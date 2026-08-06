import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { runBlueprintGuidedReviseStep } from '@/lib/jobs/blueprintGuidedReviseWorker'
import { postBlueprintGuidedReviseStep } from '@/lib/jobs/dispatchBlueprintGuidedReviseStep'

export const runtime = 'nodejs'
export const maxDuration = 120

function authorize(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'
  return req.headers.get('x-internal-job') === secret
}

/**
 * Internal worker: one planner/rewrite/finalize step per invocation.
 *
 * The step is acknowledged before it runs. Running it inline instead would hold
 * the caller open for the whole phase, and because the caller is itself a step
 * doing the same thing, every function in the chain stayed alive until the last
 * one finished — which is how a full-balance revision timed out the 60s start
 * route. Acknowledging first bounds each invocation to its own phase.
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
      const outcome = await runBlueprintGuidedReviseStep(acceptedJobId)
      if (!outcome.done && !outcome.error && !outcome.inFlight) {
        // Awaited directly rather than through scheduleBlueprintGuidedReviseStep:
        // the next hop acknowledges immediately, so this waits on a handshake
        // instead of on that hop's phase. Nesting another `after()` here is what
        // chained the lifetimes together.
        await postBlueprintGuidedReviseStep(acceptedJobId)
      }
    } catch (err) {
      // The worker already marks the job failed and notifies the user; this is
      // the last chance to see it in logs, since nobody awaits this callback.
      console.error(
        `[BlueprintGuidedRevise] Step failed for job ${acceptedJobId}:`,
        err
      )
    }
  })

  return NextResponse.json({ accepted: true, jobId: acceptedJobId }, { status: 202 })
}
