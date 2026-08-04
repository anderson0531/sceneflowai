/**
 * Fire-and-forget dispatch for one blueprint guided-revise worker step.
 * Each HTTP invocation gets its own serverless isolate (unlike after() on a warm instance).
 */

function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

export function scheduleBlueprintGuidedReviseStep(jobId: string): void {
  const url = `${resolveAppUrl()}/api/internal/jobs/blueprint-guided-revise/step`
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-job': secret,
    },
    body: JSON.stringify({ jobId }),
  }).catch((err) => {
    console.error('[BlueprintGuidedRevise] Failed to schedule worker step:', err)
  })
}
