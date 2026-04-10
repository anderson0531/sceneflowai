import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs voice preview retired',
      migration: 'Use Gemini TTS preview via /api/tts/google',
    },
    { status: 410 }
  )
}
