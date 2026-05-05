import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs TTS endpoint has been retired',
      migration: 'Use /api/tts/google for TTS. SFX is generated via /api/tts/elevenlabs/sound-effects.',
    },
    { status: 410 }
  )
}
