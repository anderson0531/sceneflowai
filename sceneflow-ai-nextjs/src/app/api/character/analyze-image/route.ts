import { NextRequest, NextResponse } from 'next/server'
import { generateWithVision } from '@/lib/vertexai/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, characterName } = await req.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
    }
    
    console.log('[Analyze Image] Analyzing character:', characterName, 'from URL:', imageUrl.substring(0, 50))
    
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    
    const prompt = `Analyze this character reference image and extract physical appearance details.

PART 1 - STRUCTURED ATTRIBUTES (for database):
Extract these specific fields as JSON:
{
  "subject": "brief role description",
  "ethnicity": "ethnicity/race (e.g., 'African American', 'Asian', 'Caucasian', 'Hispanic')",
  "keyFeature": "most distinctive feature",
  "hairStyle": "hair style",
  "hairColor": "hair color",
  "eyeColor": "eye color",
  "expression": "typical expression",
  "build": "body build"
}

PART 2 - APPEARANCE DESCRIPTION (for image generation):
Create a single concise sentence describing objective physical appearance ONLY.
Focus on: Ethnicity/Race, Gender, Apparent Age (e.g., "in his late 40s"), Hair (color, style, texture), Skin Tone, and distinct Facial Features (e.g., "strong jawline", "clean-shaven", "glasses").

CRITICAL - DO NOT INCLUDE CLOTHING: Never mention what the person is wearing.
DO NOT include: Clothing, Wardrobe, Attire, Outfit, Accessories (watch, jewelry), Emotion, Action, Lighting, or Background.
The wardrobe is set separately - only describe physical features of the person's face and body.

Format as:
"appearanceDescription": "An [ethnicity] [gender] in [his/her] [age], with [hair details], [skin tone], and [facial features]"

Example: "An African American man in his late 40s, with short black hair, dark brown skin, and a strong jawline"

CRITICAL: Output ONLY a single valid JSON object with all fields.
DO NOT include markdown fences, explanations, or any text before or after the JSON.
Start your response with { and end with }`

    console.log('[Analyze Image] Calling Vertex AI Gemini...')
    const result = await generateWithVision(
      [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Image
          }
        }
      ],
      {
        model: 'gemini-2.5-flash',
        temperature: 0.4,
        topP: 0.8,
        maxOutputTokens: 500
      }
    )
    
    const text = result.text
    
    if (!text) {
      throw new Error('No response from Gemini')
    }
    
    console.log('[Analyze Image] Raw response:', text.substring(0, 500))
    
    // Remove markdown fences first
    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Extract all JSON objects (Gemini sometimes returns multiple objects)
    // Match all {...} patterns that look like complete JSON objects
    const jsonObjectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
    const jsonMatches = cleanedText.match(jsonObjectRegex)
    
    if (!jsonMatches || jsonMatches.length === 0) {
      console.error('[Analyze Image] No valid JSON objects found in response')
      console.error('[Analyze Image] Cleaned text:', cleanedText)
      throw new Error('Invalid response format from Gemini')
    }
    
    console.log('[Analyze Image] Found', jsonMatches.length, 'JSON object(s)')
    
    // Parse and merge all JSON objects
    let parsed = {}
    try {
      for (let i = 0; i < jsonMatches.length; i++) {
        const obj = JSON.parse(jsonMatches[i])
        console.log(`[Analyze Image] Object ${i + 1}:`, Object.keys(obj))
        parsed = { ...parsed, ...obj }
      }
      console.log('[Analyze Image] Merged attributes:', Object.keys(parsed))
    } catch (parseError: any) {
      console.error('[Analyze Image] JSON parse error:', parseError.message)
      console.error('[Analyze Image] JSON matches:', jsonMatches)
      throw new Error('Failed to parse Gemini response as JSON')
    }
    
    // Only use appearanceDescription if AI actually generated it
    const attributes = parsed.appearanceDescription 
      ? { ...parsed, appearanceDescription: parsed.appearanceDescription }
      : parsed
    
    // Validate required fields
    const requiredFields = ['subject', 'ethnicity', 'hairStyle', 'hairColor', 'eyeColor', 'expression', 'build']
    const missingFields = requiredFields.filter(field => !attributes[field])
    
    if (missingFields.length > 0) {
      console.warn('[Analyze Image] Missing fields:', missingFields)
      // Fill with defaults
      missingFields.forEach(field => {
        if (!attributes[field]) {
          attributes[field] = ''
        }
      })
    }
    
    console.log('[Analyze Image] Extracted attributes:', attributes)
    
    return NextResponse.json({ 
      success: true, 
      ...attributes  // Return attributes at top level for easier access
    })
  } catch (error: any) {
    console.error('[Analyze Image] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to analyze image'
    }, { status: 500 })
  }
}

