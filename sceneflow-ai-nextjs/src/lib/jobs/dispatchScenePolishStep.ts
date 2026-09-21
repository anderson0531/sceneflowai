/**
 * Dispatch one Scene Polish worker step over HTTP.
 *
 * Mirrors `dispatchScriptAnalysisStep`: each invocation gets its own isolate,
 * and the outbound request is awaited inside `after()` because Vercel kills a
 * function as soon as its response is sent. Only the handshake is awaited —
 * the worker acknowledges before running Gemini.
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

export async function postScenePolishStep(jobId: string): Promise<void> {
  const url = `${resolveAppUrl()}/api/internal/jobs/scene-polish/step`
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
      // Client-driven /api/vision/polish-scene/step ticks continue the job.
      console.error(
        `[Scene Polish] Step dispatch returned ${res.status} for job ${jobId} url=${url} body=${body}`
      )
    }
  } catch (err) {
    console.error('[Scene Polish] Step dispatch failed:', err)
  }
}

/** Queue a step so the dispatch survives until after the current response is sent. */
export function scheduleScenePolishStep(jobId: string): void {
  try {
    after(() => postScenePolishStep(jobId))
  } catch {
    void postScenePolishStep(jobId)
  }
}
