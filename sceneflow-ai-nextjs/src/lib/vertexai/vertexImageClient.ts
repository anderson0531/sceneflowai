/**
 * Vertex AI image generation (production media path).
 *
 * All Imagen endpoints were retired 2026-06-30, so every image request — with or
 * without reference images — goes through Gemini Image on Vertex (generateContent).
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'
import { getGeminiImageSafetySettings } from '@/lib/vertexai/safety'
import { MAX_REFERENCE_IMAGES_ECO } from '@/lib/vision/referenceLimits'

export type VertexImageTier = 'eco' | 'designer' | 'director'
export type VertexThinkingLevel = 'low' | 'high'

const GEMINI_IMAGE_TIER_CONFIG = {
  eco: { model: GEMINI_IMAGE_MODELS.flash, maxResolution: '2K' },
  designer: { model: GEMINI_IMAGE_MODELS.pro, maxResolution: '4K' },
  director: { model: GEMINI_IMAGE_MODELS.pro, maxResolution: '4K' },
} as const

let proModelRateLimitedUntil: number | null = null
const RATE_LIMIT_COOLDOWN_MS = 60_000
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 10_000
/** Identity-ref 429 ladder — longer than generic backoff to avoid stampeding Startup quota. */
const IDENTITY_REF_RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const
const REQUEST_TIMEOUT_MS = 90_000

/** Marker so scene route does not re-burst another full outer×inner 429 ladder. */
export const IDENTITY_REF_RATE_LIMIT_EXHAUSTED =
  'identity-ref rate limit exhausted'

function referenceCountExceedsEcoCap(referenceImages?: VertexReferenceImage[]): boolean {
  return (referenceImages?.length ?? 0) > MAX_REFERENCE_IMAGES_ECO
}

function hasIdentityReferenceImages(options: GenerateVertexImageOptions): boolean {
  return (options.referenceImages?.length ?? 0) > 0
}

function canFallbackToEcoTier(options: GenerateVertexImageOptions): boolean {
  // Identity / wardrobe lock jobs must stay on the pro image model. A warm-instance
  // 429 cooldown previously forced flash, which then rate-limited and still hit
  // IMAGE_SAFETY (production 2026-08-07 Scene Headshot logs).
  if (hasIdentityReferenceImages(options)) return false
  return !referenceCountExceedsEcoCap(options.referenceImages)
}

async function sleepWithBackoff(attempt: number): Promise<void> {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS)
  const jitter = Math.random() * 500
  await new Promise((r) => setTimeout(r, delay + jitter))
}

function parseRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get('retry-after')
  if (!raw?.trim()) return null
  const asSeconds = Number(raw)
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.min(60_000, Math.max(1_000, asSeconds * 1000))
  }
  const asDate = Date.parse(raw)
  if (Number.isFinite(asDate)) {
    const delta = asDate - Date.now()
    if (delta > 0) return Math.min(60_000, Math.max(1_000, delta))
  }
  return null
}

async function sleepIdentityRefBackoff(
  attempt: number,
  response?: Response
): Promise<void> {
  const retryAfter = response ? parseRetryAfterMs(response) : null
  const scheduled =
    IDENTITY_REF_RETRY_DELAYS_MS[
      Math.min(attempt, IDENTITY_REF_RETRY_DELAYS_MS.length - 1)
    ] ?? 30_000
  const delay = retryAfter != null ? Math.max(retryAfter, scheduled) : scheduled
  const jitter = Math.random() * 750
  await new Promise((r) => setTimeout(r, delay + jitter))
}

function getVertexImageConfig() {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location =
    process.env.VERTEX_IMAGE_LOCATION ||
    process.env.VERTEX_LOCATION ||
    process.env.GCP_REGION ||
    'us-central1'
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for image generation')
  }
  return { projectId, location }
}

/** Resolve Vertex location + endpoint for Gemini image models (Gemini 3 preview -> global only). */
export function resolveVertexGeminiImageEndpoint(args: {
  model: string
  projectId: string
  regionalLocation: string
}): { endpoint: string; effectiveLocation: string; apiVersion: string } {
  const isGemini3 = args.model.includes('gemini-3')
  const effectiveLocation = isGemini3 ? 'global' : args.regionalLocation
  const isPreview = args.model.includes('preview')
  const apiVersion = isPreview ? 'v1beta1' : 'v1'
  const baseUrl =
    effectiveLocation === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${effectiveLocation}-aiplatform.googleapis.com`
  const endpoint = `${baseUrl}/${apiVersion}/projects/${args.projectId}/locations/${effectiveLocation}/publishers/google/models/${args.model}:generateContent`
  return { endpoint, effectiveLocation, apiVersion }
}

export interface VertexReferenceImage {
  imageUrl?: string
  base64Image?: string
  mimeType?: string
  name?: string
}

export interface GenerateVertexImageOptions {
  prompt: string
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K' | '4K'
  referenceImages?: VertexReferenceImage[]
  modelTier?: VertexImageTier
  thinkingLevel?: VertexThinkingLevel
  negativePrompt?: string
}

export interface VertexImageResult {
  imageBase64: string
  mimeType: string
  text?: string
  provider: 'vertex'
  modelId: string
}

async function buildMultimodalParts(
  fullPrompt: string,
  referenceImages?: VertexReferenceImage[]
): Promise<Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: fullPrompt },
  ]

  if (!referenceImages?.length) return parts

  for (const ref of referenceImages) {
    let base64Data = ref.base64Image
    let mimeType = ref.mimeType || 'image/jpeg'

    if (!base64Data && ref.imageUrl) {
      const downloaded = await fetchReferenceImageAsBase64(ref.imageUrl, { label: ref.name })
      base64Data = downloaded.base64
      mimeType = downloaded.mimeType
    }

    if (!base64Data) continue
    if (base64Data.includes(',')) base64Data = base64Data.split(',')[1] || base64Data

    const label = ref.name ? `[Reference: ${ref.name}]\n` : ''
    parts.push({ text: label })
    parts.push({ inlineData: { mimeType, data: base64Data } })
  }

  return parts
}

/**
 * Gemini Image on Vertex (multimodal generateContent).
 */
export async function generateVertexGeminiImage(
  options: GenerateVertexImageOptions,
  retryCount = 0
): Promise<VertexImageResult> {
  const tier = options.modelTier || 'designer'
  const useFlashFallback =
    tier !== 'eco' &&
    canFallbackToEcoTier(options) &&
    proModelRateLimitedUntil != null &&
    Date.now() < proModelRateLimitedUntil

  let model: string
  if (tier === 'eco' || useFlashFallback) {
    model = GEMINI_IMAGE_TIER_CONFIG.eco.model
  } else {
    model =
      process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL || GEMINI_IMAGE_TIER_CONFIG.designer.model
  }

  const { projectId, location } = getVertexImageConfig()
  const { endpoint, effectiveLocation } = resolveVertexGeminiImageEndpoint({
    model,
    projectId,
    regionalLocation: location,
  })

  if (model.includes('gemini-3') && effectiveLocation === 'global') {
    console.log(
      `[Vertex Gemini Image] Using global endpoint for ${model} (Gemini 3 image models are not regional)`
    )
  }

  let fullPrompt = options.prompt
  if (options.negativePrompt) {
    fullPrompt += `\n\nAVOID the following in the generated image: ${options.negativePrompt}`
  }

  const parts = await buildMultimodalParts(fullPrompt, options.referenceImages)
  const effectiveImageSize = model.includes('flash-image') ? undefined : options.imageSize

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(options.aspectRatio || effectiveImageSize
        ? {
            imageConfig: {
              ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
              ...(effectiveImageSize && { imageSize: effectiveImageSize }),
            },
          }
        : {}),
    },
    safetySettings: getGeminiImageSafetySettings(),
  }

  const accessToken = await getVertexAIAuthToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      if (model.includes('pro-image') && canFallbackToEcoTier(options)) {
        console.warn(
          `[Vertex Gemini Image] ${model} timed out after ${REQUEST_TIMEOUT_MS}ms, falling back to ${GEMINI_IMAGE_TIER_CONFIG.eco.model}`
        )
        proModelRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return generateVertexGeminiImage({ ...options, modelTier: 'eco' }, 0)
      }
      if (model.includes('pro-image') && referenceCountExceedsEcoCap(options.referenceImages)) {
        console.warn(
          `[Vertex Gemini Image] ${model} timed out with ${options.referenceImages?.length ?? 0} refs (exceeds eco cap ${MAX_REFERENCE_IMAGES_ECO}); retrying pro model`
        )
      }
      if (retryCount < MAX_RETRIES) {
        await sleepWithBackoff(retryCount)
        return generateVertexGeminiImage(options, retryCount + 1)
      }
    }
    throw error
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 429 && model.includes('pro-image')) {
      if (hasIdentityReferenceImages(options)) {
        if (retryCount < MAX_RETRIES) {
          console.warn(
            `[Vertex Gemini Image] Rate limit on ${model} with reference images (attempt ${retryCount + 1}/${MAX_RETRIES}) — backing off without eco fallback`
          )
          await sleepIdentityRefBackoff(retryCount, response)
          return generateVertexGeminiImage(options, retryCount + 1)
        }
        throw new Error(
          `Vertex Gemini Image error ${response.status}: ${IDENTITY_REF_RATE_LIMIT_EXHAUSTED} after ${MAX_RETRIES} retries: ${errorText}`
        )
      }
      if (!useFlashFallback) {
        proModelRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return generateVertexGeminiImage(options, 0)
      }
    }
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      console.warn(
        `[Vertex Gemini Image] Rate limit on ${model} (attempt ${retryCount + 1}/${MAX_RETRIES}). Backing off...`
      )
      await sleepWithBackoff(retryCount)
      return generateVertexGeminiImage(options, retryCount + 1)
    }
    // Pro preview models require allowlist access; fall back to GA flash-image model
    if (
      response.status === 404 &&
      model !== GEMINI_IMAGE_TIER_CONFIG.eco.model &&
      (errorText.includes('NOT_FOUND') || errorText.includes('not found')) &&
      canFallbackToEcoTier(options)
    ) {
      console.warn(
        `[Vertex Gemini Image] Model ${model} unavailable (404), falling back to ${GEMINI_IMAGE_TIER_CONFIG.eco.model}`
      )
      return generateVertexGeminiImage({ ...options, modelTier: 'eco' }, 0)
    }
    if (
      response.status === 404 &&
      model.includes('pro-image') &&
      referenceCountExceedsEcoCap(options.referenceImages)
    ) {
      console.warn(
        `[Vertex Gemini Image] Model ${model} unavailable (404) with ${options.referenceImages?.length ?? 0} refs; cannot fall back to eco (cap ${MAX_REFERENCE_IMAGES_ECO})`
      )
    }
    if (response.status === 503 && retryCount < MAX_RETRIES) {
      await sleepWithBackoff(retryCount)
      return generateVertexGeminiImage(options, retryCount + 1)
    }
    throw new Error(`Vertex Gemini Image error ${response.status}: ${errorText}`)
  }

  if (model.includes('pro-image')) proModelRateLimitedUntil = null

  const data = await response.json()
  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `Image generation blocked by safety: ${data.promptFeedback.blockReason}`
    )
  }

  const candidates = data.candidates
  if (!candidates?.length) {
    const block = data.promptFeedback?.blockReason
    throw new Error(
      block
        ? `Image generation blocked by safety: ${block}`
        : 'No image generated from Vertex Gemini Image (blocked by safety or empty candidates)'
    )
  }

  const candidate = candidates[0]
  const content = candidate.content
  let imageBase64: string | undefined
  let imageMimeType = 'image/png'
  let responseText: string | undefined

  for (const part of content?.parts || []) {
    const inline = part.inlineData || part.inline_data
    if (inline?.data) {
      imageBase64 = inline.data
      imageMimeType = inline.mimeType || inline.mime_type || 'image/png'
    } else if (part.text && !part.thought) {
      responseText = part.text
    }
  }

  if (!imageBase64) {
    const finishReason = String(
      candidate.finishReason || candidate.finish_reason || 'unknown'
    )
    const textSnippet = (responseText || '').slice(0, 200)
    const detail = `model=${model}, finishReason=${finishReason}${
      textSnippet ? `, text=${JSON.stringify(textSnippet)}` : ''
    }`
    // Soft refusals (text-only 200 / SAFETY finish) — mark as safety so sanitize retries run.
    throw new Error(
      `No image in Vertex Gemini Image response — blocked by safety (${detail})`
    )
  }

  return {
    imageBase64,
    mimeType: imageMimeType,
    text: responseText,
    provider: 'vertex',
    modelId: model,
  }
}

/**
 * Unified Vertex image entry. Text-only and reference-based generation both use
 * Gemini Image; the Imagen `:predict` path was removed after the 2026-06-30 retirement.
 */
export async function generateVertexImage(
  options: GenerateVertexImageOptions
): Promise<VertexImageResult> {
  return generateVertexGeminiImage(options)
}

export interface VertexImageEditOptions {
  sourceImage: string
  instruction: string
  referenceImage?: string
  referenceImages?: Array<{ imageUrl: string; name?: string }>
  aspectRatio?: GenerateVertexImageOptions['aspectRatio']
  imageSize?: '1K' | '2K'
  editIntent?: 'default' | 'keyframeEnd' | 'preVisEdit'
  segmentDurationSeconds?: number
  modelTier?: VertexImageTier
  thinkingLevel?: VertexThinkingLevel
  negativePrompt?: string
  /** Appended when identity + wardrobe refs are both sent. */
  dualReferenceInstruction?: string
}

export async function editVertexImage(options: VertexImageEditOptions): Promise<VertexImageResult> {
  const intent = options.editIntent ?? 'default'
  const dur =
    typeof options.segmentDurationSeconds === 'number' &&
    Number.isFinite(options.segmentDurationSeconds)
      ? options.segmentDurationSeconds
      : undefined

  let editPrompt: string
  if (intent === 'keyframeEnd') {
    const durLine =
      dur != null && dur > 0
        ? `END keyframe of a ~${dur}s clip. Primary image is the START frame.`
        : `END keyframe. Primary image is the START frame.`
    editPrompt = `${durLine}\n\nDIRECTED EDIT:\n${options.instruction}\n\nPreserve scene, cast, and lighting continuity.`
  } else if (intent === 'preVisEdit') {
    editPrompt =
      `PRE-VIS STORYBOARD EDIT:\n${options.instruction}\n\n` +
      'Apply a minimal, localized change only. Preserve exact composition, framing, aspect ratio, character identities, and overall scene layout unless the instruction explicitly requires otherwise.'
    if (options.dualReferenceInstruction?.trim()) {
      editPrompt += `\n\n${options.dualReferenceInstruction.trim()}`
    }
  } else {
    editPrompt = `Edit this image: ${options.instruction}\nPreserve identity, framing, and lighting unless the edit requires otherwise.`
  }

  const referenceImages: VertexReferenceImage[] = []

  if (options.sourceImage.startsWith('data:')) {
    const m = options.sourceImage.match(/^data:([^;]+);base64,(.+)$/)
    if (m) referenceImages.push({ base64Image: m[2], mimeType: m[1], name: 'source-to-edit' })
  } else {
    referenceImages.push({ imageUrl: options.sourceImage, name: 'source-to-edit' })
  }

  if (options.referenceImage) {
    if (options.referenceImage.startsWith('data:')) {
      const m = options.referenceImage.match(/^data:([^;]+);base64,(.+)$/)
      if (m) referenceImages.push({ base64Image: m[2], mimeType: m[1], name: 'identity-reference' })
    } else {
      referenceImages.push({ imageUrl: options.referenceImage, name: 'identity-reference' })
    }
  }

  for (const ref of options.referenceImages ?? []) {
    if (!ref.imageUrl?.trim()) continue
    const url = ref.imageUrl.trim()
    if (url.startsWith('data:')) {
      const m = url.match(/^data:([^;]+);base64,(.+)$/)
      if (m) {
        referenceImages.push({
          base64Image: m[2],
          mimeType: m[1],
          name: ref.name || 'reference',
        })
      }
    } else {
      referenceImages.push({ imageUrl: url, name: ref.name || 'reference' })
    }
  }

  return generateVertexGeminiImage({
    prompt: editPrompt,
    aspectRatio: options.aspectRatio || '1:1',
    imageSize: options.imageSize || '1K',
    referenceImages,
    modelTier: options.modelTier,
    thinkingLevel: options.thinkingLevel,
    negativePrompt: options.negativePrompt,
  })
}
