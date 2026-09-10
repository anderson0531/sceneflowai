import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import {
  buildCastingBriefDirectorPrompt,
  parseCastingBriefDirectorResponse,
  type CastingBriefDirectorRequest,
} from '@/lib/character/buildCastingBriefDirectorPrompt'

export const maxDuration = 60
export const runtime = 'nodejs'

async function callGemini(prompt: string): Promise<string> {
  console.log('[Generate Casting Brief] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  })
  return result.text
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CastingBriefDirectorRequest

    if (!body.recommendMode && !body.directorNotes?.trim()) {
      return NextResponse.json(
        { error: 'Casting direction is required' },
        { status: 400 },
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 },
      )
    }

    const prompt = buildCastingBriefDirectorPrompt(body)
    console.log(
      '[Generate Casting Brief] Processing request for:',
      body.characterName,
      body.recommendMode ? '(recommend mode)' : '(director notes)',
    )

    const responseText = await callGemini(prompt)

    let brief
    try {
      brief = parseCastingBriefDirectorResponse(responseText)
    } catch (parseError) {
      console.error('[Generate Casting Brief] Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse casting brief response' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      voiceDescription: brief.voiceDescription,
    })
  } catch (error) {
    console.error('[Generate Casting Brief] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate casting brief',
      },
      { status: 500 },
    )
  }
}
