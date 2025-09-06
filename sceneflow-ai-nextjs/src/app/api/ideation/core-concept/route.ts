import { NextRequest, NextResponse } from 'next/server'

interface CoreConceptRequest {
  input: string
  targetAudience?: string
  keyMessage?: string
  tone?: string
  genre?: string
  duration?: number
  platform?: string
}

interface CoreConceptResponse {
  success: boolean
  data: {
    input_title: string
    input_synopsis: string
    core_themes: string[]
    narrative_structure: string
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CoreConceptRequest = await request.json()
    const { input, targetAudience, keyMessage, tone, genre, duration, platform } = body

    if (!input) {
      return NextResponse.json({
        success: false,
        message: 'Input content is required'
      }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    console.log('🔑 API Key available:', !!apiKey)
    if (!apiKey) {
      console.error('❌ Google Gemini API key not configured')
      return NextResponse.json({
        success: false,
        message: 'Google Gemini API key not configured'
      }, { status: 500 })
    }

    console.log('🎯 Core Concept Analysis - Input length:', input.length)
    console.log('🎯 First 500 chars:', input.substring(0, 500))

    const coreConcept = await analyzeCoreConcept(input, {
      targetAudience,
      keyMessage,
      tone,
      genre,
      duration,
      platform
    }, apiKey)

    return NextResponse.json({
      success: true,
      data: coreConcept,
      message: 'Core concept analysis completed successfully'
    })

  } catch (error) {
    console.error('❌ Core Concept Analysis Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to analyze core concept'
    }, { status: 500 })
  }
}

async function analyzeCoreConcept(
  input: string, 
  context: any, 
  apiKey: string
): Promise<CoreConceptResponse['data']> {
  
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional script analyst. Analyze this input and extract ONLY the core concept.

INPUT:
${input}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 60} seconds

CRITICAL RULES:
1. If the input is a detailed script, DO NOT copy the script content
2. Create ORIGINAL summaries based on the script's themes and structure
3. Extract the ESSENCE, not the details
4. Keep synopsis under 50 words - be CONCISE
5. Focus on the CORE MESSAGE, not scene-by-scene details

TASK: Extract the core concept by:
1. Creating a descriptive title (not copying script titles)
2. Writing a brief synopsis (≤50 words) - SUMMARIZE, don't copy
3. Identifying core themes (extract main ideas)
4. Determining the best narrative structure

Respond with valid JSON only:
{
  "input_title": "Descriptive title based on the input",
  "input_synopsis": "Brief overview summary (≤50 words) - ORIGINAL SUMMARY ONLY",
  "core_themes": ["Theme 1", "Theme 2", "Theme 3"],
  "narrative_structure": "3-Act Structure" | "5-Act Structure" | "Hero's Journey" | "Documentary Structure" | "Series Structure" | "Experimental Structure"
}`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!generatedText) {
    throw new Error('No response from Gemini API')
  }

  console.log('🎯 Gemini Core Concept Response:', generatedText)

  try {
    const parsed = JSON.parse(generatedText)
    return {
      input_title: parsed.input_title || 'Core Concept',
      input_synopsis: parsed.input_synopsis || 'Brief overview of the concept',
      core_themes: Array.isArray(parsed.core_themes) ? parsed.core_themes : ['General'],
      narrative_structure: parsed.narrative_structure || '3-Act Structure'
    }
  } catch (parseError) {
    console.error('❌ Failed to parse core concept response:', parseError)
    throw new Error('Failed to parse core concept response')
  }
}
