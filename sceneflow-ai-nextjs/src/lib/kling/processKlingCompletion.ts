import {
  moderateKlingVideoBuffer,
} from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { downloadKlingVideoUrl, extractKlingVideoId } from './klingDirectClient'
import { getKlingJob, updateKlingJob } from './jobStore'
import type { KlingJobRecord, KlingWebhookPayload } from './types'
import { inngest } from '@/inngest/client'
import { CreditHold } from '@/models'
import { Op } from 'sequelize'
import { settleAsyncJobBilling } from '@/lib/credits/meteredGateway'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'

async function resolveKlingBillingContext(job: KlingJobRecord): Promise<{
  holdId: string | null
  runId: string | null
  userId: string
  credits: number
  cogsUsd: number
  model: string
  operation: string
}> {
  const jobMeta = job as unknown as Record<string, unknown>
  let hold: CreditHold | null = null
  try {
    const directHoldId = typeof jobMeta.billingHoldId === 'string' ? jobMeta.billingHoldId : null
    if (directHoldId) {
      hold = await CreditHold.findByPk(directHoldId)
    }
    if (!hold) {
      const refCandidates = [`kling_job:${job.jobId}`]
      if (job.taskId && job.taskId !== job.jobId) {
        refCandidates.push(`kling_job:${job.taskId}`)
      }
      hold = await CreditHold.findOne({
        where: {
          status: 'pending',
          ref: refCandidates.length === 1 ? refCandidates[0] : { [Op.in]: refCandidates },
        },
        order: [['created_at', 'DESC']],
      })
    }
  } catch (err) {
    console.warn('[Kling Webhook] Failed to look up pending CreditHold:', err)
  }

  const holdMeta = (hold?.meta || {}) as Record<string, unknown>
  const model =
    (typeof holdMeta.billingModel === 'string' && holdMeta.billingModel) ||
    job.modelName ||
    'kling-v3-omni'
  const fallbackCredits = getKlingCreditsForGeneration({
    model,
    durationSeconds: 10,
  })
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
        : 1.4
  const runId =
    (typeof holdMeta.billingRunId === 'string' && holdMeta.billingRunId) ||
    (typeof jobMeta.billingRunId === 'string' && jobMeta.billingRunId) ||
    null
  const userId =
    hold?.user_id ||
    (typeof jobMeta.billingUserId === 'string' && jobMeta.billingUserId) ||
    job.userId
  const operation =
    (typeof holdMeta.billingOperation === 'string' && holdMeta.billingOperation) ||
    hold?.operation ||
    'kling_omni_1080p_audio'

  return {
    holdId: hold?.id ?? null,
    runId,
    userId,
    credits,
    cogsUsd,
    model,
    operation,
  }
}

async function emitKlingTaskCompleted(args: {
  taskId: string
  videoUrl?: string
  videoId?: string
  status: 'succeed' | 'failed'
  error?: string
  klingJobId: string
  generationJobId?: string
}): Promise<void> {
  try {
    await inngest.send({
      name: 'kling/task.completed',
      data: args,
    })
  } catch (e) {
    console.warn('[Kling Webhook] Failed to emit Inngest kling/task.completed:', e)
  }
}

export async function processKlingWebhookPayload(
  payload: KlingWebhookPayload
): Promise<{ assetUrl?: string; error?: string }> {
  const job = await getKlingJob(payload.task_id)
  if (!job) {
    // Also try lookup by task_id stored on job record
    console.warn('[Kling Webhook] Unknown task_id:', payload.task_id)
    return { error: 'Unknown Kling job' }
  }

  const isLongTakeStep = Boolean(job.kind?.startsWith('long_take'))

  if (payload.task_status === 'failed') {
    const failReason = payload.task_status_msg || 'Kling generation failed'
    if (!isLongTakeStep) {
      const billing = await resolveKlingBillingContext(job)
      await settleAsyncJobBilling({
        userId: billing.userId,
        holdId: billing.holdId,
        runId: billing.runId,
        idempotencyKey: `kling_job:${job.jobId}`,
        credits: 0,
        provider: 'kling',
        model: billing.model,
        operation: billing.operation,
        estimatedCogsUsd: 0,
        projectId: job.projectId,
        segmentId: job.segmentId,
        succeeded: false,
        providerRequestId: payload.task_id,
        errorCode: failReason,
      })
    }
    await updateKlingJob(job.jobId, {
      status: 'failed',
      error: failReason,
    })
    if (isLongTakeStep) {
      await emitKlingTaskCompleted({
        taskId: payload.task_id,
        status: 'failed',
        error: failReason,
        klingJobId: job.jobId,
        generationJobId: job.longTake?.generationJobId,
      })
    }
    return { error: failReason }
  }

  const videoUrl = payload.task_result?.videos?.[0]?.url
  const videoId =
    payload.task_result?.videos?.[0]?.id ||
    extractKlingVideoId({ task_result: payload.task_result })

  if (!videoUrl) {
    return { error: 'Kling webhook missing video URL' }
  }

  // Long-take intermediate steps: store raw URLs, emit Inngest, skip moderation & billing
  // (overall long-take hold is settled by processKlingLongTake in Inngest)
  if (isLongTakeStep) {
    await updateKlingJob(job.jobId, {
      status: 'completed',
      videoUrl,
      videoId,
    })
    await emitKlingTaskCompleted({
      taskId: payload.task_id,
      videoUrl,
      videoId,
      status: 'succeed',
      klingJobId: job.jobId,
      generationJobId: job.longTake?.generationJobId,
    })
    return { assetUrl: videoUrl }
  }

  const billing = await resolveKlingBillingContext(job)

  try {
    const videoBuffer = await downloadKlingVideoUrl(videoUrl)
    await moderateKlingVideoBuffer(videoBuffer, {
      userId: job.userId,
      projectId: job.projectId,
      sceneId: job.sceneId,
      segmentId: job.segmentId,
    })

    const assetUrl = await uploadVideoToGCS(
      videoBuffer,
      `segments/${job.segmentId}-${Date.now()}.mp4`,
      job.projectId
    )

    // Capture escrowed credits (or charge idempotently) BEFORE marking asset completed
    await settleAsyncJobBilling({
      userId: billing.userId,
      holdId: billing.holdId,
      runId: billing.runId,
      idempotencyKey: `kling_job:${job.jobId}`,
      credits: billing.credits,
      provider: 'kling',
      model: billing.model,
      operation: billing.operation,
      estimatedCogsUsd: billing.cogsUsd,
      projectId: job.projectId,
      segmentId: job.segmentId,
      succeeded: true,
      providerRequestId: payload.task_id,
      meta: { assetUrl, videoId },
    })

    await updateKlingJob(job.jobId, {
      status: 'completed',
      assetUrl,
      videoUrl,
      videoId,
    })

    return { assetUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await settleAsyncJobBilling({
      userId: billing.userId,
      holdId: billing.holdId,
      runId: billing.runId,
      idempotencyKey: `kling_job:${job.jobId}`,
      credits: 0,
      provider: 'kling',
      model: billing.model,
      operation: billing.operation,
      estimatedCogsUsd: 0,
      projectId: job.projectId,
      segmentId: job.segmentId,
      succeeded: false,
      providerRequestId: payload.task_id,
      errorCode: msg,
    })
    await updateKlingJob(job.jobId, { status: 'failed', error: msg })
    return { error: msg }
  }
}
