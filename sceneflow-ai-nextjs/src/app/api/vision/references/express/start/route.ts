import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  cancelActiveJobsForProject,
  createGenerationJob,
} from '@/lib/jobs/jobService'
import { scheduleReferenceExpressStep } from '@/lib/jobs/dispatchReferenceExpressStep'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { CreditService } from '@/services/CreditService'
import { getCreditCost } from '@/lib/credits/creditCosts'
import { CAST_IMAGE_CREDIT_COST } from '@/lib/vision/referenceExpress/generateReferenceImage'
import {
  loadReferenceExpressContext,
  planReferenceExpressItems,
} from '@/lib/vision/referenceExpress/planItems'
import type { ReferenceExpressItem } from '@/lib/vision/referenceExpress/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Wall-clock estimate per item so the UI can say what to expect. */
const SECONDS_PER_ITEM: Record<ReferenceExpressItem['kind'], number> = {
  // Generate, enhance, then vision-analyse a portrait.
  cast: 90,
  location: 30,
  prop: 30,
}

function estimateSeconds(items: ReferenceExpressItem[]): number {
  return items.reduce((total, item) => total + SECONDS_PER_ITEM[item.kind], 0)
}

function creditsFor(items: ReferenceExpressItem[]): number {
  const imageCost = getCreditCost('IMAGE_GENERATION')
  return items.reduce(
    (total, item) => total + (item.kind === 'cast' ? CAST_IMAGE_CREDIT_COST : imageCost),
    0
  )
}

/**
 * Queue Reference Express (cast, locations, props) and return immediately.
 *
 * Always background, matching Audience Resonance: there is no size threshold to
 * tune, and even a two-item batch then survives a reload. Items are planned
 * here and stored on the job payload, so the run is resumable without Inngest
 * and a browser refresh can re-attach to it.
 *
 * Starting always means "run a new batch": any prior active batch for this
 * project is cancelled first so the user is never blocked on a stuck queue.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { projectId } = body as { projectId?: string }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const { cancelledIds } = await cancelActiveJobsForProject({
      userId,
      projectId,
      jobType: 'reference_express',
    })

    const context = await loadReferenceExpressContext(projectId)
    if (!context) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const items = planReferenceExpressItems(context)
    if (!items.length) {
      return NextResponse.json(
        {
          error: 'All reference images are already generated',
          code: 'NOTHING_TO_GENERATE',
        },
        { status: 409 }
      )
    }

    const requiredCredits = creditsFor(items)
    const hasCredits = await CreditService.ensureCredits(userId, requiredCredits)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Generating ${items.length} reference images requires ${requiredCredits} credits. You have ${breakdown.total_credits}.`,
          required: requiredCredits,
          available: breakdown.total_credits,
        },
        { status: 402 }
      )
    }

    const { job, dispatched } = await createGenerationJob({
      userId,
      projectId,
      jobType: 'reference_express',
      payload: {
        items,
        itemCount: items.length,
        castCount: items.filter((item) => item.kind === 'cast').length,
        locationCount: items.filter((item) => item.kind === 'location').length,
        propCount: items.filter((item) => item.kind === 'prop').length,
      },
    })

    if (!dispatched) {
      console.warn(
        '[Reference Express Start] INNGEST_EVENT_KEY not set or send failed — dispatching step worker (one image per HTTP invocation)'
      )
      scheduleReferenceExpressStep(job.id)
    }

    // Each item charges its own credits as it succeeds, so a partial batch only
    // bills for the images the user actually received.
    return NextResponse.json(
      {
        jobId: job.id,
        status: 'queued',
        itemCount: items.length,
        estimatedSeconds: estimateSeconds(items),
        estimatedCredits: requiredCredits,
        replacedPreviousCount: cancelledIds.length,
        dispatch: dispatched ? 'inngest' : 'step_worker',
      },
      { status: 202 }
    )
  } catch (err: any) {
    console.error('[Reference Express Start] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to queue reference generation' },
      { status: 500 }
    )
  }
}
