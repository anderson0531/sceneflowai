import { NextRequest, NextResponse } from 'next/server'
import { synthesizeEdgeMp3 } from '@/lib/tts/synthesizeEdgeMp3'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_PREVIEW =
  'This is a preview of my Edge fallback voice for dialogue generation.'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text =
      typeof body.text === 'string' && body.text.trim()
        ? body.text.trim()
        : DEFAULT_PREVIEW
    const voiceId =
      typeof body.voiceId === 'string' && body.voiceId.trim()
        ? body.voiceId.trim()
        : undefined

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Missing voiceId parameter' },
        { status: 400 }
      )
    }

    const audioBuffer = await synthesizeEdgeMp3({
      text,
      voice: voiceId,
    })

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Edge TTS] Preview error:', message)
    return NextResponse.json(
      { error: 'Edge TTS preview failed', details: message },
      { status: 500 }
    )
  }
}
