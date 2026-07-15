/**
 * Fal-hosted Kling image generation (O3 Omni for references, v3 for text-only).
 */

import { fal } from '@fal-ai/client'
import {
  ensureFalConfigured,
  getFalKlingImageModel,
  getFalKlingImageO3Model,
} from './config'
import { runFalKlingImage } from './klingPolicyClient'

export type KlingImageAspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'

export interface KlingImageElement {
  frontal_image_url: string
  reference_image_urls?: string[]
}

export interface GenerateKlingImageWithRefsOptions {
  prompt: string
  elements?: KlingImageElement[]
  imageUrls?: string[]
  aspectRatio?: KlingImageAspectRatio | string
  numImages?: number
  negativePrompt?: string
}

export interface KlingImageGenerationResult {
  imageBase64: string
  mimeType: string
  provider: 'fal-kling-o3' | 'fal-kling-v3'
  modelId: string
}

function mapAspectRatio(ratio?: string): string {
  if (ratio === '9:16') return '9:16'
  if (ratio === '1:1') return '1:1'
  if (ratio === '4:3') return '4:3'
  if (ratio === '3:4') return '3:4'
  if (ratio === '21:9') return '21:9'
  return '16:9'
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  const images = d.images as Array<{ url?: string }> | undefined
  if (images?.[0]?.url) return images[0].url
  if (typeof d.image_url === 'string') return d.image_url
  const image = d.image as { url?: string } | undefined
  if (typeof image?.url === 'string') return image.url
  return undefined
}

/** Resolve a URL, data URI, or raw base64 to a public URL Fal can fetch. */
export async function resolveImageUrlForFal(source: string): Promise<string> {
  const trimmed = source.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  ensureFalConfigured()
  let base64 = trimmed
  let mime = 'image/png'
  const dataMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/)
  if (dataMatch) {
    mime = dataMatch[1]
    base64 = dataMatch[2]
  }
  const buffer = Buffer.from(base64, 'base64')
  const blob = new Blob([buffer], { type: mime })
  return fal.storage.upload(blob)
}

async function downloadFalImageUrl(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(imageUrl)
  if (!res.ok) {
    throw new Error(`Fal image download failed: ${res.status}`)
  }
  const mimeType = res.headers.get('content-type')?.split(';')[0].trim() || 'image/png'
  const buffer = Buffer.from(await res.arrayBuffer())
  return { base64: buffer.toString('base64'), mimeType }
}

function appendNegativePrompt(prompt: string, negativePrompt?: string): string {
  if (!negativePrompt?.trim()) return prompt
  return `${prompt.trim()}\n\nAvoid: ${negativePrompt.trim()}`
}

function truncatePrompt(text: string, max = 2500): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

/**
 * O3 Omni image-to-image with elements + labeled reference images.
 */
export async function generateKlingImageWithRefs(
  options: GenerateKlingImageWithRefsOptions
): Promise<KlingImageGenerationResult> {
  ensureFalConfigured()

  const elements = options.elements ?? []
  const imageUrls = [...(options.imageUrls ?? [])]

  const resolvedElements: KlingImageElement[] = []
  for (const element of elements) {
    const frontal = await resolveImageUrlForFal(element.frontal_image_url)
    const refs = element.reference_image_urls?.length
      ? await Promise.all(element.reference_image_urls.map((url) => resolveImageUrlForFal(url)))
      : undefined
    resolvedElements.push({
      frontal_image_url: frontal,
      ...(refs?.length ? { reference_image_urls: refs } : {}),
    })
  }

  const resolvedImageUrls = await Promise.all(imageUrls.map((url) => resolveImageUrlForFal(url)))

  // O3 requires at least one image_url; promote first element frontal when only elements exist.
  if (resolvedImageUrls.length === 0 && resolvedElements.length > 0) {
    resolvedImageUrls.push(resolvedElements[0].frontal_image_url)
  }

  if (resolvedImageUrls.length === 0) {
    throw new Error('Kling O3 image generation requires at least one reference image URL')
  }

  const prompt = truncatePrompt(appendNegativePrompt(options.prompt, options.negativePrompt))
  const input: Record<string, unknown> = {
    prompt,
    image_urls: resolvedImageUrls,
    aspect_ratio: mapAspectRatio(options.aspectRatio),
    num_images: options.numImages ?? 1,
    result_type: 'single',
  }
  if (resolvedElements.length > 0) {
    input.elements = resolvedElements
  }

  const modelId = getFalKlingImageO3Model()
  const result = await fal.subscribe(modelId, { input, logs: false })
  const outputUrl = extractImageUrl(result.data)
  if (!outputUrl) {
    throw new Error('Fal Kling O3 image completed without image URL')
  }

  const downloaded = await downloadFalImageUrl(outputUrl)
  return {
    imageBase64: downloaded.base64,
    mimeType: downloaded.mimeType,
    provider: 'fal-kling-o3',
    modelId,
  }
}

/** Text-only image generation via Kling v3 on Fal. */
export async function generateKlingImageTextOnly(options: {
  prompt: string
  aspectRatio?: string
  negativePrompt?: string
}): Promise<KlingImageGenerationResult> {
  const modelId = getFalKlingImageModel()
  const prompt = appendNegativePrompt(options.prompt, options.negativePrompt)
  const buf = await runFalKlingImage({
    prompt,
    negative_prompt: undefined,
    aspect_ratio: mapAspectRatio(options.aspectRatio),
  })
  return {
    imageBase64: buf.toString('base64'),
    mimeType: 'image/png',
    provider: 'fal-kling-v3',
    modelId,
  }
}

/** Edit / end-frame generation: source frame as @Image1 with optional extra refs. */
export async function editKlingImage(options: {
  sourceImage: string
  instruction: string
  extraImageUrls?: string[]
  aspectRatio?: string
  negativePrompt?: string
}): Promise<KlingImageGenerationResult> {
  const sourceUrl = await resolveImageUrlForFal(options.sourceImage)
  const extraUrls = options.extraImageUrls?.length
    ? await Promise.all(options.extraImageUrls.map((url) => resolveImageUrlForFal(url)))
    : []

  const prompt = truncatePrompt(
    appendNegativePrompt(
      `@Image1 ${options.instruction.trim()}`,
      options.negativePrompt
    )
  )

  return generateKlingImageWithRefs({
    prompt,
    imageUrls: [sourceUrl, ...extraUrls],
    aspectRatio: options.aspectRatio,
    negativePrompt: undefined,
  })
}
