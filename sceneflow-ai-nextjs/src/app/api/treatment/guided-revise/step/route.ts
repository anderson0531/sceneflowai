import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { getJobForUser } from '@/lib/jobs/jobService'
import { runBlueprintGuidedReviseStep } from '@/lib/jobs/blueprintGuidedReviseWorker'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Advance a full-balance revision by one phase.
 *
 * The dialog calls this while polling. Serverless self-invocation can be dropped
 * once a response is sent, so a client-driven tick guarantees forward progress
 * even when the internal chain is interrupted. Phases are lease-guarded, so
 * repeated and overlapping calls are safe.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    let jobId: string | undefined
    try {
      const body = await request.json()
      jobId = typeof body?.jobId === 'string' ? body.jobId : undefined
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    if (!jobId) {
      return NextResponse.json({ success: false, message: 'jobId is required' }, { status: 400 })
    }

    const job = await getJobForUser(jobId, userId)
    if (!job || job.job_type !== 'blueprint_guided_revise') {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 })
    }

    const outcome = await runBlueprintGuidedReviseStep(jobId)
    return NextResponse.json({ success: !outcome.error, ...outcome })
  } catch (error) {
    console.error('[Guided Revise Step] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to advance revision',
      },
      { status: 500 }
    )
  }
}
