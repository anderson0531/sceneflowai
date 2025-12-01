/**
 * Gemini API Image Generation Client
 * Uses Gemini 3 Pro Image Preview (gemini-3-pro-image-preview) for scene generation
 * Supports up to 5 reference images for character consistency
 */

interface ReferenceImage {
  referenceId: number
  imageUrl?: string
  base64Image?: string
  subjectDescription?: string
}

interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9'
  numberOfImages?: number
  imageSize?: '1K' | '2K' | '4K'
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
  referenceImages?: ReferenceImage[]
}

/**
 * Generate image using Gemini 3 Pro Image Preview
 * Supports up to 5 reference images for character consistency
 * 
 * @param prompt - Text description of image to generate
 * @param options - Generation options (aspect ratio, reference images, etc.)
 * @returns Base64-encoded image data URL
 */
export async function generateImageWithGemini(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  
  const hasReferenceImages = options.referenceImages && options.referenceImages.length > 0
  const model = 'gemini-3-pro-image-preview'
  
  console.log(`[Gemini Image] Generating image with ${model}...`)
  console.log('[Gemini Image] Prompt:', prompt.substring(0, 200))
  console.log('[Gemini Image] Has reference images:', hasReferenceImages)
  
  if (hasReferenceImages && options.referenceImages!.length > 5) {
    console.warn(`[Gemini Image] Too many reference images (${options.referenceImages!.length}). Gemini supports up to 5 for character consistency. Using first 5.`)
    options.referenceImages = options.referenceImages!.slice(0, 5)
  }
  
  // Build contents array: prompt + reference images
  const contents: any[] = []
  
  // Add text prompt
  contents.push({ text: prompt })
  
  // Add reference images if provided
  if (hasReferenceImages) {
    console.log('[Gemini Image] Adding', options.referenceImages!.length, 'reference image(s) for character consistency')
    
    for (const ref of options.referenceImages!) {
      let base64Data = ref.base64Image
      
      // If HTTP/HTTPS URL provided, download and convert to base64
      if (!base64Data && ref.imageUrl) {
        console.log(`[Gemini Image] Downloading reference ${ref.referenceId} from: ${ref.imageUrl.substring(0, 50)}...`)
        try {
          const imageResponse = await fetch(ref.imageUrl)
          if (!imageResponse.ok) {
            throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
          }
          const imageBuffer = await imageResponse.arrayBuffer()
          base64Data = Buffer.from(imageBuffer).toString('base64')
          console.log(`[Gemini Image] Downloaded and encoded ${base64Data.length} base64 chars`)
        } catch (error: any) {
          console.error(`[Gemini Image] Failed to download reference image:`, error.message)
          throw new Error(`Failed to download reference image: ${error.message}`)
        }
      }
      
      if (!base64Data) {
        console.warn(`[Gemini Image] Reference ${ref.referenceId}: No image data available, skipping`)
        continue
      }
      
      // Add image to contents array
      // Gemini API expects inline_data format
      contents.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data
        }
      })
      
      console.log(`[Gemini Image] Added reference ${ref.referenceId}: ${ref.subjectDescription || 'character'} (${base64Data.length} base64 chars)`)
    }
  }
  
  // Build request body for Gemini API
  const generationConfig: any = {
    response_modalities: ['IMAGE'],
    responseMimeType: 'image/png'
  }

  // Add image config if specified
  if (options.aspectRatio || options.imageSize) {
    generationConfig.image_config = {
      aspect_ratio: options.aspectRatio || '16:9',
      image_size: options.imageSize || '1K'
    }
  }

  const requestBody: any = {
    contents: [
      {
        parts: contents
      }
    ],
    generationConfig
  }
  
  console.log('[Gemini Image] Config:', JSON.stringify({
    aspectRatio: options.aspectRatio || '16:9',
    imageSize: options.imageSize || '1K',
    referenceImagesCount: options.referenceImages?.length || 0
  }))
  
  // Gemini API endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Gemini Image] Error response:', errorText)
    
    let hint = ''
    if (response.status === 403) {
      hint = 'API key invalid or unauthorized.'
    } else if (response.status === 404) {
      hint = `Model ${model} not found or not accessible.`
    } else if (response.status === 400) {
      hint = 'Bad request. Check prompt and parameters.'
    }
    
    throw new Error(`Gemini API error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  console.log('[Gemini Image] Response structure:', Object.keys(data))
  
  // Check for API errors in response
  if (data.error) {
    console.error('[Gemini Image] API error in response:', data.error)
    throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`)
  }
  
  // Extract image from Gemini response
  // Response structure: candidates[0].content.parts[n].inline_data.data
  const candidates = data?.candidates
  if (!candidates || candidates.length === 0) {
    console.error('[Gemini Image] No candidates in response - likely filtered by safety settings')
    throw new Error('Problem: Image generation was filtered due to content policies.\n\n\nAction: Try adjusting the prompt to be more descriptive and professional.')
  }
  
  const candidate = candidates[0]
  const parts = candidate?.content?.parts
  if (!parts || parts.length === 0) {
    console.error('[Gemini Image] No parts in response:', JSON.stringify(data).slice(0, 500))
    throw new Error('Unexpected response format from Gemini API')
  }
  
  // Find the image part (skip thought parts if present)
  let imageData: string | null = null
  for (const part of parts) {
    if (part.inline_data && part.inline_data.mime_type?.startsWith('image/') && !part.thought) {
      imageData = part.inline_data.data
      break
    }

    if (!imageData && part.file_data?.file_uri) {
      const fileUri: string = part.file_data.file_uri
      const isGcsUri = fileUri.startsWith('gs://')
      if (isGcsUri) {
        console.warn('[Gemini Image] Received gs:// file URI, which cannot be downloaded with API key. Prompt likely blocked or requires Vertex integration.')
        continue
      }

      try {
        const separator = fileUri.includes('?') ? '&' : '?'
        const urlWithKey = fileUri.includes('key=') ? fileUri : `${fileUri}${separator}key=${apiKey}`
        console.log('[Gemini Image] Downloading image via file_data URI...')
        const fileResponse = await fetch(urlWithKey)
        if (!fileResponse.ok) {
          console.error('[Gemini Image] file_data download failed:', fileResponse.status, fileResponse.statusText)
          continue
        }

        const buffer = Buffer.from(await fileResponse.arrayBuffer())
        imageData = buffer.toString('base64')
        break
      } catch (error: any) {
        console.error('[Gemini Image] Unable to download file_data URI:', error.message)
      }
    }
  }
  
  if (!imageData) {
    const finishReason = candidate?.finishReason || candidate?.finish_reason
    const safetyRatings = candidate?.safetyRatings || candidate?.safety_ratings
    const promptFeedback = data?.promptFeedback
    const textParts = parts
      .filter((part: any) => typeof part.text === 'string' && part.text.trim().length > 0)
      .map((part: any) => part.text.trim())

    console.error('[Gemini Image] No image data in response parts:', JSON.stringify(parts).slice(0, 500))
    console.error('[Gemini Image] Debug context:', {
      finishReason,
      promptFeedback,
      safetyRatings,
      firstTextPart: textParts[0]
    })

    if (finishReason && finishReason !== 'STOP') {
      const reason = finishReason.toString().toUpperCase()
      if (reason.includes('SAFETY')) {
        throw new Error('Gemini blocked the prompt for safety reasons. Try softening violent/graphic wording or remove disallowed references.')
      }
      if (reason.includes('BLOCK') || reason.includes('FILTER')) {
        throw new Error(`Gemini filtered this request (${finishReason}). Adjust the prompt and try again.`)
      }
      if (reason.includes('ERROR')) {
        throw new Error(`Gemini encountered an internal error while generating the image (finishReason=${finishReason}). Please retry in a moment.`)
      }
    }

    if (promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked this prompt (${promptFeedback.blockReason}). ${promptFeedback.blockReasonMessage || 'Please adjust the description.'}`)
    }

    if (textParts.length > 0) {
      throw new Error(`Gemini returned text instead of an image: "${textParts[0].slice(0, 200)}"`)
    }
    
    throw new Error('No image data in Gemini API response')
  }
  
  console.log('[Gemini Image] Image generated successfully')
  return `data:image/png;base64,${imageData}`
}
