/**
 * Image Generation Client (Vertex)
 *
 * All Vertex Imagen endpoints were retired 2026-06-30 and now return 404, so this
 * client delegates to Gemini Image on Vertex (`generateContent`):
 * - gemini-2.5-flash-image (GA) for the fast tier
 * - gemini-3-pro-image-preview for the standard tier, with automatic fallback to flash
 *
 * The exported name `generateImageWithGemini` and its data-URL return value are kept
 * so existing route imports continue to work unchanged.
 */

import { generateVertexGeminiImage } from '@/lib/vertexai/vertexImageClient'
import {
  DEFAULT_IMAGE_QUALITY,
  geminiImageTierForQuality,
  type ModelQuality,
} from '@/lib/config/modelConfig'

interface ReferenceImage {
  referenceId: number
  imageUrl?: string
  base64Image?: string
  subjectDescription?: string
}

type ImagenAspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4'

const GEMINI_IMAGE_ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
] as const

type GeminiImageAspectRatio = (typeof GEMINI_IMAGE_ASPECT_RATIOS)[number]

function resolveAspectRatio(
  ratio?: ImageGenerationOptions['aspectRatio']
): GeminiImageAspectRatio {
  const requested = ratio || '16:9'
  return GEMINI_IMAGE_ASPECT_RATIOS.includes(requested as GeminiImageAspectRatio)
    ? (requested as GeminiImageAspectRatio)
    : '16:9'
}

interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9'
  numberOfImages?: number
  imageSize?: '1K' | '2K' | '4K'
  /** Gemini Image has no personGeneration parameter; 'dont_allow' is enforced via prompt. */
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  referenceImages?: ReferenceImage[]
  negativePrompt?: string
  quality?: ModelQuality
  /** No-op on Gemini Image (Imagen FACE_MESH control reference is gone). */
  skipFaceMesh?: boolean
}

const NO_PEOPLE_INSTRUCTION =
  'Do not depict any people, faces, human figures, or identifiable persons in this image.'

/**
 * Generate an image via Gemini Image on Vertex.
 *
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, reference images, etc.)
 * @returns Base64-encoded image data URL
 */
export async function generateImageWithGemini(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const referenceImages = options.referenceImages ?? []
  const hasReferenceImages = referenceImages.length > 0
  const quality = options.quality || DEFAULT_IMAGE_QUALITY
  const modelTier = geminiImageTierForQuality(quality, hasReferenceImages)

  let finalPrompt = prompt
  if (options.personGeneration === 'dont_allow') {
    finalPrompt = `${finalPrompt}\n\n${NO_PEOPLE_INSTRUCTION}`
  }

  const aspectRatio = resolveAspectRatio(options.aspectRatio)
  if (options.aspectRatio && options.aspectRatio !== aspectRatio) {
    console.log(
      `[Vertex Gemini Image] Mapped unsupported aspect ratio ${options.aspectRatio} -> ${aspectRatio}`
    )
  }

  console.log(
    `[Vertex Gemini Image] Generating (tier=${modelTier}, refs=${referenceImages.length}, aspect=${aspectRatio})`
  )

  const result = await generateVertexGeminiImage({
    prompt: finalPrompt,
    aspectRatio,
    ...(options.imageSize ? { imageSize: options.imageSize } : {}),
    ...(options.negativePrompt ? { negativePrompt: options.negativePrompt } : {}),
    modelTier,
    ...(hasReferenceImages
      ? {
          referenceImages: referenceImages.map((ref) => ({
            ...(ref.imageUrl ? { imageUrl: ref.imageUrl } : {}),
            ...(ref.base64Image ? { base64Image: ref.base64Image } : {}),
            ...(ref.subjectDescription ? { name: ref.subjectDescription } : {}),
          })),
        }
      : {}),
  })

  console.log(`[Vertex Gemini Image] Image generated successfully via ${result.modelId}`)
  return `data:${result.mimeType};base64,${result.imageBase64}`
}

export type { ImageGenerationOptions, ReferenceImage, ImagenAspectRatio }
