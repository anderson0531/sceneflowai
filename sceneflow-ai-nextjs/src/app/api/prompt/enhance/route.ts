import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(req: NextRequest) {
  try {
    const { field, value } = await req.json()
    
    if (!field || !value?.trim()) {
      return NextResponse.json({ error: 'Field and value are required' }, { status: 400 })
    }

    // Vertex AI uses service account credentials - no API key required
    const prompt = `Expand on this "${field}" description for an AI character image prompt: "${value}". 
Provide 3 brief, vivid variations (each 3-8 words). Return ONLY a JSON array of strings, nothing else.

Example response: ["variation one", "variation two", "variation three"]`

    console.log('[Prompt Enhance] Calling Vertex AI Gemini...')
    const text = await generateText(prompt, { model: 'gemini-2.5-flash' })

    if (!text) {
      console.error('[Prompt Enhance] No response from Vertex AI')
      return NextResponse.json({ 
        error: 'Failed to generate suggestions' 
      }, { status: 500 })
    }
    
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

