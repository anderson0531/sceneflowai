import { GoogleAuth } from 'google-auth-library';

/**
 * Get Google OAuth2 Bearer token for Vertex AI
 * Supports both file-based credentials (GOOGLE_APPLICATION_CREDENTIALS) 
 * and JSON string credentials (GOOGLE_APPLICATION_CREDENTIALS_JSON) for serverless
 */
async function getVertexAccessToken(): Promise<string> {
  // For serverless environments (Vercel), use JSON credentials from env var
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  // Debug logging
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON exists:', !!credentialsJson);
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON length:', credentialsJson?.length || 0);
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS exists:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  let authOptions: any = {
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/aiplatform'
    ]
  };
  
  if (credentialsJson) {
    try {
      // Handle case where the JSON might be double-encoded or have extra escaping
      let jsonToParse = credentialsJson;
      
      // If it starts with a quote, it might be double-stringified
      if (jsonToParse.startsWith('"') && jsonToParse.endsWith('"')) {
        jsonToParse = JSON.parse(jsonToParse);
      }
      
      const credentials = JSON.parse(jsonToParse);
      console.log('[Vertex AI Auth] Parsed credentials successfully');
      console.log('[Vertex AI Auth] Service account email:', credentials.client_email);
      console.log('[Vertex AI Auth] Project ID:', credentials.project_id);
      
      authOptions.credentials = credentials;
      authOptions.projectId = credentials.project_id;
    } catch (e) {
      console.error('[Vertex AI Auth] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
      console.error('[Vertex AI Auth] First 100 chars:', credentialsJson?.substring(0, 100));
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format: ' + (e as Error).message);
    }
  } else {
    console.warn('[Vertex AI Auth] No GOOGLE_APPLICATION_CREDENTIALS_JSON found, falling back to ADC');
  }
  
  try {
    const auth = new GoogleAuth(authOptions);
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Failed to obtain Vertex AI access token');
    }
    console.log('[Vertex AI Auth] Successfully obtained access token');
    return tokenResponse.token;
  } catch (authError) {
    console.error('[Vertex AI Auth] Authentication failed:', authError);
    throw authError;
  }
}
/**
 * Gemini API Video Generation Client
 * Uses Veo 3.1 (veo-3.1-generate-preview) for video generation
 * 
 * Supported Generation Modes:
 * 1. T2V (Text-to-Video): Prompt only, basic generation
 * 2. REF (Reference Images): T2V + up to 3 reference images for style/character guidance
 *    - CANNOT be combined with startFrame (I2V)
 *    - referenceImages goes in 'config' object per Gemini API format
 * 3. I2V (Image-to-Video): Uses startFrame as the first frame
 *    - Animates from a static image
 * 4. FTV (Frame-to-Video/Interpolation): Uses BOTH startFrame AND lastFrame
 *    - Creates smooth transition between two frames
 *    - lastFrame is REQUIRED for proper interpolation
 * 5. EXT (Extension): Extends a previous Veo-generated video
 *    - Only works with videos still in Gemini's system
 *    - For external videos, use I2V with last frame instead
 * 
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

interface ReferenceImage {
  imageUrl?: string
  url?: string  // Alternative URL field name
  base64Image?: string
  referenceType?: 'asset' | 'style'
  type?: 'style' | 'character'  // Alternative type field name (maps to referenceType)
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
  sourceVideoUrl?: string // URL of video to extend (EXT mode) - Veo handles frame continuity automatically
}

interface VideoGenerationResult {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  operationName?: string
  videoUrl?: string
  veoVideoRef?: string  // Gemini Files API reference (e.g., "files/xxx") for video extension
  error?: string
  estimatedWaitSeconds?: number
}

/**
 * Convert URL to base64 image data with mimeType
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
    mimeType: contentType.split(';')[0] // Remove charset if present
  }
}

/**
 * Trigger video generation using Veo 3.1
 * Returns an operation name for polling
 */
export async function generateVideoWithVeo(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<VideoGenerationResult> {
  // Vertex AI endpoint config
  const project = process.env.VERTEX_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const model = 'veo-3.1-generate-preview'
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')
  // Vertex endpoint: https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL:predictLongRunning
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predictLongRunning`
  console.log(`[Veo Video] Generating video with ${model} on Vertex AI...`)
  console.log('[Veo Video] Prompt:', prompt.substring(0, 200))
  console.log('[Veo Video] Options:', JSON.stringify({
    aspectRatio: options.aspectRatio || '16:9',
    resolution: options.resolution || '720p',
    duration: options.durationSeconds || 8,
    hasStartFrame: !!options.startFrame,
    hasLastFrame: !!options.lastFrame,
    referenceImagesCount: options.referenceImages?.length || 0
  }))

  // Build instances array (Veo uses Vertex AI-style request format)
  const instance: Record<string, any> = {
    prompt: prompt
  }

  // Add start frame for I2V
  if (options.startFrame) {
    let startFrameData: string
    let mimeType = 'image/png'
    
    if (options.startFrame.startsWith('http')) {
      const result = await urlToBase64(options.startFrame)
      startFrameData = result.base64
      mimeType = result.mimeType
    } else {
      startFrameData = options.startFrame
    }
    
    instance.image = {
      bytesBase64Encoded: startFrameData,
      mimeType: mimeType
    }
    console.log('[Veo Video] Added start frame for I2V generation, mimeType:', mimeType)
  }

  // Note: Video extension (EXT mode) only works with Veo-generated videos that are still
  // in Gemini's system (from a previous operation.response). For videos stored externally
  // (like Vercel Blob), we use I2V with the last frame instead.
  // The sourceVideoUrl option is kept for future use if we implement proper Veo operation chaining.
  if (options.sourceVideoUrl) {
    console.log('[Veo Video] sourceVideoUrl provided, but video extension only works with Veo-generated videos.')
    console.log('[Veo Video] For external videos, use I2V with the last frame as startFrame instead.')
    // Don't add video to instance - caller should extract last frame and use I2V
  }

  // Build parameters object
  // Note: For Veo 3 text-to-video, personGeneration must be 'allow_all'
  // For image-to-video, it should be 'allow_adult'
  const isImageToVideo = !!options.startFrame
  const parameters: Record<string, any> = {
    aspectRatio: options.aspectRatio || '16:9',
    durationSeconds: options.durationSeconds || 8,
    personGeneration: isImageToVideo ? 'allow_adult' : 'allow_all'
  }

  // Add resolution if 1080p (720p is default)
  if (options.resolution === '1080p') {
    parameters.resolution = '1080p'
  }

  // Add negative prompt if provided
  if (options.negativePrompt) {
    parameters.negativePrompt = options.negativePrompt
  }

  // Add last frame for interpolation
  if (options.lastFrame) {
    let lastFrameData: string
    let mimeType = 'image/png'
    
    if (options.lastFrame.startsWith('http')) {
      const result = await urlToBase64(options.lastFrame)
      lastFrameData = result.base64
      mimeType = result.mimeType
    } else {
      lastFrameData = options.lastFrame
    }
    
    parameters.lastFrame = {
      image: {
        bytesBase64Encoded: lastFrameData,
        mimeType: mimeType
      }
    }
  }

  // Build config object for Gemini API-style parameters
  // The Gemini API uses 'config' for certain features like referenceImages
  const config: Record<string, any> = {}

  // Add reference images to config (Veo 3.1 feature - T2V only, NOT compatible with I2V)
  // Per Gemini API docs: referenceImages goes in config.reference_images, not parameters
  // IMPORTANT: referenceImages cannot be used with startFrame (image parameter)
  if (options.referenceImages && options.referenceImages.length > 0) {
    // Safety check: referenceImages is T2V only
    if (options.startFrame) {
      console.warn('[Veo Video] WARNING: referenceImages cannot be used with startFrame (I2V)')
      console.warn('[Veo Video] Ignoring referenceImages - using I2V mode instead')
      // Skip adding referenceImages when startFrame is present
    } else {
      const refs = await Promise.all(
        options.referenceImages.slice(0, 3).map(async (ref) => {
          // Support both imageUrl and url field names
          const imageSource = ref.base64Image || ref.imageUrl || ref.url
          if (!imageSource) return null
          
          let imageData: string
          let mimeType = 'image/png'
          
          if (imageSource.startsWith('http')) {
            const result = await urlToBase64(imageSource)
            imageData = result.base64
            mimeType = result.mimeType
          } else {
            imageData = imageSource
          }
            
          // Map 'character' type to 'asset', keep 'style' as 'style'
          const refType = ref.referenceType || (ref.type === 'style' ? 'style' : 'asset')
          
          return {
            image: {
              bytesBase64Encoded: imageData,
              mimeType: mimeType
            },
            referenceType: refType
          }
        })
      )
      const validRefs = refs.filter(Boolean)
      if (validRefs.length > 0) {
        // Per Gemini API: reference_images goes in config object, not parameters
        config.referenceImages = validRefs
        console.log('[Veo Video] Added', validRefs.length, 'reference images to config')
      }
    }
  }

  // Build request body
  // The Gemini API predictLongRunning uses instances + parameters + config structure
  const requestBody: Record<string, any> = {
    instances: [instance],
    parameters: parameters
  }
  
  // Add config object if it has any properties (e.g., referenceImages)
  if (Object.keys(config).length > 0) {
    requestBody.config = config
    console.log('[Veo Video] Request includes config object with keys:', Object.keys(config))
  }

  try {
    const accessToken = await getVertexAccessToken();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Veo Video] Error response:', errorText);
      return {
        status: 'FAILED',
        error: `Vertex AI error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    console.log('[Veo Video] Response:', JSON.stringify(data).substring(0, 500));

    // Check for immediate error in response
    if (data.error) {
      return {
        status: 'FAILED',
        error: data.error.message || 'Unknown Vertex AI error'
      };
    }

    // Vertex AI returns an operation for async processing
    // The operation name is used for polling
    // Vertex AI returns the full operation name as data.name
    const operationName = data.name || data.operation?.name;
    if (!operationName) {
      // Check if video is already done (unlikely but possible)
      if (data.done && data.response?.generatedVideos?.[0]?.video) {
        const videoFile = data.response.generatedVideos[0].video;
        return {
          status: 'COMPLETED',
          videoUrl: videoFile.uri || videoFile.url,
          operationName: 'completed'
        };
      }
      console.error('[Veo Video] No operation name in response:', data);
      return {
        status: 'FAILED',
        error: 'No operation ID returned from Vertex AI'
      };
    }

    return {
      status: 'QUEUED',
      operationName: operationName,
      estimatedWaitSeconds: 120 // Veo typically takes 1-3 minutes
    };
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
  const project = process.env.VERTEX_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')
  // Vertex operation endpoint: https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/operations/OPERATION_ID
  // operationName may be full or just the ID; handle both
  let opId = operationName
  if (operationName.startsWith('projects/')) {
    // Already full path
    opId = operationName.split('/operations/')[1] || operationName
  }
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/operations/${opId}`
  console.log('[Veo Video] Checking status at:', endpoint)

  try {
    const accessToken = await getVertexAccessToken();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
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
      // The API may return in different formats:
      // 1. data.response.generateVideoResponse.generatedSamples[].video (predictLongRunning format)
      // 2. data.response.generatedVideos[].video (generateVideos format)
      // 3. data.result.generatedVideos[].video (alternative format)
      const generateVideoResponse = data.response?.generateVideoResponse
      const generatedSamples = generateVideoResponse?.generatedSamples
      const generatedVideos = data.response?.generatedVideos || data.result?.generatedVideos
      
      // Try generatedSamples first (predictLongRunning response format)
      if (generatedSamples && generatedSamples.length > 0) {
        const video = generatedSamples[0].video
        const videoUrl = video?.uri || video?.url
        const veoVideoRef = video?.name  // Store the Files API reference for video extension
        
        if (videoUrl) {
          console.log('[Veo Video] Video completed! URI:', videoUrl.substring(0, 100))
          console.log('[Veo Video] Video reference for extension:', veoVideoRef)
          return {
            status: 'COMPLETED',
            videoUrl: videoUrl,
            veoVideoRef: veoVideoRef,
            operationName: operationName
          }
        } else if (video?.name) {
          // Video may need to be downloaded using Files API
          return {
            status: 'COMPLETED',
            operationName: operationName,
            videoUrl: `file:${video.name}`,
            veoVideoRef: video.name
          }
        }
      }
      
      // Fallback to generatedVideos format
      if (generatedVideos && generatedVideos.length > 0) {
        const video = generatedVideos[0].video
        const videoUrl = video?.uri || video?.url
        const veoVideoRef = video?.name  // Store the Files API reference for video extension
        
        if (videoUrl) {
          console.log('[Veo Video] Video completed! URI:', videoUrl.substring(0, 100))
          console.log('[Veo Video] Video reference for extension:', veoVideoRef)
          return {
            status: 'COMPLETED',
            videoUrl: videoUrl,
            veoVideoRef: veoVideoRef,
            operationName: operationName
          }
        } else if (video?.name) {
          return {
            status: 'COMPLETED',
            operationName: operationName,
            videoUrl: `file:${video.name}`,
            veoVideoRef: video.name
          }
        }
      }

      // Log full response for debugging if we couldn't extract the video
      console.error('[Veo Video] Could not extract video from response:', JSON.stringify(data).substring(0, 500))
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
  const project = process.env.VERTEX_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')
  // Extract file name from file: prefix if present
  const cleanName = fileName.startsWith('file:') ? fileName.substring(5) : fileName
  // Vertex AI files endpoint: https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/files/FILE_ID:download
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/files/${cleanName}:download`

  try {
    const accessToken = await getVertexAccessToken();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      console.error('[Veo Video] File download failed:', response.status)
      return null;
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('[Veo Video] File download error:', error);
    return null;
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
