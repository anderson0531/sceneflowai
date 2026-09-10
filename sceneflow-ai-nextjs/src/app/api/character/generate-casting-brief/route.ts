import { NextRequest, NextResponse } from 'next/server'
import {
  CastingBriefParseError,
  generateCastingBrief,
} from '@/lib/character/generateCastingBrief'
import type { CastingBriefDirectorRequest } from '@/lib/character/buildCastingBriefDirectorPrompt'

export const maxDuration = 60
export const runtime = 'nodejs'

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

    const brief = await generateCastingBrief(body)

    return NextResponse.json({
      success: true,
      voiceDescription: brief.voiceDescription,
    })
  } catch (error) {
    if (error instanceof CastingBriefParseError) {
      console.error('[Generate Casting Brief] Parse error:', error.cause, 'Response:', error.raw)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
