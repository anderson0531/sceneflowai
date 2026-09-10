/**
 * Dispatch one Reference Express worker step over HTTP.
 *
 * The fallback path for when Inngest is not configured. Mirrors
 * `dispatchScriptAnalysisStep`: each invocation gets its own isolate, and the
 * outbound request is awaited inside `after()` because Vercel kills a function
 * as soon as its response is sent, which would otherwise break the chain and
 * stall the job.
 *
 * Only the handshake is awaited — the worker route acknowledges a step before
 * running it, so step lifetimes never nest.
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

export async function postReferenceExpressStep(jobId: string): Promise<void> {
  const url = `${resolveAppUrl()}/api/internal/jobs/reference-express/step`
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-job': secret,
        ...(bypass ? { 'x-vercel-protection-bypass': bypass } : {}),
      },
      body: JSON.stringify({ jobId }),
    })
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300)
      // 508 = Vercel recursion protection (function self-fetch via x-vercel-id).
      // Client-driven /api/vision/references/express/step ticks continue the job.
      console.error(
        `[ReferenceExpress] Step dispatch returned ${res.status} for job ${jobId} url=${url} body=${body}`
      )
    }
  } catch (err) {
    console.error('[ReferenceExpress] Step dispatch failed:', err)
  }
}

/** Queue a step so the dispatch survives until after the current response is sent. */
export function scheduleReferenceExpressStep(jobId: string): void {
  try {
    after(() => postReferenceExpressStep(jobId))
  } catch {
    // Outside a request lifecycle (e.g. scripts) — fall back to a direct call.
    void postReferenceExpressStep(jobId)
  }
}
