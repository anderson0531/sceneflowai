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
} from '@/lib/treatment/blueprintRevisionPrompts'
import {
  buildFieldDiffs,
  mergeRevisionIntoVariant,
  detectMissingBalanceSections,
} from '@/lib/treatment/blueprintRevisionDiff'

const CREDIT_COST = BLUEPRINT_CREDITS.BLUEPRINT_GUIDED_REVISE

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as GuidedReviseRequest
    const {
      variant,
      userIntent = '',
      selectedRecommendationIds = [],
      resonanceRecommendations = [],
      focusScope,
    } = body

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'variant is required' },
        { status: 400 }
      )
    }

    const selectedRecs = resonanceRecommendations.filter((r) =>
      selectedRecommendationIds.length > 0
        ? selectedRecommendationIds.includes(r.id)
        : true
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

    // Step A: Planner
    const plannerPrompt = buildPlannerPrompt(
      variant,
      intentText,
      selectedRecs,
      focusScope
    )
    const plannerResult = await generateText(plannerPrompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxOutputTokens: 2048,
      thinkingBudget: 0,
    })
    const planRaw = safeParseJsonFromText(plannerResult?.text || '{}')
    const plan = normalizePlan(
      planRaw && typeof planRaw === 'object'
        ? (planRaw as Record<string, unknown>)
        : { primaryGoal: intentText, sectionsToUpdate: ['story'] }
    )

    if (plan.sectionsToUpdate.length === 0) {
      plan.sectionsToUpdate = selectedRecs[0]?.fixSection
        ? [selectedRecs[0].fixSection]
        : ['story']
    }

    // Step B: Balanced rewriter
    const rewriterPrompt = buildRewriterPrompt(variant, plan, intentText, selectedRecs)
    const rewriteResult = await generateText(rewriterPrompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.35,
      maxOutputTokens: 8192,
      thinkingBudget: 0,
    })
    let patch =
      safeParseJsonFromText(rewriteResult?.text || '{}') as Record<string, unknown> | null

    if (!patch || typeof patch !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Failed to parse revision response' },
        { status: 500 }
      )
    }

    let incompleteBalance = false
    const missing = detectMissingBalanceSections(plan.sectionsToUpdate, patch)
    if (missing.length > 0) {
      incompleteBalance = true
      const microPrompt = buildBalanceMicroPassPrompt(variant, plan, patch, missing)
      const microResult = await generateText(microPrompt, {
        model: 'gemini-2.5-flash',
        temperature: 0.3,
        maxOutputTokens: 4096,
        thinkingBudget: 0,
      })
      const microPatch = safeParseJsonFromText(microResult?.text || '{}')
      if (microPatch && typeof microPatch === 'object') {
        patch = { ...patch, ...(microPatch as Record<string, unknown>) }
      }
    }

    const narrativeReasoning = patch.narrative_reasoning as
      | Record<string, unknown>
      | undefined
    const { narrative_reasoning: _nr, ...fieldPatch } = patch

    const revisedVariant = mergeRevisionIntoVariant(variant, fieldPatch)
    const diff = buildFieldDiffs(variant, revisedVariant)

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
    console.error('[Guided Revise] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate guided revision' },
      { status: 500 }
    )
  }
}
