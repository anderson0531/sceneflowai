import {
  moderateKlingVideoBuffer,
} from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { downloadKlingVideoUrl } from './klingDirectClient'
import { getKlingJob, updateKlingJob } from './jobStore'
import type { KlingWebhookPayload } from './types'

export async function processKlingWebhookPayload(
  payload: KlingWebhookPayload
): Promise<{ assetUrl?: string; error?: string }> {
  const job = await getKlingJob(payload.task_id)
  if (!job) {
    console.warn('[Kling Webhook] Unknown task_id:', payload.task_id)
    return { error: 'Unknown Kling job' }
  }

  if (payload.task_status === 'failed') {
    await updateKlingJob(job.jobId, {
      status: 'failed',
      error: payload.task_status_msg || 'Kling generation failed',
    })
    return { error: payload.task_status_msg || 'Kling generation failed' }
  }

  const videoUrl =
    payload.task_result?.videos?.[0]?.url
  if (!videoUrl) {
    return { error: 'Kling webhook missing video URL' }
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
    })

    return { assetUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await updateKlingJob(job.jobId, { status: 'failed', error: msg })
    return { error: msg }
  }
}
