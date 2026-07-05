import { moderateKlingVideoBuffer } from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo } from '@/lib/storage/gcsAssets'
import { AssetProvenanceService } from '@/services/AssetProvenanceService'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import { getAggregatorAdapter } from './adapters'
import { downloadVideoUrl } from './generateVideoWithAggregator'
import { getAggregatorJob, updateAggregatorJob } from './jobStore'
import type { AggregatorWebhookPayload } from './types'

export async function processAggregatorWebhookPayload(
  payload: AggregatorWebhookPayload
): Promise<{ assetUrl?: string; error?: string }> {
  const job = await getAggregatorJob(payload.jobId)
  if (!job) {
    console.warn('[AggregatorWebhook] Unknown job:', payload.jobId)
    return { error: 'Unknown job' }
  }

  if (job.status === 'completed' && job.assetUrl) {
    return { assetUrl: job.assetUrl }
  }

  if (payload.status === 'failed') {
    await updateAggregatorJob(payload.jobId, {
      status: 'failed',
      error: payload.error || 'Generation failed',
      completedAt: new Date().toISOString(),
    })
    return { error: payload.error || 'Generation failed' }
  }

  if (payload.status !== 'completed' || !payload.videoUrl) {
    await updateAggregatorJob(payload.jobId, { status: payload.status })
    return {}
  }

  try {
    const videoBuffer = await downloadVideoUrl(payload.videoUrl)

    await moderateKlingVideoBuffer(videoBuffer, {
      userId: job.userId,
      projectId: job.projectId,
      sceneId: job.sceneId,
      segmentId: job.segmentId,
    })

    const provenanceStamp = await AssetProvenanceService.stampVideoAsset({
      videoBuffer,
      userId: job.userId,
      projectId: job.projectId,
      sceneId: job.sceneId,
      segmentId: job.segmentId,
      generationProvider: 'aggregator',
      wasPolicyFallback: false,
      vertexPolicyAttempts: 0,
      videoModel: job.videoModel,
      aggregatorVendor: job.vendor,
    })

    const assetUrl = await uploadVideo(
      videoBuffer,
      `segments/${job.segmentId}-${Date.now()}.mp4`,
      job.projectId
    )

    await AssetProvenanceService.attachAssetUrl(provenanceStamp.provenanceId, assetUrl)
    await AssetProvenanceService.scheduleC2paSigning({
      provenanceId: provenanceStamp.provenanceId,
      assetUrl,
      contentHash: provenanceStamp.contentHash,
    })

    try {
      await extractAndStoreLastFrame(assetUrl, job.segmentId)
    } catch {
      // non-fatal
    }

    await updateAggregatorJob(payload.jobId, {
      status: 'completed',
      assetUrl,
      completedAt: new Date().toISOString(),
    })

    return { assetUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Processing failed'
    await updateAggregatorJob(payload.jobId, {
      status: 'failed',
      error: msg,
      completedAt: new Date().toISOString(),
    })
    return { error: msg }
  }
}

export function parseAggregatorWebhookFromVendor(
  vendor: string,
  body: unknown,
  headers: Headers,
  rawBody: string
): AggregatorWebhookPayload | null {
  const adapter = getAggregatorAdapter(vendor as never)
  if (!adapter.verifyWebhookSignature(headers, rawBody)) {
    if (process.env.NODE_ENV === 'production') return null
  }
  return adapter.parseWebhook(body)
}
