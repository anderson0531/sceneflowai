import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs voice design retired',
      migration: 'Use Gemini TTS Director profiles via /api/tts/google/director-prompt',
    },
    { status: 410 }
  )
}
