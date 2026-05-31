import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
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
  READY_FOR_PRODUCTION_THRESHOLD_V3,
} from '@/lib/types/audienceResonance'
import {
  finalizeBlueprintScore,
  mapDeductions,
  mapRecommendations,
} from '@/lib/treatment/blueprintAudienceScorer'
import { persistBlueprintARToProject } from '@/lib/treatment/persistBlueprintAR'
import {
  type ContentIntent,
  getIntentScoringRubric,
  resolveContentIntent,
} from '@/lib/content/contentIntent'

export const runtime = 'nodejs'
export const maxDuration = 120

const CREDIT_COST = BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS

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
  contentIntent?: ContentIntent
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

  const beatsText =
    treatment.beats?.slice(0, 8).map((b, i) =>
      `${i + 1}. ${b.title || 'Beat'}: ${truncate(b.synopsis || b.intent, 120)}`
    ).join('\n') || 'Not provided'

  const charsText =
    treatment.character_descriptions?.slice(0, 5).map((c) =>
      `${c.name || 'Character'} (${c.role || 'role'}): ${truncate(c.description, 100)}`
    ).join('\n') || 'Not provided'

  const appliedBlock =
    appliedIds.length > 0
      ? `\nThe user already applied fixes for recommendation IDs: ${appliedIds.join(', ')}. Do NOT repeat those issues. Acknowledge improvements and find remaining gaps only.`
      : ''

  return `You are an expert ${rubric.persona} evaluating a ${intent === 'fiction' ? 'FILM TREATMENT' : 'CONTENT BLUEPRINT'} for TARGET AUDIENCE RESONANCE.

${rubric.guardrail}

CRITICAL — TARGET AUDIENCE PROFILE:
${audienceBlock}${presetHint}
${appliedBlock}

Secondary context (genre/tone only): Genre: ${genre || treatment.genre || 'unspecified'} | Tone: ${tone || treatment.tone_description || 'unspecified'} | Content Intent: ${intent}

SCORING RULES (MANDATORY):
1. Start at baseScore 100.
2. List every genuine audience-resonance gap as a deduction with reason, points, category, priority.
3. overallScore MUST equal 100 minus the sum of all deduction points (we verify server-side).
4. Priority point bands: critical 12–18, high 10–15, medium 5–9, low 1–4.
5. Each deduction MUST have a matching recommendation with text, priority, pointsDeducted, fixSection (core|story|tone|beats|characters), and when a fix ripples beyond one section, impactSections (array of sections to reconcile) and optional intentLabel (short chip text).
6. Be fair: a solid treatment with minor gaps should score 75–88. Reserve below 65 for major audience misalignment.
7. Evaluate ONLY how well this content resonates with the TARGET AUDIENCE above.
8. Do NOT penalize non-fiction/commercial content for missing fictional screenplay elements (antagonist arc, three-act drama, character ghost) unless content intent is fiction.

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
${rubric.categories.map((c) => `- ${c.name} (weight ${c.weight}): ${c.description}`).join('\n')}

Return ONLY valid JSON:
{
  "overallScore": <100 minus sum of deduction points>,
  "baseScore": 100,
  "deductions": [{"reason": "...", "points": <number>, "category": "...", "priority": "high|medium|low"}],
  "recommendations": [
    {"text": "...", "title": "...", "priority": "high|medium|low", "pointsDeducted": <number>, "fixSection": "story", "impactSections": ["story","beats"], "intentLabel": "Short chip", "category": "..."}
  ],
  "categories": [
${rubric.categories.map((c) => `    {"name": "${c.name}", "score": <1-100>, "weight": ${c.weight}}`).join(',\n')}
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "summary": "<2-3 sentences>"
}`
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string })?.id

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
    const prompt = buildPrompt(treatment, audienceDefinition, genre, tone, appliedIds, contentIntent)

    const result = await generateText(prompt, {
      model: 'gemini-3.0-flash',
      temperature: 0.15,
      maxOutputTokens: 8000,
      thinkingLevel: 'low',
      timeoutMs: 90000,
      maxRetries: 1,
    })

    if (result.finishReason === 'SAFETY') {
      throw new Error('Content blocked by safety filters.')
    }

    const parsed = safeParseJsonFromText(result.text || '{}') as Record<string, unknown>
    const deductions = mapDeductions((parsed.deductions as unknown[]) || [])
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

    const recommendations = mapRecommendations(
      (parsed.recommendations as unknown[]) || []
    ).filter((r) => !appliedIds.includes(r.id))

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

    if (body.projectId && !body.projectId.startsWith('new-project')) {
      try {
        await persistBlueprintARToProject(body.projectId, persisted, userId)
      } catch (persistErr) {
        console.error('[Blueprint AR v3] Failed to persist analysis to project:', persistErr)
      }
    }

    return NextResponse.json(
      {
        success: true,
        analysis,
        persisted,
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
