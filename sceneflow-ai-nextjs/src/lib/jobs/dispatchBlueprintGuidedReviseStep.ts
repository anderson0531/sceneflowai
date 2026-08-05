/**
 * Dispatch one blueprint guided-revise worker step over HTTP.
 *
 * Each invocation gets its own serverless isolate, so memory never accumulates
 * across LLM calls. Vercel terminates a function once its response is sent, so
 * the outbound request must be awaited inside `after()` rather than fired and
 * forgotten — otherwise the chain silently dies and the job stalls.
 */

import { after } from 'next/server'

function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

export async function postBlueprintGuidedReviseStep(jobId: string): Promise<void> {
  const url = `${resolveAppUrl()}/api/internal/jobs/blueprint-guided-revise/step`
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-job': secret,
      },
      body: JSON.stringify({ jobId }),
    })
    if (!res.ok) {
      console.error(
        `[BlueprintGuidedRevise] Step dispatch returned ${res.status} for job ${jobId}`
      )
    }
  } catch (err) {
    console.error('[BlueprintGuidedRevise] Step dispatch failed:', err)
  }
}

/** Queue the next step so it survives until after the current response is sent. */
export function scheduleBlueprintGuidedReviseStep(jobId: string): void {
  try {
    after(() => postBlueprintGuidedReviseStep(jobId))
  } catch {
    // Outside a request lifecycle (e.g. scripts) — fall back to a direct call.
    void postBlueprintGuidedReviseStep(jobId)
  }
}
