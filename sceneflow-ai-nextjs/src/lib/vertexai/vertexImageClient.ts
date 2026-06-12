/**
 * Vertex AI image generation (production media path).
 * - Gemini Image on Vertex for reference-heavy / multimodal prompts
 * - Imagen 4 / Imagen 3 via callVertexAIImagen for text-only tiers
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import {
  getImagenModel,
  getImagen4Model,
  DEFAULT_IMAGE_QUALITY,
  type ImagenQualityTier,
} from '@/lib/config/modelConfig'
import { getGeminiSafetyThreshold } from '@/lib/vertexai/safety'

export type VertexImageTier = 'eco' | 'designer' | 'director'
export type VertexThinkingLevel = 'low' | 'high'

const GEMINI_IMAGE_TIER_CONFIG = {
  eco: { model: 'gemini-2.5-flash-image', maxResolution: '2K' },
  designer: { model: 'gemini-3-pro-image-preview', maxResolution: '4K' },
  director: { model: 'gemini-3-pro-image-preview', maxResolution: '4K' },
} as const

let proModelRateLimitedUntil: number | null = null
const RATE_LIMIT_COOLDOWN_MS = 60_000
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 10_000
const REQUEST_TIMEOUT_MS = 90_000

async function sleepWithBackoff(attempt: number): Promise<void> {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS)
  const jitter = Math.random() * 500
  await new Promise((r) => setTimeout(r, delay + jitter))
}

function getVertexImageConfig() {
  const projectId = process.env.VERTEX_PROJECT_ID
  const location = process.env.VERTEX_IMAGE_LOCATION || process.env.VERTEX_LOCATION || 'us-central1'
  if (!projectId) throw new Error('VERTEX_PROJECT_ID not configured')
  return { projectId, location }
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
      const response = await fetch(ref.imageUrl)
      if (!response.ok) throw new Error(`Failed to download reference: HTTP ${response.status}`)
      const contentType = response.headers.get('content-type')
      if (contentType) mimeType = contentType.split(';')[0].trim()
      base64Data = Buffer.from(await response.arrayBuffer()).toString('base64')
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
    tier !== 'eco' && proModelRateLimitedUntil != null && Date.now() < proModelRateLimitedUntil

  let model: string
  if (tier === 'eco' || useFlashFallback) {
    model = GEMINI_IMAGE_TIER_CONFIG.eco.model
  } else {
    model =
      process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL || GEMINI_IMAGE_TIER_CONFIG.designer.model
  }

  const { projectId, location } = getVertexImageConfig()
  const isPreview = model.includes('preview')
  const apiVersion = isPreview ? 'v1beta1' : 'v1'
  const baseUrl =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`
  const endpoint = `${baseUrl}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`

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
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: getGeminiSafetyThreshold() },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: getGeminiSafetyThreshold() },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: getGeminiSafetyThreshold() },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: getGeminiSafetyThreshold() },
    ],
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
    if (error instanceof Error && error.name === 'AbortError' && retryCount < MAX_RETRIES) {
      await sleepWithBackoff(retryCount)
      return generateVertexGeminiImage(options, retryCount + 1)
    }
    throw error
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 429 && model.includes('pro-image') && !useFlashFallback) {
      proModelRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
      return generateVertexGeminiImage(options, 0)
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
      (errorText.includes('NOT_FOUND') || errorText.includes('not found'))
    ) {
      console.warn(
        `[Vertex Gemini Image] Model ${model} unavailable (404), falling back to ${GEMINI_IMAGE_TIER_CONFIG.eco.model}`
      )
      return generateVertexGeminiImage({ ...options, modelTier: 'eco' }, 0)
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
    throw new Error(`Image generation blocked: ${data.promptFeedback.blockReason}`)
  }

  const candidates = data.candidates
  if (!candidates?.length) throw new Error('No image generated from Vertex Gemini Image')

  const content = candidates[0].content
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

  if (!imageBase64) throw new Error('No image in Vertex Gemini Image response')

  return {
    imageBase64,
    mimeType: imageMimeType,
    text: responseText,
    provider: 'vertex',
    modelId: model,
  }
}

/**
 * Unified Vertex image entry — routes by reference presence and tier.
 */
export async function generateVertexImage(
  options: GenerateVertexImageOptions
): Promise<VertexImageResult> {
  const hasRefs = (options.referenceImages?.length ?? 0) > 0
  if (hasRefs) {
    return generateVertexGeminiImage(options)
  }

  const tier = options.modelTier || 'designer'
  const quality: ImagenQualityTier =
    tier === 'eco' ? 'fast' : tier === 'director' ? 'standard' : DEFAULT_IMAGE_QUALITY

  const useImagen4 = process.env.VERTEX_USE_IMAGEN_4 !== 'false'
  const modelId = useImagen4
    ? getImagen4Model(quality)
    : getImagenModel(quality, false)

  const aspect =
    options.aspectRatio === '21:9'
      ? '16:9'
      : (options.aspectRatio as '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | undefined) || '16:9'

  const dataUrl = await callVertexAIImagen(options.prompt, {
    aspectRatio: aspect,
    numberOfImages: 1,
    modelQuality: quality === 'capability' ? 'standard' : quality,
    modelId,
  })

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid Imagen response format')

  return {
    imageBase64: match[2],
    mimeType: match[1],
    provider: 'vertex',
    modelId,
  }
}

export interface VertexImageEditOptions {
  sourceImage: string
  instruction: string
  referenceImage?: string
  aspectRatio?: GenerateVertexImageOptions['aspectRatio']
  imageSize?: '1K' | '2K'
  editIntent?: 'default' | 'keyframeEnd' | 'preVisEdit'
  segmentDurationSeconds?: number
  modelTier?: VertexImageTier
  thinkingLevel?: VertexThinkingLevel
  negativePrompt?: string
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
