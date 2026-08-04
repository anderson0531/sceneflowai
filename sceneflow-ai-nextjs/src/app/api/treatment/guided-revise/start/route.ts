import { NextRequest, NextResponse, after } from 'next/server'
import v8 from 'node:v8'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import type { GuidedReviseRequest } from '@/lib/treatment/blueprintRevisionTypes'
import {
  buildGuidedRevisePayload,
} from '@/lib/treatment/runGuidedRevise'
import { createGenerationJob, findActiveJob } from '@/lib/jobs/jobService'
import { executeBlueprintGuidedReviseJob } from '@/lib/jobs/executeBlueprintGuidedReviseJob'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

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

    const payload = buildGuidedRevisePayload({
      incomingVariant,
      userIntent,
      selectedRecommendationIds,
      resonanceRecommendations,
      focusScope,
      contentIntent: bodyIntent,
    })

    if (!payload.intentText.trim() && payload.selectedRecs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Provide revision direction or select recommendations' },
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
      selectedRecommendationIds,
      resonanceRecommendations: payload.selectedRecs,
      focusScope: focusScope ?? 'all',
      contentIntent: payload.contentIntent,
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
        '[Guided Revise Start] INNGEST_EVENT_KEY not set — running inline fallback via after()'
      )
      after(async () => {
        try {
          await executeBlueprintGuidedReviseJob({
            jobId: job.id,
            userId,
            projectId,
            payload: jobPayload,
          })
        } catch (err) {
          console.error('[Guided Revise Start] Inline fallback failed:', err)
        }
      })
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
        dispatch: dispatched ? 'inngest' : 'inline_fallback',
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
