/**
 * Get Google API key for Vertex AI
 * Uses GOOGLE_API_KEY (same key used for other Google services)
 */
export function getGoogleApiKey(): string {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured')
  }
  return apiKey
}

/**
 * Generate image using Vertex AI Imagen
 * Character references provided as Base64-encoded images
 * 
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, number of images, Base64 reference images)
 * @returns Base64-encoded image data URL
 */
export async function callVertexAIImagen(
  prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
    quality?: 'max' | 'auto' // NEW parameter
    personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow' // NEW: Control person/face generation safety
    referenceImages?: Array<{
      referenceId: number
      base64Image?: string        // For Base64 (fallback)
      gcsUri?: string             // For GCS URLs (preferred)
      referenceType?: 'REFERENCE_TYPE_SUBJECT'
      subjectDescription?: string
      subjectType?: 'SUBJECT_TYPE_PERSON' | 'SUBJECT_TYPE_PRODUCT'  // Character type
    }>
  } = {}
): Promise<string> {
  const apiKey = getGoogleApiKey()
  
  // Determine model based on quality and whether references are provided
  let model: string

  if (options.referenceImages && options.referenceImages.length > 0) {
    // Reference images require Imagen 3 (generateContent endpoint supports references)
    model = 'imagen-3.0-generate-001'
    console.log('[Vertex AI] Using Imagen 3 for reference image support')
  } else if (options.quality === 'max') {
    model = 'imagen-3.0-generate-001'  // Imagen 3 high quality
  } else {
    model = 'imagen-3.0-fast-generate-001'  // Imagen 3 fast (default)
  }
  
  console.log(`[Vertex AI] Generating image with ${model} (${options.quality || 'auto'} quality)...`)
  console.log('[Vertex AI] Using API key authentication')

  // Vertex AI REST API endpoint (no project/region needed with API key)
  const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:predict`
  
  // Build request payload
  const instance: any = {
    prompt: prompt
  }

  // Always send structured referenceImages array when GCS URIs are provided
  // Imagen 4 Subject Customization requires structured format, not URLs in prompt text
  if (options.referenceImages && options.referenceImages.length > 0) {
    // Check if we have GCS URIs (preferred for structured array)
    const hasGcsUris = options.referenceImages.some(ref => ref.gcsUri)
    
    if (hasGcsUris) {
      instance.referenceImages = options.referenceImages
        .filter(ref => ref.gcsUri) // Only include references with GCS URIs
        .map((ref, idx) => {
          return {
            referenceId: ref.referenceId || idx + 1,
            referenceImage: {
              gcsUri: ref.gcsUri!
            },
            referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
            subjectConfig: {
              subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
              subjectDescription: ref.subjectDescription || ''
            }
          }
        })
      
      console.log(`[Vertex AI] Using ${instance.referenceImages.length} reference images (structured array with GCS URIs)`)
    } else if (options.referenceImages.some(ref => ref.base64Image)) {
      // Fallback to Base64 if no GCS URIs available
      instance.referenceImages = options.referenceImages
        .filter(ref => ref.base64Image)
        .map((ref, idx) => {
          return {
            referenceId: ref.referenceId || idx + 1,
            referenceImage: {
              bytesBase64Encoded: ref.base64Image!.replace(/^data:image\/[^;]+;base64,/, '')
            },
            referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
            subjectConfig: {
              subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
              subjectDescription: ref.subjectDescription || ''
            }
          }
        })
      
      console.log(`[Vertex AI] Using ${instance.referenceImages.length} reference images (structured array with Base64)`)
    }
  }

  // Use provided personGeneration or default to 'allow_adult'
  const personGeneration = options.personGeneration || 'allow_adult'
  
  if (personGeneration !== 'allow_adult') {
    console.log(`[Vertex AI] Using custom personGeneration setting: ${personGeneration}`)
    if (personGeneration === 'allow_all') {
      console.warn('[Vertex AI] ⚠️  personGeneration set to "allow_all" - this requires Google Cloud allowlist approval')
    }
  }
  
  const requestBody: any = {
    instances: [{ prompt: prompt }],
    parameters: {
      model, // Use selected model
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      negativePrompt: options.negativePrompt || '',
      safetySetting: 'block_only_high', // Renamed from 'block_few' in Imagen 3
      personGeneration: personGeneration // Configurable setting - default allows adults but not children
    }
  }
  
  // Add reference images to parameters (structured array format required for Imagen 4 Subject Customization)
  if (instance.referenceImages && instance.referenceImages.length > 0) {
    requestBody.parameters.referenceImages = instance.referenceImages
  }
  
  console.log('[Vertex AI] Negative prompt:', requestBody.parameters.negativePrompt || '(none)')
  
  // Log request size for debugging
  const requestBodyStr = JSON.stringify(requestBody)
  const requestSizeKB = Math.round(requestBodyStr.length / 1024)
  console.log(`[Vertex AI] Total request size: ${requestSizeKB}KB`)

  // Log request for debugging
  console.log('[Vertex AI] ===== FULL REQUEST BODY =====')
  console.log(JSON.stringify(requestBody, null, 2))
  console.log('[Vertex AI] ===== END REQUEST BODY =====')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: requestBodyStr
  })

  if (!response.ok) {
    let rawText = ''
    let json: any = null
    try {
      rawText = await response.text()
      json = JSON.parse(rawText)
    } catch {
      // leave json as null
    }

    const status = response.status
    const apiMessage: string = json?.error?.message || json?.message || rawText || 'Unknown error'
    const apiCode: string = json?.error?.status || 'UNKNOWN'

    const ctx = `model=${model} api_key=present`

    let hint = ''
    const msgLower = apiMessage.toLowerCase()

    if (status === 403 || msgLower.includes('api key')) {
      hint = 'Check GOOGLE_API_KEY is valid and Vertex AI API is enabled in Google Cloud Console.'
    } else if (status === 404 || msgLower.includes('not found')) {
      hint = `Model ${model} not found. Verify model name and availability.`
    } else if (status === 400) {
      if (msgLower.includes('persongeneration')) {
        hint = 'Invalid personGeneration value or policy blocked. Try personGeneration="allow_adult".'
      } else if (msgLower.includes('reference') && msgLower.includes('image')) {
        hint = 'Check referenceImages format (use structured array with base64).'
      } else {
        hint = 'Bad request. Check parameters: aspectRatio, sampleCount, negativePrompt.'
      }
    }

    console.error('[Vertex AI] Error response:', { status, apiCode, apiMessage, context: ctx })
    if (hint) console.error('[Vertex AI] Hint:', hint)

    const friendly = `Vertex AI error ${status} (${apiCode}): ${apiMessage}. ${hint ? 'Hint: ' + hint : ''}`
    throw new Error(friendly)
  }

  const data = await response.json()
  
  console.log('[Vertex AI] Response structure:', {
    hasPredictions: !!data?.predictions,
    predictionCount: data?.predictions?.length || 0,
    firstPredictionKeys: data?.predictions?.[0] ? Object.keys(data.predictions[0]) : null
  })
  
  // Extract base64 image from response
  const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
  if (!imageBytes) {
    console.error('[Vertex AI] Full response data:', JSON.stringify(data, null, 2))
    console.error('[Vertex AI] First prediction:', JSON.stringify(data?.predictions?.[0], null, 2))
    throw new Error('No image data in Vertex AI response')
  }

  console.log('[Vertex AI] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

