import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  cancelActiveJobsForProject,
  createGenerationJob,
} from '@/lib/jobs/jobService'
import { scheduleReferenceExpressStep } from '@/lib/jobs/dispatchReferenceExpressStep'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { CreditService } from '@/services/CreditService'
import {
  estimateReferenceExpressCredits,
  estimateReferenceExpressSeconds,
} from '@/lib/vision/referenceExpress/estimate'
import {
  loadReferenceExpressContext,
  planSceneReferenceExpressItems,
} from '@/lib/vision/referenceExpress/planItems'
import type { ReferenceExpressScope } from '@/lib/vision/referenceExpress/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Queue Express References (cast, locations, props) and return immediately.
 *
 * Always background, matching Audience Resonance: there is no size threshold to
 * tune, and even a two-item batch then survives a reload. Items are planned
 * here and stored on the job payload, so the run is resumable without Inngest
 * and a browser refresh can re-attach to it.
 *
 * `sceneIndices` scopes the run to what those scenes need, which is what makes
 * just-in-time generation viable: the whole library is 20+ minutes of serial
 * work, one scene is usually four items. Scoping is a planning change only —
 * the worker and the job row are unchanged.
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
    const { projectId, sceneIndices, itemKeys } = body as {
      projectId?: string
      sceneIndices?: unknown
      itemKeys?: unknown
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const scope: ReferenceExpressScope = {
      sceneIndices: Array.isArray(sceneIndices)
        ? sceneIndices.filter((index): index is number => Number.isInteger(index) && index >= 0)
        : undefined,
      itemKeys: Array.isArray(itemKeys)
        ? itemKeys.filter((key): key is string => typeof key === 'string' && !!key.trim())
        : undefined,
    }
    const sceneScoped = !!scope.sceneIndices?.length

    const { cancelledIds } = await cancelActiveJobsForProject({
      userId,
      projectId,
      jobType: 'reference_express',
    })

    const context = await loadReferenceExpressContext(projectId)
    if (!context) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const items = planSceneReferenceExpressItems(context, scope)
    if (!items.length) {
      return NextResponse.json(
        {
          error: sceneScoped
            ? 'This scene already has every reference it needs'
            : 'All reference images are already generated',
          code: 'NOTHING_TO_GENERATE',
        },
        { status: 409 }
      )
    }

    const requiredCredits = estimateReferenceExpressCredits(items)
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
        // Recorded so the status card can name the scope. The worker reads
        // only `items` and `_worker`, so this stays informational.
        sceneIndices: sceneScoped ? scope.sceneIndices : undefined,
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
        estimatedSeconds: estimateReferenceExpressSeconds(items),
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
