import { NextRequest, NextResponse } from 'next/server'
import { runBlueprintGuidedReviseStep } from '@/lib/jobs/blueprintGuidedReviseWorker'
import { scheduleBlueprintGuidedReviseStep } from '@/lib/jobs/dispatchBlueprintGuidedReviseStep'

export const runtime = 'nodejs'
export const maxDuration = 120

function authorize(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'
  return req.headers.get('x-internal-job') === secret
}

/**
 * Internal worker: one planner/rewrite/finalize step per invocation.
 * Chains to itself so each LLM call runs in a fresh serverless isolate.
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

  const outcome = await runBlueprintGuidedReviseStep(jobId)

  if (!outcome.done && !outcome.error && !outcome.inFlight) {
    scheduleBlueprintGuidedReviseStep(jobId)
  }

  return NextResponse.json(outcome)
}
