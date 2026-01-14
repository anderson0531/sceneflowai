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
  // Veo 3.1 Extension Mode (EXT) - True video continuation
  // Pass the veoVideoRef from a previous generation still in Gemini's 2-day cache
  sourceVideo?: string // Gemini Files API reference (e.g., "files/xxx") for video extension
}

export interface GeminiVideoResult {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  operationName?: string
  videoUrl?: string
  videoBase64?: string
  mimeType?: string
  error?: string
  estimatedWaitSeconds?: number
  // Veo video reference for future extension - stores Gemini Files API reference
  // Valid for 2 days in Gemini's cache, required for true EXT mode
  veoVideoRef?: string
  veoVideoRefExpiry?: string // ISO timestamp when veoVideoRef expires (48 hours from generation)
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
    hasSourceVideo: !!options.sourceVideo,
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
    // Defensive validation: ensure duration is exactly 4, 6, or 8
    // Snap to nearest valid value if needed
    let duration = options.durationSeconds
    if (![4, 6, 8].includes(duration)) {
      const snapped = duration <= 5 ? 4 : duration <= 7 ? 6 : 8
      console.warn(`[Gemini Studio Video] Invalid duration ${duration}, snapping to ${snapped}`)
      duration = snapped as 4 | 6 | 8
    }
    parameters.durationSeconds = duration
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
  
  // Add source video for EXT mode (true video extension)
  // This uses a Veo-generated video reference from Gemini's Files API (valid for 2 days)
  // Note: sourceVideo is mutually exclusive with startFrame - you either extend a video OR use an image
  if (options.sourceVideo && !options.startFrame) {
    // sourceVideo should be a Gemini Files API reference like "files/xxx"
    // Pass it as a video object in the instance
    instance.video = {
      fileUri: options.sourceVideo.startsWith('files/') 
        ? `https://generativelanguage.googleapis.com/v1beta/${options.sourceVideo}`
        : options.sourceVideo
    }
    console.log('[Gemini Studio Video] Added source video for EXT (extension) mode')
    console.log('[Gemini Studio Video] Source video ref:', options.sourceVideo)
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
        
        // Map type to Veo's referenceType (lowercase per Python SDK: 'asset' or 'style')
        const refType = ref.referenceType || (ref.type === 'style' ? 'style' : 'asset')
        
        return {
          image: {
            bytesBase64Encoded: imageData,
            mimeType: mimeType
          },
          referenceType: refType.toLowerCase() // Ensure lowercase: asset or style
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
  
  // Debug: Log full request structure (with base64 truncated)
  const debugRequestBody = JSON.parse(JSON.stringify(requestBody))
  if (debugRequestBody.instances?.[0]?.image?.bytesBase64Encoded) {
    debugRequestBody.instances[0].image.bytesBase64Encoded = `[BASE64_TRUNCATED: ${debugRequestBody.instances[0].image.bytesBase64Encoded.length} chars]`
  }
  if (debugRequestBody.instances?.[0]?.lastFrame?.bytesBase64Encoded) {
    debugRequestBody.instances[0].lastFrame.bytesBase64Encoded = `[BASE64_TRUNCATED: ${debugRequestBody.instances[0].lastFrame.bytesBase64Encoded.length} chars]`
  }
  if (debugRequestBody.instances?.[0]?.referenceImages) {
    debugRequestBody.instances[0].referenceImages = debugRequestBody.instances[0].referenceImages.map((ref: any) => ({
      ...ref,
      image: { ...ref.image, bytesBase64Encoded: `[BASE64_TRUNCATED: ${ref.image?.bytesBase64Encoded?.length || 0} chars]` }
    }))
  }
  console.log('[Gemini Studio Video] Full request body (debug):', JSON.stringify(debugRequestBody, null, 2))
  
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
      console.error('[Gemini Studio Video] HTTP Status:', response.status)
      console.error('[Gemini Studio Video] Error response (full):', errorText)
      
      // Try to parse JSON error for more details
      try {
        const errorJson = JSON.parse(errorText)
        console.error('[Gemini Studio Video] Parsed error:', JSON.stringify(errorJson, null, 2))
        if (errorJson.error?.details) {
          console.error('[Gemini Studio Video] Error details:', JSON.stringify(errorJson.error.details, null, 2))
        }
      } catch {
        // Not JSON, keep raw error
      }
      
      // Handle specific error codes
      if (response.status === 429) {
        return {
          status: 'FAILED',
          error: 'Rate limit exceeded. Please wait a moment and try again.'
        }
      }
      if (response.status === 400) {
        // Include the full error for debugging
        return {
          status: 'FAILED',
          error: `Bad request (400): ${errorText.substring(0, 500)}`
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
        // Calculate expiry time (48 hours from now) for veoVideoRef cache
        const expiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
        return {
          status: 'COMPLETED',
          videoUrl: `file:${video.name}`,
          operationName: operationName,
          // Store the Gemini Files API reference for future video extension (EXT mode)
          // Valid for 2 days in Gemini's cache
          veoVideoRef: video.name,
          veoVideoRefExpiry: expiryDate.toISOString()
        }
      }
      
      // Or it may have a direct URI
      if (video?.uri || video?.url) {
        console.log('[Gemini Studio Video] Video completed! URI:', video.uri || video.url)
        // Try to extract file reference from URI for future extension
        // Format: https://generativelanguage.googleapis.com/v1beta/files/xxx or files/xxx
        const videoUri = video.uri || video.url
        let extractedRef: string | undefined = undefined
        const fileMatch = videoUri.match(/files\/([^/?]+)/)
        if (fileMatch) {
          extractedRef = `files/${fileMatch[1]}`
        }
        // Calculate expiry time (48 hours from now) for veoVideoRef cache
        const expiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
        return {
          status: 'COMPLETED',
          videoUrl: videoUri,
          operationName: operationName,
          veoVideoRef: extractedRef,
          veoVideoRefExpiry: extractedRef ? expiryDate.toISOString() : undefined
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

// ============================================================================
// Video Modification (V2V Operations)
// ============================================================================

/**
 * Configuration for video modification operations
 */
export interface VideoModifyConfig {
  /** Operation mode: 'extend' continues video, 'edit' performs masked inpainting */
  mode: 'extend' | 'edit'
  /** Prompt describing the continuation or edit */
  prompt: string
  /** Source video reference (Gemini Files API ref like "files/xxx") - required */
  sourceVideoRef: string
  /** Mask image for edit mode - base64 or URL (white = edit region) */
  maskImage?: string
  /** Text instruction for edit mode (alternative to mask) */
  editInstruction?: string
  /** Video generation options */
  options?: Omit<GeminiVideoOptions, 'sourceVideo' | 'startFrame' | 'lastFrame'>
}

export interface VideoModifyResult extends GeminiVideoResult {
  /** The modification mode that was used */
  modifyMode: 'extend' | 'edit'
}

/**
 * Check if a veoVideoRef is still valid for extension (within 48-hour cache window)
 */
export function isVeoVideoRefValid(expiryIso?: string): boolean {
  if (!expiryIso) return false
  try {
    const expiry = new Date(expiryIso)
    return expiry.getTime() > Date.now()
  } catch {
    return false
  }
}

/**
 * Modify an existing video using Veo 3.1 capabilities
 * 
 * Supports two modes:
 * 1. **Extend** - Continue a video beyond its current length using the sourceVideoRef
 *    - Requires a Veo-generated video still in Gemini's 2-day cache
 *    - Prompt describes what happens next in the video
 * 
 * 2. **Edit** - Modify specific regions of a video using mask/instruction
 *    - NOT YET AVAILABLE in Veo 3.1 public API (January 2026)
 *    - Will return an informative error until API support is added
 * 
 * @param config - Video modification configuration
 * @returns Promise<VideoModifyResult> - Result of the modification operation
 */
export async function modifyVideoWithGemini(
  config: VideoModifyConfig
): Promise<VideoModifyResult> {
  const { mode, prompt, sourceVideoRef, maskImage, editInstruction, options = {} } = config
  
  console.log(`[Gemini Video Modify] Mode: ${mode}`)
  console.log(`[Gemini Video Modify] Source video ref: ${sourceVideoRef}`)
  
  // Validate source video reference
  if (!sourceVideoRef) {
    return {
      status: 'FAILED',
      error: 'Source video reference is required for video modification',
      modifyMode: mode
    }
  }
  
  // Handle EXTEND mode - use generateVideoWithGeminiStudio with sourceVideo
  if (mode === 'extend') {
    console.log('[Gemini Video Modify] Using extension mode')
    
    const result = await generateVideoWithGeminiStudio(prompt, {
      ...options,
      sourceVideo: sourceVideoRef
    })
    
    return {
      ...result,
      modifyMode: 'extend'
    }
  }
  
  // Handle EDIT mode - NOT YET AVAILABLE
  if (mode === 'edit') {
    console.warn('[Gemini Video Modify] Edit (inpainting) mode requested but not yet available')
    
    // Check if mask or instruction was provided
    const hasEditInput = !!maskImage || !!editInstruction
    
    return {
      status: 'FAILED',
      error: `⚠️ Video Editing (Inpainting) Not Yet Available

Veo 3.1's video inpainting feature is not yet publicly available in the API (as of January 2026).

${hasEditInput ? `Your edit request:
${maskImage ? '• Mask image provided' : ''}
${editInstruction ? `• Instruction: "${editInstruction}"` : ''}
${prompt ? `• Prompt: "${prompt.substring(0, 100)}..."` : ''}

` : ''}**Current Alternatives:**

1. **Edit the frame, regenerate video**
   - Use the Image Edit feature to modify a key frame
   - Then regenerate the video segment using I2V mode

2. **Use Reference Images**
   - Add character/style reference images
   - Regenerate with T2V + REF mode for consistency

3. **Extend instead**
   - If you want to continue the video, use "Extend" mode

We'll enable this feature automatically when Veo 3.1 API support becomes available.`,
      modifyMode: 'edit'
    }
  }
  
  return {
    status: 'FAILED',
    error: `Unknown modification mode: ${mode}`,
    modifyMode: mode
  }
}
