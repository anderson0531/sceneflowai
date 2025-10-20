import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, characterName } = await req.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
    }
    
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
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
DO NOT include: Emotion, Action, Lighting, Clothing, or Background.

Format as:
"appearanceDescription": "An [ethnicity] [gender] in [his/her] [age], with [hair details], [skin tone], and [facial features]"

Example: "An African American man in his late 40s, with short black hair, dark brown skin, and a strong jawline"

Output both parts in JSON format with all fields.
IMPORTANT: Return ONLY the JSON object, no markdown fences, no explanations.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { 
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4, // Lower temperature for more consistent, factual extraction
            topP: 0.8,
            maxOutputTokens: 500
          }
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }
    
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No response from Gemini')
    }
    
    console.log('[Analyze Image] Raw response:', text.substring(0, 200))
    
    // Parse JSON response (handle markdown fences)
    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json\n?|\n?```|```/g, '').trim()
    
    const parsed = JSON.parse(cleanedText)
    
    // Ensure appearanceDescription is present, generate fallback if needed
    const appearanceDescription = parsed.appearanceDescription || 
      `${parsed.ethnicity || ''} ${parsed.subject || 'person'} with ${parsed.hairColor || ''} ${parsed.hairStyle || ''} hair`.trim()
    
    const attributes = {
      ...parsed,
      appearanceDescription
    }
    
    console.log('[Analyze Image] Extracted attributes:', attributes)
    console.log('[Analyze Image] Appearance description:', appearanceDescription)
    
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

