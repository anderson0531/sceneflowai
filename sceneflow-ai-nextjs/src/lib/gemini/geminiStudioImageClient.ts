/**
 * Studio image client — Vertex Imagen / Gemini image only.
 * Legacy names preserved for existing imports.
 */

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

export async function generateImageWithGeminiStudio(
  options: GeminiStudioImageOptions
): Promise<GeminiStudioImageResult> {
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

export async function editImageWithGeminiStudio(
  options: GeminiStudioEditOptions
): Promise<GeminiStudioImageResult> {
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
