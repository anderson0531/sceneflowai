/**
 * Image Generation Client
 * 
 * Uses Vertex AI Imagen for scene generation.
 * Migrated from Gemini API Studio (generativelanguage.googleapis.com) to 
 * Vertex AI (aiplatform.googleapis.com) for pay-as-you-go billing.
 * 
 * Supports:
 * - imagen-3.0-generate-001 for standard generation
 * - imagen-3.0-capability-001 for subject customization with reference images
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'

interface ReferenceImage {
  referenceId: number
  imageUrl?: string
  base64Image?: string
  subjectDescription?: string
}

interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9'
  numberOfImages?: number
  imageSize?: '1K' | '2K' | '4K'  // Note: Vertex AI Imagen uses different resolution handling
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  referenceImages?: ReferenceImage[]
  negativePrompt?: string  // Terms to avoid in generation (e.g., "casual clothes, jeans")
}

/**
 * Generate image using Vertex AI Imagen
 * Supports reference images for character consistency via subject customization
 * 
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, reference images, etc.)
 * @returns Base64-encoded image data URL
 */
export async function generateImageWithGemini(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for image generation')
  }
  
  const hasReferenceImages = options.referenceImages && options.referenceImages.length > 0
  
  // Use capability model for subject customization, standard model otherwise
  const model = hasReferenceImages 
    ? 'imagen-3.0-capability-001'
    : 'imagen-3.0-generate-001'
  
  // Build final prompt with negative prompt suffix if provided
  let finalPrompt = prompt
  if (options.negativePrompt && !hasReferenceImages) {
    // Negative prompt is handled differently - append to prompt for capability model
    // or use negativePrompt parameter for standard model
    finalPrompt = prompt
  }
  
  console.log(`[Vertex Imagen] Generating image with ${model}...`)
  console.log('[Vertex Imagen] Prompt:', finalPrompt.substring(0, 200))
  console.log('[Vertex Imagen] Has reference images:', hasReferenceImages)
  console.log('[Vertex Imagen] Project:', projectId, 'Location:', location)
  
  // Limit reference images (Imagen supports up to 4)
  if (hasReferenceImages && options.referenceImages!.length > 4) {
    console.warn(`[Vertex Imagen] Too many reference images (${options.referenceImages!.length}). Using first 4.`)
    options.referenceImages = options.referenceImages!.slice(0, 4)
  }
  
  console.log('[Vertex Imagen] Requesting auth token...')
  let accessToken: string
  try {
    accessToken = await getVertexAIAuthToken()
    console.log('[Vertex Imagen] Auth token obtained successfully')
  } catch (authError: any) {
    console.error('[Vertex Imagen] AUTH FAILED:', authError.message)
    throw new Error(`Vertex AI authentication failed: ${authError.message}`)
  }
  
  // Vertex AI Imagen endpoint
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`
  console.log('[Vertex Imagen] Endpoint:', endpoint)
  
  // Build request body
  const requestBody: any = {
    instances: [{
      prompt: finalPrompt
    }],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '16:9',
      safetySetting: 'block_some',
      personGeneration: options.personGeneration || 'allow_adult'
    }
  }
  
  // Add negative prompt (only for standard model, not capability model)
  if (!hasReferenceImages && options.negativePrompt) {
    requestBody.parameters.negativePrompt = options.negativePrompt
  }
  
  // Add reference images for subject customization
  // Per Google docs: referenceImage.bytesBase64Encoded is REQUIRED (not gcsUri)
  // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-customization
  if (hasReferenceImages) {
    console.log('[Vertex Imagen] Adding', options.referenceImages!.length, 'reference image(s) for subject customization')
    console.log('[Vertex Imagen] Using bytesBase64Encoded format (required by API)')
    
    const referenceImagesArray = []
    
    for (const ref of options.referenceImages!) {
      let base64Data: string | undefined = ref.base64Image
      
      // Download from URL if needed and convert to base64
      if (!base64Data && ref.imageUrl) {
        console.log(`[Vertex Imagen] Downloading reference ${ref.referenceId} from: ${ref.imageUrl.substring(0, 60)}...`)
        try {
          const imageResponse = await fetch(ref.imageUrl)
          if (!imageResponse.ok) {
            throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
          }
          const imageBuffer = await imageResponse.arrayBuffer()
          base64Data = Buffer.from(imageBuffer).toString('base64')
          console.log(`[Vertex Imagen] Downloaded and encoded ${base64Data.length} base64 chars`)
        } catch (error: any) {
          console.error(`[Vertex Imagen] Failed to download reference image:`, error.message)
          throw new Error(`Failed to download reference image: ${error.message}`)
        }
      }
      
      if (!base64Data) {
        console.warn(`[Vertex Imagen] Reference ${ref.referenceId}: No image data available, skipping`)
        continue
      }
      
      // Strip data URL prefix if present (e.g., "data:image/png;base64,")
      if (base64Data.includes(',')) {
        const originalLength = base64Data.length
        base64Data = base64Data.split(',')[1] || base64Data
        console.log(`[Vertex Imagen] Stripped data URL prefix: ${originalLength} -> ${base64Data.length} chars`)
      }
      
      // Build reference image object per Imagen 3 Capability API spec
      // IMPORTANT: bytesBase64Encoded is REQUIRED (gcsUri does NOT work for subject customization)
      referenceImagesArray.push({
        referenceType: 'REFERENCE_TYPE_SUBJECT',
        referenceId: ref.referenceId,
        referenceImage: {
          bytesBase64Encoded: base64Data
        },
        subjectImageConfig: {
          subjectType: 'SUBJECT_TYPE_PERSON',
          subjectDescription: ref.subjectDescription || 'a person'
        }
      })
      
      console.log(`[Vertex Imagen] Added SUBJECT reference ${ref.referenceId}: "${ref.subjectDescription || 'a person'}" (${base64Data.length} base64 chars)`)
      
      // ALSO add FACE_MESH control reference using the SAME image
      // Per Google docs, adding CONTROL_TYPE_FACE_MESH alongside subject reference
      // helps preserve facial features more accurately (pose, expression, structure)
      // We use a new referenceId (original + 100) to avoid collision
      const faceMeshRefId = ref.referenceId + 100
      referenceImagesArray.push({
        referenceType: 'REFERENCE_TYPE_CONTROL',
        referenceId: faceMeshRefId,
        referenceImage: {
          bytesBase64Encoded: base64Data  // Same image as subject
        },
        controlImageConfig: {
          controlType: 'CONTROL_TYPE_FACE_MESH',
          enableControlImageComputation: true  // Let API compute face mesh from image
        }
      })
      
      console.log(`[Vertex Imagen] Added FACE_MESH control reference ${faceMeshRefId} for better facial preservation`)
    }
    
    if (referenceImagesArray.length > 0) {
      requestBody.instances[0].referenceImages = referenceImagesArray
      console.log('[Vertex Imagen] Reference images configured:', referenceImagesArray.length, 'images (using bytesBase64Encoded)')
    }
  }
  
  console.log('[Vertex Imagen] Config:', JSON.stringify({
    aspectRatio: options.aspectRatio || '16:9',
    referenceImagesCount: options.referenceImages?.length || 0,
    model
  }))
  
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
    console.error('[Vertex Imagen] Error response:', errorText)
    
    let hint = ''
    if (response.status === 403) {
      hint = 'IAM permission denied. Ensure service account has roles/aiplatform.user role.'
    } else if (response.status === 404) {
      hint = `Model ${model} not found in region ${location}.`
    } else if (response.status === 400) {
      hint = 'Bad request. Check prompt and parameters.'
    } else if (response.status === 429) {
      hint = 'Rate limit exceeded. Retry after a moment.'
    }
    
    throw new Error(`Vertex AI Imagen error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  console.log('[Vertex Imagen] Response structure:', Object.keys(data))
  
  // Check for API errors in response
  if (data.error) {
    console.error('[Vertex Imagen] API error in response:', data.error)
    throw new Error(`Vertex AI API error: ${data.error.message || 'Unknown error'}`)
  }
  
  // Extract image from Vertex AI response
  const predictions = data?.predictions
  if (!predictions || predictions.length === 0) {
    console.error('[Vertex Imagen] No predictions in response - likely filtered by safety settings')
    throw new Error('Problem: Image generation was filtered due to content policies.\n\n\nAction: Try adjusting the prompt to be more descriptive and professional.')
  }
  
  const imageBytes = predictions[0]?.bytesBase64Encoded
  
  if (!imageBytes) {
    console.error('[Vertex Imagen] Unexpected response structure:', JSON.stringify(data).slice(0, 500))
    throw new Error('Unexpected response format from Vertex AI Imagen')
  }
  
  console.log('[Vertex Imagen] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

