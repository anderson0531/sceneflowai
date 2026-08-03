/**
 * Image generation client — Vertex Imagen / Gemini image only.
 * Legacy name `generateImageWithGemini` preserved for existing route imports.
 */

import { generateImageWithGemini as generateImageWithVertexImagen } from '@/lib/gemini/imageClient.vertex'

interface ReferenceImage {
  referenceId: number
  imageUrl?: string
  base64Image?: string
  subjectDescription?: string
}

type ImagenAspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4'

interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9'
  numberOfImages?: number
  imageSize?: '1K' | '2K' | '4K'
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  referenceImages?: ReferenceImage[]
  negativePrompt?: string
  quality?: 'fast' | 'standard' | 'max'
  skipFaceMesh?: boolean
}

/**
 * Generate image via Vertex Imagen / Gemini image.
 */
export async function generateImageWithGemini(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  return generateImageWithVertexImagen(prompt, options)
}

export type { ImageGenerationOptions, ReferenceImage, ImagenAspectRatio }
