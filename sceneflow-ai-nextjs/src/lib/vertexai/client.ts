import { GoogleAuth } from 'google-auth-library'
import { fetchWithRetry } from '../utils/retry'

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
 * Uses imagen-3.0-generate-001 for standard generation without references
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
  
  // Use capability model for subject customization with reference images
  // Use standard model for generation without references
  const hasReferenceImages = options.referenceImages && options.referenceImages.length > 0
  const MODEL_ID = hasReferenceImages 
    ? 'imagen-3.0-capability-001'  // Required for subject customization
    : 'imagen-3.0-generate-001'    // Standard generation
  
  console.log(`[Imagen] Generating image with ${MODEL_ID}...`)
  console.log('[Imagen] FULL Prompt:', prompt)
  console.log('[Imagen] Project:', projectId, 'Region:', region)
  console.log('[Imagen] Has reference images:', hasReferenceImages)
  
  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI endpoint
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
  
  // Build request body for Vertex AI Imagen 
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      safetySetting: 'block_some',
      personGeneration: options.personGeneration || 'allow_adult'
    }
  }
  
  // Only add negativePrompt for non-capability models (not supported by imagen-3.0-capability-001)
  if (!hasReferenceImages && options.negativePrompt) {
    requestBody.parameters.negativePrompt = options.negativePrompt
  }
  
  // Add reference images for subject customization (character consistency)
  if (hasReferenceImages) {
    console.log('[Imagen] Adding', options.referenceImages!.length, 'reference image(s) for subject customization')
    console.log('[Imagen] Using GCS URI format for Vertex AI (not base64)')
    
    // Import GCS utilities for uploading images
    const { uploadFromUrlToGCS } = await import('@/lib/storage/gcs')
    
    // Build referenceImages array per Imagen 3 Capability API spec
    const referenceImagesArray = []
    
    for (const ref of options.referenceImages!) {
      let gcsUri: string | undefined
      
      // Vertex AI requires GCS URIs for reference images (not base64)
      // Upload HTTP images to GCS, or use existing gs:// URIs directly
      const sourceUrl = ref.imageUrl || ref.gcsUri
      
      if (sourceUrl?.startsWith('gs://')) {
        // Already a GCS URI - use directly
        gcsUri = sourceUrl
        console.log(`[Imagen] Using existing GCS URI: ${gcsUri}`)
      } else if (sourceUrl?.startsWith('http://') || sourceUrl?.startsWith('https://')) {
        // HTTP URL - upload to GCS first
        console.log(`[Imagen] Uploading HTTP image to GCS: ${sourceUrl.substring(0, 60)}...`)
        try {
          gcsUri = await uploadFromUrlToGCS(sourceUrl, ref.referenceId.toString())
          console.log(`[Imagen] Uploaded to GCS: ${gcsUri}`)
        } catch (error: any) {
          console.error(`[Imagen] Failed to upload reference image to GCS:`, error.message)
          throw new Error(`Failed to upload reference image to GCS: ${error.message}`)
        }
      } else if (ref.base64Image) {
        // Base64 provided directly - upload to GCS
        console.log(`[Imagen] Uploading base64 image to GCS for reference ${ref.referenceId}`)
        try {
          const { uploadImageToGCS } = await import('@/lib/storage/gcs')
          const imageBuffer = Buffer.from(ref.base64Image, 'base64')
          gcsUri = await uploadImageToGCS(imageBuffer, `ref-${ref.referenceId}`)
          console.log(`[Imagen] Uploaded base64 to GCS: ${gcsUri}`)
        } catch (error: any) {
          console.error(`[Imagen] Failed to upload base64 image to GCS:`, error.message)
          throw new Error(`Failed to upload base64 image to GCS: ${error.message}`)
        }
      }
      
      if (!gcsUri) {
        console.warn(`[Imagen] Reference ${ref.referenceId}: No image source available, skipping`)
        continue
      }
      
      // Build reference image object per API spec
      // Uses gcsUri format for Vertex AI (NOT bytesBase64Encoded)
      const refImage: any = {
        referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
        referenceId: ref.referenceId,
        referenceImage: {
          gcsUri: gcsUri
        },
        subjectImageConfig: {
          subjectType: ref.subjectType || 'SUBJECT_TYPE_PERSON',
          subjectDescription: ref.subjectDescription || 'a person'
        }
      }
      
      referenceImagesArray.push(refImage)
      console.log(`[Imagen] Reference ${ref.referenceId}: ${ref.subjectDescription || 'person'} -> ${gcsUri}`)
    }
    
    if (referenceImagesArray.length > 0) {
      requestBody.instances[0].referenceImages = referenceImagesArray
      console.log('[Imagen] Reference images configured:', referenceImagesArray.length, 'images (using GCS URIs)')
      
      // Debug: Log the full reference structure with GCS URIs
      console.log('[Imagen] DEBUG - Reference structure:', JSON.stringify(
        referenceImagesArray.map(r => ({
          referenceType: r.referenceType,
          referenceId: r.referenceId,
          subjectImageConfig: r.subjectImageConfig,
          gcsUri: r.referenceImage?.gcsUri
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
            referenceImage: { gcsUri: r.referenceImage.gcsUri },
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

