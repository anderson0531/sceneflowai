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
    }>
  } = {}
): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }

  // Determine model based on quality setting
  const model = options.quality === 'max' 
    ? 'imagen-4.0-ultra-generate-001'  // Imagen 4 Ultra
    : 'imagen-3.0-generate-002'         // Imagen 3 (default)
  
  console.log(`[Vertex AI] Generating image with ${model} (${options.quality || 'auto'} quality)...`)
  console.log('[Vertex AI] Project:', projectId, 'Region:', region)

  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI endpoint with selected model
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:predict`
  
  const requestBody: any = {
    instances: [{
      prompt: prompt
    }],
    parameters: {
      model, // Use selected model
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      negativePrompt: options.negativePrompt || '',
      safetySetting: 'block_only_high', // Renamed from 'block_few' in Imagen 3
      personGeneration: 'allow_adult' // Default setting - allows adults but not celebrities
    }
  }
  
  console.log('[Vertex AI] Negative prompt:', requestBody.parameters.negativePrompt || '(none)')

  // Add reference images if provided
  // Prefer GCS URLs over Base64 for efficiency
  if (options.referenceImages && options.referenceImages.length > 0) {
    requestBody.parameters.referenceImages = options.referenceImages.map(ref => {
      // Use GCS URL if available (preferred), otherwise fall back to Base64
      if (ref.gcsUri) {
        console.log(`[Vertex AI] Using GCS URI for reference ${ref.referenceId}:`, ref.gcsUri)
        return {
          referenceId: ref.referenceId.toString(),
          referenceUri: ref.gcsUri,  // GCS format: gs://bucket/path
          subjectDescription: ref.subjectDescription || `Character ${ref.referenceId}`
        }
      } else if (ref.base64Image) {
        console.log(`[Vertex AI] Using Base64 for reference ${ref.referenceId} (GCS not available)`)
        return {
          referenceId: ref.referenceId.toString(),
          bytesBase64Encoded: ref.base64Image,
          subjectDescription: ref.subjectDescription || `Character ${ref.referenceId}`
        }
      } else {
        throw new Error(`Reference ${ref.referenceId} has neither gcsUri nor base64Image`)
      }
    })
    
    const firstRef = options.referenceImages[0]
    console.log('[Vertex AI] Using', options.referenceImages.length, 'reference images')
    console.log('[Vertex AI] Reference method:', firstRef.gcsUri ? 'GCS URI' : 'Base64')
    console.log('[Vertex AI] Reference description:', firstRef.subjectDescription?.substring(0, 60))
    
    if (firstRef.gcsUri) {
      console.log('[Vertex AI] GCS URI:', firstRef.gcsUri)
    } else if (firstRef.base64Image) {
      const base64SizeKB = Math.round((firstRef.base64Image.length * 0.75) / 1024)
      console.log(`[Vertex AI] Base64 size: ${base64SizeKB}KB`)
      // Validate base64 format
      const firstBase64 = firstRef.base64Image
      console.log('[Vertex AI] Base64 validation:')
      console.log('  - Length:', firstBase64.length)
      console.log('  - Starts with data URL?:', firstBase64.startsWith('data:'))
      console.log('  - First 80 chars:', firstBase64.substring(0, 80))
      console.log('  - Appears valid?:', /^[A-Za-z0-9+/]+=*$/.test(firstBase64.substring(0, 100)))
    }
  }
  
  // Log request size for debugging
  const requestBodyStr = JSON.stringify(requestBody)
  const requestSizeKB = Math.round(requestBodyStr.length / 1024)
  console.log(`[Vertex AI] Total request size: ${requestSizeKB}KB`)

  // Log full request for debugging (excluding large base64 data)
  const debugRequest = {
    ...requestBody,
    instances: requestBody.instances,
    parameters: {
      ...requestBody.parameters,
      referenceImages: requestBody.parameters.referenceImages?.map((ref: any) => ({
        referenceId: ref.referenceId,
        referenceUri: ref.referenceUri || 'N/A',
        base64Size: ref.bytesBase64Encoded ? `${Math.round((ref.bytesBase64Encoded?.length || 0) / 1024)}KB` : 'N/A',
        subjectDescription: ref.subjectDescription
      }))
    }
  }
  console.log('[Vertex AI] ===== FULL REQUEST BODY =====')
  console.log(JSON.stringify(debugRequest, null, 2))
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

