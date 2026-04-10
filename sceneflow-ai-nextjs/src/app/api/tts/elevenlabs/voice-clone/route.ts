import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs voice clone retired',
      migration: 'Use Google voice clone endpoints under /api/tts/google/voice-clone',
    },
    { status: 410 }
  )
}
