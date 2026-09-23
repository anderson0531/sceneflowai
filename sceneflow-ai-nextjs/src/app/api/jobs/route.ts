import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  cancelActiveJobsForProject,
  cancelGenerationJob,
  createGenerationJob,
  getJobForUser,
  listJobsForUser,
} from '@/lib/jobs/jobService'
import { ACTIVE_JOB_STATUSES } from '@/lib/jobs/jobStatus'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import type { GenerationJobType } from '@/models/GenerationJob'
import {
  promoteSceneRenderResult,
  syncSceneRenderJobRecord,
} from '@/lib/jobs/sceneRenderJob'
import { inngest } from '@/inngest/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Session is authoritative — a client-supplied userId would let one
    // account enumerate another's jobs.
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const jobId = req.nextUrl.searchParams.get('jobId')
    const projectId = req.nextUrl.searchParams.get('projectId') || undefined

    if (jobId) {
      const job = await getJobForUser(jobId, userId)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      const fresh = await syncSceneRenderJobRecord(job)
      return NextResponse.json({ job: fresh })
    }

    const activeOnly = req.nextUrl.searchParams.get('active') === 'true'
    const jobs = await listJobsForUser(userId, projectId, { activeOnly })
    const synced = []
    for (const job of jobs) {
      if (job.job_type === 'scene_render' && ACTIVE_JOB_STATUSES.includes(job.status)) {
        synced.push(await syncSceneRenderJobRecord(job))
      } else {
        synced.push(job)
      }
    }
    return NextResponse.json({ jobs: synced })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { jobId, action, projectId, jobType, downloadUrl } = body as {
      jobId?: string
      action?: string
      projectId?: string
      jobType?: GenerationJobType
      downloadUrl?: string
    }

    if (action === 'promote-scene-render') {
      if (!jobId || !downloadUrl) {
        return NextResponse.json(
          { error: 'jobId, downloadUrl, and action=promote-scene-render required' },
          { status: 400 }
        )
      }
      const job = await promoteSceneRenderResult({ userId, jobId, downloadUrl })
      if (!job) {
        return NextResponse.json({ error: 'Scene render job not found' }, { status: 404 })
      }
      return NextResponse.json({ job })
    }

    if (action === 'cancel-active') {
      if (!projectId || !jobType) {
        return NextResponse.json(
          { error: 'projectId, jobType, and action=cancel-active required' },
          { status: 400 }
        )
      }
      const { cancelledIds } = await cancelActiveJobsForProject({
        userId,
        projectId,
        jobType,
      })
      return NextResponse.json({ cancelledIds, cancelledCount: cancelledIds.length })
    }

    if (!jobId || action !== 'cancel') {
      return NextResponse.json(
        { error: 'jobId and action=cancel required (or action=cancel-active with projectId+jobType)' },
        { status: 400 }
      )
    }

    const cancelled = await cancelGenerationJob(jobId, userId)
    if (!cancelled) {
      return NextResponse.json({ error: 'Job not found or not active' }, { status: 404 })
    }

    const job = await getJobForUser(jobId, userId)
    return NextResponse.json({ job })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, jobType, payload, batch } = body as {
      projectId: string
      jobType: GenerationJobType
      payload?: Record<string, unknown>
      batch?: Record<string, unknown>[]
    }

    if (!projectId || !jobType) {
      return NextResponse.json({ error: 'projectId, jobType required' }, { status: 400 })
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (batch && Array.isArray(batch) && batch.length > 0) {
      // Items live on the payload, not just in the Inngest event, so the work
      // is recoverable after a cold start and inspectable when a run stalls.
      const { job } = await createGenerationJob({
        userId,
        projectId,
        jobType,
        payload: { batchSize: batch.length, items: batch },
        dispatch: false,
      })

      let dispatched = false
      try {
        await inngest.send({
          name: 'generation/batch.queued',
          data: { jobId: job.id, userId, projectId, jobType, items: batch },
        })
        dispatched = true
      } catch (err) {
        console.warn('[jobs] Batch dispatch failed — job left queued:', err)
      }

      return NextResponse.json({
        jobId: job.id,
        status: 'queued',
        batchSize: batch.length,
        dispatched,
      })
    }

    const { job } = await createGenerationJob({
      userId,
      projectId,
      jobType,
      payload: payload || {},
    })
    return NextResponse.json({ jobId: job.id, status: 'queued' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
