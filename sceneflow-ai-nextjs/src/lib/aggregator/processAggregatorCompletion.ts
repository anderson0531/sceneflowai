import { moderateKlingVideoBuffer } from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo } from '@/lib/storage/gcsAssets'
import { AssetProvenanceService } from '@/services/AssetProvenanceService'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import { getAggregatorAdapter } from './adapters'
import { downloadVideoUrl } from './generateVideoWithAggregator'
import { getAggregatorJob, updateAggregatorJob } from './jobStore'
import type { AggregatorJobRecord, AggregatorWebhookPayload } from './types'
import { CreditHold } from '@/models'
import { settleAsyncJobBilling } from '@/lib/credits/meteredGateway'
import { getAggregatorCreditsForModel, getAggregatorModel } from './modelRegistry'

async function resolveAggregatorBillingContext(job: AggregatorJobRecord): Promise<{
  holdId: string | null
  runId: string | null
  userId: string
  credits: number
  cogsUsd: number
  model: string
}> {
  const jobMeta = job as unknown as Record<string, unknown>
  let hold: CreditHold | null = null
  try {
    const directHoldId = typeof jobMeta.billingHoldId === 'string' ? jobMeta.billingHoldId : null
    if (directHoldId) {
      hold = await CreditHold.findByPk(directHoldId)
    }
    if (!hold) {
      hold = await CreditHold.findOne({
        where: {
          status: 'pending',
          ref: `agg_job:${job.jobId}`,
        },
        order: [['created_at', 'DESC']],
      })
    }
  } catch (err) {
    console.warn('[AggregatorWebhook] Failed to look up pending CreditHold:', err)
  }

  const holdMeta = (hold?.meta || {}) as Record<string, unknown>
  const model =
    (typeof holdMeta.billingModel === 'string' && holdMeta.billingModel) ||
    job.videoModel ||
    job.vendorModelId ||
    'aggregator_video'
  const aggModel = getAggregatorModel(model)
  const fallbackCredits = getAggregatorCreditsForModel(model, 8)
  const credits =
    hold && Number(hold.amount) > 0
      ? Number(hold.amount)
      : typeof jobMeta.billingCredits === 'number' && jobMeta.billingCredits > 0
        ? jobMeta.billingCredits
        : fallbackCredits
  const cogsUsd =
    typeof holdMeta.billingCogsUsd === 'number'
      ? holdMeta.billingCogsUsd
      : typeof jobMeta.billingCogsUsd === 'number'
        ? jobMeta.billingCogsUsd
        : (aggModel?.costPerSecondUsd ?? 0.08) * 8
  const runId =
    (typeof holdMeta.billingRunId === 'string' && holdMeta.billingRunId) ||
    (typeof jobMeta.billingRunId === 'string' && jobMeta.billingRunId) ||
    null
  const userId =
    hold?.user_id ||
    (typeof jobMeta.billingUserId === 'string' && jobMeta.billingUserId) ||
    job.userId

  return {
    holdId: hold?.id ?? null,
    runId,
    userId,
    credits,
    cogsUsd,
    model,
  }
}

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
    const failReason = payload.error || 'Generation failed'
    const billing = await resolveAggregatorBillingContext(job)
    await settleAsyncJobBilling({
      userId: billing.userId,
      holdId: billing.holdId,
      runId: billing.runId,
      idempotencyKey: `agg_job:${job.jobId}`,
      credits: 0,
      provider: 'aggregator',
      model: billing.model,
      operation: 'aggregator_video',
      estimatedCogsUsd: 0,
      projectId: job.projectId,
      segmentId: job.segmentId,
      succeeded: false,
      providerRequestId: job.jobId,
      errorCode: failReason,
      meta: { vendor: job.vendor },
    })
    await updateAggregatorJob(payload.jobId, {
      status: 'failed',
      error: failReason,
      completedAt: new Date().toISOString(),
    })
    return { error: failReason }
  }

  if (payload.status !== 'completed' || !payload.videoUrl) {
    await updateAggregatorJob(payload.jobId, { status: payload.status })
    return {}
  }

  const billing = await resolveAggregatorBillingContext(job)

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

    // Capture escrowed credits (or charge idempotently) BEFORE marking asset completed
    await settleAsyncJobBilling({
      userId: billing.userId,
      holdId: billing.holdId,
      runId: billing.runId,
      idempotencyKey: `agg_job:${job.jobId}`,
      credits: billing.credits,
      provider: 'aggregator',
      model: billing.model,
      operation: 'aggregator_video',
      estimatedCogsUsd: billing.cogsUsd,
      projectId: job.projectId,
      segmentId: job.segmentId,
      succeeded: true,
      providerRequestId: job.jobId,
      meta: { vendor: job.vendor, assetUrl },
    })

    await updateAggregatorJob(payload.jobId, {
      status: 'completed',
      assetUrl,
      completedAt: new Date().toISOString(),
    })

    return { assetUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Processing failed'
    await settleAsyncJobBilling({
      userId: billing.userId,
      holdId: billing.holdId,
      runId: billing.runId,
      idempotencyKey: `agg_job:${job.jobId}`,
      credits: 0,
      provider: 'aggregator',
      model: billing.model,
      operation: 'aggregator_video',
      estimatedCogsUsd: 0,
      projectId: job.projectId,
      segmentId: job.segmentId,
      succeeded: false,
      providerRequestId: job.jobId,
      errorCode: msg,
      meta: { vendor: job.vendor },
    })
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
