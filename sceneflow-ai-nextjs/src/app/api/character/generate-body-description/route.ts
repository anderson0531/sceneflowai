import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import {
  buildBodyDirectorPrompt,
  parseBodyDirectorResponse,
  type BodyDirectorRequest,
} from '@/lib/character/buildBodyDirectorPrompt'

export const maxDuration = 60
export const runtime = 'nodejs'

async function callGemini(prompt: string): Promise<string> {
  console.log('[Generate Body] Calling Vertex AI Gemini...')
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
    const body = (await request.json()) as BodyDirectorRequest

    if (!body.recommendMode && !body.directorNotes?.trim()) {
      return NextResponse.json(
        { error: 'Body direction is required' },
        { status: 400 },
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 },
      )
    }

    const prompt = buildBodyDirectorPrompt(body)
    console.log(
      '[Generate Body] Processing request for:',
      body.characterName,
      body.recommendMode ? '(recommend mode)' : '(director notes)',
    )

    const responseText = await callGemini(prompt)

    let appearance
    try {
      appearance = parseBodyDirectorResponse(responseText)
    } catch (parseError) {
      console.error('[Generate Body] Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse body description response' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      appearanceDescription: appearance.appearanceDescription,
    })
  } catch (error) {
    console.error('[Generate Body] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate body description',
      },
      { status: 500 },
    )
  }
}
