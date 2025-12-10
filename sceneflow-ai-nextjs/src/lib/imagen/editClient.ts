/**
 * Image Editing Client for SceneFlow AI
 * 
 * Provides two editing approaches:
 * 1. Instruction-Based Editing (Gemini) - Conversational editing without masks
 * 2. Mask-Based Editing (Imagen 3) - Precise pixel control with inpainting/outpainting
 * 
 * SERVER-SIDE ONLY - Do not import this file in client components
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { EditMode, AspectRatioPreset } from '@/types/imageEdit'

// Re-export types for API route usage
export type { EditMode, AspectRatioPreset }

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
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert image URL or data URL to base64
 */
async function imageToBase64(imageSource: string): Promise<string> {
  // Already base64
  if (imageSource.startsWith('data:')) {
    const base64Part = imageSource.split(',')[1]
    return base64Part
  }
  
  // Raw base64 (no data: prefix)
  if (!imageSource.startsWith('http')) {
    return imageSource
  }
  
  // Download from URL
  const response = await fetch(imageSource)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

/**
 * Detect MIME type from base64 or URL
 */
function detectMimeType(imageSource: string): string {
  if (imageSource.startsWith('data:image/png')) return 'image/png'
  if (imageSource.startsWith('data:image/jpeg') || imageSource.startsWith('data:image/jpg')) return 'image/jpeg'
  if (imageSource.startsWith('data:image/webp')) return 'image/webp'
  if (imageSource.includes('.png')) return 'image/png'
  if (imageSource.includes('.webp')) return 'image/webp'
  return 'image/jpeg' // Default
}

// ============================================================================
// Instruction-Based Editing (Imagen 3)
// ============================================================================

/**
 * Edit image using natural language instruction (Imagen 3)
 * No mask required - AI understands context from the instruction
 * Uses Imagen 3's inpainting with auto-generated mask for instruction-based modifications
 * 
 * @example
 * await editImageWithInstruction({
 *   sourceImage: 'https://example.com/man-in-suit.jpg',
 *   instruction: 'Change the suit to a tuxedo'
 * })
 */
export async function editImageWithInstruction(
  options: InstructionEditOptions
): Promise<EditResult> {
  const { sourceImage, instruction, subjectReference } = options
  
  console.log('[Image Edit] Starting instruction-based edit with Imagen 3...')
  console.log('[Image Edit] Instruction:', instruction.substring(0, 100))
  
  try {
    const projectId = process.env.GCP_PROJECT_ID
    const region = process.env.GCP_REGION || 'us-central1'
    
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID not configured')
    }
    
    const accessToken = await getVertexAIAuthToken()
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    
    // Imagen 3 edit endpoint
    const MODEL_ID = 'imagen-3.0-capability-001'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
    
    // Build request body for Imagen 3 editing
    // The prompt should describe the desired result, not just the change
    const editPrompt = `${instruction}. Maintain the overall composition and style of the original image.`
    
    // For instruction-based editing, we provide the image and use 'product-image' edit mode
    // which allows AI-driven modifications based on the prompt without explicit mask
    const requestBody: any = {
      instances: [{
        prompt: editPrompt,
        image: {
          bytesBase64Encoded: sourceBase64
        }
      }],
      parameters: {
        sampleCount: 1,
        // Use 'product-image' mode for AI-driven edits without explicit mask
        // This mode uses the image as reference and applies prompt-based modifications
        editMode: 'product-image',
        safetySetting: 'block_some',
        personGeneration: 'allow_adult'
      }
    }
    
    // Add subject reference for identity consistency if provided
    if (subjectReference) {
      console.log('[Image Edit] Adding subject reference for identity consistency')
      const refBase64 = await imageToBase64(subjectReference.imageUrl)
      
      // Match the working structure from callVertexAIImagen
      requestBody.instances[0].referenceImages = [{
        referenceType: 'REFERENCE_TYPE_SUBJECT',
        referenceId: 1,
        referenceImage: {
          bytesBase64Encoded: refBase64
        },
        subjectImageConfig: {
          subjectType: 'SUBJECT_TYPE_PERSON',
          subjectDescription: subjectReference.description
        }
      }]
    }
    
    console.log('[Image Edit] Calling Imagen 3 API with edit mode: product-image')
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Imagen API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
    if (!imageBytes) {
      throw new Error('No image returned from Imagen edit')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageBytes}`
    
    console.log('[Image Edit] Instruction-based edit completed successfully')
    
    return {
      imageDataUrl: editedImageDataUrl,
      originalImageUrl: sourceImage,
      mode: 'instruction',
      success: true
    }
  } catch (error: any) {
    console.error('[Image Edit] Instruction edit failed:', error.message)
    return {
      imageDataUrl: '',
      originalImageUrl: sourceImage,
      mode: 'instruction',
      success: false,
      error: error.message
    }
  }
}

// ============================================================================
// Mask-Based Editing (Imagen 3 Inpainting)
// ============================================================================

/**
 * Edit image using a binary mask (Imagen 3 Inpainting)
 * White areas in mask will be regenerated based on prompt
 * 
 * @example
 * await inpaintImage({
 *   sourceImage: 'https://example.com/scene.jpg',
 *   maskImage: 'data:image/png;base64,...', // White areas = edit
 *   prompt: 'A beautiful sunset sky'
 * })
 */
export async function inpaintImage(
  options: MaskEditOptions
): Promise<EditResult> {
  const { sourceImage, maskImage, prompt, negativePrompt } = options
  
  console.log('[Image Edit] Starting mask-based inpainting...')
  console.log('[Image Edit] Prompt:', prompt.substring(0, 100))
  
  try {
    const projectId = process.env.GCP_PROJECT_ID
    const region = process.env.GCP_REGION || 'us-central1'
    
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID not configured')
    }
    
    const accessToken = await getVertexAIAuthToken()
    
    // Convert images to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    const maskBase64 = await imageToBase64(maskImage)
    
    // Imagen 3 inpainting endpoint
    const MODEL_ID = 'imagen-3.0-capability-001'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
    
    const requestBody: any = {
      instances: [{
        prompt: prompt,
        image: {
          bytesBase64Encoded: sourceBase64
        },
        mask: {
          image: {
            bytesBase64Encoded: maskBase64
          }
        }
      }],
      parameters: {
        sampleCount: 1,
        editMode: 'inpainting',
        safetySetting: 'block_some',
        personGeneration: 'allow_adult'
      }
    }
    
    if (negativePrompt) {
      requestBody.parameters.negativePrompt = negativePrompt
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Imagen API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
    if (!imageBytes) {
      throw new Error('No image returned from Imagen inpainting')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageBytes}`
    
    console.log('[Image Edit] Inpainting completed successfully')
    
    return {
      imageDataUrl: editedImageDataUrl,
      originalImageUrl: sourceImage,
      mode: 'inpaint',
      success: true
    }
  } catch (error: any) {
    console.error('[Image Edit] Inpainting failed:', error.message)
    return {
      imageDataUrl: '',
      originalImageUrl: sourceImage,
      mode: 'inpaint',
      success: false,
      error: error.message
    }
  }
}

// ============================================================================
// Outpainting (Aspect Ratio Expansion)
// ============================================================================

/**
 * Expand image to a new aspect ratio (Imagen 3 Outpainting)
 * AI fills in the new areas based on the prompt
 * 
 * @example
 * await outpaintImage({
 *   sourceImage: 'https://example.com/portrait.jpg', // 1:1
 *   targetAspectRatio: '16:9', // Expand to cinematic
 *   prompt: 'A modern office interior with large windows'
 * })
 */
export async function outpaintImage(
  options: OutpaintOptions
): Promise<EditResult> {
  const { sourceImage, targetAspectRatio, prompt, negativePrompt } = options
  
  console.log('[Image Edit] Starting outpainting...')
  console.log('[Image Edit] Target aspect ratio:', targetAspectRatio)
  console.log('[Image Edit] Prompt:', prompt.substring(0, 100))
  
  try {
    const projectId = process.env.GCP_PROJECT_ID
    const region = process.env.GCP_REGION || 'us-central1'
    
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID not configured')
    }
    
    const accessToken = await getVertexAIAuthToken()
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    
    // Imagen 3 outpainting endpoint
    const MODEL_ID = 'imagen-3.0-capability-001'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
    
    const requestBody: any = {
      instances: [{
        prompt: prompt,
        image: {
          bytesBase64Encoded: sourceBase64
        }
      }],
      parameters: {
        sampleCount: 1,
        editMode: 'outpainting',
        aspectRatio: targetAspectRatio,
        safetySetting: 'block_some',
        personGeneration: 'allow_adult'
      }
    }
    
    if (negativePrompt) {
      requestBody.parameters.negativePrompt = negativePrompt
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Imagen API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
    if (!imageBytes) {
      throw new Error('No image returned from Imagen outpainting')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageBytes}`
    
    console.log('[Image Edit] Outpainting completed successfully')
    
    return {
      imageDataUrl: editedImageDataUrl,
      originalImageUrl: sourceImage,
      mode: 'outpaint',
      success: true
    }
  } catch (error: any) {
    console.error('[Image Edit] Outpainting failed:', error.message)
    return {
      imageDataUrl: '',
      originalImageUrl: sourceImage,
      mode: 'outpaint',
      success: false,
      error: error.message
    }
  }
}
