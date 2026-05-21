import { NextRequest, NextResponse } from 'next/server'
import { isGeminiTtsConfigured } from '@/lib/tts/geminiFlashTts'

export const dynamic = 'force-dynamic'

/** Gemini voices for Blueprint narration. */
export async function GET(req: NextRequest) {
  try {
    if (!isGeminiTtsConfigured()) {
      return NextResponse.json({
        enabled: false,
        error: 'TTS not configured',
        voices: [],
      })
    }

    const origin = new URL(req.url).origin
    const res = await fetch(`${origin}/api/tts/google/voices`, { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    const voices = Array.isArray(data?.voices)
      ? data.voices.filter((v: { type?: string }) => v.type === 'Gemini')
      : []

    return NextResponse.json({
      enabled: voices.length > 0,
      voices,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { enabled: false, error: message, voices: [] },
      { status: 500 }
    )
  }
}
