import { NextRequest, NextResponse } from 'next/server'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import {
  isGeminiTtsConfigured,
  normalizeBlueprintGeminiVoiceId,
  synthesizeGeminiFlashMp3,
} from '@/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '@/lib/tts/googleTtsLocale'
import { DEFAULT_GEMINI_TTS_MODEL } from '@/lib/tts/blueprintTtsConstants'
import {
  findCachedNarrationAudio,
  hashNarrationAudio,
  narrationAudioPathname,
  storeNarrationAudio,
} from '@/lib/blueprint/narrationAudioCache'
import {
  CONCURRENCY_DEFAULTS,
  processWithConcurrency,
} from '@/lib/utils/concurrent-processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Blueprint narration TTS (Gemini 3.1 Flash). Studio preview and share UI should use this route.
 *
 * Returns `{ url }` when the clip could be stored, so a replay costs a cache
 * lookup instead of a synthesis; falls back to streaming the audio bytes when
 * Blob storage is not configured.
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

    const languageRaw =
      typeof body?.language === 'string'
        ? body.language
        : typeof body?.languageCode === 'string'
          ? body.languageCode
          : 'en'
    const languageCode = resolveGeminiTtsLanguageCode(languageRaw)
    const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL

    const pathname = narrationAudioPathname(
      hashNarrationAudio({ text: cleanText, voiceId, directorNotes, languageCode, model })
    )

    const cachedUrl = await findCachedNarrationAudio(pathname)
    if (cachedUrl) {
      return NextResponse.json({ url: cachedUrl, cached: true })
    }

    // Long narration is split into several Gemini calls. They are independent,
    // so they run concurrently and are reassembled in order — the helper returns
    // results in task order, which is what keeps the sentences in sequence.
    const chunks = chunkNarrationText(cleanText, 4000)
    const results = await processWithConcurrency<Buffer>(
      chunks.map((chunk, index) => ({
        id: index,
        execute: () =>
          synthesizeGeminiFlashMp3({
            text: chunk,
            voiceId,
            directorNotes,
            languageCode,
          }),
      })),
      CONCURRENCY_DEFAULTS.AUDIO_GENERATION,
      undefined,
      false
    )

    // A dropped chunk would otherwise become silence in the middle of the read,
    // which sounds like a finished narration rather than a failure.
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) {
      throw failed.error ?? new Error('TTS chunk failed')
    }

    const buffers = results.map((result) => result.value!)
    const finalBuffer = buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)

    const storedUrl = await storeNarrationAudio(pathname, finalBuffer)
    if (storedUrl) {
      return NextResponse.json({ url: storedUrl, cached: false })
    }

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
