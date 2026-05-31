import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'
import type { BlueprintAudienceRecommendation, BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { GuidedReviseRequest, BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'
import {
  buildPlannerPrompt,
  buildRewriterPrompt,
  buildBalanceMicroPassPrompt,
  inferPlanFromFocus,
  trimVariantForPrompt,
  trimRecommendationsForPrompt,
} from '@/lib/treatment/blueprintRevisionPrompts'
import {
  buildFieldDiffs,
  mergeRevisionIntoVariant,
  detectMissingBalanceSections,
} from '@/lib/treatment/blueprintRevisionDiff'
import { resolveContentIntent } from '@/lib/content/contentIntent'

export const runtime = 'nodejs'
export const maxDuration = 180

const CREDIT_COST = BLUEPRINT_CREDITS.BLUEPRINT_GUIDED_REVISE

const MAX_PATCH_FIELD_LEN: Record<string, number> = {
  synopsis: 8000,
  content: 8000,
  logline: 600,
  setting: 2000,
  protagonist: 2000,
  antagonist: 2000,
  tone_description: 2000,
}

function normalizePlan(raw: Record<string, unknown>): BlueprintChangePlan {
  const sections = (raw.sectionsToUpdate as string[]) || ['story']
  const valid: BlueprintFixSection[] = ['core', 'story', 'tone', 'beats', 'characters']
  return {
    primaryGoal: String(raw.primaryGoal || 'Improve blueprint coherence'),
    sectionsToUpdate: sections.filter((s): s is BlueprintFixSection =>
      valid.includes(s as BlueprintFixSection)
    ) as BlueprintFixSection[],
    crossSectionDependencies: Array.isArray(raw.crossSectionDependencies)
      ? raw.crossSectionDependencies.map(String)
      : [],
    preserveConstraints: Array.isArray(raw.preserveConstraints)
      ? raw.preserveConstraints.map(String)
      : [],
    coherenceActions: Array.isArray(raw.coherenceActions)
      ? raw.coherenceActions.map(String)
      : [],
  }
}

function capPatchSize(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch }
  for (const [key, max] of Object.entries(MAX_PATCH_FIELD_LEN)) {
    const v = out[key]
    if (typeof v === 'string' && v.length > max) {
      out[key] = `${v.slice(0, max)}…`
    }
  }
  if (Array.isArray(out.beats)) {
    out.beats = (out.beats as Array<Record<string, unknown>>).slice(0, 8)
  }
  if (Array.isArray(out.character_descriptions)) {
    out.character_descriptions = (out.character_descriptions as Array<Record<string, unknown>>).slice(
      0,
      8
    )
  }
  return out
}

async function runGeminiJson(
  prompt: string,
  maxOutputTokens: number
): Promise<Record<string, unknown> | null> {
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxOutputTokens,
    thinkingBudget: 0,
    responseMimeType: 'application/json',
    timeoutMs: 120_000,
  })
  const text = result?.text || '{}'
  const parsed = safeParseJsonFromText(text)
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as GuidedReviseRequest
    const {
      variant: rawVariant,
      userIntent = '',
      selectedRecommendationIds = [],
      resonanceRecommendations = [],
      focusScope,
      contentIntent: bodyIntent,
    } = body

    const contentIntent =
      bodyIntent ?? resolveContentIntent(String(rawVariant.genre || ''))

    if (!rawVariant || typeof rawVariant !== 'object') {
      return NextResponse.json(
        { success: false, message: 'variant is required' },
        { status: 400 }
      )
    }

    const variant = trimVariantForPrompt(rawVariant)

    const selectedRecs = trimRecommendationsForPrompt(
      resonanceRecommendations.filter((r) =>
        selectedRecommendationIds.length > 0
          ? selectedRecommendationIds.includes(r.id)
          : true
      )
    )

    const intentText =
      userIntent.trim() ||
      selectedRecs.map((r) => r.text).join('\n') ||
      ''

    if (!intentText.trim() && selectedRecs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Provide revision direction or select recommendations' },
        { status: 400 }
      )
    }

    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient credits',
          creditsRequired: CREDIT_COST,
          creditsAvailable: breakdown?.total_credits ?? 0,
        },
        { status: 402 }
      )
    }

    // Step A: Planner (skip when scoped to one section — reduces memory + one fewer LLM call)
    let plan =
      inferPlanFromFocus(focusScope, intentText) ??
      normalizePlan({
        primaryGoal: intentText,
        sectionsToUpdate: ['story'],
      })

    if (!inferPlanFromFocus(focusScope, intentText)) {
      const plannerPrompt = buildPlannerPrompt(variant, intentText, selectedRecs, focusScope, contentIntent)
      const planRaw = await runGeminiJson(plannerPrompt, 1536)
      plan = normalizePlan(
        planRaw ?? { primaryGoal: intentText, sectionsToUpdate: ['story'] }
      )
    }

    if (plan.sectionsToUpdate.length === 0) {
      plan.sectionsToUpdate = selectedRecs[0]?.fixSection
        ? [selectedRecs[0].fixSection]
        : ['story']
    }

    // Step B: Balanced rewriter
    const rewriterPrompt = buildRewriterPrompt(variant, plan, intentText, selectedRecs, contentIntent)
    let patch = await runGeminiJson(rewriterPrompt, 6144)

    if (!patch) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse revision response' },
        { status: 500 }
      )
    }

    let incompleteBalance = false
    const missing = detectMissingBalanceSections(plan.sectionsToUpdate, patch)
    if (missing.length > 0) {
      incompleteBalance = true
      const microPrompt = buildBalanceMicroPassPrompt(variant, plan, patch, missing, contentIntent)
      const microPatch = await runGeminiJson(microPrompt, 3072)
      if (microPatch) {
        patch = { ...patch, ...microPatch }
      }
    }

    patch = capPatchSize(patch)

    const narrativeReasoning = patch.narrative_reasoning as
      | Record<string, unknown>
      | undefined
    const { narrative_reasoning: _nr, ...fieldPatch } = patch

    const revisedVariant = mergeRevisionIntoVariant(rawVariant, fieldPatch)
    const diff = buildFieldDiffs(variant, trimVariantForPrompt(revisedVariant))

    const changePlan: BlueprintChangePlan = {
      ...plan,
      coherenceActions: [
        ...plan.coherenceActions,
        ...(incompleteBalance
          ? ['Ran additional pass to align dependent sections']
          : []),
      ],
    }

    await CreditService.charge(userId, CREDIT_COST, 'ai_usage', null, {
      operation: 'blueprint_guided_revise',
      sections: plan.sectionsToUpdate.join(','),
    })

    return NextResponse.json({
      success: true,
      revisedVariant,
      changePlan,
      diff,
      narrativeReasoning: narrativeReasoning || undefined,
      incompleteBalance,
      creditsUsed: CREDIT_COST,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const oom =
      message.includes('heap') ||
      message.includes('OOM') ||
      message.includes('memory')
    console.error('[Guided Revise] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: oom
          ? 'Revision ran out of memory. Try a narrower focus scope or fewer recommendations.'
          : 'Failed to generate guided revision',
      },
      { status: oom ? 503 : 500 }
    )
  }
}
