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
 * @param options - Generation options (aspect ratio, number of images, etc.)
 * @returns Base64-encoded image data URL
 */
export async function callVertexAIImagen(
  prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
  } = {}
): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }

  console.log('[Vertex AI] Generating image with Imagen...')
  console.log('[Vertex AI] Project:', projectId, 'Region:', region)

  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI Imagen endpoint
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagegeneration@006:predict`
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{
        prompt: prompt
      }],
      parameters: {
        sampleCount: options.numberOfImages || 1,
        aspectRatio: options.aspectRatio || '16:9',
        negativePrompt: options.negativePrompt || '',
        safetySetting: 'block_few',
        personGeneration: 'allow_all'
      }
    })
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

