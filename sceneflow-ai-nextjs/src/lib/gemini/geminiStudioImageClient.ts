/**
 * Gemini Studio (Google AI Studio) Image Generation Client
 * 
 * Uses Gemini 3 Pro Image Preview for image generation with reference images.
 * This model supports up to 5 human reference images for character consistency
 * and generates high-quality images up to 4K resolution.
 * 
 * Unlike Vertex AI Imagen's complex referenceImages API, Gemini 3 Pro uses
 * simple multimodal input - reference images are passed directly in the prompt.
 * 
 * Rate Limits:
 * - gemini-3-pro-image-preview: 20 RPM (higher quality, 4K support)
 * - gemini-2.5-flash-image: 500 RPM (faster, 1K only, fallback)
 * 
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

// Rate limit tracking for automatic fallback
let proModelRateLimitedUntil: number | null = null
const RATE_LIMIT_COOLDOWN_MS = 60000 // 1 minute cooldown after rate limit hit

// Retry configuration for 503 errors (service unavailable / high demand)
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 2000 // Start with 2 seconds
const MAX_RETRY_DELAY_MS = 10000 // Cap at 10 seconds

// Request timeout configuration
// Vercel functions timeout at 120s, so we use 90s to allow graceful error handling
const REQUEST_TIMEOUT_MS = 90000

// Helper to sleep with exponential backoff
async function sleepWithBackoff(attempt: number): Promise<void> {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS)
  const jitter = Math.random() * 500 // Add up to 500ms jitter to avoid thundering herd
  console.log(`[Gemini Studio Image] Waiting ${(delay + jitter).toFixed(0)}ms before retry...`)
  await new Promise(resolve => setTimeout(resolve, delay + jitter))
}

// ============================================================================
// Model Tier Types
// ============================================================================

export type ModelTier = 'eco' | 'designer' | 'director'
export type ThinkingLevel = 'low' | 'high'

// Model mapping for tiers
const MODEL_TIER_CONFIG = {
  eco: {
    model: 'gemini-2.5-flash-image', // Nano Banana equivalent - fast, affordable
    maxResolution: '2K',
    description: 'Fast & Affordable',
  },
  designer: {
    model: 'gemini-3-pro-image-preview', // Nano Banana Pro equivalent - high quality
    maxResolution: '4K',
    description: 'High Precision',
  },
  director: {
    model: 'gemini-3-pro-image-preview', // Placeholder until Veo 3.1 available
    maxResolution: '4K',
    description: 'Cinematic (Coming Soon)',
  },
} as const

export interface GeminiStudioImageOptions {
  prompt: string
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K' | '4K'
  referenceImages?: Array<{
    imageUrl?: string      // HTTP URL to download
    base64Image?: string   // Already encoded base64
    mimeType?: string      // e.g., 'image/jpeg', 'image/png'
    name?: string          // Character name for logging
  }>
  /** Model quality tier: eco (fast/cheap), designer (high quality), director (cinematic) */
  modelTier?: ModelTier
  /** Thinking level: low (fast) or high (more detailed reasoning) */
  thinkingLevel?: ThinkingLevel
  /** Negative prompt - elements to avoid in generation */
  negativePrompt?: string
}

export interface GeminiStudioImageResult {
  imageBase64: string
  mimeType: string
  text?: string  // Optional text response
}

/**
 * Generate an image using Gemini 3 Pro Image Preview via Google AI Studio API
 * 
 * This is the preferred method for generating images with character reference images
 * because Gemini 3 Pro handles reference images natively in the prompt context.
 */
export async function generateImageWithGeminiStudio(
  options: GeminiStudioImageOptions,
  retryCount: number = 0
): Promise<GeminiStudioImageResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }
  
  // Determine model based on tier (default to designer for best quality)
  const tier = options.modelTier || 'designer'
  const tierConfig = MODEL_TIER_CONFIG[tier]
  
  // Check if we should use fallback due to rate limiting (only for designer/director tiers)
  const useFlashFallback = tier !== 'eco' && proModelRateLimitedUntil && Date.now() < proModelRateLimitedUntil
  
  // Select model based on tier and rate limit status
  let model: string
  if (tier === 'eco' || useFlashFallback) {
    model = 'gemini-2.5-flash-image' // Nano Banana - fast, affordable
  } else {
    model = 'gemini-3-pro-image-preview' // Nano Banana Pro - high quality
  }
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  if (useFlashFallback && proModelRateLimitedUntil) {
    console.log(`[Gemini Studio Image] Using flash fallback (rate limited until ${new Date(proModelRateLimitedUntil).toISOString()})`)
  }
  
  console.log(`[Gemini Studio Image] Generating with ${model} (tier: ${tier}, thinking: ${options.thinkingLevel || 'high'})...`)
  console.log(`[Gemini Studio Image] Prompt preview: ${options.prompt.substring(0, 150)}...`)
  if (options.negativePrompt) {
    console.log(`[Gemini Studio Image] Negative prompt: ${options.negativePrompt.substring(0, 100)}...`)
  }
  console.log(`[Gemini Studio Image] Reference images: ${options.referenceImages?.length || 0}`)
  
  // Build the full prompt with negative prompt if provided
  let fullPrompt = options.prompt
  if (options.negativePrompt) {
    fullPrompt += `\n\nAVOID the following in the generated image: ${options.negativePrompt}`
  }
  
  // Build the contents array with prompt text and reference images
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = []
  
  // Add text prompt first (with negative prompt included)
  parts.push({ text: fullPrompt })
  
  // Add reference images as inline_data parts
  if (options.referenceImages && options.referenceImages.length > 0) {
    console.log(`[Gemini Studio Image] Adding ${options.referenceImages.length} reference image(s)`)
    
    for (const ref of options.referenceImages) {
      let base64Data = ref.base64Image
      let mimeType = ref.mimeType || 'image/jpeg'
      
      // Download from URL if needed
      if (!base64Data && ref.imageUrl) {
        console.log(`[Gemini Studio Image] Downloading reference from: ${ref.imageUrl.substring(0, 50)}...`)
        try {
          const response = await fetch(ref.imageUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          // Detect mime type from response
          const contentType = response.headers.get('content-type')
          if (contentType) {
            mimeType = contentType.split(';')[0].trim()
          }
          
          const arrayBuffer = await response.arrayBuffer()
          base64Data = Buffer.from(arrayBuffer).toString('base64')
          console.log(`[Gemini Studio Image] Downloaded ${ref.name || 'reference'}: ${base64Data.length} base64 chars, ${mimeType}`)
        } catch (error: any) {
          console.error(`[Gemini Studio Image] Failed to download reference:`, error.message)
          throw new Error(`Failed to download reference image: ${error.message}`)
        }
      }
      
      if (!base64Data) {
        console.warn(`[Gemini Studio Image] Reference ${ref.name || 'unknown'}: No image data, skipping`)
        continue
      }
      
      // Strip data URL prefix if present
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1] || base64Data
      }
      
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      })
      
      console.log(`[Gemini Studio Image] Added reference: ${ref.name || 'unnamed'} (${mimeType})`)
    }
  }
  
  // Build request body per Gemini REST API spec (uses snake_case field names)
  // Note: gemini-2.5-flash-image only supports 1K resolution, ignore imageSize for it
  const effectiveImageSize = model === 'gemini-2.5-flash-image' ? undefined : options.imageSize
  
  const requestBody = {
    contents: [
      {
        parts
      }
    ],
    generationConfig: {
      response_modalities: ['TEXT', 'IMAGE'],  // Allow both text and image output
      ...(options.aspectRatio || effectiveImageSize ? {
        image_config: {
          ...(options.aspectRatio && { aspect_ratio: options.aspectRatio }),
          ...(effectiveImageSize && { image_size: effectiveImageSize })
        }
      } : {})
    },
    // Safety settings to allow adult content (required for character generation)
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  }
  
  console.log(`[Gemini Studio Image] Request config:`, JSON.stringify({
    model,
    partsCount: parts.length,
    aspectRatio: options.aspectRatio || 'default',
    imageSize: options.imageSize || '1K'
  }))
  
  // Create AbortController for request timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    console.error(`[Gemini Studio Image] Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)
  }, REQUEST_TIMEOUT_MS)
  
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      // Retry on timeout with remaining retries
      if (retryCount < MAX_RETRIES) {
        console.log(`[Gemini Studio Image] Request timeout, attempt ${retryCount + 1}/${MAX_RETRIES}...`)
        await sleepWithBackoff(retryCount)
        return generateImageWithGeminiStudio(options, retryCount + 1)
      }
      throw new Error(`Gemini API request timed out after ${MAX_RETRIES} attempts. The service may be experiencing high load. Please try again later.`)
    }
    
    // Handle other network errors
    if (error instanceof Error) {
      console.error(`[Gemini Studio Image] Network error:`, error.message)
      if (retryCount < MAX_RETRIES) {
        console.log(`[Gemini Studio Image] Network error, attempt ${retryCount + 1}/${MAX_RETRIES}...`)
        await sleepWithBackoff(retryCount)
        return generateImageWithGeminiStudio(options, retryCount + 1)
      }
      throw new Error(`Network error connecting to Gemini API: ${error.message}`)
    }
    
    throw error
  }
  
  clearTimeout(timeoutId)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Gemini Studio Image] Error response:', errorText)
    
    // Handle rate limiting with automatic fallback
    if (response.status === 429) {
      if (model === 'gemini-3-pro-image-preview' && !useFlashFallback) {
        // Set cooldown and retry with flash model
        proModelRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
        console.log(`[Gemini Studio Image] Rate limited on pro model, retrying with flash fallback...`)
        return generateImageWithGeminiStudio(options, 0) // Recursive call will use flash
      }
      throw new Error(`Rate limit exceeded on both models. Please wait a moment and try again.`)
    }
    
    // Handle 503 Service Unavailable with exponential backoff retry
    if (response.status === 503) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[Gemini Studio Image] Service unavailable (503), attempt ${retryCount + 1}/${MAX_RETRIES}...`)
        await sleepWithBackoff(retryCount)
        return generateImageWithGeminiStudio(options, retryCount + 1)
      }
      throw new Error(`Service unavailable after ${MAX_RETRIES} retries. The model is experiencing high demand. Please try again in a few minutes.`)
    }
    
    let hint = ''
    if (response.status === 400) {
      hint = 'Bad request. Check prompt and parameters.'
    } else if (response.status === 403) {
      hint = 'API key may be invalid or this model is not available with your API key.'
    }
    
    throw new Error(`Gemini Studio API error ${response.status}: ${errorText}. ${hint}`)
  }
  
  // Clear rate limit on success with pro model
  if (model === 'gemini-3-pro-image-preview') {
    proModelRateLimitedUntil = null
  }
  
  const data = await response.json()
  
  // Check for blocked content
  if (data.promptFeedback?.blockReason) {
    console.error('[Gemini Studio Image] Content blocked:', data.promptFeedback.blockReason)
    throw new Error(`Image generation blocked: ${data.promptFeedback.blockReason}. Try adjusting the prompt.`)
  }
  
  // Extract image from response
  const candidates = data.candidates
  if (!candidates || candidates.length === 0) {
    console.error('[Gemini Studio Image] No candidates in response:', JSON.stringify(data))
    throw new Error('No image generated. The request may have been filtered.')
  }
  
  const content = candidates[0].content
  if (!content || !content.parts) {
    console.error('[Gemini Studio Image] No parts in response:', JSON.stringify(candidates[0]))
    throw new Error('Invalid response structure from Gemini API.')
  }
  
  // Find image and text parts
  let imageBase64: string | undefined
  let imageMimeType = 'image/png'
  let responseText: string | undefined
  
  // Log full response structure for debugging
  console.log(`[Gemini Studio Image] Response parts structure:`, JSON.stringify(content.parts.map((p: any) => Object.keys(p))))
  
  for (const part of content.parts) {
    // Gemini REST API returns camelCase in responses (inlineData, not inline_data)
    const inlineData = part.inlineData || part.inline_data
    if (inlineData) {
      // Handle both camelCase (mimeType) and snake_case (mime_type) response formats
      imageBase64 = inlineData.data
      imageMimeType = inlineData.mimeType || inlineData.mime_type || 'image/png'
      console.log(`[Gemini Studio Image] Found image: ${imageMimeType}, ${(imageBase64 as string).length} chars`)
    } else if (part.text && !part.thought && !part.thoughtSignature) {
      // Capture non-thought text (skip thought and thoughtSignature parts)
      responseText = part.text
      console.log(`[Gemini Studio Image] Found text: ${(responseText as string).substring(0, 100)}...`)
    }
  }
  
  if (!imageBase64) {
    console.error('[Gemini Studio Image] No image in response parts:', JSON.stringify(content.parts.map((p: any) => Object.keys(p))))
    throw new Error('No image found in Gemini response. The model may have returned only text.')
  }
  
  console.log('[Gemini Studio Image] ✓ Image generated successfully')
  
  return {
    imageBase64: imageBase64!,
    mimeType: imageMimeType,
    text: responseText
  }
}

/**
 * Edit an image using Gemini Studio with character identity preservation
 * 
 * This is the preferred method for character image editing because it:
 * 1. Understands the source image context
 * 2. Preserves character identity from reference images
 * 3. Applies natural language edit instructions accurately
 * 
 * Unlike Imagen 3's mask-based editing which regenerates entire regions,
 * Gemini understands the semantic content and makes targeted edits.
 */
export interface GeminiStudioEditOptions {
  /** The source image to edit (URL or base64 data URL) */
  sourceImage: string
  /** Natural language description of the edit to apply */
  instruction: string
  /** Optional character reference image for identity preservation */
  referenceImage?: string
  /** Aspect ratio for the output (defaults to source aspect) */
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9'
  /** Output image size */
  imageSize?: '1K' | '2K'
}

export async function editImageWithGeminiStudio(
  options: GeminiStudioEditOptions
): Promise<GeminiStudioImageResult> {
  console.log(`[Gemini Studio Edit] Starting edit: "${options.instruction.substring(0, 50)}..."`)
  
  // Build the edit prompt with identity preservation instructions
  const editPrompt = `Edit this image according to the following instruction: ${options.instruction}

CRITICAL REQUIREMENTS:
1. Preserve the EXACT same person's identity - same face, ethnicity, age, and facial features
2. Only apply the specific edit requested - do not change anything else
3. Maintain the same pose, angle, lighting style, and background where possible
4. The edited image should look like the same person, just with the requested modification

If a reference image of the person is provided, use it to ensure identity consistency.`

  // Prepare reference images - source is primary, character reference is for identity
  const referenceImages: Array<{
    imageUrl?: string
    base64Image?: string
    mimeType?: string
    name?: string
  }> = []

  // Add source image (the one being edited)
  if (options.sourceImage.startsWith('data:')) {
    // Extract base64 from data URL
    const matches = options.sourceImage.match(/^data:([^;]+);base64,(.+)$/)
    if (matches) {
      referenceImages.push({
        base64Image: matches[2],
        mimeType: matches[1],
        name: 'source-to-edit'
      })
    }
  } else {
    referenceImages.push({
      imageUrl: options.sourceImage,
      name: 'source-to-edit'
    })
  }

  // Add character reference image for identity preservation (if provided)
  if (options.referenceImage) {
    if (options.referenceImage.startsWith('data:')) {
      const matches = options.referenceImage.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        referenceImages.push({
          base64Image: matches[2],
          mimeType: matches[1],
          name: 'identity-reference'
        })
      }
    } else {
      referenceImages.push({
        imageUrl: options.referenceImage,
        name: 'identity-reference'
      })
    }
    console.log(`[Gemini Studio Edit] Added identity reference image for preservation`)
  }

  // Generate edited image using the standard function
  return generateImageWithGeminiStudio({
    prompt: editPrompt,
    aspectRatio: options.aspectRatio || '1:1',
    imageSize: options.imageSize || '1K',
    referenceImages
  })
}

/**
 * Upload a generated image to Vercel Blob storage
 * (Utility function to match existing workflow)
 */
export async function uploadGeneratedImage(
  imageBase64: string,
  mimeType: string,
  filename: string
): Promise<string> {
  // Dynamic import to avoid issues if blob storage not configured
  const { put } = await import('@vercel/blob')
  
  // Convert base64 to buffer
  const buffer = Buffer.from(imageBase64, 'base64')
  
  // Determine extension from mime type
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'
  const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`
  
  // Upload to Vercel Blob
  const blob = await put(fullFilename, buffer, {
    access: 'public',
    contentType: mimeType
  })
  
  console.log(`[Gemini Studio Image] Uploaded to blob storage: ${blob.url}`)
  
  return blob.url
}
