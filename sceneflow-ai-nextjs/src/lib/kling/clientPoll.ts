import { getKlingJob } from './jobStore'

export async function pollKlingJobForAsset(
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<{ assetUrl: string; status: string }> {
  const intervalMs = options?.intervalMs ?? 5000
  const timeoutMs = options?.timeoutMs ?? 300_000
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const job = await getKlingJob(jobId)
    if (!job) {
      await new Promise((r) => setTimeout(r, intervalMs))
      continue
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
