import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { scheduleScenePolishStep } from '@/lib/jobs/dispatchScenePolishStep'
import {
  enqueueScenePolish,
  POLISH_PROGRESS_QUEUED,
} from '@/lib/script/scenePolish/enqueueScenePolish'
import type { PolishSceneInput } from '@/lib/script/scenePolish/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Queue a scene Polish job and return immediately.
 *
 * Gemini on a 28-beat scene can exceed a single blocking fetch. The client
 * tracks `jobId` and advances the worker via `/api/vision/polish-scene/step`.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { projectId, sceneIndex, scene, context } = body as {
      projectId?: string
      sceneIndex?: number
      scene?: PolishSceneInput
      context?: { previousScene?: PolishSceneInput | null; nextScene?: PolishSceneInput | null }
    }

    if (!projectId || sceneIndex === undefined || !scene) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { job, dispatched, replacedPreviousCount, beatCount, activity } = await enqueueScenePolish({
      userId,
      projectId,
      sceneIndex,
      scene,
      previousScene: context?.previousScene ?? null,
      nextScene: context?.nextScene ?? null,
    })

    if (!dispatched) {
      console.warn(
        '[Scene Polish Start] INNGEST_EVENT_KEY not set or send failed — dispatching step worker'
      )
      scheduleScenePolishStep(job.id)
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: 'queued',
        progress: POLISH_PROGRESS_QUEUED,
        sceneIndex,
        beatCount,
        activity,
        replacedPreviousCount,
        dispatch: dispatched ? 'inngest' : 'step_worker',
      },
      { status: 202 }
    )
  } catch (err: unknown) {
    console.error('[Scene Polish Start] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue polish' },
      { status: 500 }
    )
  }
}
