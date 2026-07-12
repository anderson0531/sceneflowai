/** Client-side poll for async Kling jobs (KLING_ASYNC=true). */

export async function pollKlingJobForAsset(
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<{ assetUrl: string; status: string }> {
  const intervalMs = options?.intervalMs ?? 5000
  const timeoutMs = options?.timeoutMs ?? 300_000
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await fetch(`/api/kling/jobs/${encodeURIComponent(jobId)}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { error?: string }).error || `Failed to poll Kling job (${res.status})`
      )
    }
    const job = (await res.json()) as {
      status?: string
      assetUrl?: string
      error?: string
    }
    if (job.status === 'completed' && job.assetUrl) {
      return { assetUrl: job.assetUrl, status: 'completed' }
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Kling job failed')
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Kling job polling timed out')
}
