import { GoogleAuth } from 'google-auth-library'

let authClient: any = null

/**
 * Get access token for Vertex AI API
 * Uses API key for authentication (no IAM required)
 */
export async function getVertexAIAuthToken(): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured')
  }
  return apiKey
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
  
  // Use stable Imagen 2 model
  const MODEL_ID = 'imagegeneration@006'
  
  console.log(`[Imagen] Generating image with ${MODEL_ID}...`)
  console.log('[Imagen] Prompt:', prompt.slice(0, 100) + '...')
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
  
  // Extract image bytes from Vertex AI response
  const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
  
  if (!imageBytes) {
    console.error('[Imagen] Unexpected response:', JSON.stringify(data).slice(0, 500))
    throw new Error('No image data in Vertex AI response')
  }
  
  console.log('[Imagen] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

