import {
  moderateKlingVideoBuffer,
} from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { downloadKlingVideoUrl, extractKlingVideoId } from './klingDirectClient'
import { getKlingJob, updateKlingJob } from './jobStore'
import type { KlingWebhookPayload } from './types'
import { inngest } from '@/inngest/client'

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

  if (payload.task_status === 'failed') {
    await updateKlingJob(job.jobId, {
      status: 'failed',
      error: payload.task_status_msg || 'Kling generation failed',
    })
    if (job.kind?.startsWith('long_take')) {
      await emitKlingTaskCompleted({
        taskId: payload.task_id,
        status: 'failed',
        error: payload.task_status_msg || 'Kling generation failed',
        klingJobId: job.jobId,
        generationJobId: job.longTake?.generationJobId,
      })
    }
    return { error: payload.task_status_msg || 'Kling generation failed' }
  }

  const videoUrl = payload.task_result?.videos?.[0]?.url
  const videoId =
    payload.task_result?.videos?.[0]?.id ||
    extractKlingVideoId({ task_result: payload.task_result })

  if (!videoUrl) {
    return { error: 'Kling webhook missing video URL' }
  }

  // Long-take intermediate steps: store raw URLs, emit Inngest, skip moderation
  if (job.kind?.startsWith('long_take')) {
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

    await updateKlingJob(job.jobId, {
      status: 'completed',
      assetUrl,
      videoUrl,
      videoId,
    })

    return { assetUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await updateKlingJob(job.jobId, { status: 'failed', error: msg })
    return { error: msg }
  }
}
