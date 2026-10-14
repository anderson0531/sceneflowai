import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, type SeriesEpisodeBlueprint } from '@/models/Series'
import { sequelize } from '@/config/database'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import {
  findCachedNarrationAudio,
  hashNarrationAudio,
  narrationAudioPathname,
  storeNarrationAudio,
} from '@/lib/blueprint/narrationAudioCache'
import {
  activeNarrationPrompt,
  isSavedNarrationCurrent,
  readEpisodeNarration,
  readOverviewNarration,
  seriesEpisodeNarrationText,
  seriesOverviewNarrationText,
  withSavedSeriesNarration,
  type SavedSeriesNarration,
} from '@/lib/series/seriesNarrationSync'
import {
  DEFAULT_GEMINI_TTS_MODEL,
  NARRATION_CHUNK_BYTES,
} from '@/lib/tts/blueprintTtsConstants'
import { isGeminiTtsConfigured, synthesizeGeminiFlashMp3 } from '@/lib/tts/geminiFlashTts'
import { synthesizeDesignedGeminiVoiceWav } from '@/lib/tts/geminiDesignedVoiceTts'
import { DESIGNED_VOICE_TTS_MODEL, isDesignedGeminiVoiceId } from '@/lib/tts/geminiVoiceDesign'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * POST /api/series/[seriesId]/narration
 *
 * Returns the saved overview or episode narration when it still matches the
 * spoken text and voice. Otherwise synthesizes a clip, stores it, and writes
 * the URL onto series.metadata. `force` always makes a new take.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params
    await sequelize.authenticate()

    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      section?: string
      episodeId?: string
      voiceId?: string
      prompt?: string
      force?: boolean
    }
    const section = body.section === 'episode' ? 'episode' : body.section === 'overview' ? 'overview' : null
    if (!section) {
      return NextResponse.json({ success: false, error: 'section is required' }, { status: 400 })
    }

    const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : ''
    if (!voiceId) {
      return NextResponse.json({ success: false, error: 'voiceId is required' }, { status: 400 })
    }

    const episodeId = typeof body.episodeId === 'string' ? body.episodeId.trim() : ''
    let text = ''
    if (section === 'overview') {
      const bible = (series.production_bible || {}) as { logline?: string; synopsis?: string }
      text = seriesOverviewNarrationText({
        logline: series.logline,
        productionBible: bible,
      })
    } else {
      if (!episodeId) {
        return NextResponse.json({ success: false, error: 'episodeId is required' }, { status: 400 })
      }
      const episodes = (series.episode_blueprints || []) as SeriesEpisodeBlueprint[]
      const episode = episodes.find((item) => item.id === episodeId)
      if (!episode) {
        return NextResponse.json({ success: false, error: 'Episode not found' }, { status: 404 })
      }
      text = seriesEpisodeNarrationText(episode)
    }

    if (!text) {
      return NextResponse.json({ success: false, error: 'Nothing to read in this section' }, { status: 400 })
    }

    const prompt = activeNarrationPrompt(voiceId, typeof body.prompt === 'string' ? body.prompt : undefined)
    const metadata =
      series.metadata && typeof series.metadata === 'object' && !Array.isArray(series.metadata)
        ? series.metadata
        : {}
    const saved =
      section === 'overview'
        ? readOverviewNarration(metadata)
        : readEpisodeNarration(metadata, episodeId)

    if (!body.force && isSavedNarrationCurrent(saved, { text, voiceId, prompt })) {
      return NextResponse.json({
        success: true,
        audioUrl: saved!.audioUrl,
        narration: saved,
        cached: true,
      })
    }

    if (!isGeminiTtsConfigured()) {
      return NextResponse.json({ success: false, error: 'TTS not configured' }, { status: 500 })
    }

    const performance = narrationPerformanceText(text, prompt)
    if (!performance.spoken) {
      return NextResponse.json({ success: false, error: 'Nothing to read in this section' }, { status: 400 })
    }

    const designed = isDesignedGeminiVoiceId(voiceId)
    const model = designed
      ? DESIGNED_VOICE_TTS_MODEL
      : process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL
    const extension = designed ? 'wav' : 'mp3'
    const contentType = designed ? 'audio/wav' : 'audio/mpeg'
    const hash = hashNarrationAudio({
      text: performance.spoken,
      voiceId,
      directorNotes: performance.directorNotes,
      languageCode: 'en-US',
      model,
    })
    const pathname = body.force
      ? `audio/series-narration/${seriesId}/${section}${episodeId ? `-${episodeId}` : ''}-${Date.now()}.${extension}`
      : designed
        ? `audio/blueprint-narration/${hash}.wav`
        : narrationAudioPathname(hash)

    let audioUrl = body.force ? null : await findCachedNarrationAudio(pathname)
    const reusedBlob = Boolean(audioUrl)
    if (!audioUrl) {
      const audio = designed
        ? await synthesizeDesignedGeminiVoiceWav({
            text: performance.spoken,
            voiceId,
            displayName: 'Series Narrator',
          })
        : await synthesizeChunkedMp3(performance.spoken, voiceId, performance.directorNotes)
      if (!audio.length) {
        return NextResponse.json({ success: false, error: 'Narration came back empty' }, { status: 502 })
      }
      audioUrl = await storeNarrationAudio(pathname, audio, contentType)
      if (!audioUrl) {
        return NextResponse.json(
          { success: false, error: 'Could not save narration audio' },
          { status: 503 }
        )
      }
    }

    const narration: SavedSeriesNarration = {
      audioUrl,
      text,
      voiceId,
      ...(prompt ? { prompt } : {}),
      generatedAt: new Date().toISOString(),
    }
    const nextMetadata = withSavedSeriesNarration(
      metadata,
      section === 'overview'
        ? { section, narration }
        : { section, episodeId, narration }
    )
    await series.update({ metadata: nextMetadata })

    return NextResponse.json({
      success: true,
      audioUrl,
      narration,
      cached: reusedBlob,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Narration failed'
    console.error('[Series narration]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/** Same director-note strip the Google TTS route applies before synthesis. */
function narrationPerformanceText(
  text: string,
  prompt?: string
): { spoken: string; directorNotes?: string } {
  let spoken = text
  let directorNotes = prompt?.trim() || undefined
  const noteMatch = spoken.match(/\[DirectorNote:\s*(.*?)\]/)
  if (noteMatch) {
    directorNotes = directorNotes || noteMatch[1]
    spoken = spoken.replace(/\[DirectorNote:\s*(.*?)\]\s*/, '').trim()
  }
  return { spoken, directorNotes }
}

async function synthesizeChunkedMp3(
  text: string,
  voiceId: string,
  directorNotes?: string
): Promise<Buffer> {
  const chunks = chunkNarrationText(text, NARRATION_CHUNK_BYTES)
  const audioBuffers: Buffer[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i]!
    console.log(
      `[Series narration] chunk ${i + 1}/${chunks.length} (${chunkText.length} chars) voice=${voiceId}`
    )
    audioBuffers.push(
      await synthesizeGeminiFlashMp3({
        text: chunkText,
        voiceId,
        directorNotes,
        audioType: 'narration',
      })
    )
  }
  return audioBuffers.length === 1 ? audioBuffers[0]! : Buffer.concat(audioBuffers)
}
