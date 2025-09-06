import { NextRequest, NextResponse } from 'next/server'

interface FilmTreatmentRequest {
  input: string
  coreConcept: {
    input_title: string
    input_synopsis: string
    core_themes: string[]
    narrative_structure: string
  }
  targetAudience?: string
  keyMessage?: string
  tone?: string
  genre?: string
  duration?: number
  platform?: string
}

interface FilmTreatmentResponse {
  success: boolean
  data: {
    film_treatment: string
    visual_style: string
    tone_description: string
    target_audience: string
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: FilmTreatmentRequest = await request.json()
    const { input, coreConcept, targetAudience, keyMessage, tone, genre, duration, platform } = body

    if (!input || !coreConcept) {
      return NextResponse.json({
        success: false,
        message: 'Input content and core concept are required'
      }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Google Gemini API key not configured'
      }, { status: 500 })
    }

    console.log('🎬 Film Treatment Generation - Input length:', input.length)
    console.log('🎬 Core concept:', coreConcept.input_title)

    const filmTreatment = await generateFilmTreatment(input, coreConcept, {
      targetAudience,
      keyMessage,
      tone,
      genre,
      duration,
      platform
    }, apiKey)

    return NextResponse.json({
      success: true,
      data: filmTreatment,
      message: 'Film treatment generated successfully'
    })

  } catch (error) {
    console.error('❌ Film Treatment Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to generate film treatment'
    }, { status: 500 })
  }
}

async function generateFilmTreatment(
  input: string,
  coreConcept: any,
  context: any,
  apiKey: string
): Promise<FilmTreatmentResponse['data']> {
  
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional film treatment writer. Create a treatment based on the core concept, NOT by copying the input.

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept.input_title}
- Synopsis: ${coreConcept.input_synopsis}
- Themes: ${coreConcept.core_themes.join(', ')}
- Structure: ${coreConcept.narrative_structure}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 60} seconds
- Platform: ${context.platform || 'Multi-platform'}

CRITICAL RULES:
1. DO NOT copy or repeat the input content
2. Create ORIGINAL treatment based on the core concept
3. Focus on VISION and APPROACH, not scene details
4. Keep treatment under 100 words - be CONCISE
5. Describe HOW to tell the story, not WHAT happens

TASK: Create a comprehensive film treatment that includes:
1. Treatment description (≤100 words) - VISION ONLY, no scene details
2. Visual style and aesthetic approach
3. Tone and mood description
4. Target audience specifics

Respond with valid JSON only:
{
  "film_treatment": "Treatment vision and approach (≤100 words) - NO SCENE DETAILS",
  "visual_style": "Visual aesthetic and style approach",
  "tone_description": "Detailed tone and mood description",
  "target_audience": "Specific target audience description"
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

  console.log('🎬 Gemini Film Treatment Response:', generatedText)

  try {
    const parsed = JSON.parse(generatedText)
    return {
      film_treatment: parsed.film_treatment || 'Comprehensive film treatment',
      visual_style: parsed.visual_style || 'Professional visual style',
      tone_description: parsed.tone_description || 'Engaging and informative tone',
      target_audience: parsed.target_audience || 'General audience'
    }
  } catch (parseError) {
    console.error('❌ Failed to parse film treatment response:', parseError)
    throw new Error('Failed to parse film treatment response')
  }
}
