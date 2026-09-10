import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { runReferenceExpressStep } from '@/lib/jobs/referenceExpressWorker'

export const runtime = 'nodejs'
// One cast item generates, enhances and vision-analyses a portrait; the
// interactive character route budgets the same 300s for that work.
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'
  return req.headers.get('x-internal-job') === secret
}

/**
 * Internal worker: one reference image per invocation.
 *
 * Acknowledges first, then runs the item in `after()`. Does **not** fetch this
 * same route for the next hop — Vercel recursion protection returns
 * `508 INFINITE_LOOP_DETECTED` when a function self-fetches via `x-vercel-id`.
 * Further items are driven by browser ticks to
 * `POST /api/vision/references/express/step`.
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
      await runReferenceExpressStep(acceptedJobId)
    } catch (err) {
      // The worker already marks the job failed and notifies the user; this is
      // the last chance to see it in logs, since nobody awaits this callback.
      console.error(`[ReferenceExpress] Step failed for job ${acceptedJobId}:`, err)
    }
  })

  return NextResponse.json({ accepted: true, jobId: acceptedJobId }, { status: 202 })
}
