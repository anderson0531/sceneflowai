import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'ElevenLabs SFX endpoint retired',
      migration: 'Use /api/audio/epidemic/search and /api/audio/epidemic/select',
    },
    { status: 410 }
  )
}
