/**
 * Gemini Studio (Google AI Studio) Video Generation Client
 * 
 * Uses Veo 3.1 via the Gemini API (generativelanguage.googleapis.com)
 * This uses the same simple API key authentication as the image generation client,
 * which has been tested and working.
 * 
 * Key differences from Vertex AI implementation:
 * - Uses GEMINI_API_KEY instead of service account JWT
 * - Endpoint: generativelanguage.googleapis.com vs aiplatform.googleapis.com
 * - Simpler request/response format
 * 
 * Supported Generation Modes:
 * 1. T2V (Text-to-Video): Prompt only
 * 2. I2V (Image-to-Video): Uses image parameter as first frame
 * 3. FTV (Frame-to-Video/Interpolation): Uses image + lastFrame
 * 4. REF (Reference Images): Up to 3 reference images (Veo 3.1 only)
 * 5. EXT (Extension): Extends previous Veo-generated videos
 * 
 * @see https://ai.google.dev/gemini-api/docs/video
 */

// ============================================================================
// Types
// ============================================================================

interface ReferenceImage {
  url?: string         // Primary URL field (from API route)
  imageUrl?: string    // Alternative URL field (legacy)
  base64Image?: string // Direct base64 data
  mimeType?: string
  referenceType?: 'asset' | 'style' | 'ASSET' | 'STYLE'
  type?: 'style' | 'character'
}

export interface GeminiVideoOptions {
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
  durationSeconds?: 4 | 6 | 8
  negativePrompt?: string
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  startFrame?: string // Base64 or URL for I2V
  lastFrame?: string // For interpolation (FTV)
  referenceImages?: ReferenceImage[] // Up to 3 for Veo 3.1
  numberOfVideos?: number
}

export interface GeminiVideoResult {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  operationName?: string
  videoUrl?: string
  videoBase64?: string
  mimeType?: string
  error?: string
  estimatedWaitSeconds?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert URL to base64 image data
 */
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = await response.arrayBuffer()
  return {
    base64: Buffer.from(buffer).toString('base64'),
    mimeType: contentType.split(';')[0]
  }
}

/**
 * Build helpful error message for RAI content filtering
 */
function buildRAIFilteredErrorMessage(reason: string): string {
  return `⚠️ Content Safety Filter Triggered

Veo's AI safety system flagged this prompt as potentially containing sensitive content.

Original message: ${reason}

📝 Recommendations:
1. Rephrase trigger words with cinematic alternatives
2. Focus on visual description, not medical/violent nature
3. Edit the segment prompt before regenerating`
}

// ============================================================================
// Main Video Generation Function
// ============================================================================

/**
 * Generate video using Veo 3.1 via Gemini API
 * Uses simple API key authentication (same as image generation)
 */
export async function generateVideoWithGeminiStudio(
  prompt: string,
  options: GeminiVideoOptions = {}
): Promise<GeminiVideoResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }
  
  const model = 'veo-3.1-generate-preview'
  // Use the Gemini API predictLongRunning endpoint for video generation
  // Based on Python SDK: google/genai/models.py _generate_videos method
  // The endpoint is :predictLongRunning, same as Vertex but with different auth
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`
  
  console.log(`[Gemini Studio Video] Generating with ${model}...`)
  console.log(`[Gemini Studio Video] Prompt preview: ${prompt.substring(0, 200)}...`)
  console.log(`[Gemini Studio Video] Options:`, JSON.stringify({
    aspectRatio: options.aspectRatio || '16:9',
    resolution: options.resolution || '720p',
    duration: options.durationSeconds || 8,
    hasStartFrame: !!options.startFrame,
    hasLastFrame: !!options.lastFrame,
    referenceImagesCount: options.referenceImages?.length || 0
  }))
  
  // Build the request body per Gemini API mldev format
  // Structure: { instances: [{ prompt, image?, ... }], parameters: { ... } }
  // Based on Python SDK: _GenerateVideosParameters_to_mldev
  const instance: Record<string, any> = {
    prompt: prompt
  }
  
  const parameters: Record<string, any> = {}
  
  // Add parameters (config options)
  if (options.aspectRatio) {
    parameters.aspectRatio = options.aspectRatio
  }
  
  if (options.resolution) {
    parameters.resolution = options.resolution
  }
  
  if (options.durationSeconds) {
    parameters.durationSeconds = options.durationSeconds
  }
  
  if (options.negativePrompt) {
    parameters.negativePrompt = options.negativePrompt
  }
  
  // Person generation setting
  // T2V: 'allow_all' only
  // I2V/FTV/REF: 'allow_adult' only
  const isImageBased = !!options.startFrame || (options.referenceImages && options.referenceImages.length > 0)
  parameters.personGeneration = isImageBased ? 'allow_adult' : 'allow_all'
  
  if (options.numberOfVideos) {
    parameters.sampleCount = options.numberOfVideos
  } else {
    parameters.sampleCount = 1
  }
  
  // Add start frame for I2V mode
  if (options.startFrame) {
    let imageData: string
    let mimeType = 'image/png'
    
    if (options.startFrame.startsWith('http')) {
      const result = await urlToBase64(options.startFrame)
      imageData = result.base64
      mimeType = result.mimeType
    } else if (options.startFrame.startsWith('data:')) {
      // Handle data URL
      const match = options.startFrame.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        mimeType = match[1]
        imageData = match[2]
      } else {
        imageData = options.startFrame
      }
    } else {
      imageData = options.startFrame
    }
    
    // Add image to instance for I2V mode
    instance.image = {
      bytesBase64Encoded: imageData,
      mimeType: mimeType
    }
    console.log('[Gemini Studio Video] Added start frame for I2V generation')
  }
  
  // Add last frame for interpolation (FTV mode)
  if (options.lastFrame) {
    let imageData: string
    let mimeType = 'image/png'
    
    if (options.lastFrame.startsWith('http')) {
      const result = await urlToBase64(options.lastFrame)
      imageData = result.base64
      mimeType = result.mimeType
    } else if (options.lastFrame.startsWith('data:')) {
      const match = options.lastFrame.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        mimeType = match[1]
        imageData = match[2]
      } else {
        imageData = options.lastFrame
      }
    } else {
      imageData = options.lastFrame
    }
    
    // lastFrame goes in instance for FTV interpolation
    instance.lastFrame = {
      bytesBase64Encoded: imageData,
      mimeType: mimeType
    }
    console.log('[Gemini Studio Video] Added last frame for FTV interpolation')
  }
  
  // Add reference images (REF mode) - T2V only, not compatible with I2V
  if (options.referenceImages && options.referenceImages.length > 0 && !options.startFrame) {
    const refs = await Promise.all(
      options.referenceImages.slice(0, 3).map(async (ref) => {
        // Check url first (from API route), then imageUrl (legacy), then base64Image
        const imageSource = ref.url || ref.base64Image || ref.imageUrl
        if (!imageSource) return null
        
        let imageData: string
        let mimeType = ref.mimeType || 'image/png'
        
        if (imageSource.startsWith('http')) {
          const result = await urlToBase64(imageSource)
          imageData = result.base64
          mimeType = result.mimeType
        } else {
          imageData = imageSource
        }
        
        // Map type to Veo's referenceType (must be uppercase per API spec)
        const refType = ref.referenceType || (ref.type === 'style' ? 'STYLE' : 'ASSET')
        
        return {
          image: {
            bytesBase64Encoded: imageData,
            mimeType: mimeType
          },
          referenceType: refType.toUpperCase() // Ensure uppercase: ASSET or STYLE
        }
      })
    )
    
    const validRefs = refs.filter(Boolean)
    if (validRefs.length > 0) {
      // CRITICAL: referenceImages goes in instance, NOT in parameters
      // Per SDK: common.setValueByPath(parentObject, ['instances[0]', 'referenceImages'], ...)
      instance.referenceImages = validRefs
      console.log(`[Gemini Studio Video] Added ${validRefs.length} reference images`)
    }
  }
  
  // Build the final request body with instances and parameters
  const requestBody = {
    instances: [instance],
    parameters: parameters
  }
  
  console.log('[Gemini Studio Video] Instance keys:', Object.keys(instance))
  console.log('[Gemini Studio Video] Parameters keys:', Object.keys(parameters))
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini Studio Video] Error response:', errorText)
      
      // Handle specific error codes
      if (response.status === 429) {
        return {
          status: 'FAILED',
          error: 'Rate limit exceeded. Please wait a moment and try again.'
        }
      }
      if (response.status === 400) {
        return {
          status: 'FAILED',
          error: `Bad request: ${errorText}`
        }
      }
      if (response.status === 403) {
        return {
          status: 'FAILED',
          error: 'API key invalid or Veo not available with this key.'
        }
      }
      
      return {
        status: 'FAILED',
        error: `Gemini API error ${response.status}: ${errorText}`
      }
    }
    
    const data = await response.json()
    console.log('[Gemini Studio Video] Response:', JSON.stringify(data).substring(0, 500))
    
    // Check for immediate error
    if (data.error) {
      return {
        status: 'FAILED',
        error: data.error.message || 'Unknown Gemini API error'
      }
    }
    
    // Gemini API returns an operation for async processing
    // The operation name is used for polling
    const operationName = data.name
    if (!operationName) {
      // Check if video is already complete (unlikely for video generation)
      if (data.done && data.response?.generatedVideos?.[0]) {
        const video = data.response.generatedVideos[0].video
        return {
          status: 'COMPLETED',
          videoUrl: video?.uri || video?.url,
          operationName: 'completed'
        }
      }
      
      console.error('[Gemini Studio Video] No operation name in response:', data)
      return {
        status: 'FAILED',
        error: 'No operation ID returned from Gemini API'
      }
    }
    
    console.log('[Gemini Studio Video] Operation started:', operationName)
    
    return {
      status: 'QUEUED',
      operationName: operationName,
      estimatedWaitSeconds: 120
    }
  } catch (error: any) {
    console.error('[Gemini Studio Video] Request error:', error)
    return {
      status: 'FAILED',
      error: error.message || 'Failed to initiate video generation'
    }
  }
}

// ============================================================================
// Operation Polling
// ============================================================================

/**
 * Check the status of a video generation operation
 */
export async function checkGeminiVideoStatus(
  operationName: string
): Promise<GeminiVideoResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable')
  }
  
  // Poll operation status using the operations endpoint
  // Format: https://generativelanguage.googleapis.com/v1beta/{operationName}?key={apiKey}
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
  
  console.log('[Gemini Studio Video] Checking status:', operationName)
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini Studio Video] Status check error:', errorText)
      return {
        status: 'FAILED',
        error: `Status check failed: ${response.status}`
      }
    }
    
    const data = await response.json()
    console.log('[Gemini Studio Video] Status response:', JSON.stringify(data).substring(0, 500))
    
    // Check for error
    if (data.error) {
      return {
        status: 'FAILED',
        error: data.error.message || 'Generation failed'
      }
    }
    
    // Check if done
    if (!data.done) {
      return {
        status: 'PROCESSING',
        operationName: operationName
      }
    }
    
    // Check for RAI filtering
    // Python SDK checks: response.generateVideoResponse.raiMediaFilteredCount
    const generateVideoResponse = data.response?.generateVideoResponse || data.response
    const raiFilteredCount = generateVideoResponse?.raiMediaFilteredCount
    const raiReasons = generateVideoResponse?.raiMediaFilteredReasons
    if (raiFilteredCount && raiFilteredCount > 0) {
      const reason = raiReasons?.[0] || 'Content was filtered by safety policies'
      console.error('[Gemini Studio Video] Content filtered by RAI:', reason)
      return {
        status: 'FAILED',
        error: buildRAIFilteredErrorMessage(reason)
      }
    }
    
    // Extract video from response
    // Python SDK mldev uses: response.generateVideoResponse.generatedSamples[0].video
    // But may also be: response.generatedVideos[0].video
    const generatedSamples = generateVideoResponse?.generatedSamples || 
                             generateVideoResponse?.generatedVideos ||
                             data.response?.generatedVideos
    if (generatedSamples && generatedSamples.length > 0) {
      const videoEntry = generatedSamples[0]
      const video = videoEntry.video || videoEntry
      
      // Video may be a file reference that needs to be downloaded
      if (video?.name) {
        console.log('[Gemini Studio Video] Video completed! File:', video.name)
        return {
          status: 'COMPLETED',
          videoUrl: `file:${video.name}`,
          operationName: operationName
        }
      }
      
      // Or it may have a direct URI
      if (video?.uri || video?.url) {
        console.log('[Gemini Studio Video] Video completed! URI:', video.uri || video.url)
        return {
          status: 'COMPLETED',
          videoUrl: video.uri || video.url,
          operationName: operationName
        }
      }
    }
    
    console.error('[Gemini Studio Video] Done but no video found:', JSON.stringify(data))
    return {
      status: 'FAILED',
      error: 'Generation completed but no video was returned'
    }
  } catch (error: any) {
    console.error('[Gemini Studio Video] Status check error:', error)
    return {
      status: 'FAILED',
      error: error.message || 'Failed to check operation status'
    }
  }
}

// ============================================================================
// Video Download (Files API)
// ============================================================================

/**
 * Download video file from Gemini Files API
 * The video reference format is "files/{fileId}"
 */
export async function downloadGeminiVideoFile(
  fileReference: string
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable')
  }
  
  // Extract file ID from reference
  let fileId = fileReference
  if (fileReference.startsWith('file:')) {
    fileId = fileReference.replace('file:', '')
  }
  
  // Download from Files API
  // GET https://generativelanguage.googleapis.com/v1beta/{name}:download?key={apiKey}
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${fileId}:download?key=${apiKey}&alt=media`
  
  console.log('[Gemini Studio Video] Downloading file:', fileId)
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini Studio Video] Download error:', errorText)
      return null
    }
    
    const buffer = await response.arrayBuffer()
    console.log('[Gemini Studio Video] Downloaded video:', buffer.byteLength, 'bytes')
    
    return Buffer.from(buffer)
  } catch (error: any) {
    console.error('[Gemini Studio Video] Download error:', error)
    return null
  }
}

// ============================================================================
// Wait for Completion (Polling Loop)
// ============================================================================

/**
 * Wait for video generation to complete, polling periodically
 */
export async function waitForGeminiVideoCompletion(
  operationName: string,
  maxWaitSeconds: number = 240,
  pollIntervalSeconds: number = 10
): Promise<GeminiVideoResult> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitSeconds * 1000
  
  console.log(`[Gemini Studio Video] Waiting for completion (max ${maxWaitSeconds}s)...`)
  
  while (Date.now() - startTime < maxWaitMs) {
    const result = await checkGeminiVideoStatus(operationName)
    
    if (result.status === 'COMPLETED' || result.status === 'FAILED') {
      return result
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000))
  }
  
  console.error('[Gemini Studio Video] Timeout waiting for completion')
  return {
    status: 'FAILED',
    error: `Video generation timed out after ${maxWaitSeconds} seconds`,
    operationName: operationName
  }
}
