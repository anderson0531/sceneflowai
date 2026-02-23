/**
 * Image Editing Client for SceneFlow AI
 * 
 * All editing modes use Vertex AI Imagen 3 Capability Model for image editing:
 * 1. Instruction-Based Editing - Natural language editing with automatic mask detection
 * 2. Mask-Based Editing (Inpainting) - Precise pixel control with user-provided masks
 * 3. Outpainting - Expand image to new aspect ratios
 * 
 * MIGRATED: From Gemini (doesn't support multi-modal output on Vertex AI) to
 * Imagen 3 Capability Model (imagen-3.0-capability-001) which supports editing.
 * 
 * SERVER-SIDE ONLY - Do not import this file in client components
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/edit-images-overview
 */

import { EditMode, AspectRatioPreset } from '@/types/imageEdit'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { getImagenSafetyFilterLevel, getImagenPersonGeneration } from '@/lib/vertexai/safety'

// Vertex AI configuration
function getVertexConfig() {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Vertex AI')
  }
  
  return { projectId, location }
}

// Imagen 3 Capability Model for editing operations
const IMAGEN_EDIT_MODEL = 'imagen-3.0-capability-001'

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
// Instruction-Based Editing (Imagen 3 with Automatic Mask Detection)
// ============================================================================

/**
 * Edit image using natural language instruction (Vertex AI Imagen 3)
 * Uses automatic foreground mask detection - no mask required from user
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
  
  console.log('[Image Edit] Starting instruction-based edit with Imagen 3 Capability...')
  console.log('[Image Edit] Instruction:', instruction.substring(0, 100))
  
  try {
    const { projectId, location } = getVertexConfig()
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    
    // Build reference images array for Imagen 3 editing
    const referenceImages: any[] = [
      {
        referenceType: 'REFERENCE_TYPE_RAW',
        referenceId: 1,
        referenceImage: {
          bytesBase64Encoded: sourceBase64
        }
      },
      {
        referenceType: 'REFERENCE_TYPE_MASK',
        referenceId: 2,
        maskImageConfig: {
          // Use foreground segmentation for automatic mask detection
          // Works well for character edits like "remove glasses", "change expression"
          maskMode: 'MASK_MODE_FOREGROUND',
          dilation: 0.03  // Small dilation for better edge handling
        }
      }
    ]
    
    // Add subject reference if provided (for identity consistency)
    if (subjectReference) {
      console.log('[Image Edit] Adding subject reference for identity consistency')
      const refBase64 = await imageToBase64(subjectReference.imageUrl)
      referenceImages.push({
        referenceType: 'REFERENCE_TYPE_SUBJECT',
        referenceId: 3,
        referenceImage: {
          bytesBase64Encoded: refBase64
        },
        subjectImageConfig: {
          subjectType: 'SUBJECT_TYPE_PERSON',
          subjectDescription: subjectReference.description
        }
      })
    }
    
    // Use Imagen 3 Capability endpoint for editing
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${IMAGEN_EDIT_MODEL}:predict`
    
    const accessToken = await getVertexAIAuthToken()
    
    const requestBody = {
      instances: [{
        prompt: instruction,
        referenceImages: referenceImages
      }],
      parameters: {
        editMode: 'EDIT_MODE_INPAINT_INSERTION',
        editConfig: {
          baseSteps: 50  // Balance between quality and speed
        },
        sampleCount: 1,
        safetySetting: getImagenSafetyFilterLevel(),
        personGeneration: getImagenPersonGeneration()
      }
    }
    
    console.log('[Image Edit] Calling Imagen 3 Capability for instruction-based edit...')
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Image Edit] Imagen 3 error response:', errorText)
      throw new Error(`Imagen 3 error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check for API errors
    if (data.error) {
      throw new Error(`Imagen 3 error: ${data.error.message || 'Unknown error'}`)
    }
    
    // Extract image from Imagen 3 response
    const predictions = data?.predictions
    if (!predictions || predictions.length === 0) {
      console.error('[Image Edit] No predictions - likely filtered by safety settings')
      throw new Error('Image editing was filtered due to content policies. Try adjusting the instruction.')
    }
    
    const imageBytes = predictions[0]?.bytesBase64Encoded
    if (!imageBytes) {
      console.error('[Image Edit] Unexpected response structure:', JSON.stringify(data).slice(0, 500))
      throw new Error('Unexpected response format from Imagen 3')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageBytes}`
    
    console.log('[Image Edit] Instruction-based edit completed successfully via Imagen 3')
    
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
// Mask-Based Editing (Imagen 3 with User-Provided Mask)
// ============================================================================

/**
 * Edit image using a binary mask (Vertex AI Imagen 3 Inpainting)
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
  
  console.log('[Image Edit] Starting mask-based inpainting with Imagen 3 Capability...')
  console.log('[Image Edit] Prompt:', prompt.substring(0, 100))
  
  try {
    const { projectId, location } = getVertexConfig()
    
    // Convert images to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    const maskBase64 = await imageToBase64(maskImage)
    
    // Build reference images array for Imagen 3 editing
    const referenceImages: any[] = [
      {
        referenceType: 'REFERENCE_TYPE_RAW',
        referenceId: 1,
        referenceImage: {
          bytesBase64Encoded: sourceBase64
        }
      },
      {
        referenceType: 'REFERENCE_TYPE_MASK',
        referenceId: 2,
        referenceImage: {
          bytesBase64Encoded: maskBase64
        },
        maskImageConfig: {
          maskMode: 'MASK_MODE_USER_PROVIDED',
          dilation: 0.01  // Small dilation for edge smoothing
        }
      }
    ]
    
    // Use Imagen 3 Capability endpoint for editing
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${IMAGEN_EDIT_MODEL}:predict`
    
    const accessToken = await getVertexAIAuthToken()
    
    // Build prompt with optional negative
    let fullPrompt = prompt
    if (negativePrompt) {
      fullPrompt += `. Avoid: ${negativePrompt}`
    }
    
    const requestBody = {
      instances: [{
        prompt: fullPrompt,
        referenceImages: referenceImages
      }],
      parameters: {
        editMode: 'EDIT_MODE_INPAINT_INSERTION',
        editConfig: {
          baseSteps: 50
        },
        sampleCount: 1,
        safetySetting: getImagenSafetyFilterLevel(),
        personGeneration: getImagenPersonGeneration()
      }
    }
    
    console.log('[Image Edit] Calling Imagen 3 Capability for inpainting...')
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Image Edit] Imagen 3 error response:', errorText)
      throw new Error(`Imagen 3 error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check for API errors
    if (data.error) {
      throw new Error(`Imagen 3 error: ${data.error.message || 'Unknown error'}`)
    }
    
    // Extract image from Imagen 3 response
    const predictions = data?.predictions
    if (!predictions || predictions.length === 0) {
      console.error('[Image Edit] No predictions - likely filtered by safety settings')
      throw new Error('Image editing was filtered due to content policies. Try adjusting the prompt.')
    }
    
    const imageBytes = predictions[0]?.bytesBase64Encoded
    if (!imageBytes) {
      console.error('[Image Edit] Unexpected response structure:', JSON.stringify(data).slice(0, 500))
      throw new Error('Unexpected response format from Imagen 3')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageBytes}`
    
    console.log('[Image Edit] Inpainting completed successfully via Imagen 3')
    
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
// Outpainting (Aspect Ratio Expansion with Imagen 3)
// ============================================================================

/**
 * Expand image to a new aspect ratio (Vertex AI Imagen 3 Outpainting)
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
  
  console.log('[Image Edit] Starting outpainting with Imagen 3 Capability...')
  console.log('[Image Edit] Target aspect ratio:', targetAspectRatio)
  console.log('[Image Edit] Prompt:', prompt.substring(0, 100))
  
  try {
    const { projectId, location } = getVertexConfig()
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    
    // Build reference images array for Imagen 3 outpainting
    const referenceImages: any[] = [
      {
        referenceType: 'REFERENCE_TYPE_RAW',
        referenceId: 1,
        referenceImage: {
          bytesBase64Encoded: sourceBase64
        }
      }
    ]
    
    // Use Imagen 3 Capability endpoint for outpainting
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${IMAGEN_EDIT_MODEL}:predict`
    
    const accessToken = await getVertexAIAuthToken()
    
    // Build prompt with context for expanded areas
    let fullPrompt = `${prompt}. Seamlessly expand the image to fill a ${targetAspectRatio} aspect ratio.`
    if (negativePrompt) {
      fullPrompt += ` Avoid: ${negativePrompt}`
    }
    
    const requestBody = {
      instances: [{
        prompt: fullPrompt,
        referenceImages: referenceImages
      }],
      parameters: {
        editMode: 'EDIT_MODE_OUTPAINT',
        outputOptions: {
          // Map aspect ratio string to Imagen 3 format
          aspectRatio: targetAspectRatio.replace(':', ':')
        },
        editConfig: {
          baseSteps: 50
        },
        sampleCount: 1,
        safetySetting: getImagenSafetyFilterLevel(),
        personGeneration: getImagenPersonGeneration()
      }
    }
    
    console.log('[Image Edit] Calling Imagen 3 Capability for outpainting...')
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Image Edit] Imagen 3 error response:', errorText)
      throw new Error(`Imagen 3 error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check for API errors
    if (data.error) {
      throw new Error(`Imagen 3 error: ${data.error.message || 'Unknown error'}`)
    }
    
    // Extract image from Imagen 3 response
    const predictions = data?.predictions
    if (!predictions || predictions.length === 0) {
      console.error('[Image Edit] No predictions - likely filtered by safety settings')
      throw new Error('Image outpainting was filtered due to content policies. Try adjusting the prompt.')
    }
    
    const imageBytes = predictions[0]?.bytesBase64Encoded
    if (!imageBytes) {
      console.error('[Image Edit] Unexpected response structure:', JSON.stringify(data).slice(0, 500))
      throw new Error('Unexpected response format from Imagen 3')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageBytes}`
    
    console.log('[Image Edit] Outpainting completed successfully via Imagen 3')
    
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
