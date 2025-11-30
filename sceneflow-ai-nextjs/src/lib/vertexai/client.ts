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
 * Generate image using Vertex AI Imagen 2
 * 
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, number of images, reference images)
 * @returns Base64-encoded image data URL
 */
export async function callVertexAIImagen(
  prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
    quality?: 'max' | 'auto'
    personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
    referenceImages?: Array<{
      referenceId: number
      base64Image?: string
      gcsUri?: string
      referenceType?: 'REFERENCE_TYPE_SUBJECT'
      subjectDescription?: string
      subjectType?: 'SUBJECT_TYPE_PERSON' | 'SUBJECT_TYPE_PRODUCT'
    }>
  } = {}
): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }
  
  // Use stable Imagen 2 model (was working before recent changes)
  const MODEL_ID = 'imagegeneration@006'
  
  console.log(`[Imagen] Generating image with ${MODEL_ID}...`)
  console.log('[Imagen] FULL Prompt:', prompt)
  console.log('[Imagen] Project:', projectId, 'Region:', region)
  
  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI endpoint
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
  
  // Build request body for Vertex AI Imagen 2
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      negativePrompt: options.negativePrompt || '',
      safetySetting: 'block_some',
      personGeneration: options.personGeneration || 'allow_adult'
    }
  }
  
  console.log('[Imagen] Config:', JSON.stringify(requestBody.parameters))
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Imagen] Error response:', errorText)
    
    let hint = ''
    if (response.status === 403) {
      hint = 'IAM permission denied. Ensure service account has roles/aiplatform.user role.'
    } else if (response.status === 404) {
      hint = `Model ${MODEL_ID} not found in region ${region}.`
    } else if (response.status === 400) {
      hint = 'Bad request. Check prompt and parameters.'
    }
    
    throw new Error(`Vertex AI error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  console.log('[Imagen] Response structure:', Object.keys(data))
  console.log('[Imagen] Full response:', JSON.stringify(data).slice(0, 1000))
  
  // Check for API errors in response
  if (data.error) {
    console.error('[Imagen] API error in response:', data.error)
    throw new Error(`Vertex AI API error: ${data.error.message || 'Unknown error'}`)
  }
  
  // Extract image bytes from Vertex AI response
  const predictions = data?.predictions
  if (!predictions || predictions.length === 0) {
    console.error('[Imagen] No predictions in response - likely filtered by safety settings')
    throw new Error('Problem: Image generation was filtered due to content policies.\n\n\nAction: Try adjusting the prompt to be more descriptive, avoid sensitive content, and ensure it describes a professional character portrait.')
  }
  
  const imageBytes = predictions[0]?.bytesBase64Encoded
  
  if (!imageBytes) {
    console.error('[Imagen] Unexpected response structure:', JSON.stringify(data).slice(0, 500))
    throw new Error('Unexpected response format from Vertex AI')
  }
  
  console.log('[Imagen] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

