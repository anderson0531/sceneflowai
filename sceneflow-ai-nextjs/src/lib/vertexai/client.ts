import { GoogleAuth } from 'google-auth-library'

let authClient: any = null

/**
 * Get OAuth2 access token for Vertex AI API
 * Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON
 */
export async function getVertexAIAuthToken(): Promise<string> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
  }

  try {
    if (!authClient) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
      
      authClient = await auth.getClient()
    }

    const accessToken = await authClient.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token')
    }
    
    return accessToken.token
  } catch (error: any) {
    console.error('[Vertex AI Auth] Error:', error)
    throw new Error(`Vertex AI authentication failed: ${error.message}`)
  }
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
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }

  // Determine model based on quality and whether references are provided
  let model: string

  if (options.referenceImages && options.referenceImages.length > 0) {
    // Reference images require Imagen 4 (Subject Customization)
    model = 'imagen-4.0-ultra-generate-001'
    console.log('[Vertex AI] Using Imagen 4 for reference image support')
  } else if (options.quality === 'max') {
    model = 'imagen-4.0-ultra-generate-001'  // Imagen 4 Ultra
  } else {
    model = 'imagen-3.0-generate-002'         // Imagen 3 (default)
  }
  
  console.log(`[Vertex AI] Generating image with ${model} (${options.quality || 'auto'} quality)...`)
  console.log('[Vertex AI] Project:', projectId, 'Region:', region)

  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI endpoint with selected model
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:predict`
  
  // Build request payload
  const instance: any = {
    prompt: prompt
  }

  // Check if prompt already contains reference image URL (GCS or HTTPS - Gemini Chat style)
  // If it does, don't send structured referenceImages array to avoid conflicts
  const promptHasReferenceURL = 
    prompt.includes('GCS URL: gs://') || 
    prompt.includes('gs://') ||
    prompt.includes('in the style of the reference image URL:') ||
    (prompt.includes('in the style of the reference image') && prompt.includes('https://'))
  
  // Add reference images if provided AND prompt doesn't already reference URL
  // (Gemini Chat uses prompt text only, not structured array)
  if (options.referenceImages && options.referenceImages.length > 0 && !promptHasReferenceURL) {
    instance.referenceImages = options.referenceImages.map((ref, idx) => {
      if (ref.gcsUri) {
        // Use GCS URI (preferred - no size limits)
        return {
          referenceId: ref.referenceId || idx + 1,
          referenceImage: {
            gcsUri: ref.gcsUri
          },
          referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
          subjectConfig: {
            subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
            subjectDescription: ref.subjectDescription || ''
          }
        }
      } else if (ref.base64Image) {
        // Fallback to Base64
        return {
          referenceId: ref.referenceId || idx + 1,
          referenceImage: {
            bytesBase64Encoded: ref.base64Image.replace(/^data:image\/[^;]+;base64,/, '')
          },
          referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
          subjectConfig: {
            subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
            subjectDescription: ref.subjectDescription || ''
          }
        }
      }
      return null
    }).filter(Boolean)
    
    console.log(`[Vertex AI] Using ${instance.referenceImages.length} reference images (structured array)`)
  } else if (promptHasReferenceURL) {
    console.log(`[Vertex AI] Prompt contains reference image URL - using prompt text only (matching Gemini Chat behavior)`)
  }

  const requestBody: any = {
    instances: [{ prompt: prompt }],
    parameters: {
      model, // Use selected model
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      negativePrompt: options.negativePrompt || '',
      safetySetting: 'block_only_high', // Renamed from 'block_few' in Imagen 3
      personGeneration: 'allow_adult' // Default setting - allows adults but not celebrities
    }
  }
  
  // Add reference images to parameters if provided AND not already in prompt text
  // (Don't send structured array if prompt contains URL - match Gemini Chat behavior)
  if (instance.referenceImages && instance.referenceImages.length > 0 && !promptHasReferenceURL) {
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
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: requestBodyStr
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex AI] Error response:', errorText)
    throw new Error(`Vertex AI error: ${response.status} - ${errorText}`)
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

