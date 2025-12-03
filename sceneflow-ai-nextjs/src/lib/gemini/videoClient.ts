/**
 * Gemini API Video Generation Client
 * Uses Veo 3.1 (veo-3.1-generate-preview) for video generation
 * Supports Text-to-Video (T2V) and Image-to-Video (I2V)
 * 
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

interface ReferenceImage {
  imageUrl?: string
  base64Image?: string
  referenceType?: 'asset' | 'style'
}

interface VideoGenerationOptions {
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
  durationSeconds?: 4 | 6 | 8
  negativePrompt?: string
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  startFrame?: string // Base64 or URL for I2V
  lastFrame?: string // For interpolation
  referenceImages?: ReferenceImage[] // Up to 3 for Veo 3.1
}

interface VideoGenerationResult {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  operationName?: string
  videoUrl?: string
  error?: string
  estimatedWaitSeconds?: number
}

/**
 * Convert URL to base64 image data
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

/**
 * Trigger video generation using Veo 3.1
 * Returns an operation name for polling
 */
export async function generateVideoWithVeo(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<VideoGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  // Available models: veo-2.0-generate-001, veo-3.0-generate-001, veo-3.0-fast-generate-001
  // Using Veo 3 for best quality + native audio generation
  const model = 'veo-3.0-generate-001'
  console.log(`[Veo Video] Generating video with ${model}...`)
  console.log('[Veo Video] Prompt:', prompt.substring(0, 200))
  console.log('[Veo Video] Options:', JSON.stringify({
    aspectRatio: options.aspectRatio || '16:9',
    resolution: options.resolution || '720p',
    duration: options.durationSeconds || 8,
    hasStartFrame: !!options.startFrame,
    hasLastFrame: !!options.lastFrame,
    referenceImagesCount: options.referenceImages?.length || 0
  }))

  // Build request body for Veo API
  // Veo uses a different endpoint structure than generateContent
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateVideos?key=${apiKey}`

  // Build config object
  const config: Record<string, any> = {
    aspect_ratio: options.aspectRatio || '16:9',
    duration_seconds: options.durationSeconds || 8,
    person_generation: options.personGeneration || 'allow_adult'
  }

  // Add resolution if 1080p (720p is default)
  if (options.resolution === '1080p') {
    config.resolution = '1080p'
  }

  // Add negative prompt if provided
  if (options.negativePrompt) {
    config.negative_prompt = options.negativePrompt
  }

  // Add last frame for interpolation
  if (options.lastFrame) {
    const lastFrameData = options.lastFrame.startsWith('http')
      ? await urlToBase64(options.lastFrame)
      : options.lastFrame
    config.last_frame = {
      image: {
        bytes_base64_encoded: lastFrameData
      }
    }
  }

  // Add reference images (Veo 3.1 feature)
  if (options.referenceImages && options.referenceImages.length > 0) {
    const refs = await Promise.all(
      options.referenceImages.slice(0, 3).map(async (ref) => {
        const imageData = ref.base64Image || (ref.imageUrl ? await urlToBase64(ref.imageUrl) : null)
        if (!imageData) return null
        return {
          image: {
            bytes_base64_encoded: imageData
          },
          reference_type: ref.referenceType || 'asset'
        }
      })
    )
    config.reference_images = refs.filter(Boolean)
  }

  // Build request body
  const requestBody: Record<string, any> = {
    prompt: prompt,
    config: config
  }

  // Add start frame for I2V
  if (options.startFrame) {
    const startFrameData = options.startFrame.startsWith('http')
      ? await urlToBase64(options.startFrame)
      : options.startFrame
    requestBody.image = {
      bytes_base64_encoded: startFrameData
    }
    console.log('[Veo Video] Added start frame for I2V generation')
  }

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
      console.error('[Veo Video] Error response:', errorText)

      let hint = ''
      if (response.status === 403) {
        hint = 'API key invalid or unauthorized for Veo.'
      } else if (response.status === 404) {
        hint = `Model ${model} not found or not accessible.`
      } else if (response.status === 400) {
        hint = 'Bad request. Check prompt and parameters.'
      } else if (response.status === 429) {
        hint = 'Rate limit exceeded. Please wait and try again.'
      }

      return {
        status: 'FAILED',
        error: `Veo API error ${response.status}: ${errorText}. ${hint}`
      }
    }

    const data = await response.json()
    console.log('[Veo Video] Response:', JSON.stringify(data).substring(0, 500))

    // Check for immediate error in response
    if (data.error) {
      return {
        status: 'FAILED',
        error: data.error.message || 'Unknown Veo error'
      }
    }

    // Veo returns an operation for async processing
    // The operation name is used for polling
    const operationName = data.name || data.operation?.name
    if (!operationName) {
      // Check if video is already done (unlikely but possible)
      if (data.done && data.response?.generatedVideos?.[0]?.video) {
        const videoFile = data.response.generatedVideos[0].video
        return {
          status: 'COMPLETED',
          videoUrl: videoFile.uri || videoFile.url,
          operationName: 'completed'
        }
      }

      console.error('[Veo Video] No operation name in response:', data)
      return {
        status: 'FAILED',
        error: 'No operation ID returned from Veo API'
      }
    }

    return {
      status: 'QUEUED',
      operationName: operationName,
      estimatedWaitSeconds: 120 // Veo typically takes 1-3 minutes
    }
  } catch (error: any) {
    console.error('[Veo Video] Request error:', error)
    return {
      status: 'FAILED',
      error: error.message || 'Failed to initiate video generation'
    }
  }
}

/**
 * Check the status of a video generation operation
 */
export async function checkVideoGenerationStatus(
  operationName: string
): Promise<VideoGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  // Extract just the operation ID if full name provided
  const opId = operationName.includes('/') 
    ? operationName.split('/').pop() 
    : operationName

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/operations/${opId}?key=${apiKey}`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Veo Video] Status check error:', errorText)
      return {
        status: 'FAILED',
        error: `Status check failed: ${response.status}`
      }
    }

    const data = await response.json()
    console.log('[Veo Video] Status check response:', JSON.stringify(data).substring(0, 300))

    if (data.error) {
      return {
        status: 'FAILED',
        error: data.error.message || 'Generation failed'
      }
    }

    if (data.done) {
      // Check for error in result
      if (data.error) {
        return {
          status: 'FAILED',
          error: data.error.message || 'Generation failed'
        }
      }

      // Extract video URL from response
      const generatedVideos = data.response?.generatedVideos || data.result?.generatedVideos
      if (generatedVideos && generatedVideos.length > 0) {
        const video = generatedVideos[0].video
        // The video object may have uri, url, or need to be downloaded
        const videoUrl = video?.uri || video?.url
        
        if (videoUrl) {
          return {
            status: 'COMPLETED',
            videoUrl: videoUrl,
            operationName: operationName
          }
        } else {
          // Video may need to be downloaded using Files API
          return {
            status: 'COMPLETED',
            operationName: operationName,
            // Return the video object for download handling
            videoUrl: `file:${video.name || operationName}`
          }
        }
      }

      return {
        status: 'FAILED',
        error: 'No video in completed response'
      }
    }

    // Still processing
    const metadata = data.metadata || {}
    return {
      status: 'PROCESSING',
      operationName: operationName,
      estimatedWaitSeconds: metadata.estimatedTimeRemaining || 60
    }
  } catch (error: any) {
    console.error('[Veo Video] Status check error:', error)
    return {
      status: 'FAILED',
      error: error.message || 'Status check failed'
    }
  }
}

/**
 * Download a video file from Gemini Files API
 */
export async function downloadVideoFile(
  fileName: string
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  // Extract file name from file: prefix if present
  const cleanName = fileName.startsWith('file:') ? fileName.substring(5) : fileName

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/files/${cleanName}:download?key=${apiKey}`

  try {
    const response = await fetch(endpoint)
    
    if (!response.ok) {
      console.error('[Veo Video] File download failed:', response.status)
      return null
    }

    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  } catch (error) {
    console.error('[Veo Video] File download error:', error)
    return null
  }
}

/**
 * Poll for video completion with timeout
 */
export async function waitForVideoCompletion(
  operationName: string,
  maxWaitSeconds: number = 300,
  pollIntervalSeconds: number = 10
): Promise<VideoGenerationResult> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitSeconds * 1000

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkVideoGenerationStatus(operationName)

    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
      return status
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000))
  }

  return {
    status: 'FAILED',
    error: `Video generation timed out after ${maxWaitSeconds} seconds`,
    operationName: operationName
  }
}
