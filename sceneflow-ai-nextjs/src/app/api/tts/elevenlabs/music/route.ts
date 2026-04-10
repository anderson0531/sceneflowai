import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs music endpoint retired',
      migration: 'Use /api/tts/google/music',
    },
    { status: 410 }
  )
}
