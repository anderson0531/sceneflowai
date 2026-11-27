import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import {
  cancelGenerationJob,
  getJobForUser,
} from '@/lib/jobs/jobService'
import {
  PRODUCTION_AGENT_JOB_TYPE,
  type ProductionAgentWorkerState,
} from '@/lib/jobs/productionAgentWorker'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { jobId } = await context.params
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await getJobForUser(jobId, userId)
    if (!job || (job.job_type as string) !== PRODUCTION_AGENT_JOB_TYPE) {
      return NextResponse.json({ error: 'Production Agent job not found' }, { status: 404 })
    }

    const payload = (job.payload ?? {}) as Record<string, unknown>
    const worker = (payload._worker ?? null) as ProductionAgentWorkerState | null
    const result = (job.result ?? null) as Record<string, unknown> | null
    const telemetry = result?.telemetry ?? worker?.telemetry ?? null

    return NextResponse.json({
      job: {
        id: job.id,
        projectId: job.project_id,
        jobType: job.job_type,
        status: job.status,
        progress: job.progress,
        error: job.error,
        result: job.result,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      },
      worker: worker
        ? {
            stage: worker.stage,
            sceneCursor: worker.sceneCursor,
            inRecovery: worker.inRecovery,
            recoveryPass: worker.recoveryPass,
            rateLimitedQueueCount: worker.rateLimitedQueue.length,
            isSequentialMode: worker.isSequentialMode,
            credentialSource: worker.credentialSource,
            nextAttemptAt: worker.nextAttemptAt,
            lastSubtitle: worker.lastSubtitle,
          }
        : null,
      telemetry,
    })
  } catch (err: any) {
    console.error('[production/agent/[jobId]] GET error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch Production Agent job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { jobId } = await context.params
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const existing = await getJobForUser(jobId, userId)
    if (!existing || (existing.job_type as string) !== PRODUCTION_AGENT_JOB_TYPE) {
      return NextResponse.json({ error: 'Production Agent job not found' }, { status: 404 })
    }

    const cancelled = await cancelGenerationJob(jobId, userId)
    const updated = await getJobForUser(jobId, userId)

    return NextResponse.json({
      cancelled,
      job: updated
        ? {
            id: updated.id,
            status: updated.status,
            progress: updated.progress,
            error: updated.error,
            completedAt: updated.completed_at,
          }
        : null,
    })
  } catch (err: any) {
    console.error('[production/agent/[jobId]] DELETE error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to cancel Production Agent job' },
      { status: 500 }
    )
  }
}
