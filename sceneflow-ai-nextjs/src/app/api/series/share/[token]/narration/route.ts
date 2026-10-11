import { NextRequest, NextResponse } from 'next/server'
import {
  findCachedNarrationAudio,
  hashNarrationAudio,
  narrationAudioPathname,
  storeNarrationAudio,
} from '@/lib/blueprint/narrationAudioCache'
import { chunkNarrationText } from '@/lib/blueprint/narrationChunks'
import { buildPublicSeriesShare, seriesShareNarrationText } from '@/lib/series/publicShare'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  DEFAULT_GEMINI_TTS_MODEL,
  NARRATION_CHUNK_BYTES,
} from '@/lib/tts/blueprintTtsConstants'
import { synthesizeGeminiFlashMp3 } from '@/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '@/lib/tts/googleTtsLocale'
import { findSeriesByShareToken } from '@/lib/series/findSeriesByShareToken'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/series/share/[token]/narration
 * Speaks a section of the shared Series Bible. The text is built from the
 * series record. Callers cannot submit their own script.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const series = await findSeriesByShareToken(token)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      section?: string
      episodeNumber?: number
    }
    const section = body.section === 'episode' ? 'episode' : body.section === 'overview' ? 'overview' : null
    if (!section) {
      return NextResponse.json({ success: false, error: 'section is required' }, { status: 400 })
    }

    const share = buildPublicSeriesShare({
      title: series.title,
      logline: series.logline,
      genre: series.genre,
      bible: (series.production_bible || {}) as Record<string, unknown>,
      episodes: series.episode_blueprints || [],
    })
    const spoken = seriesShareNarrationText(share, section, body.episodeNumber)
    if (!spoken.trim()) {
      return NextResponse.json({ success: false, error: 'Nothing to read in this section' }, { status: 400 })
    }

    const voiceId = DEFAULT_BLUEPRINT_GEMINI_VOICE
    const languageCode = resolveGeminiTtsLanguageCode('en')
    const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL
    const pathname = narrationAudioPathname(
      hashNarrationAudio({ text: spoken, voiceId, languageCode, model })
    )
    const cached = await findCachedNarrationAudio(pathname)
    if (cached) {
      return NextResponse.json({ success: true, audioUrl: cached, cached: true })
    }

    const chunks = chunkNarrationText(spoken, NARRATION_CHUNK_BYTES)
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      buffers.push(
        await synthesizeGeminiFlashMp3({
          text: chunk,
          voiceId,
          languageCode,
          audioType: 'narration',
        })
      )
    }
    const audio = buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
    if (!audio.length) {
      return NextResponse.json({ success: false, error: 'Narration came back empty' }, { status: 502 })
    }

    const stored = await storeNarrationAudio(pathname, audio)
    if (stored) {
      return NextResponse.json({ success: true, audioUrl: stored, cached: false })
    }

    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Narration failed'
    console.error('[Series share narration]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
