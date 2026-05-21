import { NextRequest, NextResponse } from 'next/server'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import { synthesizeGeminiFlashMp3, isGeminiTtsConfigured } from '@/lib/tts/geminiFlashTts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, prompt } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    if (!isGeminiTtsConfigured()) {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }

    let cleanText = text
    let directorNotes = typeof prompt === 'string' ? prompt : undefined
    const noteMatch = cleanText.match(/\[DirectorNote:\s*(.*?)\]/)
    if (noteMatch) {
      directorNotes = directorNotes || noteMatch[1]
      cleanText = cleanText.replace(/\[DirectorNote:\s*(.*?)\]\s*/, '').trim()
    }

    const voice = typeof voiceId === 'string' && voiceId.trim() ? voiceId.trim() : 'gemini-Kore'
    const chunks = chunkNarrationText(cleanText, 4000)
    const audioBuffers: Buffer[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]!
      console.log(
        `[Google TTS] chunk ${i + 1}/${chunks.length} (${chunkText.length} chars) voice=${voice}`
      )
      const buf = await synthesizeGeminiFlashMp3({
        text: chunkText,
        voiceId: voice,
        directorNotes,
      })
      audioBuffers.push(buf)
    }

    const finalAudioBuffer =
      audioBuffers.length === 1 ? audioBuffers[0]! : Buffer.concat(audioBuffers)

    return new Response(finalAudioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Google TTS] Error:', message)
    return NextResponse.json(
      {
        error: 'TTS failed',
        details: message,
      },
      { status: 500 }
    )
  }
}
