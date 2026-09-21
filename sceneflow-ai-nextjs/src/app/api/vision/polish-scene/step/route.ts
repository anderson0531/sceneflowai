import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { getJobForUser } from '@/lib/jobs/jobService'
import { runScenePolishStep } from '@/lib/jobs/scenePolishWorker'

export const runtime = 'nodejs'
export const maxDuration = 180

/**
 * Advance Scene Polish: one analyze+persist invocation.
 *
 * The vision page calls this while polling. Vercel recursion protection returns
 * 508 when a serverless function fetches itself (internal step→step chaining).
 * Client-driven ticks are fresh browser-originated requests. The worker is
 * lease-guarded, so overlapping calls are safe.
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
    if (!job || job.job_type !== 'scene_polish') {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 })
    }

    const outcome = await runScenePolishStep(jobId)
    return NextResponse.json({ success: !outcome.error, ...outcome })
  } catch (error) {
    console.error('[Scene Polish Step] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to advance polish',
      },
      { status: 500 }
    )
  }
}
