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
    
    const prompt = `Analyze this character image and extract detailed physical attributes.

Return ONLY valid JSON with this exact structure:
{
  "ethnicity": "Specific ethnic/cultural origin (e.g., 'Japanese', 'Mediterranean', 'West African')",
  "keyFeature": "Most distinctive characteristic (e.g., 'Piercing gaze and confident posture')",
  "hairStyle": "Specific style, length, texture (e.g., 'Short, side-parted, slightly tousled')",
  "hairColor": "Exact color with detail (e.g., 'Deep chestnut brown with subtle highlights')",
  "eyeColor": "Exact eye color (e.g., 'Warm amber brown')",
  "expression": "Typical facial expression/demeanor (e.g., 'Calm, focused, with slight smile')",
  "build": "Body type, physique (e.g., 'Athletic, lean, moves with grace')"
}

Be SPECIFIC and VISUAL. These attributes will be used to generate consistent character images across multiple scenes.

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
    
    const attributes = JSON.parse(cleanedText)
    
    console.log('[Analyze Image] Extracted attributes:', attributes)
    
    return NextResponse.json({ 
      success: true, 
      attributes 
    })
  } catch (error: any) {
    console.error('[Analyze Image] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to analyze image'
    }, { status: 500 })
  }
}

