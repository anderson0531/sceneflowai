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
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, number of images, reference images, etc.)
 * @returns Base64-encoded image data URL
 */
export async function callVertexAIImagen(
  prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
    referenceImages?: Array<{
      referenceId: number
      bytesBase64Encoded: string
      referenceType?: 'REFERENCE_TYPE_UNSPECIFIED' | 'REFERENCE_TYPE_SUBJECT'
      subjectDescription?: string
    }>
  } = {}
): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }

  console.log('[Vertex AI] Generating image with Imagen 3...')
  console.log('[Vertex AI] Project:', projectId, 'Region:', region)

  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI Imagen 3 endpoint (imagegeneration@006 is deprecated, removed Sept 2025)
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagen-3.0-generate-002:predict`
  
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      model: 'imagen-3.0-generate-002',
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      negativePrompt: options.negativePrompt || '',
      safetySetting: 'block_only_high', // Renamed from 'block_few' in Imagen 3
      personGeneration: 'allow_adult' // Default setting - allows adults but not celebrities
    }
  }

  // Add reference images if provided
  if (options.referenceImages && options.referenceImages.length > 0) {
    requestBody.parameters.referenceImages = options.referenceImages.map(ref => ({
      referenceId: ref.referenceId,
      base64Encoded: ref.bytesBase64Encoded,  // Map to correct API field name
      referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
      subjectImageConfig: {
        subjectDescription: ref.subjectDescription || `Character ${ref.referenceId}`,
        subjectType: 'SUBJECT_TYPE_PERSON'
      }
    }))
    
    console.log('[Vertex AI] Using', options.referenceImages.length, 'character reference images')
    console.log('[Vertex AI] Reference config:', JSON.stringify(requestBody.parameters.referenceImages[0], null, 2))
  }

  // Log request size for debugging
  const requestBodyStr = JSON.stringify(requestBody)
  const requestSizeKB = Math.round(requestBodyStr.length / 1024)
  console.log(`[Vertex AI] Request body size: ${requestSizeKB}KB`)

  // Log first reference image info if exists
  if (requestBody.parameters?.referenceImages?.[0]) {
    const ref = requestBody.parameters.referenceImages[0]
    const base64Length = ref.base64Encoded?.length || 0
    const refSizeKB = Math.round((base64Length * 0.75) / 1024)
    console.log(`[Vertex AI] Reference image Base64 length: ${base64Length}, ~${refSizeKB}KB`)
  }

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
    predictionCount: data?.predictions?.length || 0
  })
  
  // Extract base64 image from response
  const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
  if (!imageBytes) {
    throw new Error('No image data in Vertex AI response')
  }

  console.log('[Vertex AI] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

