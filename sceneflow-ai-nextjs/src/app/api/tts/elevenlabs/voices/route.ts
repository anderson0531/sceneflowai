import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      enabled: false,
      error: 'ElevenLabs voices retired',
      migration: 'Use /api/tts/google/voices',
      voices: [],
    },
    { status: 410 }
  )
}
