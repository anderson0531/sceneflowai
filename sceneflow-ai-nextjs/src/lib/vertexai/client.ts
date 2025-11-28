/**
 * Get Google API key for Gemini/Imagen
 */
function getGoogleApiKey(): string {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured')
  }
  return apiKey
}

/**
 * Generate image using Nano Banana Pro (gemini-3-pro-image-preview)
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
  const apiKey = getGoogleApiKey()
  
  // Use Nano Banana Pro model
  const MODEL_ID = 'gemini-3-pro-image-preview'
  
  console.log(`[Imagen] Generating image with ${MODEL_ID}...`)
  console.log('[Imagen] Prompt:', prompt.slice(0, 100) + '...')
  
  // REST API endpoint for Nano Banana Pro
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateImage`
  
  // Build request body for Nano Banana Pro
  const requestBody: any = {
    prompt: prompt,
    generationConfig: {
      aspectRatio: options.aspectRatio || '16:9',
      numberOfImages: options.numberOfImages || 1,
      personGeneration: options.personGeneration || 'allow_adult'
    }
  }
  
  // Enable thinking mode for max quality
  if (options.quality === 'max') {
    requestBody.generationConfig.includeThoughts = true
    console.log('[Imagen] Enabling thinking mode for max quality')
  }
  
  // Handle reference images (up to 14 supported)
  if (options.referenceImages && options.referenceImages.length > 0) {
    console.log(`[Imagen] Using ${options.referenceImages.length} reference images`)
    requestBody.referenceImages = options.referenceImages
      .filter(ref => ref.base64Image)
      .map(ref => {
        const base64Data = ref.base64Image!.replace(/^data:image\/[^;]+;base64,/, '')
        return {
          imageBytes: base64Data,
          mimeType: 'image/jpeg'
        }
      })
  }
  
  if (options.negativePrompt) {
    requestBody.negativePrompt = options.negativePrompt
  }
  
  console.log('[Imagen] Config:', JSON.stringify(requestBody.generationConfig))
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Imagen] Error response:', errorText)
    
    let hint = ''
    if (response.status === 403 || response.status === 401) {
      hint = 'Check that GOOGLE_API_KEY is valid and has Gemini API access enabled.'
    } else if (response.status === 404) {
      hint = 'Model gemini-3-pro-image-preview not found. Ensure Gemini API is enabled in Google Cloud Console.'
    } else if (response.status === 400) {
      hint = 'Bad request. Check prompt and generation config parameters.'
    }
    
    throw new Error(`Imagen API error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  console.log('[Imagen] Response structure:', Object.keys(data))
  
  // Extract image bytes from response
  const imageBytes = data?.generatedImages?.[0]?.imageBytes || 
                    data?.images?.[0]?.imageBytes ||
                    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  
  if (!imageBytes) {
    console.error('[Imagen] Unexpected response:', JSON.stringify(data).slice(0, 500))
    throw new Error('No image data in API response')
  }
  
  console.log('[Imagen] Image generated successfully')
  return `data:image/png;base64,${imageBytes}`
}

