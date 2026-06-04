/**
 * @deprecated Use @/lib/vertexai/vertexImageClient — Studio (generativelanguage.googleapis.com) retired for production media.
 * Thin compatibility shim for existing imports.
 */

import {
  generateImageWithVertexKlingFallback,
} from '@/lib/generation/vertexImageWithKlingFallback'
import {
  editVertexImage,
  type VertexImageTier,
  type VertexThinkingLevel,
  type VertexReferenceImage,
  type VertexImageResult,
} from '@/lib/vertexai/vertexImageClient'

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

function toVertexRefs(
  refs?: GeminiStudioImageOptions['referenceImages']
): VertexReferenceImage[] | undefined {
  return refs?.map((r) => ({
    imageUrl: r.imageUrl,
    base64Image: r.base64Image,
    mimeType: r.mimeType,
    name: r.name,
  }))
}

function mapResult(r: VertexImageResult): GeminiStudioImageResult {
  return { imageBase64: r.imageBase64, mimeType: r.mimeType, text: r.text }
}

/** @deprecated Use generateVertexImage / generateImageWithVertexKlingFallback */
export async function generateImageWithGeminiStudio(
  options: GeminiStudioImageOptions
): Promise<GeminiStudioImageResult> {
  const result = await generateImageWithVertexKlingFallback({
    prompt: options.prompt,
    aspectRatio: options.aspectRatio,
    imageSize: options.imageSize,
    referenceImages: toVertexRefs(options.referenceImages),
    modelTier: options.modelTier,
    thinkingLevel: options.thinkingLevel,
    negativePrompt: options.negativePrompt,
  })
  return mapResult(result)
}

/** @deprecated Use editVertexImage */
export async function editImageWithGeminiStudio(
  options: GeminiStudioEditOptions
): Promise<GeminiStudioImageResult> {
  return mapResult(
    await editVertexImage({
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
  )
}
