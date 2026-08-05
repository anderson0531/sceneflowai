/**
 * Image Editing Client for SceneFlow AI
 *
 * Vertex AI Imagen endpoints (including `imagen-3.0-capability-001`) were retired on
 * 2026-06-30, so editing now runs on Gemini Image via `editVertexImage`:
 * 1. Instruction-Based Editing - natural language edit, source sent as a reference image
 * 2. Outpainting - target aspect ratio passed through Gemini's imageConfig
 * 3. Mask-Based Editing (Inpainting) - unsupported; Gemini has no user-mask equivalent
 *
 * SERVER-SIDE ONLY - Do not import this file in client components
 *
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { EditMode, AspectRatioPreset } from '@/types/imageEdit'
import { editVertexImage } from '@/lib/vertexai/vertexImageClient'

// Re-export types for API route usage
export type { EditMode, AspectRatioPreset }

/** Thrown when an edit mode has no Gemini Image equivalent. */
export class ImageEditUnsupportedError extends Error {
  readonly mode: EditMode

  constructor(mode: EditMode, reason: string) {
    super(reason)
    this.name = 'ImageEditUnsupportedError'
    this.mode = mode
  }
}

export interface InstructionEditOptions {
  /** The source image to edit (base64 or URL) */
  sourceImage: string
  /** Natural language instruction for the edit (e.g., "Change the suit to a tuxedo") */
  instruction: string
  /** Optional: Subject reference image for identity consistency */
  subjectReference?: {
    imageUrl: string
    description: string
  }
}

export interface MaskEditOptions {
  /** The source image to edit (base64 or URL) */
  sourceImage: string
  /** Binary mask image (black = keep, white = edit) - base64 or URL */
  maskImage: string
  /** Prompt describing what to generate in the masked area */
  prompt: string
  /** Optional negative prompt */
  negativePrompt?: string
}

export interface OutpaintOptions {
  /** The source image to expand (base64 or URL) */
  sourceImage: string
  /** Target aspect ratio for the expanded image */
  targetAspectRatio: AspectRatioPreset
  /** Prompt describing the expanded areas */
  prompt: string
  /** Optional negative prompt */
  negativePrompt?: string
}

export interface EditResult {
  /** The edited image as a data URL */
  imageDataUrl: string
  /** Original image for comparison */
  originalImageUrl: string
  /** Edit mode used */
  mode: EditMode
  /** Success status */
  success: boolean
  /** Error message if failed */
  error?: string
  /** True when the mode is not supported by the current provider */
  unsupported?: boolean
}

// ============================================================================
// Instruction-Based Editing (Gemini Image)
// ============================================================================

/**
 * Edit image using a natural language instruction.
 *
 * @example
 * await editImageWithInstruction({
 *   sourceImage: 'https://example.com/man-in-suit.jpg',
 *   instruction: 'Remove the glasses'
 * })
 */
export async function editImageWithInstruction(
  options: InstructionEditOptions
): Promise<EditResult> {
  const { sourceImage, instruction, subjectReference } = options

  console.log('[Image Edit] Starting instruction-based edit with Gemini Image...')
  console.log('[Image Edit] Instruction:', instruction.substring(0, 100))

  try {
    const result = await editVertexImage({
      sourceImage,
      instruction,
      ...(subjectReference?.imageUrl
        ? {
            referenceImages: [
              {
                imageUrl: subjectReference.imageUrl,
                name: subjectReference.description || 'identity reference',
              },
            ],
          }
        : {}),
    })

    console.log(`[Image Edit] Instruction edit completed via ${result.modelId}`)

    return {
      imageDataUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
      originalImageUrl: sourceImage,
      mode: 'instruction',
      success: true,
    }
  } catch (error: any) {
    console.error('[Image Edit] Instruction edit failed:', error.message)
    return {
      imageDataUrl: '',
      originalImageUrl: sourceImage,
      mode: 'instruction',
      success: false,
      error: error.message,
    }
  }
}

// ============================================================================
// Mask-Based Editing (unsupported after Imagen retirement)
// ============================================================================

/**
 * Mask-based inpainting is unavailable. It required `imagen-3.0-capability-001`
 * (`MASK_MODE_USER_PROVIDED`), which was retired on 2026-06-30, and Gemini Image
 * has no user-supplied mask equivalent.
 */
export async function inpaintImage(options: MaskEditOptions): Promise<EditResult> {
  const reason =
    'Mask-based inpainting is unavailable: the Imagen capability endpoint was retired on 2026-06-30 and Gemini Image does not accept user-provided masks. Use instruction-based editing instead.'
  console.warn('[Image Edit] Inpainting requested but unsupported')
  return {
    imageDataUrl: '',
    originalImageUrl: options.sourceImage,
    mode: 'inpaint',
    success: false,
    unsupported: true,
    error: reason,
  }
}

// ============================================================================
// Outpainting (Gemini Image aspect-ratio expansion)
// ============================================================================

/**
 * Expand image to a new aspect ratio. Gemini Image receives the source as a
 * reference and the target ratio via imageConfig, filling new areas from the prompt.
 *
 * @example
 * await outpaintImage({
 *   sourceImage: 'https://example.com/portrait.jpg', // 1:1
 *   targetAspectRatio: '16:9',
 *   prompt: 'A modern office interior with large windows'
 * })
 */
export async function outpaintImage(options: OutpaintOptions): Promise<EditResult> {
  const { sourceImage, targetAspectRatio, prompt, negativePrompt } = options

  console.log('[Image Edit] Starting outpainting with Gemini Image...')
  console.log('[Image Edit] Target aspect ratio:', targetAspectRatio)

  try {
    const result = await editVertexImage({
      sourceImage,
      instruction:
        `${prompt}. Seamlessly expand the existing image to fill a ${targetAspectRatio} frame. ` +
        'Keep the original content unchanged and only generate the newly revealed areas.',
      aspectRatio: targetAspectRatio,
      ...(negativePrompt ? { negativePrompt } : {}),
    })

    console.log(`[Image Edit] Outpainting completed via ${result.modelId}`)

    return {
      imageDataUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
      originalImageUrl: sourceImage,
      mode: 'outpaint',
      success: true,
    }
  } catch (error: any) {
    console.error('[Image Edit] Outpainting failed:', error.message)
    return {
      imageDataUrl: '',
      originalImageUrl: sourceImage,
      mode: 'outpaint',
      success: false,
      error: error.message,
    }
  }
}
