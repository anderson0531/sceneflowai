import { GoogleAuth } from 'google-auth-library'
import { fetchWithRetry } from '../utils/retry'
import { getImagenModel, DEFAULT_IMAGE_QUALITY, type ModelQuality } from '@/lib/config/modelConfig'
import { getImagenSafetyFilterLevel, getImagenPersonGeneration } from './safety'

let authClient: any = null

/**
 * Get OAuth2 access token for Vertex AI API
 * Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON
 */
export async function getVertexAIAuthToken(): Promise<string> {
  console.log('[Vertex AI Auth] Getting access token...')
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON configured:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  console.log('[Vertex AI Auth] VERTEX_PROJECT_ID:', process.env.VERTEX_PROJECT_ID || 'NOT SET')
  console.log('[Vertex AI Auth] VERTEX_LOCATION:', process.env.VERTEX_LOCATION || 'NOT SET')
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.error('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured - check Vercel environment variables')
  }

  try {
    if (!authClient) {
      console.log('[Vertex AI Auth] Creating new auth client...')
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      console.log('[Vertex AI Auth] Parsed credentials for project:', credentials.project_id)
      
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
      
      authClient = await auth.getClient()
      console.log('[Vertex AI Auth] Auth client created successfully')
    }

    const accessToken = await authClient.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token')
    }
    
    console.log('[Vertex AI Auth] Access token obtained successfully')
    return accessToken.token
  } catch (error: any) {
    console.error('[Vertex AI Auth] Error:', error.message)
    console.error('[Vertex AI Auth] Stack:', error.stack)
    throw new Error(`Vertex AI authentication failed: ${error.message}`)
  }
}

/**
 * Generate image using Vertex AI Imagen 
 * Uses imagen-3.0-capability-001 for subject customization with reference images
 * Uses imagen-3.0-generate-001 or imagen-3.0-fast-generate-001 for standard generation
 * 
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, number of images, reference images, quality tier)
 * @returns Base64-encoded image data URL
 */
export async function callVertexAIImagen(
  prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
    quality?: 'max' | 'auto'  // Legacy Imagen quality setting
    modelQuality?: ModelQuality  // Model tier: fast or standard
    personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
    referenceImages?: Array<{
      referenceId: number
      base64Image?: string
      imageUrl?: string
      gcsUri?: string // Deprecated: kept for backward compatibility
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
  
  // Select model based on quality tier (default: fast for cost efficiency)
  // Uses capability model for subject customization with reference images
  const hasReferenceImages = options.referenceImages && options.referenceImages.length > 0
  const quality = options.modelQuality || DEFAULT_IMAGE_QUALITY
  const MODEL_ID = getImagenModel(quality, hasReferenceImages)
  
  console.log(`[Imagen] Generating image with ${MODEL_ID} (quality: ${quality})...`)
  console.log('[Imagen] FULL Prompt:', prompt)
  console.log('[Imagen] Project:', projectId, 'Region:', region)
  console.log('[Imagen] Has reference images:', hasReferenceImages)
  
  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI endpoint
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
  
  // Build request body for Vertex AI Imagen 
  // Use configurable safety settings (default: block_few for creative content)
  const safetySetting = getImagenSafetyFilterLevel()
  const personGeneration = options.personGeneration || getImagenPersonGeneration()
  
  console.log('[Imagen] Safety settings:', { safetySetting, personGeneration })
  
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      safetySetting: safetySetting,
      personGeneration: personGeneration
    }
  }
  
  // Only add negativePrompt for non-capability models (not supported by imagen-3.0-capability-001)
  if (!hasReferenceImages && options.negativePrompt) {
    requestBody.parameters.negativePrompt = options.negativePrompt
  }
  
  // Add reference images for subject customization (character consistency)
  // Per Google docs: referenceImage.bytesBase64Encoded is REQUIRED (not gcsUri)
  // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-customization
  if (hasReferenceImages) {
    console.log('[Imagen] Adding', options.referenceImages!.length, 'reference image(s) for subject customization')
    console.log('[Imagen] Using bytesBase64Encoded format (required by API)')
    
    // Build referenceImages array per Imagen 3 Capability API spec
    const referenceImagesArray = []
    
    for (const ref of options.referenceImages!) {
      let base64Data = ref.base64Image
      
      // If HTTP/HTTPS URL provided, download and convert to base64
      if (!base64Data && (ref.imageUrl || ref.gcsUri)) {
        const sourceUrl = ref.imageUrl || ref.gcsUri
        console.log(`[Imagen] Downloading image from: ${sourceUrl?.substring(0, 60)}...`)
        try {
          if (sourceUrl?.startsWith('http://') || sourceUrl?.startsWith('https://')) {
            // Direct HTTP download and base64 encode
            const imageResponse = await fetch(sourceUrl)
            if (!imageResponse.ok) {
              throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()
            base64Data = Buffer.from(imageBuffer).toString('base64')
            console.log(`[Imagen] Downloaded and encoded ${base64Data.length} base64 chars from HTTP URL`)
          } else if (sourceUrl?.startsWith('gs://')) {
            // GCS URL - import dynamically to avoid dependency if not needed
            const { downloadImageAsBase64 } = await import('@/lib/storage/gcs')
            base64Data = await downloadImageAsBase64(sourceUrl)
            console.log(`[Imagen] Downloaded and encoded ${base64Data.length} base64 chars from GCS`)
          } else {
            throw new Error(`Unsupported URL scheme: ${sourceUrl}`)
          }
        } catch (error: any) {
          console.error(`[Imagen] Failed to download reference image:`, error.message)
          throw new Error(`Failed to download reference image: ${error.message}`)
        }
      }
      
      if (!base64Data) {
        console.warn(`[Imagen] Reference ${ref.referenceId}: No image data available, skipping`)
        continue
      }
      
      // Build reference image object per API spec
      // IMPORTANT: bytesBase64Encoded is REQUIRED (gcsUri does NOT work for subject customization)
      const refImage: any = {
        referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
        referenceId: ref.referenceId,
        referenceImage: {
          bytesBase64Encoded: base64Data
        },
        subjectImageConfig: {
          subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
          subjectDescription: ref.subjectDescription || 'a person'
        }
      }
      
      referenceImagesArray.push(refImage)
      console.log(`[Imagen] Reference ${ref.referenceId}: "${ref.subjectDescription || 'a person'}" (${base64Data.length} base64 chars)`)
    }
    
    if (referenceImagesArray.length > 0) {
      requestBody.instances[0].referenceImages = referenceImagesArray
      console.log('[Imagen] Reference images configured:', referenceImagesArray.length, 'images (using bytesBase64Encoded)')
      
      // Debug: Log the full reference structure (without base64 data)
      console.log('[Imagen] DEBUG - Reference structure:', JSON.stringify(
        referenceImagesArray.map(r => ({
          referenceType: r.referenceType,
          referenceId: r.referenceId,
          subjectImageConfig: r.subjectImageConfig,
          base64Length: r.referenceImage?.bytesBase64Encoded?.length || 0
        })), null, 2
      ))
      
      // Verify the request structure matches Google's expected format
      console.log('[Imagen] DEBUG - Full request structure:')
      const debugRequest = {
        instances: [{
          prompt: requestBody.instances[0].prompt.substring(0, 100) + '...',
          referenceImages: referenceImagesArray.map(r => ({
            referenceType: r.referenceType,
            referenceId: r.referenceId,
            referenceImage: { bytesBase64Encoded: `[${r.referenceImage.bytesBase64Encoded.length} chars]` },
            subjectImageConfig: r.subjectImageConfig
          }))
        }],
        parameters: requestBody.parameters
      }
      console.log(JSON.stringify(debugRequest, null, 2))
    } else {
      console.warn('[Imagen] No valid reference images, proceeding without subject customization')
    }
  }
  
  console.log('[Imagen] Config:', JSON.stringify(requestBody.parameters))
  
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      operationName: `Vertex Imagen ${MODEL_ID}`,
    }
  )

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

