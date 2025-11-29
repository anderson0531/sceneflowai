import { getVertexAIAuthToken } from './client'

export async function callGeminiImageGeneration(
  prompt: string,
  options: {
    aspectRatio?: string
    numberOfImages?: number
    personGeneration?: string
    includeThoughts?: boolean
    negativePrompt?: string
  } = {}
): Promise<{ imageBase64: string; thoughts?: string }> {
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }

  const MODEL_ID = 'gemini-3-pro-image-preview'
  
  console.log(`[Gemini Image] Generating with ${MODEL_ID}...`)
  
  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI endpoint for prediction (using v1beta1 for preview models)
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL_ID}:predict`
  
  // Map options to parameters
  // Based on Python SDK: aspect_ratio, number_of_images, person_generation, include_thoughts
  const parameters: any = {
    sampleCount: options.numberOfImages || 1,
    aspectRatio: options.aspectRatio || '16:9',
    personGeneration: options.personGeneration || 'allow_adult',
    includeThoughts: options.includeThoughts || false
  }

  if (options.negativePrompt) {
    parameters.negativePrompt = options.negativePrompt
  }

  const requestBody = {
    instances: [{ prompt }],
    parameters
  }

  console.log('[Gemini Image] Config:', JSON.stringify(parameters))

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
    console.error('[Gemini Image] API Error:', errorText)
    throw new Error(`Gemini Image API failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.predictions || data.predictions.length === 0) {
    throw new Error('No predictions returned from Gemini Image API')
  }

  const prediction = data.predictions[0]
  
  // Check structure of prediction
  // Imagen returns bytesBase64String. Gemini might be similar or have 'image' field.
  // Python SDK: response.generated_images[0].image.image_bytes
  // REST API usually returns base64.
  
  let imageBase64 = ''
  let thoughts = ''

  if (prediction.bytesBase64Encoded) {
    imageBase64 = prediction.bytesBase64Encoded
  } else if (prediction.image?.bytesBase64Encoded) {
    imageBase64 = prediction.image.bytesBase64Encoded
  } else if (typeof prediction === 'string') {
    imageBase64 = prediction
  } else {
    // Fallback for unknown structure, log it
    console.log('[Gemini Image] Prediction structure:', JSON.stringify(prediction).slice(0, 200))
    if (prediction.bytesBase64Encoded) imageBase64 = prediction.bytesBase64Encoded
  }

  if (prediction.thoughts) {
    thoughts = prediction.thoughts
  }

  if (!imageBase64) {
    throw new Error('Could not extract image data from response')
  }

  // Ensure data URL prefix
  if (!imageBase64.startsWith('data:image')) {
    imageBase64 = `data:image/png;base64,${imageBase64}`
  }

  return { imageBase64, thoughts }
}
