/**
 * Gemini Studio (Google AI Studio) Image Generation Client
 * 
 * Uses Gemini 3 Pro Image Preview for image generation with reference images.
 * This model supports up to 5 human reference images for character consistency
 * and generates high-quality images up to 4K resolution.
 * 
 * Unlike Vertex AI Imagen's complex referenceImages API, Gemini 3 Pro uses
 * simple multimodal input - reference images are passed directly in the prompt.
 * 
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

export interface GeminiStudioImageOptions {
  prompt: string
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K' | '4K'
  referenceImages?: Array<{
    imageUrl?: string      // HTTP URL to download
    base64Image?: string   // Already encoded base64
    mimeType?: string      // e.g., 'image/jpeg', 'image/png'
    name?: string          // Character name for logging
  }>
}

export interface GeminiStudioImageResult {
  imageBase64: string
  mimeType: string
  text?: string  // Optional text response
}

/**
 * Generate an image using Gemini 3 Pro Image Preview via Google AI Studio API
 * 
 * This is the preferred method for generating images with character reference images
 * because Gemini 3 Pro handles reference images natively in the prompt context.
 */
export async function generateImageWithGeminiStudio(
  options: GeminiStudioImageOptions
): Promise<GeminiStudioImageResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }
  
  // Use gemini-2.5-flash-image for higher rate limits (500 RPM vs 20 RPM for gemini-3-pro-image)
  // This is the "Nano Banana" model - supports reference images for character consistency
  const model = 'gemini-2.5-flash-image'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  console.log(`[Gemini Studio Image] Generating with ${model}...`)
  console.log(`[Gemini Studio Image] Prompt preview: ${options.prompt.substring(0, 150)}...`)
  console.log(`[Gemini Studio Image] Reference images: ${options.referenceImages?.length || 0}`)
  
  // Build the contents array with prompt text and reference images
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = []
  
  // Add text prompt first
  parts.push({ text: options.prompt })
  
  // Add reference images as inline_data parts
  if (options.referenceImages && options.referenceImages.length > 0) {
    console.log(`[Gemini Studio Image] Adding ${options.referenceImages.length} reference image(s)`)
    
    for (const ref of options.referenceImages) {
      let base64Data = ref.base64Image
      let mimeType = ref.mimeType || 'image/jpeg'
      
      // Download from URL if needed
      if (!base64Data && ref.imageUrl) {
        console.log(`[Gemini Studio Image] Downloading reference from: ${ref.imageUrl.substring(0, 50)}...`)
        try {
          const response = await fetch(ref.imageUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          // Detect mime type from response
          const contentType = response.headers.get('content-type')
          if (contentType) {
            mimeType = contentType.split(';')[0].trim()
          }
          
          const arrayBuffer = await response.arrayBuffer()
          base64Data = Buffer.from(arrayBuffer).toString('base64')
          console.log(`[Gemini Studio Image] Downloaded ${ref.name || 'reference'}: ${base64Data.length} base64 chars, ${mimeType}`)
        } catch (error: any) {
          console.error(`[Gemini Studio Image] Failed to download reference:`, error.message)
          throw new Error(`Failed to download reference image: ${error.message}`)
        }
      }
      
      if (!base64Data) {
        console.warn(`[Gemini Studio Image] Reference ${ref.name || 'unknown'}: No image data, skipping`)
        continue
      }
      
      // Strip data URL prefix if present
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1] || base64Data
      }
      
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      })
      
      console.log(`[Gemini Studio Image] Added reference: ${ref.name || 'unnamed'} (${mimeType})`)
    }
  }
  
  // Build request body per Gemini API spec
  const requestBody = {
    contents: [
      {
        parts
      }
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],  // Allow both text and image output
      ...(options.aspectRatio || options.imageSize ? {
        imageConfig: {
          ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
          ...(options.imageSize && { imageSize: options.imageSize })
        }
      } : {})
    },
    // Safety settings to allow adult content (required for character generation)
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  }
  
  console.log(`[Gemini Studio Image] Request config:`, JSON.stringify({
    model,
    partsCount: parts.length,
    aspectRatio: options.aspectRatio || 'default',
    imageSize: options.imageSize || '1K'
  }))
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Gemini Studio Image] Error response:', errorText)
    
    let hint = ''
    if (response.status === 400) {
      hint = 'Bad request. Check prompt and parameters.'
    } else if (response.status === 403) {
      hint = 'API key may be invalid or this model is not available with your API key.'
    } else if (response.status === 429) {
      hint = 'Rate limit exceeded. Try again in a moment.'
    } else if (response.status === 503) {
      hint = 'Service temporarily unavailable. The model may be under high load.'
    }
    
    throw new Error(`Gemini Studio API error ${response.status}: ${errorText}. ${hint}`)
  }
  
  const data = await response.json()
  
  // Check for blocked content
  if (data.promptFeedback?.blockReason) {
    console.error('[Gemini Studio Image] Content blocked:', data.promptFeedback.blockReason)
    throw new Error(`Image generation blocked: ${data.promptFeedback.blockReason}. Try adjusting the prompt.`)
  }
  
  // Extract image from response
  const candidates = data.candidates
  if (!candidates || candidates.length === 0) {
    console.error('[Gemini Studio Image] No candidates in response:', JSON.stringify(data))
    throw new Error('No image generated. The request may have been filtered.')
  }
  
  const content = candidates[0].content
  if (!content || !content.parts) {
    console.error('[Gemini Studio Image] No parts in response:', JSON.stringify(candidates[0]))
    throw new Error('Invalid response structure from Gemini API.')
  }
  
  // Find image and text parts
  let imageBase64: string | undefined
  let imageMimeType = 'image/png'
  let responseText: string | undefined
  
  for (const part of content.parts) {
    if (part.inline_data) {
      imageBase64 = part.inline_data.data
      imageMimeType = part.inline_data.mime_type || 'image/png'
      console.log(`[Gemini Studio Image] Found image: ${imageMimeType}, ${imageBase64.length} chars`)
    } else if (part.text && !part.thought) {
      // Capture non-thought text
      responseText = part.text
      console.log(`[Gemini Studio Image] Found text: ${responseText.substring(0, 100)}...`)
    }
  }
  
  if (!imageBase64) {
    console.error('[Gemini Studio Image] No image in response parts:', JSON.stringify(content.parts.map((p: any) => Object.keys(p))))
    throw new Error('No image found in Gemini response. The model may have returned only text.')
  }
  
  console.log('[Gemini Studio Image] ✓ Image generated successfully')
  
  return {
    imageBase64,
    mimeType: imageMimeType,
    text: responseText
  }
}

/**
 * Upload a generated image to Vercel Blob storage
 * (Utility function to match existing workflow)
 */
export async function uploadGeneratedImage(
  imageBase64: string,
  mimeType: string,
  filename: string
): Promise<string> {
  // Dynamic import to avoid issues if blob storage not configured
  const { put } = await import('@vercel/blob')
  
  // Convert base64 to buffer
  const buffer = Buffer.from(imageBase64, 'base64')
  
  // Determine extension from mime type
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'
  const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`
  
  // Upload to Vercel Blob
  const blob = await put(fullFilename, buffer, {
    access: 'public',
    contentType: mimeType
  })
  
  console.log(`[Gemini Studio Image] Uploaded to blob storage: ${blob.url}`)
  
  return blob.url
}
