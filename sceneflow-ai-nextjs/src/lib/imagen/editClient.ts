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
// Instruction-Based Editing (Gemini Native)
// ============================================================================

/**
 * Edit image using natural language instruction (Gemini)
 * No mask required - AI understands context from the instruction
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
  
  console.log('[Image Edit] Starting instruction-based edit...')
  console.log('[Image Edit] Instruction:', instruction.substring(0, 100))
  
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    const sourceMimeType = detectMimeType(sourceImage)
    
    // Build contents array for Gemini
    const contents: any[] = []
    
    // Add the source image first
    contents.push({
      inline_data: {
        mime_type: sourceMimeType,
        data: sourceBase64
      }
    })
    
    // Add subject reference if provided (for identity consistency)
    if (subjectReference) {
      const refBase64 = await imageToBase64(subjectReference.imageUrl)
      contents.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: refBase64
        }
      })
    }
    
    // Build the edit instruction prompt
    let editPrompt = `Edit this image according to the following instruction: ${instruction}`
    if (subjectReference) {
      editPrompt += `\n\nMaintain the identity of the person shown in the reference image. Subject description: ${subjectReference.description}`
    }
    editPrompt += '\n\nGenerate only the edited image, no text or explanation.'
    
    contents.push({ text: editPrompt })
    
    // Call Gemini API for image editing
    const model = 'gemini-2.0-flash-exp' // Use flash for faster editing
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    
    const requestBody = {
      contents: [{ parts: contents }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        responseMimeType: 'image/png'
      }
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Extract generated image
    const parts = data?.candidates?.[0]?.content?.parts
    if (!parts) {
      throw new Error('No response from Gemini')
    }
    
    const imagePart = parts.find((p: any) => p.inline_data?.data)
    if (!imagePart) {
      throw new Error('No image generated by Gemini')
    }
    
    const editedImageDataUrl = `data:${imagePart.inline_data.mime_type || 'image/png'};base64,${imagePart.inline_data.data}`
    
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
