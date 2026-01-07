/**
 * Image Editing Client for SceneFlow AI
 * 
 * All editing modes use Vertex AI Gemini for multimodal image editing:
 * 1. Instruction-Based Editing - Natural language editing without masks
 * 2. Mask-Based Editing (Inpainting) - Precise pixel control with masks
 * 3. Outpainting - Expand image to new aspect ratios
 * 
 * MIGRATED: From consumer Gemini API (generativelanguage.googleapis.com) to
 * Vertex AI (aiplatform.googleapis.com) for pay-as-you-go billing and no 429 errors.
 * 
 * SERVER-SIDE ONLY - Do not import this file in client components
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { EditMode, AspectRatioPreset } from '@/types/imageEdit'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'

// Vertex AI configuration
function getVertexConfig() {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Vertex AI')
  }
  
  return { projectId, location }
}

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
// Instruction-Based Editing (Gemini 3 Pro Image Preview)
// ============================================================================

/**
 * Edit image using natural language instruction (Vertex AI Gemini)
 * No mask required - AI understands context from the instruction
 * Uses Vertex AI for pay-as-you-go billing (no 429 quota errors)
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
  
  console.log('[Image Edit] Starting instruction-based edit with Vertex AI Gemini...')
  console.log('[Image Edit] Instruction:', instruction.substring(0, 100))
  
  try {
    const { projectId, location } = getVertexConfig()
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    const sourceMimeType = detectMimeType(sourceImage)
    
    // Build contents array: source image first, then instruction
    const contents: any[] = []
    
    // Add source image to edit
    contents.push({
      inline_data: {
        mime_type: sourceMimeType,
        data: sourceBase64
      }
    })
    
    // Add subject reference if provided (for identity consistency)
    if (subjectReference) {
      console.log('[Image Edit] Adding subject reference for identity consistency')
      const refBase64 = await imageToBase64(subjectReference.imageUrl)
      contents.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: refBase64
        }
      })
    }
    
    // Build the edit instruction prompt
    let editPrompt = `Edit this image: ${instruction}`
    if (subjectReference) {
      editPrompt += `\n\nMaintain the identity of the person shown in the reference image. Subject: ${subjectReference.description}`
    }
    editPrompt += '\n\nKeep the same overall composition, lighting, and style. Generate the edited image.'
    
    contents.push({ text: editPrompt })
    
    // Use Vertex AI Gemini endpoint for image editing
    // Note: gemini-2.0-flash supports image generation on Vertex AI
    const model = 'gemini-2.0-flash'
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
    
    const accessToken = await getVertexAIAuthToken()
    
    const requestBody = {
      contents: [{ parts: contents }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT']
      }
    }
    
    console.log('[Image Edit] Calling Vertex AI Gemini...')
    
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
      throw new Error(`Vertex AI Gemini error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check for API errors
    if (data.error) {
      throw new Error(`Vertex AI Gemini error: ${data.error.message || 'Unknown error'}`)
    }
    
    // Extract image from Gemini response
    const candidates = data?.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('Image editing was filtered due to content policies. Try adjusting the instruction.')
    }
    
    const parts = candidates[0]?.content?.parts
    if (!parts || parts.length === 0) {
      throw new Error('Unexpected response format from Vertex AI Gemini')
    }
    
    // Find the image part
    let imageData: string | null = null
    for (const part of parts) {
      const inlineData = part.inline_data || part.inlineData
      if (inlineData && (inlineData.mime_type || inlineData.mimeType)?.startsWith?.('image/') && !part.thought) {
        imageData = inlineData.data
        break
      }
    }
    
    if (!imageData) {
      throw new Error('No image generated by Vertex AI Gemini')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageData}`
    
    console.log('[Image Edit] Instruction-based edit completed successfully via Vertex AI')
    
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
// Mask-Based Editing (Vertex AI Gemini with Mask)
// ============================================================================

/**
 * Edit image using a binary mask (Vertex AI Gemini Inpainting)
 * White areas in mask will be regenerated based on prompt
 * Uses Vertex AI for pay-as-you-go billing (no 429 quota errors)
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
  
  console.log('[Image Edit] Starting mask-based inpainting with Vertex AI Gemini...')
  console.log('[Image Edit] Prompt:', prompt.substring(0, 100))
  
  try {
    const { projectId, location } = getVertexConfig()
    
    // Convert images to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    const maskBase64 = await imageToBase64(maskImage)
    const sourceMimeType = detectMimeType(sourceImage)
    
    // Build contents array: source image, mask, then instruction
    const contents: any[] = []
    
    // Add source image
    contents.push({
      inline_data: {
        mime_type: sourceMimeType,
        data: sourceBase64
      }
    })
    
    // Add mask image
    contents.push({
      inline_data: {
        mime_type: 'image/png',
        data: maskBase64
      }
    })
    
    // Build the inpainting prompt
    let editPrompt = `Edit this image. The second image is a mask where WHITE areas should be replaced/edited and BLACK areas should remain unchanged.

In the WHITE masked areas, generate: ${prompt}`
    
    if (negativePrompt) {
      editPrompt += `\n\nAvoid: ${negativePrompt}`
    }
    
    editPrompt += '\n\nKeep the BLACK masked areas exactly as they are in the original. Generate the edited image.'
    
    contents.push({ text: editPrompt })
    
    // Use Vertex AI Gemini endpoint
    const model = 'gemini-2.0-flash'
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
    
    const accessToken = await getVertexAIAuthToken()
    
    const requestBody = {
      contents: [{ parts: contents }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT']
      }
    }
    
    console.log('[Image Edit] Calling Vertex AI Gemini for inpainting...')
    
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
      throw new Error(`Vertex AI Gemini error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check for API errors
    if (data.error) {
      throw new Error(`Vertex AI Gemini error: ${data.error.message || 'Unknown error'}`)
    }
    
    // Extract image from response
    const candidates = data?.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('Image editing was filtered due to content policies. Try adjusting the prompt.')
    }
    
    const parts = candidates[0]?.content?.parts
    if (!parts || parts.length === 0) {
      throw new Error('Unexpected response format from Vertex AI Gemini')
    }
    
    // Find the image part
    let imageData: string | null = null
    for (const part of parts) {
      const inlineData = part.inline_data || part.inlineData
      if (inlineData && (inlineData.mime_type || inlineData.mimeType)?.startsWith?.('image/') && !part.thought) {
        imageData = inlineData.data
        break
      }
    }
    
    if (!imageData) {
      throw new Error('No image generated by Vertex AI Gemini')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageData}`
    
    console.log('[Image Edit] Inpainting completed successfully via Vertex AI')
    
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
// Outpainting (Aspect Ratio Expansion with Vertex AI Gemini)
// ============================================================================

/**
 * Expand image to a new aspect ratio (Vertex AI Gemini Outpainting)
 * AI fills in the new areas based on the prompt
 * Uses Vertex AI for pay-as-you-go billing (no 429 quota errors)
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
  
  console.log('[Image Edit] Starting outpainting with Vertex AI Gemini...')
  console.log('[Image Edit] Target aspect ratio:', targetAspectRatio)
  console.log('[Image Edit] Prompt:', prompt.substring(0, 100))
  
  try {
    const { projectId, location } = getVertexConfig()
    
    // Convert source image to base64
    const sourceBase64 = await imageToBase64(sourceImage)
    const sourceMimeType = detectMimeType(sourceImage)
    
    // Build contents array
    const contents: any[] = []
    
    // Add source image
    contents.push({
      inline_data: {
        mime_type: sourceMimeType,
        data: sourceBase64
      }
    })
    
    // Build the outpainting prompt
    let editPrompt = `Expand this image to a ${targetAspectRatio} aspect ratio. 

The original image should remain in the center, and you should extend/expand the canvas outward to fill the new aspect ratio.

For the newly expanded areas, generate: ${prompt}

Make sure the expanded areas blend seamlessly with the original image, matching the lighting, style, and perspective.`
    
    if (negativePrompt) {
      editPrompt += `\n\nAvoid: ${negativePrompt}`
    }
    
    contents.push({ text: editPrompt })
    
    // Use Vertex AI Gemini endpoint
    const model = 'gemini-2.0-flash'
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
    
    const accessToken = await getVertexAIAuthToken()
    
    const requestBody: any = {
      contents: [{ parts: contents }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT']
      }
    }
    
    console.log('[Image Edit] Calling Vertex AI Gemini for outpainting...')
    
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
      throw new Error(`Vertex AI Gemini error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check for API errors
    if (data.error) {
      throw new Error(`Vertex AI Gemini error: ${data.error.message || 'Unknown error'}`)
    }
    
    // Extract image from response
    const candidates = data?.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('Image outpainting was filtered due to content policies. Try adjusting the prompt.')
    }
    
    const parts = candidates[0]?.content?.parts
    if (!parts || parts.length === 0) {
      throw new Error('Unexpected response format from Vertex AI Gemini')
    }
    
    // Find the image part
    let imageData: string | null = null
    for (const part of parts) {
      const inlineData = part.inline_data || part.inlineData
      if (inlineData && (inlineData.mime_type || inlineData.mimeType)?.startsWith?.('image/') && !part.thought) {
        imageData = inlineData.data
        break
      }
    }
    
    if (!imageData) {
      throw new Error('No image generated by Vertex AI Gemini')
    }
    
    const editedImageDataUrl = `data:image/png;base64,${imageData}`
    
    console.log('[Image Edit] Outpainting completed successfully via Vertex AI')
    
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
