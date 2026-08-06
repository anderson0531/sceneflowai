import { NextRequest, NextResponse } from 'next/server'
import v8 from 'node:v8'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import type { GuidedReviseRequest } from '@/lib/treatment/blueprintRevisionTypes'
import {
  buildGuidedRevisePayload,
} from '@/lib/treatment/runGuidedRevise'
import { validateRevisionRequest } from '@/lib/treatment/blueprintRequestValidation'
import { createGenerationJob, findActiveJob } from '@/lib/jobs/jobService'
import { scheduleBlueprintGuidedReviseStep } from '@/lib/jobs/dispatchBlueprintGuidedReviseStep'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import { resolveStoryLocale } from '@/i18n/server/storyLocale'
import { englishForModel } from '@/i18n/server/requestLocale'

export const runtime = 'nodejs'
export const maxDuration = 60

const CREDIT_COST = BLUEPRINT_CREDITS.BLUEPRINT_GUIDED_REVISE
const MAX_BODY_BYTES = 3 * 1024 * 1024

const v8HeapLimitMb = Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024)
console.log(
  `[Guided Revise Start] Module init (v8HeapLimit=${v8HeapLimitMb}MB, NODE_OPTIONS=${process.env.NODE_OPTIONS ?? 'unset'})`
)

function isSingleSectionScope(
  focusScope?: BlueprintFixSection | 'all'
): focusScope is BlueprintFixSection {
  return (
    !!focusScope &&
    focusScope !== 'all' &&
    ['core', 'story', 'tone', 'beats', 'characters'].includes(focusScope)
  )
}

/**
 * Queue a full-balance guided revise as a durable Inngest job (fresh memory per step).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.text()
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Blueprint payload is too large to revise. Remove embedded images and try again.',
          code: 'payload_too_large',
        },
        { status: 413 }
      )
    }

    let body: GuidedReviseRequest
    try {
      body = JSON.parse(rawBody) as GuidedReviseRequest
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const {
      variant: incomingVariant,
      userIntent = '',
      selectedRecommendationIds = [],
      resonanceRecommendations = [],
      focusScope,
      contentIntent: bodyIntent,
      projectId,
    } = body

    if (!incomingVariant || typeof incomingVariant !== 'object') {
      return NextResponse.json(
        { success: false, message: 'variant is required' },
        { status: 400 }
      )
    }

    if (isSingleSectionScope(focusScope)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Single-section edits use POST /api/treatment/refine synchronously.',
          code: 'use_refine_route',
        },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'projectId is required for background revision' },
        { status: 400 }
      )
    }

    // Resolved here rather than in the worker: the job runs without a session,
    // so the creator's language has to be captured while the request context exists.
    const { storyLocale } = await resolveStoryLocale({
      explicit: (body as { storyLocale?: string }).storyLocale,
      projectId,
      userIdOrEmail: userId,
      includeProperNouns: false,
    })

    // Section inference and request validation match English keywords ("beats",
    // "pacing", "characters"), so Spanish direction silently collapsed to a
    // story-only plan. An English copy drives that routing; the prompts keep the
    // creator's own words.
    const intentTextForRouting =
      storyLocale === 'en' ? undefined : await englishForModel(userIntent, storyLocale)

    const payload = buildGuidedRevisePayload({
      incomingVariant,
      userIntent,
      selectedRecommendationIds,
      resonanceRecommendations,
      focusScope,
      contentIntent: bodyIntent,
      storyLocale,
      intentTextForRouting,
    })

    if (!payload.intentText.trim() && payload.selectedRecs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Provide revision direction or select recommendations' },
        { status: 400 }
      )
    }

    // The dialog blocks these client-side, but that is bypassable and this route
    // charges credits, so reject blockers before touching the credit balance.
    const blockers = validateRevisionRequest({
      intentText: payload.intentTextForRouting ?? payload.intentText,
      focusScope: focusScope ?? 'all',
      variant: payload.rawVariant,
      hasSelectedRecommendations: payload.selectedRecs.length > 0,
    }).filter((issue) => issue.severity === 'blocker')

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: blockers[0].message,
          code: blockers[0].code,
        },
        { status: 400 }
      )
    }

    const existing = await findActiveJob({
      userId,
      projectId,
      jobType: 'blueprint_guided_revise',
    })
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          jobId: existing.id,
          status: existing.status,
          progress: existing.progress,
          alreadyRunning: true,
        },
        { status: 200 }
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

    const jobPayload: Record<string, unknown> = {
      userIntent,
      // Persisted alongside the raw direction so a retry in the worker infers the
      // same sections without re-translating.
      intentTextForRouting: payload.intentTextForRouting,
      selectedRecommendationIds,
      resonanceRecommendations: payload.selectedRecs,
      focusScope: focusScope ?? 'all',
      contentIntent: payload.contentIntent,
      storyLocale: payload.storyLocale,
      rawVariant: payload.rawVariant,
      preservedCharacterAssets: payload.preservedCharacterAssets,
    }

    const { job, dispatched } = await createGenerationJob({
      userId,
      projectId,
      jobType: 'blueprint_guided_revise',
      payload: jobPayload,
    })

    if (!dispatched) {
      console.warn(
        '[Guided Revise Start] INNGEST_EVENT_KEY not set — dispatching step worker (one HTTP invocation per section)'
      )
      scheduleBlueprintGuidedReviseStep(job.id)
    }

    await CreditService.charge(userId, CREDIT_COST, 'ai_usage', null, {
      operation: 'blueprint_guided_revise',
      jobId: job.id,
      projectId,
    })

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: 'queued',
        creditsUsed: CREDIT_COST,
        estimatedSeconds: 90,
        dispatch: dispatched ? 'inngest' : 'step_worker',
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[Guided Revise Start] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to queue revision',
      },
      { status: 500 }
    )
  }
}
