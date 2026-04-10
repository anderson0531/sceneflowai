import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs endpoints have been retired',
      migration: 'Use /api/tts/google for TTS and /api/audio/epidemic/* for SFX',
    },
    { status: 410 }
  )
}
