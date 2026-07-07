import { JWT } from 'google-auth-library';
import { getVeoModel, DEFAULT_VIDEO_QUALITY, DEFAULT_VEO_CLIP_DURATION, isOmniVideoModel, getVertexLocation, getVertexHostname, getVertexApiBaseUrl, VEO_MODELS, resolveVideoModel, clampDurationForVeoPredictLongRunning, type VeoQualityTier, type VeoClipDuration } from '@/lib/config/modelConfig';
import {
  getVeoSafetySetting,
  getVeoIncludeRaiReason,
  getImagenPersonGeneration,
  formatVeoRaiDetailsFromPayload,
} from '@/lib/vertexai/safety'
import {
  isVeoDiagnosticLogEnabled,
  logVeoPredictLongRunningSubmitDiagnostics,
  logVeoFetchPredictOperationResponseDiagnostics,
} from '@/lib/gemini/veoRequestDiagnostics'
import {
  normalizeRefsForVeoPredictLongRunning,
  inferVeoPredictReferenceType,
} from '@/lib/video/normalizeReferenceImages'
import {
  buildOmniInteractionRequestBody,
  extractVideoFromOmniInteraction,
  formatOmniDuration,
  formatOmniInteractionErrorMessage,
  isOmniInteractionOperation,
  logOmniInteractionPayload,
  mapOmniInteractionStatus,
  normalizeOmniInteractionBuildOptions,
  normalizeOmniInteractionId,
  resolveOmniPreviousInteractionId,
} from '@/lib/gemini/omniVideoInteractions'

/**
 * Get Google OAuth2 Bearer token for Vertex AI
 * Uses JWT client directly for better serverless compatibility
 */
async function getVertexAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON exists:', !!credentialsJson);
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON length:', credentialsJson?.length || 0);
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is required for Vertex AI');
  }
  
  try {
    // Handle case where the JSON might be double-encoded
    let jsonToParse = credentialsJson;
    if (jsonToParse.startsWith('"') && jsonToParse.endsWith('"')) {
      jsonToParse = JSON.parse(jsonToParse);
    }
    
    const credentials = JSON.parse(jsonToParse);
    console.log('[Vertex AI Auth] Parsed credentials successfully');
    console.log('[Vertex AI Auth] Service account email:', credentials.client_email);
    console.log('[Vertex AI Auth] Project ID:', credentials.project_id);
    console.log('[Vertex AI Auth] Private key exists:', !!credentials.private_key);
    console.log('[Vertex AI Auth] Private key length:', credentials.private_key?.length || 0);
    
    // Use JWT client directly - more reliable in serverless environments
    const jwtClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const tokenResponse = await jwtClient.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Failed to obtain Vertex AI access token - empty response');
    }
    
    console.log('[Vertex AI Auth] Successfully obtained access token');
    return tokenResponse.token;
  } catch (e) {
    const error = e as Error;
    console.error('[Vertex AI Auth] Authentication failed:', error.message);
    console.error('[Vertex AI Auth] Error stack:', error.stack);
    throw new Error('Vertex AI authentication failed: ' + error.message);
  }
}

/**
 * Words that commonly trigger Veo's content safety filters
 * Mapped to cinematically-appropriate alternatives
 */
const TRIGGER_WORD_ALTERNATIVES: Record<string, string[]> = {
  'necrotic': ['darkened', 'discolored', 'shadowed', 'blackened', 'withered'],
  'rotting': ['deteriorating', 'decaying slowly', 'weathered', 'aged'],
  'decaying': ['deteriorating', 'fading', 'withering', 'crumbling'],
  'gore': ['visceral detail', 'intense imagery', 'dramatic effect'],
  'blood': ['dark liquid', 'crimson', 'red fluid'],
  'bloody': ['stained', 'marked', 'crimson-covered'],
  'corpse': ['motionless figure', 'still form', 'lifeless body'],
  'dead body': ['motionless figure', 'fallen form', 'still figure'],
  'wound': ['injury', 'mark', 'damage'],
  'mutilated': ['damaged', 'scarred', 'marked'],
  'severed': ['separated', 'detached', 'cut'],
  'dismembered': ['broken apart', 'separated'],
  'death': ['end', 'final moment', 'passing'],
  'dying': ['fading', 'weakening', 'failing'],
  'kill': ['stop', 'end', 'defeat'],
  'murder': ['crime', 'act', 'incident'],
  'torture': ['suffering', 'ordeal', 'distress'],
  'violent': ['intense', 'dramatic', 'forceful'],
  'gruesome': ['unsettling', 'disturbing', 'haunting'],
};

/**
 * Build a helpful error message when content is filtered by RAI
 * Includes explanation and specific recommendations
 */
function buildRAIFilteredErrorMessage(originalReason: string): string {
  const lines: string[] = [
    '⚠️ Content Safety Filter Triggered',
    '',
    'Veo\'s AI safety system flagged this prompt as potentially containing sensitive content.',
    ''
  ];
  
  // Add the original reason
  lines.push(`Original message: ${originalReason}`);
  lines.push('');
  
  // Add recommendations
  lines.push('📝 Recommendations to fix this:');
  lines.push('');
  lines.push('1. **Rephrase trigger words** - Replace medical/graphic terms with cinematic alternatives:');
  
  // List common replacements
  const commonReplacements = [
    '   • "necrotic" → "darkened", "discolored", "shadowed"',
    '   • "rotting/decaying" → "deteriorating", "weathered", "aged"',
    '   • "blood/bloody" → "crimson", "stained", "marked"',
    '   • "corpse/dead body" → "motionless figure", "still form"',
    '   • "wound" → "injury", "mark"',
    '   • "violent" → "intense", "dramatic", "forceful"',
  ];
  lines.push(...commonReplacements);
  lines.push('');
  lines.push('2. **Focus on visual description** - Describe what the camera sees, not the medical/violent nature');
  lines.push('');
  lines.push('3. **Edit the segment prompt** - Use the edit button to modify the prompt before regenerating');
  
  return lines.join('\n');
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
  durationSeconds?: VeoClipDuration
  negativePrompt?: string
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  safetySetting?: 'block_most' | 'block_some' | 'block_few' | 'block_only_high' | 'block_none' // Vertex safetySetting
  startFrame?: string // Base64 or URL for I2V
  lastFrame?: string // For interpolation
  referenceImages?: ReferenceImage[] // Up to 3 for Veo 3.1
  sourceVideoUrl?: string // URL of video to extend (EXT mode) - Veo handles frame continuity automatically (legacy)
  sourceVideo?: string // Gemini Files API reference (e.g., "files/xxx") for video extension (EXT mode)
  quality?: VeoQualityTier | 'standard' // lite | fast | premium (standard → premium)
}

interface VideoGenerationResult {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  operationName?: string
  videoUrl?: string
  veoVideoRef?: string
  veoVideoRefExpiry?: string
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
 * Generate video using Gemini Omni Flash via Vertex AI Interactions API
 */
async function generateVideoWithOmniInteractions(
  prompt: string,
  options: VideoGenerationOptions,
  model: string,
  quality: VeoQualityTier | 'standard',
  stabilityDuration: VeoClipDuration
): Promise<VideoGenerationResult> {
  const project = process.env.VERTEX_PROJECT_ID
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')

  const location = getVertexLocation(model)
  const apiBase = getVertexApiBaseUrl(project, location, 'v1beta1')

  const isFTV = !!options.startFrame && !!options.lastFrame
  const isEXT = !!options.sourceVideo && !options.startFrame
  let effectiveDuration: VeoClipDuration = options.durationSeconds ?? DEFAULT_VEO_CLIP_DURATION
  if (isFTV || isEXT) {
    effectiveDuration = stabilityDuration
  }

  const previousInteractionId = resolveOmniPreviousInteractionId(options.sourceVideo)
  const hasValidPreviousInteraction = !!previousInteractionId

  if (isFTV && options.lastFrame) {
    console.warn(
      '[Omni Video] FTV (start+end frame interpolation) is unsupported on Omni — using start frame only as I2V'
    )
  }
  if (isEXT && !hasValidPreviousInteraction) {
    console.warn(
      '[Omni Video] EXT without valid previous_interaction_id — degrading to I2V/T2V (Omni does not support legacy video refs)'
    )
  }

  const omniBuildOptions = normalizeOmniInteractionBuildOptions(
    {
      aspectRatio: options.aspectRatio,
      durationSeconds: effectiveDuration,
      negativePrompt: options.negativePrompt,
      personGeneration: options.personGeneration,
      startFrame: options.startFrame,
      lastFrame: options.lastFrame,
      referenceImages: options.referenceImages,
      previousInteractionId,
    },
    { isFTV, isEXT, hasValidPreviousInteraction }
  )

  const endpoint = `${apiBase}/interactions`

  const postOmniInteraction = async (
    buildOptions: typeof omniBuildOptions
  ): Promise<Response> => {
    const requestBody = await buildOmniInteractionRequestBody(model, prompt, buildOptions)
    const accessToken = await getVertexAccessToken()
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    })
  }

  let requestBody = await buildOmniInteractionRequestBody(model, prompt, omniBuildOptions)

  console.log(`[Omni Video] Generating via Interactions API with ${model} (quality: ${quality}) at ${location}`)
  console.log('[Omni Video] Request summary:', JSON.stringify({
    aspectRatio: options.aspectRatio || '16:9',
    duration: formatOmniDuration(effectiveDuration),
    task: (requestBody.generation_config as Record<string, unknown>)?.video_config,
    hasStartFrame: !!omniBuildOptions.startFrame,
    hasLastFrame: !!omniBuildOptions.lastFrame,
    hasPreviousInteraction: !!omniBuildOptions.previousInteractionId,
    referenceImagesCount: options.referenceImages?.length || 0,
    personGenerationIntent: omniBuildOptions.personGeneration ?? 'allow_adult',
    personGenerationSentToInteractions: false,
    hasSafetySettings: Array.isArray(requestBody.safety_settings),
    background: requestBody.background,
  }))

  try {
    let response = await postOmniInteraction(omniBuildOptions)

    if (!response.ok && response.status === 400 && !omniBuildOptions.omitSafetySettings) {
      const errorText = await response.text()
      const lower = errorText.toLowerCase()
      if (
        lower.includes('safety_settings') ||
        (lower.includes('unknown parameter') && lower.includes('safety'))
      ) {
        console.warn(
          '[Omni Video] Interactions 400 with safety_settings — retrying without safety_settings'
        )
        const retryOptions = { ...omniBuildOptions, omitSafetySettings: true }
        requestBody = await buildOmniInteractionRequestBody(model, prompt, retryOptions)
        response = await postOmniInteraction(retryOptions)
      } else {
        console.error('[Omni Video] Error response:', errorText)
        let errorMsg = `Vertex AI Interactions error ${response.status}: ${errorText}`
        try {
          const parsed = JSON.parse(errorText) as unknown
          const rai = formatVeoRaiDetailsFromPayload(parsed)
          if (rai) errorMsg += `\n\nResponsible AI / safety detail:\n${rai}`
        } catch {
          /* not JSON */
        }
        return { status: 'FAILED', error: errorMsg }
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Omni Video] Error response:', errorText)
      let errorMsg = `Vertex AI Interactions error ${response.status}: ${errorText}`
      try {
        const parsed = JSON.parse(errorText) as unknown
        const rai = formatVeoRaiDetailsFromPayload(parsed)
        if (rai) errorMsg += `\n\nResponsible AI / safety detail:\n${rai}`
      } catch {
        /* not JSON */
      }
      return { status: 'FAILED', error: errorMsg }
    }

    const data = (await response.json()) as Record<string, unknown>
    logOmniInteractionPayload('[Omni Video] Response', data)

    if (data.error) {
      const errMsg = formatOmniInteractionErrorMessage(
        data,
        'Unknown Vertex AI Interactions error',
        formatVeoRaiDetailsFromPayload
      )
      return { status: 'FAILED', error: errMsg }
    }

    const interactionId = typeof data.id === 'string' ? data.id : undefined
    const status = mapOmniInteractionStatus(typeof data.status === 'string' ? data.status : undefined)

    if (status === 'COMPLETED') {
      const video = extractVideoFromOmniInteraction(data)
      if (video?.videoUrl) {
        return {
          status: 'COMPLETED',
          videoUrl: video.videoUrl,
          veoVideoRef: video.veoVideoRef,
          veoVideoRefExpiry: video.veoVideoRefExpiry,
          operationName: interactionId ? `interaction:${interactionId}` : 'completed',
        }
      }
      return { status: 'FAILED', error: 'Omni interaction completed but no video was returned' }
    }

    if (status === 'FAILED') {
      return {
        status: 'FAILED',
        error: formatOmniInteractionErrorMessage(data, 'Omni video generation failed', formatVeoRaiDetailsFromPayload),
      }
    }

    if (!interactionId) {
      return { status: 'FAILED', error: 'No interaction ID returned from Vertex AI Interactions API' }
    }

    return {
      status: 'QUEUED',
      operationName: `interaction:${interactionId}`,
      estimatedWaitSeconds: 120,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initiate Omni video generation'
    console.error('[Omni Video] Request error:', error)
    return { status: 'FAILED', error: message }
  }
}

/**
 * Poll Vertex AI Interactions API for Omni video generation status
 */
async function checkOmniInteractionStatus(
  operationName: string
): Promise<VideoGenerationResult> {
  const project = process.env.VERTEX_PROJECT_ID
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')

  const location = getVertexLocation(VEO_MODELS.omni)
  const apiBase = getVertexApiBaseUrl(project, location, 'v1beta1')
  const interactionId = normalizeOmniInteractionId(operationName)
  const endpoint = `${apiBase}/interactions/${encodeURIComponent(interactionId)}`

  console.log('[Omni Video] Checking interaction status:', interactionId, 'at', location)

  try {
    const accessToken = await getVertexAccessToken()
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Omni Video] Status check error:', errorText)
      return {
        status: 'FAILED',
        error: `Omni interaction status check failed: ${response.status}`,
      }
    }

    const data = (await response.json()) as Record<string, unknown>
    logOmniInteractionPayload('[Omni Video] Status response', data)

    const mappedStatus = mapOmniInteractionStatus(typeof data.status === 'string' ? data.status : undefined)

    if (mappedStatus === 'FAILED') {
      const errMsg = formatOmniInteractionErrorMessage(
        data,
        'Omni video generation failed',
        formatVeoRaiDetailsFromPayload
      )
      return { status: 'FAILED', error: errMsg, operationName }
    }

    if (mappedStatus === 'COMPLETED') {
      const video = extractVideoFromOmniInteraction(data)
      if (video?.videoUrl) {
        return {
          status: 'COMPLETED',
          videoUrl: video.videoUrl,
          veoVideoRef: video.veoVideoRef,
          veoVideoRefExpiry: video.veoVideoRefExpiry,
          operationName,
        }
      }
      return { status: 'FAILED', error: 'Omni interaction completed but no video was returned', operationName }
    }

    return {
      status: mappedStatus === 'QUEUED' ? 'QUEUED' : 'PROCESSING',
      operationName,
      estimatedWaitSeconds: 60,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Omni status check failed'
    console.error('[Omni Video] Status check error:', error)
    return { status: 'FAILED', error: message }
  }
}

/**
 * Trigger video generation using Veo
 * Returns an operation name for polling
 */
export async function generateVideoWithVeo(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<VideoGenerationResult> {
  // Vertex AI endpoint config
  const project = process.env.VERTEX_PROJECT_ID
  // Select model based on quality tier (default: fast for cost efficiency)
  const quality = options.quality || DEFAULT_VIDEO_QUALITY
  const hasReferenceImages =
    !options.startFrame &&
    (options.referenceImages?.length ?? 0) > 0
  const model = resolveVideoModel(quality, {
    durationSeconds: options.durationSeconds,
    sourceVideo: options.sourceVideo,
    hasReferenceImages,
  })
  const usingOmni = isOmniVideoModel(model)
  const stabilityDuration: VeoClipDuration = usingOmni ? 10 : 8
  const location = getVertexLocation(model)
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')

  // Gemini Omni Flash requires the Interactions API (not predictLongRunning)
  if (usingOmni) {
    return generateVideoWithOmniInteractions(prompt, options, model, quality, stabilityDuration)
  }

  // Veo predictLongRunning: clamp duration to 8s max
  const veoOptions: VideoGenerationOptions = {
    ...options,
    durationSeconds: clampDurationForVeoPredictLongRunning(options.durationSeconds),
  }

  // Vertex endpoint: https://HOST/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL:predictLongRunning
  const host = getVertexHostname(location)
  const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predictLongRunning`
  console.log(`[Veo Video] Generating video with ${model} (quality: ${quality}) on Vertex AI...`)
  {
    const len = prompt.length
    const head = 380
    const tail = 280
    const excerpt =
      len <= head + tail
        ? prompt
        : `${prompt.slice(0, head)} ... [${len - head - tail} chars omitted] ... ${prompt.slice(-tail)}`
    console.log('[Veo Video] Prompt length:', len)
    console.log('[Veo Video] Prompt excerpt:', excerpt)
  }
  console.log('[Veo Video] Options:', JSON.stringify({
    aspectRatio: veoOptions.aspectRatio || '16:9',
    resolution: veoOptions.resolution || '720p',
    duration: veoOptions.durationSeconds || DEFAULT_VEO_CLIP_DURATION,
    hasStartFrame: !!veoOptions.startFrame,
    hasLastFrame: !!veoOptions.lastFrame,
    hasSourceVideo: !!veoOptions.sourceVideo,
    referenceImagesCount: veoOptions.referenceImages?.length || 0
  }))

  // Build instances array (Veo uses Vertex AI-style request format)
  const instance: Record<string, any> = {
    prompt: prompt
  }

  // Add start frame for I2V
  if (veoOptions.startFrame) {
    let startFrameData: string
    let mimeType = 'image/png'
    
    if (veoOptions.startFrame.startsWith('http')) {
      const result = await urlToBase64(veoOptions.startFrame)
      startFrameData = result.base64
      mimeType = result.mimeType
    } else {
      startFrameData = veoOptions.startFrame
    }
    
    instance.image = {
      bytesBase64Encoded: startFrameData,
      mimeType: mimeType
    }
    console.log('[Veo Video] Added start frame for I2V generation, mimeType:', mimeType)
  }

  // EXT: extend a prior Veo output (Vertex resource name, GCS URI, or files/ ref from prior gen)
  if (veoOptions.sourceVideo && !veoOptions.startFrame) {
    const ref = veoOptions.sourceVideo
    if (ref.startsWith('gs://')) {
      instance.video = { gcsUri: ref, mimeType: 'video/mp4' }
    } else if (ref.startsWith('http://') || ref.startsWith('https://')) {
      instance.video = { uri: ref, mimeType: 'video/mp4' }
    } else if (ref.startsWith('projects/')) {
      instance.video = { name: ref }
    } else if (ref.startsWith('files/')) {
      instance.video = { uri: ref, mimeType: 'video/mp4' }
    } else {
      instance.video = { name: ref, mimeType: 'video/mp4' }
    }
    console.log('[Veo Video] EXT mode with source video ref:', ref.substring(0, 80))
  } else if (veoOptions.sourceVideoUrl) {
    console.log('[Veo Video] sourceVideoUrl legacy — use sourceVideo (Veo ref) for EXT on Vertex')
  }

  // Build parameters object
  // Note: For Veo 3 text-to-video, personGeneration must be 'allow_all'
  // For image-to-video, it should be 'allow_adult'
  const isImageToVideo = !!veoOptions.startFrame
  const isEXT = !!veoOptions.sourceVideo && !veoOptions.startFrame
  const isFTV = !!veoOptions.startFrame && !!veoOptions.lastFrame
  
  // FTV/EXT Stability Constraints (Veo predictLongRunning):
  // - duration MUST be 8s, resolution MUST be 720p
  if (isFTV) {
    if (veoOptions.durationSeconds && veoOptions.durationSeconds !== stabilityDuration) {
      console.warn(`[Veo Video] FTV mode: Overriding duration ${veoOptions.durationSeconds}s → ${stabilityDuration}s (required for stability)`)
    }
    if (veoOptions.resolution && veoOptions.resolution !== '720p') {
      console.warn(`[Veo Video] FTV mode: Overriding resolution ${veoOptions.resolution} → 720p (required for stability)`)
    }
    console.log(`[Veo Video] FTV MODE: Enforcing stability constraints (${stabilityDuration}s duration, 720p resolution)`)
  }
  
  // Safety setting: Use configurable setting from environment (default: 'block_only_high')
  const safetySetting = veoOptions.safetySetting || getVeoSafetySetting()
  const personGeneration = isImageToVideo ? getImagenPersonGeneration() : 'allow_all'
  
  const parameters: Record<string, any> = {
    aspectRatio: veoOptions.aspectRatio || '16:9',
    durationSeconds: isFTV || isEXT ? stabilityDuration : (veoOptions.durationSeconds || DEFAULT_VEO_CLIP_DURATION),
    personGeneration: personGeneration,
    safetySetting: safetySetting,
    includeRaiReason: getVeoIncludeRaiReason(),
  }

  console.log('[Veo Video] Safety settings:', {
    safetySetting,
    includeRaiReason: parameters.includeRaiReason,
    personGeneration,
    isImageToVideo,
    isFTV,
  })

  // Add resolution - FTV/EXT require 720p for stability
  if (isFTV || isEXT) {
    parameters.resolution = '720p'
    parameters.durationSeconds = stabilityDuration
  } else if (veoOptions.resolution === '1080p') {
    parameters.resolution = '1080p'
  }

  // Add negative prompt if provided (same string safety scoring as main prompt in practice).
  if (veoOptions.negativePrompt) {
    parameters.negativePrompt = veoOptions.negativePrompt
  }

  // Add last frame for FTV interpolation mode
  if (veoOptions.lastFrame) {
    let lastFrameData: string
    let mimeType = 'image/png'
    
    if (veoOptions.lastFrame.startsWith('http')) {
      const result = await urlToBase64(veoOptions.lastFrame)
      lastFrameData = result.base64
      mimeType = result.mimeType
    } else {
      lastFrameData = veoOptions.lastFrame
    }
    
    // lastFrame structure must match instance.image - flat structure, not nested
    instance.lastFrame = {
      bytesBase64Encoded: lastFrameData,
      mimeType: mimeType
    }
    console.log('[Veo Video] Added last frame for FTV interpolation, mimeType:', mimeType)
  }

  // Add reference images to instance (Veo 3.1 feature - T2V only, NOT compatible with I2V)
  // Vertex AI uses instance.referenceImages, not a separate config object
  // IMPORTANT: referenceImages cannot be used with startFrame (image parameter)
  if (veoOptions.referenceImages && veoOptions.referenceImages.length > 0) {
    // Safety check: referenceImages is T2V only
    if (veoOptions.startFrame) {
      console.warn('[Veo Video] WARNING: referenceImages cannot be used with startFrame (I2V)')
      console.warn('[Veo Video] Ignoring referenceImages - using I2V mode instead')
      // Skip adding referenceImages when startFrame is present
    } else {
      const normalizedRefs = normalizeRefsForVeoPredictLongRunning(veoOptions.referenceImages)
      if (
        normalizedRefs &&
        veoOptions.referenceImages.length !== normalizedRefs.refs.length
      ) {
        console.log(
          `[Veo Video] Normalized reference images for predictLongRunning: ${veoOptions.referenceImages.length} → ${normalizedRefs.refs.length} (${normalizedRefs.referenceType})`
        )
      }
      const refs = await Promise.all(
        (normalizedRefs?.refs ?? []).map(async (ref) => {
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

          const refType = normalizedRefs?.referenceType ?? inferVeoPredictReferenceType(ref)
          
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
        // Vertex AI: referenceImages goes in the instance object
        instance.referenceImages = validRefs
        console.log('[Veo Video] Added', validRefs.length, 'reference images to instance')
      }
    }
  }

  // Build request body
  // Vertex AI predictLongRunning uses instances + parameters structure
  const requestBody: Record<string, any> = {
    instances: [instance],
    parameters: parameters
  }

  logVeoPredictLongRunningSubmitDiagnostics({
    endpoint,
    model,
    quality,
    prompt,
    requestBody,
  })

  // FTV Debug: Confirm frame fields are at correct level (instance, not parameters)
  console.log('[Veo Video] Instance keys:', Object.keys(instance))
  console.log('[Veo Video] Parameters keys:', Object.keys(parameters))
  if (instance.image && instance.lastFrame) {
    console.log('[Veo Video] FTV MODE CONFIRMED:')
    console.log('[Veo Video]   - image (start frame): Present at instance level ✓')
    console.log('[Veo Video]   - lastFrame (end frame): Present at instance level ✓')
    console.log('[Veo Video]   - referenceImages: ', instance.referenceImages ? 'PRESENT (may conflict!)' : 'Not present ✓')
  } else if (instance.image) {
    console.log('[Veo Video] I2V MODE: image present, no lastFrame')
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
      const errorText = await response.text()
      console.error('[Veo Video] Error response:', errorText)
      let errorMsg = `Vertex AI error ${response.status}: ${errorText}`
      try {
        const parsed = JSON.parse(errorText) as unknown
        const rai = formatVeoRaiDetailsFromPayload(parsed)
        if (rai) errorMsg += `\n\nResponsible AI / safety detail:\n${rai}`
      } catch {
        /* not JSON */
      }
      return {
        status: 'FAILED',
        error: errorMsg,
      }
    }

    const data = await response.json()
    console.log('[Veo Video] Response:', JSON.stringify(data).substring(0, 500))

    // Check for immediate error in response
    if (data.error) {
      let errMsg = data.error.message || 'Unknown Vertex AI error'
      const rai = formatVeoRaiDetailsFromPayload(data)
      if (rai) errMsg += `\n\nResponsible AI / safety detail:\n${rai}`
      return {
        status: 'FAILED',
        error: errMsg,
      }
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
 * For Veo predictLongRunning, we use fetchPredictOperation endpoint
 */
export async function checkVideoGenerationStatus(
  operationName: string
): Promise<VideoGenerationResult> {
  // Omni Flash interactions are polled via GET .../interactions/{id}
  if (isOmniInteractionOperation(operationName)) {
    return checkOmniInteractionStatus(operationName)
  }

  // Veo predictLongRunning operations use regional endpoints (not global)
  const project = process.env.VERTEX_PROJECT_ID
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')

  // Extract model from operation name if present, otherwise use default (fast)
  // Format: projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{opId}
  let model: string
  const modelMatch = operationName.match(/models\/([^\/]+)\/operations/)
  if (modelMatch) {
    model = modelMatch[1]
    console.log('[Veo Video] Extracted model from operation name:', model)
  } else {
    model = getVeoModel(DEFAULT_VIDEO_QUALITY)
    console.log('[Veo Video] Using default model for status check:', model)
  }

  const locationMatch = operationName.match(/locations\/([^/]+)\//)
  const location = locationMatch?.[1] ?? getVertexLocation(model)
  
  let opId = operationName
  if (operationName.includes('/operations/')) {
    opId = operationName.split('/operations/').pop() || operationName
  }
  
  // Use the fetchPredictOperation endpoint for Veo
  const host = getVertexHostname(location)
  const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:fetchPredictOperation`
  
  console.log('[Veo Video] Checking status at:', endpoint)
  console.log('[Veo Video] Operation ID:', opId)

  try {
    const accessToken = await getVertexAccessToken();
    
    // fetchPredictOperation requires POST with the operation ID in the body
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        operationName: operationName
      })
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
    if (isVeoDiagnosticLogEnabled()) {
      logVeoFetchPredictOperationResponseDiagnostics(data)
    } else {
      console.log('[Veo Video] Status check response:', JSON.stringify(data).substring(0, 500))
    }

    if (data.done) {
      // Check for error in completed operation (e.g., content policy violation)
      // Vertex AI returns { done: true, error: { code: 3, message: "..." } } for policy violations
      if (data.error) {
        let errMsg = data.error.message || 'Generation failed'
        const rai = formatVeoRaiDetailsFromPayload(data)
        if (rai) errMsg += `\n\nResponsible AI / safety detail:\n${rai}`
        return {
          status: 'FAILED',
          error: errMsg,
        }
      }
    } else if (data.error) {
      let errMsg = data.error.message || 'Generation failed'
      const rai = formatVeoRaiDetailsFromPayload(data)
      if (rai) errMsg += `\n\nResponsible AI / safety detail:\n${rai}`
      return {
        status: 'FAILED',
        error: errMsg,
      }
    }

    if (data.done) {
      
      // Check for RAI (Responsible AI) content filtering
      const raiFilteredCount = data.response?.raiMediaFilteredCount
      const raiReasons = data.response?.raiMediaFilteredReasons
      if (raiFilteredCount && raiFilteredCount > 0) {
        const reason =
          Array.isArray(raiReasons) && raiReasons.length > 0
            ? raiReasons.map(String).join('; ')
            : 'Content was filtered by safety policies'
        console.error('[Veo Video] Content filtered by RAI:', reason)

        const extra = formatVeoRaiDetailsFromPayload(data)
        const errorMessage =
          buildRAIFilteredErrorMessage(reason) +
          (extra && !extra.includes(reason) ? `\n\nResponsible AI / safety detail:\n${extra}` : '')

        return {
          status: 'FAILED',
          error: errorMessage,
        }
      }

      // Extract video URL from response
      // Vertex AI Veo response format:
      // data.response.generatedSamples[].video.uri (for Vertex AI predictLongRunning)
      // data.response.generatedSamples[].video.gcsUri (alternative GCS format)
      const generatedSamples = data.response?.generatedSamples
      
      // Try generatedSamples first (Vertex AI predictLongRunning response format)
      if (generatedSamples && generatedSamples.length > 0) {
        const sample = generatedSamples[0]
        const video = sample.video
        const videoUrl = video?.uri || video?.gcsUri || video?.url
        const veoVideoRef = video?.name  // Store the reference for video extension
        
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
      
      // Alternative: check for videos directly in response (Vertex AI Veo 3.1 format)
      // Response format: { videos: [{ bytesBase64Encoded: "..." }] }
      const videos = data.response?.videos
      if (videos && videos.length > 0) {
        const video = videos[0]
        
        // Handle inline base64-encoded video data (Vertex AI Veo 3.1 response format)
        if (video.bytesBase64Encoded) {
          console.log('[Veo Video] Video completed with inline base64 data!')
          console.log('[Veo Video] Base64 data length:', video.bytesBase64Encoded.length)
          // Return as data URL for direct use
          const dataUrl = `data:video/mp4;base64,${video.bytesBase64Encoded}`
          return {
            status: 'COMPLETED',
            videoUrl: dataUrl,
            veoVideoRef: video?.name || operationName,
            operationName: operationName
          }
        }
        
        // Handle URL-based video response
        const videoUrl = video?.uri || video?.url || video?.gcsUri
        const veoVideoRef = video?.name
        
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
      
      // Legacy format: check for generatedVideos (older API versions)
      const generatedVideos = data.response?.generatedVideos || data.result?.generatedVideos
      if (generatedVideos && generatedVideos.length > 0) {
        const video = generatedVideos[0].video
        const videoUrl = video?.uri || video?.url
        const veoVideoRef = video?.name
        
        if (videoUrl) {
          console.log('[Veo Video] Video completed! URI:', videoUrl.substring(0, 100))
          return {
            status: 'COMPLETED',
            videoUrl: videoUrl,
            veoVideoRef: veoVideoRef,
            operationName: operationName
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
  const location = getVertexLocation(VEO_MODELS.fast)
  if (!project) throw new Error('VERTEX_PROJECT_ID not configured')
  // Extract file name from file: prefix if present
  const cleanName = fileName.startsWith('file:') ? fileName.substring(5) : fileName
  const host = getVertexHostname(location)
  // Vertex AI files endpoint: https://HOST/v1/projects/PROJECT_ID/locations/LOCATION/files/FILE_ID:download
  const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/files/${cleanName}:download`

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
