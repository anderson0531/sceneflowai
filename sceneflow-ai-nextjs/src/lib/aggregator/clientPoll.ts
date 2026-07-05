/** Client-side poll for async aggregator jobs (VIDEO_AGGREGATOR_ASYNC=true). */

export async function pollAggregatorJobForAsset(
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<{ assetUrl: string; lastFrameUrl?: string | null }> {
  const intervalMs = options?.intervalMs ?? 5000
  const timeoutMs = options?.timeoutMs ?? 300000
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await fetch(`/api/aggregators/jobs/${encodeURIComponent(jobId)}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { error?: string }).error || `Failed to poll aggregator job (${res.status})`
      )
    }
    const job = (await res.json()) as {
      status?: string
      assetUrl?: string
      lastFrameUrl?: string | null
      error?: string
    }
    if (job.status === 'completed' && job.assetUrl) {
      return { assetUrl: job.assetUrl, lastFrameUrl: job.lastFrameUrl ?? null }
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Multiplatform video generation failed')
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Multiplatform video generation timed out waiting for completion')
}
