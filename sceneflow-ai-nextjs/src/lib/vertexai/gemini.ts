/**
 * Vertex AI Gemini Client
 * 
 * Unified client for all Gemini model access via Vertex AI.
 * Replaces direct Gemini API calls (generativelanguage.googleapis.com) with
 * Vertex AI endpoints (aiplatform.googleapis.com) for pay-as-you-go billing.
 * 
 * Supports:
 * - Text generation (Gemini 2.0/3.0 Flash, Pro)
 * - Vision analysis (multimodal with images)
 * - Image generation (Gemini 3 Pro Image Preview → Imagen 4)
 * 
 * @see GEMINI_MIGRATION.md for migration details
 */

import { getVertexAIAuthToken } from './client'
import { fetchWithRetry } from '../utils/retry'

// =============================================================================
// Configuration
// =============================================================================

export interface VertexGeminiConfig {
  projectId?: string
  location?: string
}

function getConfig(): { projectId: string; location: string } {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Vertex AI')
  }
  
  return { projectId, location }
}

// =============================================================================
// Text Generation (LLM)
// =============================================================================

export interface TextGenerationOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  responseMimeType?: 'text/plain' | 'application/json'
  systemInstruction?: string
  /** Maximum retry attempts for 429/transient errors (default: 3) */
  maxRetries?: number
  /** Initial retry delay in ms (default: 1000) */
  initialDelayMs?: number
  /** Timeout in ms for the entire request including retries (default: 90000) */
  timeoutMs?: number
  /** 
   * Thinking budget for Gemini 2.5 models. Set to 0 to disable thinking mode.
   * For Gemini 2.5 Flash: valid range is 0-24576 (0 disables thinking)
   * Default: undefined (auto/dynamic thinking)
   */
  thinkingBudget?: number
  /**
   * Seed for deterministic output. Same seed + same input = same output.
   * Useful for scoring consistency across repeated analysis runs.
   */
  seed?: number
}

export interface TextGenerationResult {
  text: string
  finishReason?: string
  safetyRatings?: Array<{ category: string; probability: string }>
}

/**
 * Generate text using Gemini via Vertex AI
 * Replaces direct calls to generativelanguage.googleapis.com
 */
export async function generateText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<TextGenerationResult> {
  const { projectId, location } = getConfig()
  const model = options.model || 'gemini-2.5-flash'
  
  // Vertex AI endpoint for Gemini models
  // Format: https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  
  const accessToken = await getVertexAIAuthToken()
  
  // Build request body
  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      topP: options.topP ?? 0.9,
      topK: options.topK,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    }
  }
  
  // Add seed for deterministic output
  if (options.seed !== undefined) {
    requestBody.generationConfig.seed = options.seed
  }

  // Add response mime type if specified
  if (options.responseMimeType) {
    requestBody.generationConfig.responseMimeType = options.responseMimeType
  }
  
  // Add system instruction if provided
  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    }
  }
  
  // Add thinking config for Gemini 2.5 models
  // Setting thinkingBudget to 0 disables thinking mode (prevents OOM issues)
  if (options.thinkingBudget !== undefined && model.includes('2.5')) {
    requestBody.generationConfig.thinkingConfig = {
      thinkingBudget: options.thinkingBudget
    }
  }
  
  console.log(`[Vertex Gemini] Generating text with ${model}...`)
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.initialDelayMs ?? 1000,
      operationName: `Vertex Gemini ${model}`,
      timeoutMs: options.timeoutMs ?? 90000, // Default 90s timeout per request
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Gemini] Error:', errorText)
    throw new Error(`Vertex AI Gemini error ${response.status}: ${errorText}`)
  }
  
  const data = await response.json()
  
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidates in Vertex AI response')
  }
  
  const text = candidate.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No text content in Vertex AI response')
  }
  
  return {
    text,
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings
  }
}

// =============================================================================
// Vision Analysis (Multimodal)
// =============================================================================

export interface VisionPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string  // base64
  }
}

export interface VisionGenerationOptions extends TextGenerationOptions {
  // Vision-specific options can be added here
}

/**
 * Generate content with vision (image + text) using Gemini via Vertex AI
 * Replaces @google/generative-ai SDK for vision tasks
 */
export async function generateWithVision(
  parts: VisionPart[],
  options: VisionGenerationOptions = {}
): Promise<TextGenerationResult> {
  const { projectId, location } = getConfig()
  // Use gemini-2.5-flash for vision by default (fast and capable)
  const model = options.model || 'gemini-2.5-flash'
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  
  const accessToken = await getVertexAIAuthToken()
  
  // Convert parts to Vertex AI format
  const vertexParts = parts.map(part => {
    if (part.text) {
      return { text: part.text }
    }
    if (part.inlineData) {
      return {
        inlineData: {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data
        }
      }
    }
    return part
  })
  
  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: vertexParts
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      topP: options.topP ?? 0.9,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    }
  }
  
  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    }
  }
  
  console.log(`[Vertex Gemini Vision] Generating with ${model}...`)
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.initialDelayMs ?? 1000,
      operationName: `Vertex Gemini Vision ${model}`,
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Gemini Vision] Error:', errorText)
    throw new Error(`Vertex AI Vision error ${response.status}: ${errorText}`)
  }
  
  const data = await response.json()
  
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidates in Vertex AI vision response')
  }
  
  const text = candidate.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No text content in Vertex AI vision response')
  }
  
  return {
    text,
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings
  }
}

// =============================================================================
// Image Generation (Imagen 4 via Vertex AI)
// =============================================================================

export interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9'
  numberOfImages?: number
  negativePrompt?: string
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  referenceImages?: Array<{
    referenceId: number
    base64Image?: string
    imageUrl?: string
    subjectDescription?: string
    referenceType?: 'REFERENCE_TYPE_SUBJECT'
    subjectType?: 'SUBJECT_TYPE_PERSON' | 'SUBJECT_TYPE_PRODUCT'
  }>
}

/**
 * Generate image using Imagen 4 via Vertex AI
 * Replaces Gemini 3 Pro Image Preview calls to generativelanguage.googleapis.com
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const { projectId, location } = getConfig()
  
  // Use Imagen 4 for image generation
  // - imagen-3.0-capability-001 for subject customization (with reference images)
  // - imagen-3.0-generate-001 for standard generation
  const hasReferenceImages = options.referenceImages && options.referenceImages.length > 0
  const model = hasReferenceImages 
    ? 'imagen-3.0-capability-001'
    : 'imagen-3.0-generate-001'
  
  console.log(`[Vertex Imagen] Generating image with ${model}...`)
  console.log('[Vertex Imagen] Prompt:', prompt.substring(0, 200))
  console.log('[Vertex Imagen] Has references:', hasReferenceImages)
  
  const accessToken = await getVertexAIAuthToken()
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`
  
  // Build request body
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      safetySetting: 'block_some',
      personGeneration: options.personGeneration || 'allow_adult'
    }
  }
  
  // Add negative prompt (only for non-capability models)
  if (!hasReferenceImages && options.negativePrompt) {
    requestBody.parameters.negativePrompt = options.negativePrompt
  }
  
  // Add reference images for subject customization
  if (hasReferenceImages) {
    const referenceImagesArray = []
    
    for (const ref of options.referenceImages!) {
      let base64Data = ref.base64Image
      
      // Download from URL if needed
      if (!base64Data && ref.imageUrl) {
        console.log(`[Vertex Imagen] Downloading reference from: ${ref.imageUrl.substring(0, 50)}...`)
        const imageResponse = await fetch(ref.imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download reference image: ${imageResponse.status}`)
        }
        const imageBuffer = await imageResponse.arrayBuffer()
        base64Data = Buffer.from(imageBuffer).toString('base64')
      }
      
      if (!base64Data) {
        console.warn(`[Vertex Imagen] Reference ${ref.referenceId}: No image data, skipping`)
        continue
      }
      
      referenceImagesArray.push({
        referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
        referenceId: ref.referenceId,
        referenceImage: {
          bytesBase64Encoded: base64Data
        },
        subjectImageConfig: {
          subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
          subjectDescription: ref.subjectDescription || 'a person'
        }
      })
      
      console.log(`[Vertex Imagen] Added reference ${ref.referenceId}: ${ref.subjectDescription || 'person'}`)
    }
    
    if (referenceImagesArray.length > 0) {
      requestBody.instances[0].referenceImages = referenceImagesArray
    }
  }
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      operationName: `Vertex Imagen ${model}`,
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Imagen] Error:', errorText)
    
    let hint = ''
    if (response.status === 403) {
      hint = 'IAM permission denied. Ensure service account has roles/aiplatform.user.'
    } else if (response.status === 404) {
      hint = `Model ${model} not found in region ${location}.`
    }
    
    throw new Error(`Vertex AI Imagen error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  const predictions = data?.predictions
  if (!predictions || predictions.length === 0) {
    throw new Error('Image generation was filtered due to content policies. Try adjusting the prompt.')
  }
  
  const imageBytes = predictions[0]?.bytesBase64Encoded
  if (!imageBytes) {
    throw new Error('Unexpected response format from Vertex AI Imagen')
  }
  
  console.log('[Vertex Imagen] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

// =============================================================================
// Convenience exports
// =============================================================================

export { getVertexAIAuthToken } from './client'
