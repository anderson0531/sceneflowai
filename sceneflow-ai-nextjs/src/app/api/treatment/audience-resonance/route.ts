import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { getAudienceResonanceModel } from '@/lib/config/modelConfig'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { getAudiencePreset } from '@/lib/constants/audience-presets'
import {
  type AudienceDefinition,
  type BlueprintAudienceResonanceAnalysis,
  type BlueprintAudienceCategory,
  type PersistedBlueprintAudienceResonance,
  createAudienceDefinition,
  createPersistedBlueprintAR,
  formatAudienceDefinitionForPrompt,
  hasCulturalSignals,
  buildCulturalAnalysisDirective,
  CULTURAL_AUTHENTICITY_CATEGORY,
  CULTURAL_AUTHENTICITY_WEIGHT,
  READY_FOR_PRODUCTION_THRESHOLD_V3,
} from '@/lib/types/audienceResonance'
import {
  deductionsFromRecommendations,
  finalizeBlueprintScore,
  mapRecommendations,
} from '@/lib/treatment/blueprintAudienceScorer'
import { MAX_BEATS } from '@/lib/treatment/blueprintRevisionTypes'
import { persistBlueprintARToProject } from '@/lib/treatment/persistBlueprintAR'
import { resolveExistingContentStoryLocale } from '@/i18n/server/storyLocale'
import { buildProperNounGlossary, localeDirective } from '@/lib/prompts/localeDirective'
import {
  type ContentIntent,
  getIntentScoringRubric,
  resolveContentIntent,
} from '@/lib/content/contentIntent'

export const runtime = 'nodejs'
// A full beat sheet graded at high thinking outlasts the previous 120s.
export const maxDuration = 300

const CREDIT_COST = BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS

/** Participants sent to the analyzer. Was 5, which hid most of an ensemble. */
const MAX_ANALYZED_CHARACTERS = 12

export interface AudienceResonanceRequestBody {
  treatmentId?: string
  treatment: {
    title?: string
    logline?: string
    synopsis?: string
    genre?: string
    tone_description?: string
    visual_style?: string
    target_audience?: string
    protagonist?: string
    antagonist?: string
    setting?: string
    beats?: Array<{ title?: string; synopsis?: string; intent?: string }>
    character_descriptions?: Array<{ name?: string; role?: string; description?: string }>
  }
  audienceDefinition: AudienceDefinition
  /** When set, analysis is merged into project.metadata in the database */
  projectId?: string
  /** Pre-login localStorage owner id for legacy project ownership migration */
  legacyOwnerId?: string
  /** Genre/tone context only — not part of audience definition */
  genre?: string
  tone?: string
  contentIntent?: ContentIntent
  iteration?: number
  appliedRecommendationIds?: string[]
  previousAnalysis?: {
    overallScore: number
    categories: BlueprintAudienceCategory[]
  }
}

function truncate(text: string | undefined, max: number): string {
  if (!text) return ''
  return text.length <= max ? text : text.slice(0, max) + '…'
}

function buildPrompt(
  treatment: AudienceResonanceRequestBody['treatment'],
  audienceDefinition: AudienceDefinition,
  genre?: string,
  tone?: string,
  appliedIds: string[] = [],
  contentIntent?: ContentIntent,
  languageBlock: string = ''
): string {
  const intent = contentIntent ?? resolveContentIntent(genre || treatment.genre)
  const rubric = getIntentScoringRubric(intent)
  const { lead, opposition } = rubric.primaryFieldLabels
  const preset = audienceDefinition.presetId
    ? getAudiencePreset(audienceDefinition.presetId)
    : undefined
  const audienceBlock = formatAudienceDefinitionForPrompt(audienceDefinition)
  const presetHint = preset?.directionHint
    ? `\nPreset lens (${preset.label}): ${preset.directionHint}`
    : ''
  const culturalDirective = buildCulturalAnalysisDirective(audienceDefinition)
  const hasCulture = culturalDirective.length > 0
  const culturalBlock = hasCulture ? `\n\n${culturalDirective}` : ''
  const evalCategories = hasCulture
    ? [
        ...rubric.categories,
        {
          name: CULTURAL_AUTHENTICITY_CATEGORY,
          weight: CULTURAL_AUTHENTICITY_WEIGHT,
          description:
            'How authentically and respectfully the content resonates with the specific culture(s), language(s), and values named in the target audience.',
        },
      ]
    : rubric.categories

  // The whole beat sheet, not a window. An 8-beat slice hid most of a long-form
  // story from the analyzer, so it scored an opening it mistook for the film.
  const beatsText =
    treatment.beats?.slice(0, MAX_BEATS).map((b, i) =>
      `${i + 1}. ${b.title || 'Beat'}: ${truncate(b.synopsis || b.intent, 240)}`
    ).join('\n') || 'Not provided'

  const charsText =
    treatment.character_descriptions?.slice(0, MAX_ANALYZED_CHARACTERS).map((c) =>
      `${c.name || 'Character'} (${c.role || 'role'}): ${truncate(c.description, 200)}`
    ).join('\n') || 'Not provided'

  const appliedBlock =
    appliedIds.length > 0
      ? `\nThe user already applied fixes for recommendation IDs: ${appliedIds.join(', ')}. Do NOT repeat those issues. Acknowledge improvements. Prefer remaining lower-priority polish. Do NOT invent new high or critical issues unless they are clearly still present in the treatment.`
      : ''

  return `You are an expert ${rubric.persona} evaluating a ${intent === 'fiction' ? 'FILM TREATMENT' : 'CONTENT BLUEPRINT'} for TARGET AUDIENCE RESONANCE.

${rubric.guardrail}

CRITICAL — TARGET AUDIENCE PROFILE:
${audienceBlock}${presetHint}${culturalBlock}
${appliedBlock}

Secondary context (genre/tone only): Genre: ${genre || treatment.genre || 'unspecified'} | Tone: ${tone || treatment.tone_description || 'unspecified'} | Content Intent: ${intent}

SCORING RULES (MANDATORY):
1. Start at baseScore 100.
2. Return ONE list: "recommendations". Every entry is a single audience-resonance gap AND the fix that closes it. There is no separate deductions list — a gap you deduct points for that has no fix is not a valid entry.
3. Each entry carries:
   - reason: the gap itself, i.e. exactly what is costing these points
   - text: the concrete fix that closes that gap
   - pointsDeducted: the honest cost of this gap
   - priority, fixSection (core|story|tone|beats|characters), category
   - impactSections when the fix ripples beyond one section, and optional intentLabel (short chip text)
4. "reason" and "text" must describe the SAME issue. The creator reads the reason in the score breakdown and applies the text as the fix, so they cannot describe different problems.
5. List the COMPLETE resonance backlog. Do NOT withhold issues to protect the headline number, do NOT drip-feed only the top two, and do NOT stop at an arbitrary count — report every genuine gap and no filler.
6. Report honest per-gap points. The SERVER recomputes overallScore with balanced (diminishing) weighting — your overallScore field is a hint only.
7. Priority point bands: critical 12–18, high 10–15, medium 5–9, low 1–4, optional 1–3. Reserve low and optional for genuine polish; do not label a substantive gap as polish.
8. Be fair: strong treatments with only polish left often land 85–95 AFTER server scoring. Reserve below 65 for major audience misalignment. Do not invent critical gaps just to fill a band.
9. Evaluate ONLY how well this content resonates with the TARGET AUDIENCE above.
10. Do NOT penalize non-fiction/commercial content for missing fictional screenplay elements (antagonist arc, three-act drama, character ghost) unless content intent is fiction.
11. Judge the ENTIRE beat sheet below, not just the opening beats. Long-form blueprints are normal here.

TREATMENT:
Title: ${treatment.title || 'Untitled'}
Logline: ${truncate(treatment.logline, 400)}
Synopsis: ${truncate(treatment.synopsis, 2000)}
${lead}: ${truncate(treatment.protagonist, 300)}
${opposition}: ${truncate(treatment.antagonist, 300)}
Setting: ${truncate(treatment.setting, 200)}
Beats:
${beatsText}
Participants:
${charsText}

EVALUATION CATEGORIES (score each 1–100 for radar display):
${evalCategories.map((c) => `- ${c.name} (weight ${c.weight}): ${c.description}`).join('\n')}
${languageBlock}
Return ONLY valid JSON:
{
  "overallScore": <hint: 100 minus sum of pointsDeducted; server will rebalance>,
  "baseScore": 100,
  "recommendations": [
    {"reason": "What is costing these points", "text": "The concrete fix that closes that exact gap", "title": "...", "priority": "critical|high|medium|low|optional", "pointsDeducted": <number>, "fixSection": "story", "impactSections": ["story","beats"], "intentLabel": "Short chip", "category": "..."}
  ],
  "categories": [
${evalCategories.map((c) => `    {"name": "${c.name}", "score": <1-100>, "weight": ${c.weight}}`).join(',\n')}
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "summary": "<2-3 sentences>"
}`
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()

  try {
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required: CREDIT_COST,
        },
        { status: 402 }
      )
    }

    const body = (await request.json()) as AudienceResonanceRequestBody
    const { treatment, audienceDefinition: rawDef, genre, tone, contentIntent: bodyIntent } = body
    const contentIntent =
      bodyIntent ?? resolveContentIntent(genre || treatment.genre)

    if (!treatment) {
      return NextResponse.json(
        { success: false, error: 'Treatment data is required' },
        { status: 400 }
      )
    }

    const audienceDefinition = createAudienceDefinition(rawDef)
    const appliedIds = body.appliedRecommendationIds || []

    // Analysis prose is stored on the project. Follow the stamped content
    // language (or English), never the UI cookie — that is how leftover
    // Español ended up persisted in blueprintAudienceResonance.
    const { storyLocale, properNouns } = await resolveExistingContentStoryLocale({
      explicit: (body as { storyLocale?: string }).storyLocale,
      projectId: body.projectId,
      userIdOrEmail: userId,
    })
    const prompt = buildPrompt(
      treatment,
      audienceDefinition,
      genre,
      tone,
      appliedIds,
      contentIntent,
      localeDirective(storyLocale, {
        properNouns: buildProperNounGlossary(
          { characters: treatment.character_descriptions ?? [] },
          [...properNouns, treatment.title ?? '']
        ),
        note:
          'The JSON keys, the "fixSection" values (core, story, tone, beats, characters), and the "priority" values stay exactly as specified.',
      })
    )

    // Give the model more room to reason when validating cultural nuance
    const needsCulturalReasoning = hasCulturalSignals(audienceDefinition.culturalSignals)

    // Matches the Script AR passes, which reason at high effort. Grading a full
    // long-form beat sheet against an audience is the same class of judgement,
    // and it was running two thinking tiers below that.
    const result = await generateText(prompt, {
      model: getAudienceResonanceModel(),
      temperature: 0.15,
      maxOutputTokens: needsCulturalReasoning ? 20000 : 16000,
      thinkingLevel: 'high',
      timeoutMs: 180000,
      maxRetries: 1,
    })

    if (result.finishReason === 'SAFETY') {
      throw new Error('Content blocked by safety filters.')
    }

    const parsed = safeParseJsonFromText(result.text || '{}') as Record<string, unknown>
    // Gaps and fixes are one list now, so the score breakdown is a projection of
    // the recommendations rather than a second list that can contradict them.
    // Projecting the pending list keeps a fix the creator already applied from
    // being charged against the score while hidden from the panel.
    const recommendations = mapRecommendations(
      (parsed.recommendations as unknown[]) || []
    ).filter((r) => !appliedIds.includes(r.id))
    const deductions = deductionsFromRecommendations(recommendations)
    let categories = ((parsed.categories as BlueprintAudienceCategory[]) || []).map(
      (c) => ({
        name: c.name,
        score: Math.min(100, Math.max(0, Number(c.score) || 70)),
        weight: Number(c.weight) || 20,
      })
    )

    if (categories.length === 0) {
      const rubric = getIntentScoringRubric(contentIntent)
      categories = rubric.categories.map((c) => ({
        name: c.name,
        score: 70,
        weight: c.weight,
      }))
    }

    const { overallScore, categories: finalCategories } = finalizeBlueprintScore(
      deductions,
      categories,
      body.previousAnalysis?.categories
    )

    const analysis: BlueprintAudienceResonanceAnalysis = {
      version: 3,
      treatmentId: body.treatmentId || 'current',
      overallScore,
      baseScore: 100,
      deductions,
      recommendations,
      categories: finalCategories,
      strengths: (parsed.strengths as string[]) || [],
      improvements: (parsed.improvements as string[]) || [],
      summary: String(parsed.summary || parsed.analysis || ''),
      audienceDefinition,
      isReadyForProduction: overallScore >= READY_FOR_PRODUCTION_THRESHOLD_V3,
      generatedAt: new Date().toISOString(),
      creditsUsed: CREDIT_COST,
    }

    await CreditService.charge(userId, CREDIT_COST, 'ai_usage', null, {
      operation: 'blueprint_audience_resonance_v3',
      treatmentId: body.treatmentId,
      overallScore,
    })

    const persisted = createPersistedBlueprintAR(
      analysis,
      audienceDefinition,
      appliedIds,
      body.iteration ?? 1
    )

    let persistedToProject = false
    if (body.projectId && !body.projectId.startsWith('new-project')) {
      try {
        await persistBlueprintARToProject(
          body.projectId,
          persisted,
          userId,
          body.legacyOwnerId
        )
        persistedToProject = true
      } catch (persistErr) {
        console.error('[Blueprint AR v3] Failed to persist analysis to project:', persistErr)
      }
    }

    return NextResponse.json(
      {
        success: true,
        analysis,
        persisted,
        persistedToProject,
        readyForProduction: analysis.isReadyForProduction,
        iteration: body.iteration ?? 1,
      },
      {
        headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' },
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('[Blueprint AR v3]', message, error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
