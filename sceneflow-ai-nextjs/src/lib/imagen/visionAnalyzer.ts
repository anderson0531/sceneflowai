import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Analyze character image with Gemini Vision to extract detailed physical description
 * Optimized for AI image generation prompts
 */
export async function analyzeCharacterImage(imageUrl: string, characterName: string): Promise<string> {
  console.log(`[Vision Analyzer] Analyzing ${characterName} from:`, imageUrl.substring(0, 50))
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Fetch image
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  
  // Determine mime type from URL
  const mimeType = imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') 
    ? 'image/jpeg' 
    : 'image/png'

  const prompt = `Analyze this character portrait and provide a DETAILED, PRECISE physical description optimized for AI image generation.

Focus on these specific details:
1. Ethnicity and skin tone (be very specific)
2. Age (exact range, e.g., "late 50s", "early 40s")
3. Facial structure (face shape, bone structure, cheekbones, jawline)
4. Hair: style, color, texture, grooming (or "bald" if no hair)
5. Facial hair: style, color, length, grooming (or "clean-shaven" if none)
6. Eyes: color, shape, expression, distinctive features
7. Distinctive features: wrinkles, scars, moles, expression lines
8. Build and physique visible in frame

Respond with a single, detailed paragraph (3-4 sentences). Use precise, visual language. Avoid vague terms like "middle-aged" or "average build" - be specific.`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64,
        mimeType: mimeType
      }
    }
  ])

  const description = result.response.text().trim()
  console.log(`[Vision Analyzer] ${characterName} analysis complete:`)
  console.log(description.substring(0, 200) + (description.length > 200 ? '...' : ''))
  
  return description
}

