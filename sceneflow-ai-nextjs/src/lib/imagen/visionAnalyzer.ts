import { generateWithVision } from '@/lib/vertexai/gemini'

/**
 * Analyze character image with Vertex AI Gemini Vision to extract detailed physical description
 * Optimized for AI image generation prompts
 */
export async function analyzeCharacterImage(imageUrl: string, characterName: string): Promise<string> {
  console.log(`[Vision Analyzer] Analyzing ${characterName} from:`, imageUrl.substring(0, 50))
  
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

  const prompt = `Analyze this character portrait and extract ONLY the permanent physical characteristics for AI image generation. DO NOT include expressions, emotions, or moods.

INCLUDE these physical traits:
1. Ethnicity and skin tone (be specific)
2. Age (exact range, e.g., "late 50s", "early 40s")
3. Facial structure (face shape, bone structure, cheekbones, jawline)
4. Hair: style, color, texture, grooming (or "bald" if no hair)
5. Facial hair: style, color, length, grooming (or "clean-shaven" if none)
6. Eyes: color, shape (NOT expression)
7. Distinctive permanent features: wrinkles, scars, moles, facial lines
8. Build and physique

DO NOT INCLUDE:
- Expressions (smiling, frowning, serious, etc.)
- Emotions (happy, sad, worried, confident, etc.)
- Moods (friendly, stern, cheerful, etc.)
- Temporary states (tired, energetic, etc.)

Respond with a neutral, emotion-free physical description (3-4 sentences). Focus on unchanging characteristics only. Use precise, specific language.`

  const result = await generateWithVision([
    { text: prompt },
    {
      inlineData: {
        data: base64,
        mimeType: mimeType
      }
    }
  ], {
    model: 'gemini-2.0-flash',
    temperature: 0.2
  })

  const description = result.text.trim()
  console.log(`[Vision Analyzer] ${characterName} analysis complete:`)
  console.log(description.substring(0, 200) + (description.length > 200 ? '...' : ''))
  
  return description
}

