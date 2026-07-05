import { createHmac, timingSafeEqual } from 'crypto'
import {
  getAggregatorApiKey,
  getAggregatorBaseUrl,
  getAggregatorWebhookSecret,
} from '../config'
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

function mapDuration(seconds?: number): number {
  if (seconds == null) return 5
  if (seconds <= 5) return 5
  if (seconds <= 7) return 6
  return 8
}

function mapAspectRatio(ratio?: string): string {
  return ratio === '9:16' ? '9:16' : '16:9'
}

function mapGenerationType(method: VideoGenerationMethod, hasStart: boolean): string {
  if (method === 'I2V' || method === 'FTV' || method === 'EXT' || hasStart) return 'image-to-video'
  if (method === 'REF') return 'reference-to-video'
  return 'text-to-video'
}

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000
const modelCache = new Map<string, { at: number; models: string[] }>()

async function fetchModelCatalog(type: string): Promise<string[]> {
  const apiKey = getAggregatorApiKey('renderful')
  if (!apiKey) return []
  const cached = modelCache.get(type)
  if (cached && Date.now() - cached.at < MODEL_CACHE_TTL_MS) return cached.models

  const baseUrl = getAggregatorBaseUrl('renderful')
  const res = await fetch(`${baseUrl}/models?type=${encodeURIComponent(type)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return cached?.models ?? []
  const data = (await res.json()) as { models?: Array<{ id?: string }> }
  const models = (data.models || []).map((m) => m.id || '').filter(Boolean)
  modelCache.set(type, { at: Date.now(), models })
  return models
}

function normalizeModelId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Resolve a configured model id against Renderful's live catalog so stale/dotted
 * ids (e.g. kling/kling-2.6) self-heal to the real id (kling/kling-v2-6) instead
 * of failing the whole job with "Unsupported model". Returns the configured id
 * unchanged when the catalog is unavailable (best-effort), or throws a clear
 * error listing candidates when the model genuinely isn't offered.
 */
function resolveCatalogModel(configured: string, available: string[]): string {
  if (available.length === 0) return configured
  if (available.includes(configured)) return configured

  const target = normalizeModelId(configured)
  const exact = available.find((m) => normalizeModelId(m) === target)
  if (exact) return exact

  const family = configured.split('/')[0]
  const configuredVersions = configured.match(/\d+/g) || []
  const sameFamily = available.filter((m) => m.split('/')[0] === family)

  if (sameFamily.length > 0 && configuredVersions.length > 0) {
    const scored = sameFamily
      .map((m) => {
        const versions = m.match(/\d+/g) || []
        const shared = configuredVersions.filter((v) => versions.includes(v)).length
        return { m, shared }
      })
      .filter((s) => s.shared > 0)
      .sort((a, b) => b.shared - a.shared)
    if (scored.length > 0) return scored[0].m
  }

  const sample = available.slice(0, 12).join(', ')
  throw new AggregatorHttpError(
    `Renderful does not offer model "${configured}". Available: ${sample}${
      available.length > 12 ? ', …' : ''
    }`,
    400,
    'renderful'
  )
}

export const renderfulAdapter: VideoAggregatorAdapter = {
  vendor: 'renderful',

  mapMethodToModel(method: VideoGenerationMethod, modelId: string): string {
    const entry = getAggregatorModel(modelId)
    return entry?.renderfulModel || entry?.vendorModelId || modelId
  },

  async listModels(): Promise<string[]> {
    return fetchModelCatalog('text-to-video')
  },

  async submitJob(
    input: AggregatorVideoInput,
    options?: AggregatorSubmitOptions
  ): Promise<AggregatorSubmitResult> {
    const apiKey = getAggregatorApiKey('renderful')
    if (!apiKey) throw new Error('VIDEO_AGGREGATOR_API_KEY not configured')

    const hasStart = !!input.startFrameUrl?.trim()
    const type = mapGenerationType(input.method, hasStart)

    const configuredModelId = this.mapMethodToModel(input.method, input.videoModel)
    const catalog = await fetchModelCatalog(type).catch(() => [] as string[])
    const vendorModelId = resolveCatalogModel(configuredModelId, catalog)
    const body: Record<string, unknown> = {
      type,
      model: vendorModelId,
      input: {
        prompt: input.prompt,
        aspect_ratio: mapAspectRatio(input.aspectRatio),
        duration: mapDuration(input.durationSeconds),
      },
    }
    if (input.negativePrompt?.trim()) {
      ;(body.input as Record<string, unknown>).negative_prompt = input.negativePrompt.trim()
    }
    if (hasStart) {
      ;(body.input as Record<string, unknown>).image_url = input.startFrameUrl
    }
    if (options?.webhookUrl) {
      body.webhook_url = options.webhookUrl
      body.webhook = options.webhookUrl
    }

    const baseUrl = getAggregatorBaseUrl('renderful')
    const res = await fetch(`${baseUrl}/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new AggregatorHttpError(
        `Renderful submit failed: ${errText}`,
        res.status,
        'renderful'
      )
    }

    const data = (await res.json()) as { id?: string; data?: { id?: string } }
    const jobId = data.id || data.data?.id
    if (!jobId) throw new Error('Renderful did not return a generation id')

    return { jobId, vendor: 'renderful', vendorModelId }
  },

  async pollJob(jobId: string): Promise<AggregatorPollResult> {
    const apiKey = getAggregatorApiKey('renderful')
    if (!apiKey) throw new Error('VIDEO_AGGREGATOR_API_KEY not configured')

    const baseUrl = getAggregatorBaseUrl('renderful')
    const res = await fetch(`${baseUrl}/generations/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new AggregatorHttpError(`Renderful poll failed: ${errText}`, res.status, 'renderful')
    }

    const data = (await res.json()) as {
      status?: string
      outputs?: string[]
      error?: string
      data?: { status?: string; outputs?: string[]; error?: string }
    }
    const statusRaw = (data.status || data.data?.status || '').toLowerCase()
    const outputs = data.outputs || data.data?.outputs

    if (statusRaw === 'completed' || statusRaw === 'succeed' || statusRaw === 'success') {
      const videoUrl = outputs?.[0]
      if (!videoUrl) return { status: 'failed', error: 'No output URL in completed job' }
      return { status: 'completed', videoUrl }
    }
    if (statusRaw === 'failed' || statusRaw === 'error') {
      return {
        status: 'failed',
        error: data.error || data.data?.error || 'Renderful generation failed',
      }
    }
    return { status: 'processing' }
  },

  parseWebhook(body: unknown): AggregatorWebhookPayload | null {
    if (!body || typeof body !== 'object') return null
    const b = body as {
      event?: string
      data?: { id?: string; status?: string; outputs?: string[]; error?: string; model?: string }
    }
    const data = b.data
    if (!data?.id) return null
    const statusRaw = (data.status || '').toLowerCase()
    let status: AggregatorPollResult['status'] = 'processing'
    if (statusRaw === 'completed' || statusRaw === 'succeed') status = 'completed'
    else if (statusRaw === 'failed' || statusRaw === 'error') status = 'failed'

    return {
      jobId: data.id,
      status,
      videoUrl: data.outputs?.[0],
      error: data.error,
      vendorModelId: data.model,
    }
  },

  verifyWebhookSignature(headers: Headers, rawBody: string): boolean {
    const secret = getAggregatorWebhookSecret()
    if (!secret) return process.env.NODE_ENV !== 'production'
    const sig =
      headers.get('x-renderful-signature') ||
      headers.get('x-webhook-signature') ||
      headers.get('x-signature')
    if (!sig) return false
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return sig === expected || sig === `sha256=${expected}`
    }
  },
}
