/**
 * Dispatch one Audience Resonance (script_analysis) worker step over HTTP.
 *
 * Each invocation gets its own serverless isolate, so memory never accumulates
 * across LLM calls. Vercel terminates a function once its response is sent, so
 * the outbound request is awaited inside `after()` rather than fired and
 * forgotten — otherwise the chain silently dies and the job stalls.
 *
 * What is awaited is only the *handshake*: the worker route acknowledges a step
 * before running it. Awaiting the phase itself would keep this function alive for
 * the whole phase, and since every step dispatches the next one the same way, the
 * lifetimes nested and the start route timed out waiting on the entire job.
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

export async function postScriptAnalysisStep(jobId: string): Promise<void> {
  const url = `${resolveAppUrl()}/api/internal/jobs/script-analysis/step`
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
      console.error(`[ScriptAnalysis] Step dispatch returned ${res.status} for job ${jobId}`)
    }
  } catch (err) {
    console.error('[ScriptAnalysis] Step dispatch failed:', err)
  }
}

/**
 * Queue a step so the dispatch survives until after the current response is sent.
 *
 * For use from request handlers that are not themselves steps. A step chains its
 * successor by awaiting {@link postScriptAnalysisStep} inside the `after()`
 * it is already running in, rather than nesting another one.
 */
export function scheduleScriptAnalysisStep(jobId: string): void {
  try {
    after(() => postScriptAnalysisStep(jobId))
  } catch {
    // Outside a request lifecycle (e.g. scripts) — fall back to a direct call.
    void postScriptAnalysisStep(jobId)
  }
}
