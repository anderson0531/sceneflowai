import {
  getAggregatorPollIntervalMs,
  getAggregatorPollTimeoutSec,
  getAggregatorWebhookBaseUrl,
  isAggregatorAsyncEnabled,
} from './config'
import { getDefaultAggregatorModelId } from './modelRegistry'
import {
  submitAggregatorJobWithFailover,
  pollAggregatorJobWithFailover,
} from './dispatch'
import type { AggregatorSubmitResult, AggregatorVideoInput } from './types'
import { saveAggregatorJob } from './jobStore'

export interface GenerateVideoWithAggregatorInput extends AggregatorVideoInput {
  segmentId: string
  projectId: string
  sceneId: string
  userId: string
}

export interface GenerateVideoWithAggregatorSyncResult {
  mode: 'sync'
  videoBuffer: Buffer
  vendor: AggregatorSubmitResult['vendor']
  vendorModelId: string
  jobId: string
}

export interface GenerateVideoWithAggregatorAsyncResult {
  mode: 'async'
  jobId: string
  vendor: AggregatorSubmitResult['vendor']
  vendorModelId: string
}

export type GenerateVideoWithAggregatorResult =
  | GenerateVideoWithAggregatorSyncResult
  | GenerateVideoWithAggregatorAsyncResult

async function downloadVideoUrl(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download aggregator video: ${res.status}`)
  }
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

export async function generateVideoWithAggregator(
  input: GenerateVideoWithAggregatorInput
): Promise<GenerateVideoWithAggregatorResult> {
  const videoModel = input.videoModel || getDefaultAggregatorModelId()
  const aggInput: AggregatorVideoInput = { ...input, videoModel }

  if (isAggregatorAsyncEnabled()) {
    const webhookUrl = `${getAggregatorWebhookBaseUrl()}/api/webhooks/video-aggregator`
    const submit = await submitAggregatorJobWithFailover(aggInput, { webhookUrl })
    await saveAggregatorJob({
      jobId: submit.jobId,
      segmentId: input.segmentId,
      projectId: input.projectId,
      sceneId: input.sceneId,
      userId: input.userId,
      vendor: submit.vendor,
      vendorModelId: submit.vendorModelId,
      videoModel,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return {
      mode: 'async',
      jobId: submit.jobId,
      vendor: submit.vendor,
      vendorModelId: submit.vendorModelId,
    }
  }

  const submit = await submitAggregatorJobWithFailover(aggInput)
  const polled = await pollAggregatorJobWithFailover(submit, {
    intervalMs: getAggregatorPollIntervalMs(),
    timeoutSec: getAggregatorPollTimeoutSec(),
  })

  if (polled.status === 'failed' || !polled.videoUrl) {
    throw new Error(polled.error || 'Aggregator video generation failed')
  }

  const videoBuffer = await downloadVideoUrl(polled.videoUrl)
  return {
    mode: 'sync',
    videoBuffer,
    vendor: submit.vendor,
    vendorModelId: submit.vendorModelId,
    jobId: submit.jobId,
  }
}

export { downloadVideoUrl }
