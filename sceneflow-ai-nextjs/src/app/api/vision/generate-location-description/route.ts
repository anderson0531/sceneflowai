import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import {
  buildLocationDescriptionDirectorPrompt,
  parseLocationDescriptionDirectorResponse,
  type LocationDescriptionDirectorRequest,
} from '@/lib/vision/buildLocationDescriptionDirectorPrompt'

export const maxDuration = 60
export const runtime = 'nodejs'

async function callGemini(prompt: string, temperature: number): Promise<string> {
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature,
    topP: 0.95,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  })
  return result.text
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LocationDescriptionDirectorRequest

    if (!body.recommendMode && !body.directorNotes?.trim()) {
      return NextResponse.json(
        { error: 'Location direction is required' },
        { status: 400 },
      )
    }

    if (!body.locationName?.trim()) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 },
      )
    }

    const prompt = buildLocationDescriptionDirectorPrompt(body)
    const responseText = await callGemini(prompt, body.recommendMode ? 0.7 : 0.4)

    let description
    try {
      description = parseLocationDescriptionDirectorResponse(responseText)
    } catch (parseError) {
      console.error('[Generate Location Description] Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse location description response' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      description: description.description,
    })
  } catch (error) {
    console.error('[Generate Location Description] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate location description',
      },
      { status: 500 },
    )
  }
}
