import { getAggregatorApiKey, getAggregatorBaseUrl } from '../config'
import { getAggregatorModel } from '../modelRegistry'
import type {
  AggregatorPollResult,
  AggregatorSubmitOptions,
  AggregatorSubmitResult,
  AggregatorVideoInput,
  AggregatorWebhookPayload,
  VideoAggregatorAdapter,
} from '../types'
import { AggregatorHttpError } from '../types'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

function mapDuration(seconds?: number): 5 | 10 {
  return seconds != null && seconds >= 8 ? 10 : 5
}

function mapAspectRatio(ratio?: string): string {
  return ratio === '9:16' ? '9:16' : '16:9'
}

export const polloAdapter: VideoAggregatorAdapter = {
  vendor: 'pollo',

  mapMethodToModel(method: VideoGenerationMethod, modelId: string): string {
    const entry = getAggregatorModel(modelId)
    return entry?.polloEndpoint || entry?.vendorModelId || modelId
  },

  async submitJob(
    input: AggregatorVideoInput,
    _options?: AggregatorSubmitOptions
  ): Promise<AggregatorSubmitResult> {
    const apiKey = getAggregatorApiKey('pollo')
    if (!apiKey) throw new Error('VIDEO_AGGREGATOR_FAILOVER_API_KEY not configured')

    const endpoint = this.mapMethodToModel(input.method, input.videoModel)
    const baseUrl = getAggregatorBaseUrl('pollo')
    const path = endpoint.startsWith('/') ? endpoint : `/generation/${endpoint}`

    const body: Record<string, unknown> = {
      prompt: input.prompt,
      aspectRatio: mapAspectRatio(input.aspectRatio),
      duration: mapDuration(input.durationSeconds),
    }
    if (input.negativePrompt?.trim()) body.negativePrompt = input.negativePrompt.trim()
    if (input.startFrameUrl?.trim()) body.imageUrl = input.startFrameUrl

    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new AggregatorHttpError(`Pollo submit failed: ${errText}`, res.status, 'pollo')
    }

    const data = (await res.json()) as {
      taskId?: string
      task_id?: string
      data?: { taskId?: string; task_id?: string }
    }
    const jobId =
      data.taskId || data.task_id || data.data?.taskId || data.data?.task_id
    if (!jobId) throw new Error('Pollo did not return a task id')

    return { jobId, vendor: 'pollo', vendorModelId: endpoint }
  },

  async pollJob(jobId: string): Promise<AggregatorPollResult> {
    const apiKey = getAggregatorApiKey('pollo')
    if (!apiKey) throw new Error('VIDEO_AGGREGATOR_FAILOVER_API_KEY not configured')

    const baseUrl = getAggregatorBaseUrl('pollo')
    const res = await fetch(
      `${baseUrl}/generation/${encodeURIComponent(jobId)}/status`,
      { headers: { 'X-API-KEY': apiKey } }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new AggregatorHttpError(`Pollo poll failed: ${errText}`, res.status, 'pollo')
    }

    const data = (await res.json()) as {
      status?: string
      url?: string
      videoUrl?: string
      result?: { url?: string; videoUrl?: string }
      error?: string
    }
    const statusRaw = (data.status || '').toLowerCase()

    if (statusRaw === 'succeed' || statusRaw === 'success' || statusRaw === 'completed') {
      const videoUrl =
        data.url || data.videoUrl || data.result?.url || data.result?.videoUrl
      if (!videoUrl) return { status: 'failed', error: 'No video URL in Pollo response' }
      return { status: 'completed', videoUrl }
    }
    if (statusRaw === 'failed' || statusRaw === 'error') {
      return { status: 'failed', error: data.error || 'Pollo generation failed' }
    }
    return { status: 'processing' }
  },

  parseWebhook(_body: unknown): AggregatorWebhookPayload | null {
    return null
  },

  verifyWebhookSignature(): boolean {
    return false
  },
}
