import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import {
  buildWardrobeDirectorPrompt,
  parseWardrobeDirectorResponse,
  type WardrobeDirectorRequest,
} from '@/lib/character/buildWardrobeDirectorPrompt'

export const maxDuration = 60
export const runtime = 'nodejs'

async function callGemini(prompt: string): Promise<string> {
  console.log('[Generate Wardrobe] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
  })
  return result.text
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WardrobeDirectorRequest

    if (!body.recommendMode && !body.wardrobeDescription?.trim()) {
      return NextResponse.json(
        { error: 'Wardrobe description is required' },
        { status: 400 },
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 },
      )
    }

    const prompt = buildWardrobeDirectorPrompt(body)
    console.log(
      '[Generate Wardrobe] Processing request for:',
      body.characterName,
      body.recommendMode ? '(recommend mode)' : '(director notes)',
    )

    const responseText = await callGemini(prompt)

    let wardrobe
    try {
      wardrobe = parseWardrobeDirectorResponse(responseText)
    } catch (parseError) {
      console.error('[Generate Wardrobe] Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse wardrobe response' },
        { status: 500 },
      )
    }

    console.log('[Generate Wardrobe] Generated wardrobe for:', body.characterName)

    return NextResponse.json({
      success: true,
      wardrobe,
    })
  } catch (error) {
    console.error('[Generate Wardrobe] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate wardrobe' },
      { status: 500 },
    )
  }
}
