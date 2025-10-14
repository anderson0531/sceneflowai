import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(req: NextRequest) {
  try {
    const { field, value } = await req.json()
    
    if (!field || !value?.trim()) {
      return NextResponse.json({ error: 'Field and value are required' }, { status: 400 })
    }

    const googleApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ 
        error: 'Google API key not configured' 
      }, { status: 500 })
    }

    // Use Gemini Flash for quick, cheap expansions
    const prompt = `Expand on this "${field}" description for an AI character image prompt: "${value}". 
Provide 3 brief, vivid variations (each 3-8 words). Return ONLY a JSON array of strings, nothing else.

Example response: ["variation one", "variation two", "variation three"]`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200
          }
        })
      }
    )

    if (!response.ok) {
      console.error('[Prompt Enhance] API error:', response.status)
      return NextResponse.json({ 
        error: 'Failed to generate suggestions' 
      }, { status: 500 })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Extract JSON array from response
    let suggestions: string[] = []
    try {
      // Try to parse as JSON
      const jsonMatch = text.match(/\[.*\]/s)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: split by newlines and clean
        suggestions = text
          .split('\n')
          .map((line: string) => line.replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, '').trim())
          .filter((line: string) => line.length > 0 && line.length < 100)
          .slice(0, 3)
      }
    } catch {
      // If parsing fails, return original value
      suggestions = [value]
    }

    return NextResponse.json({ 
      success: true, 
      suggestions: suggestions.slice(0, 3)
    })

  } catch (error) {
    console.error('[Prompt Enhance] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

