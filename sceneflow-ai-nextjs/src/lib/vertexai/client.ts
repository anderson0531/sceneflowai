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
    
    // Build referenceImages array per Imagen 3 Capability API spec
    const referenceImagesArray = []
    
    for (const ref of options.referenceImages!) {
      let base64Data = ref.base64Image
      
      // If HTTP/HTTPS URL provided, download and convert to base64
      if (!base64Data && (ref.imageUrl || ref.gcsUri)) {
        const sourceUrl = ref.imageUrl || ref.gcsUri
        console.log(`[Imagen] Downloading image from: ${sourceUrl?.substring(0, 50)}...`)
        try {
          // Download image from URL (works with both HTTP/HTTPS and gs:// URLs if GCS client is configured)
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
            // Legacy GCS support - import dynamically to avoid dependency if not needed
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
      // Uses subjectImageConfig for subject customization
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
      console.log(`[Imagen] Reference ${ref.referenceId}: ${ref.subjectDescription || 'person'} (${base64Data.length} base64 chars)`)
    }
    
    if (referenceImagesArray.length > 0) {
      requestBody.instances[0].referenceImages = referenceImagesArray
      console.log('[Imagen] Reference images configured:', referenceImagesArray.length, 'images')
      
      // Debug: Log the full reference structure (without base64 data)
      console.log('[Imagen] DEBUG - Reference structure:', JSON.stringify(
        referenceImagesArray.map(r => ({
          referenceType: r.referenceType,
          referenceId: r.referenceId,
          subjectImageConfig: r.subjectImageConfig,
          imageSize: r.referenceImage?.bytesBase64Encoded?.length || 0,
          // Log first 50 chars of base64 to verify it looks correct
          base64Preview: r.referenceImage?.bytesBase64Encoded?.substring(0, 50) + '...'
        })), null, 2
      ))
      
      // Verify the request structure matches Google's expected format
      console.log('[Imagen] DEBUG - Full request structure (without image data):')
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

