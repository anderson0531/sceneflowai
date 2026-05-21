import { NextRequest, NextResponse } from 'next/server'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import {
  isGeminiTtsConfigured,
  normalizeBlueprintGeminiVoiceId,
  synthesizeGeminiFlashMp3,
} from '@/lib/tts/geminiFlashTts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Blueprint narration TTS (Gemini 3.1 Flash). Studio preview and share UI should use this route.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isGeminiTtsConfigured()) {
      return NextResponse.json(
        { error: 'Blueprint TTS not configured (GOOGLE_API_KEY or Vertex service account)' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const text = typeof body?.text === 'string' ? body.text : ''
    if (!text.trim()) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    let cleanText = text
    let directorNotes =
      typeof body?.prompt === 'string'
        ? body.prompt
        : typeof body?.directorNotes === 'string'
          ? body.directorNotes
          : undefined
    const noteMatch = cleanText.match(/\[DirectorNote:\s*(.*?)\]/)
    if (noteMatch) {
      directorNotes = directorNotes || noteMatch[1]
      cleanText = cleanText.replace(/\[DirectorNote:\s*(.*?)\]\s*/, '').trim()
    }

    const voiceId = normalizeBlueprintGeminiVoiceId(
      typeof body?.voiceId === 'string' ? body.voiceId : undefined
    )

    const chunks = chunkNarrationText(cleanText, 4000)
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      buffers.push(
        await synthesizeGeminiFlashMp3({
          text: chunk,
          voiceId,
          directorNotes,
        })
      )
    }

    const finalBuffer = buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
    return new Response(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Blueprint TTS]', message)
    return NextResponse.json({ error: 'TTS failed', details: message }, { status: 500 })
  }
}
