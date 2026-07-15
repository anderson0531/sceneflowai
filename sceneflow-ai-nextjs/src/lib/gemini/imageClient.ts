/**
 * Image generation client — Fal-hosted Kling (O3 for refs, v3 text-only).
 * Legacy name `generateImageWithGemini` preserved for existing route imports.
 */

import { isFalKlingImageProvider } from '@/lib/fal/config'
import {
  generateKlingImageTextOnly,
  generateKlingImageWithRefs,
  resolveImageUrlForFal,
} from '@/lib/fal/klingImageClient'
import { mapSimpleRefsToKlingO3 } from '@/lib/fal/klingImagePromptMapper'
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

function toDataUrl(base64: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`
}

/**
 * Generate image via Fal Kling (default) or legacy Vertex Imagen when IMAGE_PROVIDER=vertex.
 */
export async function generateImageWithGemini(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  if (!isFalKlingImageProvider()) {
    return generateImageWithVertexImagen(prompt, options)
  }

  const hasRefs = options.referenceImages && options.referenceImages.length > 0
  console.log(`[Kling Image] Generating (${hasRefs ? 'O3 refs' : 'v3 text-only'})...`)

  if (hasRefs) {
    const refs = await Promise.all(
      options.referenceImages!.slice(0, 4).map(async (ref, idx) => {
        const source = ref.imageUrl || ref.base64Image || ''
        const imageUrl = source.startsWith('http')
          ? source
          : await resolveImageUrlForFal(source)
        return {
          imageUrl,
          name: ref.subjectDescription || `Reference ${idx + 1}`,
        }
      })
    )
    const mapped = mapSimpleRefsToKlingO3(prompt, refs)
    const result = await generateKlingImageWithRefs({
      prompt: mapped.prompt,
      elements: mapped.elements,
      imageUrls: mapped.imageUrls,
      aspectRatio: options.aspectRatio,
      negativePrompt: options.negativePrompt,
    })
    return toDataUrl(result.imageBase64, result.mimeType)
  }

  const result = await generateKlingImageTextOnly({
    prompt,
    aspectRatio: options.aspectRatio,
    negativePrompt: options.negativePrompt,
  })
  return toDataUrl(result.imageBase64, result.mimeType)
}

export type { ImageGenerationOptions, ReferenceImage, ImagenAspectRatio }
