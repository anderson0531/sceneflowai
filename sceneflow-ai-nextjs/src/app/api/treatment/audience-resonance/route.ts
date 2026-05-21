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
  createAudienceDefinition,
  formatAudienceDefinitionForPrompt,
  READY_FOR_PRODUCTION_THRESHOLD_V3,
} from '@/lib/types/audienceResonance'
import {
  finalizeBlueprintScore,
  mapDeductions,
  mapRecommendations,
} from '@/lib/treatment/blueprintAudienceScorer'

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
  /** Genre/tone context only — not part of audience definition */
  genre?: string
  tone?: string
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
  appliedIds: string[] = []
): string {
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

  return `You are an expert development executive evaluating a FILM TREATMENT (blueprint phase) for TARGET AUDIENCE RESONANCE.

CRITICAL — TARGET AUDIENCE PROFILE:
${audienceBlock}${presetHint}
${appliedBlock}

Secondary context (genre/tone only): Genre: ${genre || treatment.genre || 'unspecified'} | Tone: ${tone || treatment.tone_description || 'unspecified'}

SCORING RULES (MANDATORY):
1. Start at baseScore 100.
2. List every genuine audience-resonance gap as a deduction with reason, points, category, priority.
3. overallScore MUST equal 100 minus the sum of all deduction points (we verify server-side).
4. Priority point bands: critical 12–18, high 10–15, medium 5–9, low 1–4.
5. Each deduction MUST have a matching recommendation with text, priority, pointsDeducted, fixSection (core|story|tone|beats|characters).
6. Be fair: a solid treatment with minor gaps should score 75–88. Reserve below 65 for major audience misalignment.
7. Evaluate ONLY how well this treatment resonates with the TARGET AUDIENCE above.

TREATMENT:
Title: ${treatment.title || 'Untitled'}
Logline: ${truncate(treatment.logline, 400)}
Synopsis: ${truncate(treatment.synopsis, 2000)}
Protagonist: ${truncate(treatment.protagonist, 300)}
Antagonist: ${truncate(treatment.antagonist, 300)}
Setting: ${truncate(treatment.setting, 200)}
Beats:
${beatsText}
Characters:
${charsText}

EVALUATION CATEGORIES (score each 1–100 for radar display):
- Audience Appeal (weight 25): Will this audience want to watch?
- Genre & Tone Fit (weight 20): Matches genre/tone expectations for this audience?
- Concept Hook (weight 20): Logline/premise grabs this audience?
- Character Connection (weight 20): Characters this audience will root for?
- Clarity & Structure (weight 15): Clear enough for this audience?

Return ONLY valid JSON:
{
  "overallScore": <100 minus sum of deduction points>,
  "baseScore": 100,
  "deductions": [{"reason": "...", "points": <number>, "category": "...", "priority": "high|medium|low"}],
  "recommendations": [
    {"text": "...", "title": "...", "priority": "high|medium|low", "pointsDeducted": <number>, "fixSection": "story", "category": "..."}
  ],
  "categories": [
    {"name": "Audience Appeal", "score": <1-100>, "weight": 25},
    {"name": "Genre & Tone Fit", "score": <1-100>, "weight": 20},
    {"name": "Concept Hook", "score": <1-100>, "weight": 20},
    {"name": "Character Connection", "score": <1-100>, "weight": 20},
    {"name": "Clarity & Structure", "score": <1-100>, "weight": 15}
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
    const { treatment, audienceDefinition: rawDef, genre, tone } = body

    if (!treatment) {
      return NextResponse.json(
        { success: false, error: 'Treatment data is required' },
        { status: 400 }
      )
    }

    const audienceDefinition = createAudienceDefinition(rawDef)
    const appliedIds = body.appliedRecommendationIds || []
    const prompt = buildPrompt(treatment, audienceDefinition, genre, tone, appliedIds)

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
      categories = [
        { name: 'Audience Appeal', score: 70, weight: 25 },
        { name: 'Genre & Tone Fit', score: 70, weight: 20 },
        { name: 'Concept Hook', score: 70, weight: 20 },
        { name: 'Character Connection', score: 70, weight: 20 },
        { name: 'Clarity & Structure', score: 70, weight: 15 },
      ]
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

    return NextResponse.json(
      {
        success: true,
        analysis,
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
