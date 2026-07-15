/**
 * Studio image client — Fal-hosted Kling O3 (refs) / v3 (text-only).
 * Legacy names preserved for existing imports.
 */

import { isFalKlingImageProvider } from '@/lib/fal/config'
import {
  editKlingImage,
  generateKlingImageTextOnly,
  generateKlingImageWithRefs,
  resolveImageUrlForFal,
} from '@/lib/fal/klingImageClient'
import { mapSimpleRefsToKlingO3 } from '@/lib/fal/klingImagePromptMapper'
import { generateImageWithVertexKlingFallback } from '@/lib/generation/vertexImageWithKlingFallback'
import { editVertexImage, type VertexImageTier, type VertexThinkingLevel } from '@/lib/vertexai/vertexImageClient'

export type ModelTier = VertexImageTier
export type ThinkingLevel = VertexThinkingLevel

export interface GeminiStudioImageOptions {
  prompt: string
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K' | '4K'
  referenceImages?: Array<{
    imageUrl?: string
    base64Image?: string
    mimeType?: string
    name?: string
  }>
  modelTier?: ModelTier
  thinkingLevel?: ThinkingLevel
  negativePrompt?: string
}

export interface GeminiStudioImageResult {
  imageBase64: string
  mimeType: string
  text?: string
}

export interface GeminiStudioEditOptions {
  sourceImage: string
  instruction: string
  referenceImage?: string
  aspectRatio?: GeminiStudioImageOptions['aspectRatio']
  imageSize?: '1K' | '2K'
  editIntent?: 'default' | 'keyframeEnd'
  segmentDurationSeconds?: number
  modelTier?: ModelTier
  thinkingLevel?: ThinkingLevel
  negativePrompt?: string
}

async function resolveRefList(
  refs?: GeminiStudioImageOptions['referenceImages']
): Promise<Array<{ imageUrl: string; name?: string }>> {
  if (!refs?.length) return []
  return Promise.all(
    refs.map(async (ref, idx) => {
      const source = ref.imageUrl || ref.base64Image || ''
      if (!source) {
        throw new Error(`Reference image ${idx + 1} is missing imageUrl/base64Image`)
      }
      const imageUrl = source.startsWith('http')
        ? source
        : await resolveImageUrlForFal(source)
      return { imageUrl, name: ref.name }
    })
  )
}

export async function generateImageWithGeminiStudio(
  options: GeminiStudioImageOptions
): Promise<GeminiStudioImageResult> {
  if (!isFalKlingImageProvider()) {
    const result = await generateImageWithVertexKlingFallback({
      prompt: options.prompt,
      aspectRatio: options.aspectRatio,
      imageSize: options.imageSize,
      referenceImages: options.referenceImages?.map((r) => ({
        imageUrl: r.imageUrl,
        base64Image: r.base64Image,
        mimeType: r.mimeType,
        name: r.name,
      })),
      modelTier: options.modelTier,
      thinkingLevel: options.thinkingLevel,
      negativePrompt: options.negativePrompt,
    })
    return { imageBase64: result.imageBase64, mimeType: result.mimeType, text: result.text }
  }

  const resolvedRefs = await resolveRefList(options.referenceImages)
  if (resolvedRefs.length > 0) {
    const mapped = mapSimpleRefsToKlingO3(options.prompt, resolvedRefs)
    const result = await generateKlingImageWithRefs({
      prompt: mapped.prompt,
      elements: mapped.elements,
      imageUrls: mapped.imageUrls,
      aspectRatio: options.aspectRatio,
      negativePrompt: options.negativePrompt,
    })
    return { imageBase64: result.imageBase64, mimeType: result.mimeType }
  }

  const result = await generateKlingImageTextOnly({
    prompt: options.prompt,
    aspectRatio: options.aspectRatio,
    negativePrompt: options.negativePrompt,
  })
  return { imageBase64: result.imageBase64, mimeType: result.mimeType }
}

export async function editImageWithGeminiStudio(
  options: GeminiStudioEditOptions
): Promise<GeminiStudioImageResult> {
  if (!isFalKlingImageProvider()) {
    const result = await editVertexImage({
      sourceImage: options.sourceImage,
      instruction: options.instruction,
      referenceImage: options.referenceImage,
      aspectRatio: options.aspectRatio,
      imageSize: options.imageSize,
      editIntent: options.editIntent,
      segmentDurationSeconds: options.segmentDurationSeconds,
      modelTier: options.modelTier,
      thinkingLevel: options.thinkingLevel,
      negativePrompt: options.negativePrompt,
    })
    return { imageBase64: result.imageBase64, mimeType: result.mimeType, text: result.text }
  }

  const extraUrls = options.referenceImage ? [options.referenceImage] : undefined
  const result = await editKlingImage({
    sourceImage: options.sourceImage,
    instruction: options.instruction,
    extraImageUrls: extraUrls,
    aspectRatio: options.aspectRatio,
    negativePrompt: options.negativePrompt,
  })
  return { imageBase64: result.imageBase64, mimeType: result.mimeType }
}
