import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { runScenePolishStep } from '@/lib/jobs/scenePolishWorker'

export const runtime = 'nodejs'
export const maxDuration = 180

function authorize(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'
  return req.headers.get('x-internal-job') === secret
}

/**
 * Internal worker: acknowledges first, then runs polish in `after()`.
 *
 * Does **not** fetch this same route for the next hop — Vercel recursion
 * protection returns `508 INFINITE_LOOP_DETECTED`. Further progress is driven
 * by browser ticks to `POST /api/vision/polish-scene/step`.
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let jobId: string | undefined
  try {
    const body = await req.json()
    jobId = typeof body?.jobId === 'string' ? body.jobId : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const acceptedJobId = jobId

  after(async () => {
    try {
      await runScenePolishStep(acceptedJobId)
    } catch (err) {
      console.error(`[Scene Polish] Step failed for job ${acceptedJobId}:`, err)
    }
  })

  return NextResponse.json({ accepted: true, jobId: acceptedJobId }, { status: 202 })
}
