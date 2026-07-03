/**
 * Shared helpers for Gemini Omni Flash video generation via the Interactions API.
 * Omni models do not support predictLongRunning — they require POST/GET .../interactions.
 */

import {
  type VeoClipDuration,
} from '@/lib/config/modelConfig'

export interface OmniReferenceImage {
  imageUrl?: string
  url?: string
  base64Image?: string
  referenceType?: 'asset' | 'style' | 'ASSET' | 'STYLE'
  type?: 'style' | 'character'
}

export interface OmniInteractionBuildOptions {
  aspectRatio?: '16:9' | '9:16'
  durationSeconds?: VeoClipDuration
  negativePrompt?: string
  startFrame?: string
  lastFrame?: string
  referenceImages?: OmniReferenceImage[]
  /** Prior interaction id for EXT / conversational continuation */
  previousInteractionId?: string
}

export type OmniInteractionInput =
  | string
  | Array<{ type: string; text?: string; data?: string; mime_type?: string; uri?: string }>

/** Format clip duration for request summaries (Omni max is fixed at 10s; not sent in response_format) */
export function formatOmniDuration(seconds: VeoClipDuration): string {
  return `${seconds}s`
}

/** Minimum length before base64/uri blobs are redacted in logs */
const OMNI_LOG_REDACT_MIN_CHARS = 80

/** Deep-clone an interaction payload, replacing large base64/uri blobs for safe logging */
export function redactOmniPayloadForLog(data: unknown): unknown {
  if (data === null || data === undefined) return data
  if (Array.isArray(data)) return data.map(redactOmniPayloadForLog)
  if (typeof data !== 'object') return data

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (
      typeof value === 'string' &&
      (key === 'data' || key === 'uri') &&
      value.length > OMNI_LOG_REDACT_MIN_CHARS
    ) {
      out[key] = `[${key} omitted: ${value.length} chars]`
    } else {
      out[key] = redactOmniPayloadForLog(value)
    }
  }
  return out
}

/** Log interaction response/status without truncating away error details behind base64 */
export function logOmniInteractionPayload(prefix: string, data: Record<string, unknown>): void {
  console.log(
    `${prefix} id=${String(data.id ?? '')} status=${String(data.status ?? '')} error=${JSON.stringify(data.error ?? null)} status_message=${JSON.stringify(data.status_message ?? null)}`
  )
  console.log(`${prefix} payload:`, JSON.stringify(redactOmniPayloadForLog(data)))
}

/** Build a user-visible error from all signals in a failed interaction payload */
export function formatOmniInteractionErrorMessage(
  data: Record<string, unknown>,
  fallback = 'Omni video generation failed',
  formatRai?: (payload: unknown) => string | null
): string {
  const parts: string[] = []

  const err = data.error
  if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>
    if (errObj.message) parts.push(String(errObj.message))
    else parts.push(JSON.stringify(redactOmniPayloadForLog(err)))
  } else if (typeof err === 'string' && err.trim()) {
    parts.push(err)
  }

  if (typeof data.status_message === 'string' && data.status_message.trim()) {
    parts.push(data.status_message)
  }

  const steps = Array.isArray(data.steps) ? data.steps : []
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue
    const stepObj = step as Record<string, unknown>
    if (stepObj.type === 'error' || stepObj.error) {
      parts.push(JSON.stringify(redactOmniPayloadForLog(stepObj)))
    }
  }

  let errMsg = parts.length > 0 ? parts.join(' | ') : fallback

  if (formatRai) {
    const rai = formatRai(data)
    if (rai) errMsg += `\n\nResponsible AI / safety detail:\n${rai}`
  }

  const lower = errMsg.toLowerCase()
  if (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('fixed quota') ||
    lower.includes('not entitled') ||
    lower.includes('allowlist')
  ) {
    errMsg +=
      '\n\nHint: Gemini Omni Flash on Vertex may require fixed-quota allocation and Agent Platform API enablement on your GCP project.'
  }

  if (parts.length === 0) {
    errMsg += `: ${JSON.stringify(redactOmniPayloadForLog(data))}`
  }

  return errMsg
}

/**
 * Normalize build options for Omni limitations:
 * - FTV (start+end frame interpolation) is unsupported — use start frame only (I2V)
 * - EXT without a valid previous_interaction_id is unsupported — omit continuation
 */
export function normalizeOmniInteractionBuildOptions(
  options: OmniInteractionBuildOptions,
  ctx: { isFTV?: boolean; isEXT?: boolean; hasValidPreviousInteraction?: boolean }
): OmniInteractionBuildOptions {
  const normalized = { ...options }

  if (ctx.isFTV && normalized.lastFrame) {
    normalized.lastFrame = undefined
  }

  if (ctx.isEXT && !ctx.hasValidPreviousInteraction) {
    normalized.previousInteractionId = undefined
  }

  return normalized
}

/** Returns true when an operationName refers to an Interactions API resource (not Veo LRO) */
export function isOmniInteractionOperation(operationName: string): boolean {
  if (!operationName || operationName === 'completed') return false
  if (operationName.startsWith('interaction:')) return true
  if (operationName.startsWith('v1_')) return true
  return operationName.includes('/interactions/')
}

/** Normalize interaction id for polling (strip optional prefix) */
export function normalizeOmniInteractionId(operationName: string): string {
  if (operationName.startsWith('interaction:')) {
    return operationName.slice('interaction:'.length)
  }
  return operationName
}

/** Resolve EXT continuation id from legacy veoVideoRef / sourceVideo values */
export function resolveOmniPreviousInteractionId(sourceVideo?: string): string | undefined {
  if (!sourceVideo?.trim()) return undefined
  const ref = sourceVideo.trim()
  if (ref.startsWith('interaction:') || ref.startsWith('v1_') || ref.includes('/interactions/')) {
    return normalizeOmniInteractionId(ref)
  }
  // Legacy files/ refs are not valid Omni continuation handles
  return undefined
}

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = await response.arrayBuffer()
  return {
    base64: Buffer.from(buffer).toString('base64'),
    mimeType: contentType.split(';')[0],
  }
}

async function resolveImageBase64(
  source: string
): Promise<{ base64: string; mimeType: string }> {
  if (source.startsWith('http')) {
    return urlToBase64(source)
  }
  if (source.startsWith('data:')) {
    const match = source.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      return { mimeType: match[1], base64: match[2] }
    }
  }
  return { base64: source, mimeType: 'image/png' }
}

function appendNegativePrompt(prompt: string, negativePrompt?: string): string {
  if (!negativePrompt?.trim()) return prompt
  return `${prompt.trim()}\n\nDo not include: ${negativePrompt.trim()}`
}

function inferOmniVideoTask(options: OmniInteractionBuildOptions): string {
  if (options.previousInteractionId) return 'text_to_video'
  if (options.startFrame && (options.lastFrame || (options.referenceImages?.length ?? 0) > 0)) {
    return 'reference_to_video'
  }
  if (options.startFrame) return 'image_to_video'
  if (options.referenceImages && options.referenceImages.length > 0) return 'reference_to_video'
  return 'text_to_video'
}

/** Build multimodal input array for the Interactions API */
export async function buildOmniInteractionInput(
  prompt: string,
  options: OmniInteractionBuildOptions = {}
): Promise<OmniInteractionInput> {
  const textPrompt = appendNegativePrompt(prompt, options.negativePrompt)
  const parts: Array<{ type: string; text?: string; data?: string; mime_type?: string }> = []

  if (options.startFrame) {
    const { base64, mimeType } = await resolveImageBase64(options.startFrame)
    parts.push({ type: 'image', data: base64, mime_type: mimeType })
  }

  if (options.lastFrame) {
    const { base64, mimeType } = await resolveImageBase64(options.lastFrame)
    parts.push({ type: 'image', data: base64, mime_type: mimeType })
  }

  if (options.referenceImages?.length) {
    for (const ref of options.referenceImages.slice(0, 3)) {
      const imageSource = ref.base64Image || ref.imageUrl || ref.url
      if (!imageSource) continue
      const { base64, mimeType } = await resolveImageBase64(imageSource)
      parts.push({ type: 'image', data: base64, mime_type: mimeType })
    }
  }

  parts.push({ type: 'text', text: textPrompt })

  if (parts.length === 1 && parts[0].type === 'text') {
    return textPrompt
  }
  return parts
}

/** Build Interactions API request body for Omni video generation */
export async function buildOmniInteractionRequestBody(
  model: string,
  prompt: string,
  options: OmniInteractionBuildOptions = {},
  background = true
): Promise<Record<string, unknown>> {
  const task = inferOmniVideoTask(options)
  const input = await buildOmniInteractionInput(prompt, options)

  const body: Record<string, unknown> = {
    model,
    input,
    generation_config: {
      video_config: { task },
    },
    response_format: {
      type: 'video',
      aspect_ratio: options.aspectRatio || '16:9',
      delivery: 'uri',
    },
    background,
  }

  if (options.previousInteractionId) {
    body.previous_interaction_id = normalizeOmniInteractionId(options.previousInteractionId)
  }

  return body
}

export interface ExtractedOmniVideo {
  videoUrl?: string
  videoBase64?: string
  mimeType?: string
  veoVideoRef?: string
  veoVideoRefExpiry?: string
}

function interactionRefFromId(interactionId?: string): string | undefined {
  if (!interactionId) return undefined
  return interactionId.startsWith('interaction:')
    ? interactionId
    : `interaction:${interactionId}`
}

function expiryIso(hours = 48): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

/** Extract video output from a completed Interactions API response */
export function extractVideoFromOmniInteraction(
  data: Record<string, unknown>
): ExtractedOmniVideo | null {
  const interactionId = typeof data.id === 'string' ? data.id : undefined
  const veoVideoRef = interactionRefFromId(interactionId)
  const veoVideoRefExpiry = veoVideoRef ? expiryIso() : undefined

  const steps = Array.isArray(data.steps) ? data.steps : []
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue
    const stepObj = step as Record<string, unknown>
    if (stepObj.type !== 'model_output') continue
    const content = Array.isArray(stepObj.content) ? stepObj.content : []
    for (const item of content) {
      if (!item || typeof item !== 'object') continue
      const contentObj = item as Record<string, unknown>
      if (contentObj.type !== 'video') continue

      const mimeType = typeof contentObj.mime_type === 'string' ? contentObj.mime_type : 'video/mp4'
      if (typeof contentObj.data === 'string' && contentObj.data.length > 0) {
        return {
          videoUrl: `data:${mimeType};base64,${contentObj.data}`,
          videoBase64: contentObj.data,
          mimeType,
          veoVideoRef,
          veoVideoRefExpiry,
        }
      }
      if (typeof contentObj.uri === 'string' && contentObj.uri.length > 0) {
        let extractedRef: string | undefined
        const fileMatch = contentObj.uri.match(/files\/([^/?]+)/)
        if (fileMatch) extractedRef = `files/${fileMatch[1]}`
        return {
          videoUrl: contentObj.uri,
          mimeType,
          veoVideoRef: veoVideoRef ?? extractedRef,
          veoVideoRefExpiry: veoVideoRef ? veoVideoRefExpiry : extractedRef ? expiryIso() : undefined,
        }
      }
    }
  }

  // SDK-only convenience field (some responses may include it)
  const outputVideo = data.output_video as Record<string, unknown> | undefined
  if (outputVideo) {
    const mimeType = typeof outputVideo.mime_type === 'string' ? outputVideo.mime_type : 'video/mp4'
    if (typeof outputVideo.data === 'string') {
      return {
        videoUrl: `data:${mimeType};base64,${outputVideo.data}`,
        videoBase64: outputVideo.data,
        mimeType,
        veoVideoRef,
        veoVideoRefExpiry,
      }
    }
    if (typeof outputVideo.uri === 'string') {
      return {
        videoUrl: outputVideo.uri,
        mimeType,
        veoVideoRef,
        veoVideoRefExpiry,
      }
    }
  }

  return null
}

/** Map Interactions API status string to internal video status */
export function mapOmniInteractionStatus(
  status: string | undefined
): 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'completed') return 'COMPLETED'
  if (normalized === 'failed' || normalized === 'cancelled') return 'FAILED'
  if (normalized === 'in_progress' || normalized === 'processing') return 'PROCESSING'
  return 'PROCESSING'
}
