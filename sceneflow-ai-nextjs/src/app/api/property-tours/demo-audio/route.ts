import { NextRequest, NextResponse } from 'next/server'
import { list, put } from '@vercel/blob'
import { buildPublicDemoPropertyTourDTO } from '@/lib/propertyTours/hostingPolicy'
import { isVercelBlobConfigured } from '@/lib/propertyTours/vercelBlobStore'
import type { PropertyLanguageCode } from '@/lib/propertyTours/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOM_KEY_TO_ID: Record<string, string> = {
  aerial: 'room-aerial-demo',
  'great-room': 'room-great-room-demo',
  kitchen: 'room-kitchen-demo',
  'primary-suite': 'room-primary-suite-demo',
  terrace: 'room-terrace-demo',
}

/**
 * On-demand studio neural TTS (EN / ES / JA) cached permanently in Vercel Blob.
 * Zero GCP dependency — uses OpenAI `tts-1-hd` (or ElevenLabs `eleven_multilingual_v2` if configured)
 * and streams/caches MP3 directly on Vercel.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomKey = (searchParams.get('room') || 'great-room').trim().toLowerCase()
    const mode = searchParams.get('mode') === 'agent' ? 'agent' : 'narration'
    const rawLang = (searchParams.get('lang') || 'en').trim().toLowerCase()
    const lang: PropertyLanguageCode =
      rawLang === 'es' || rawLang === 'ja' ? rawLang : 'en'

    const roomId = ROOM_KEY_TO_ID[roomKey]
    if (!roomId) {
      return NextResponse.json({ error: 'Unknown demo room' }, { status: 404 })
    }

    const blobPath = `property-tours/media/demo/${mode}-${roomKey}-${lang}.mp3`

    // 1. Return permanently cached MP3 from Vercel Blob if already synthesized
    if (isVercelBlobConfigured()) {
      try {
        const existing = await list({ prefix: blobPath, limit: 3 })
        const match = existing.blobs.find((b) => b.pathname === blobPath) || existing.blobs[0]
        if (match?.url) {
          return NextResponse.redirect(match.url, 307)
        }
      } catch (err) {
        console.warn('[demo-audio] Blob cache lookup warning:', err)
      }
    }

    // 2. Resolve localized script for EN / ES / JA
    const demoTour = buildPublicDemoPropertyTourDTO('demo')
    const room = demoTour.rooms.find((r) => r.id === roomId)
    const track =
      mode === 'agent'
        ? room?.agentSyncByLanguage?.[lang]
        : room?.narrationByLanguage?.[lang]
    const script = track?.script?.trim()
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // 3. Synthesize studio MP3 via ElevenLabs (if configured) or OpenAI `tts-1-hd`
    let mp3Buffer: Buffer | null = null
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY?.trim()
    const openAiKey = process.env.OPENAI_API_KEY?.trim()

    if (elevenLabsKey) {
      const voiceId =
        mode === 'agent'
          ? process.env.ELEVENLABS_AGENT_VOICE_ID?.trim() || 'EXAVITQu4vr4xnSDxMaL'
          : process.env.ELEVENLABS_NARRATOR_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM'
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.48, similarity_boost: 0.78 },
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        mp3Buffer = Buffer.from(await res.arrayBuffer())
      }
    }

    if (!mp3Buffer && openAiKey) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          voice: mode === 'agent' ? 'shimmer' : 'nova',
          input: script,
          response_format: 'mp3',
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        mp3Buffer = Buffer.from(await res.arrayBuffer())
      }
    }

    if (!mp3Buffer) {
      return NextResponse.json(
        { error: 'TTS provider unavailable; client should use browser speech fallback.' },
        { status: 503 }
      )
    }

    // 4. Cache permanently in Vercel Blob for instant future playback
    if (isVercelBlobConfigured()) {
      try {
        await put(blobPath, mp3Buffer, {
          access: 'public',
          contentType: 'audio/mpeg',
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        })
      } catch (err) {
        console.warn('[demo-audio] Blob cache write warning:', err)
      }
    }

    return new NextResponse(new Uint8Array(mp3Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (error: any) {
    console.error('[GET /api/property-tours/demo-audio] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to synthesize audio' },
      { status: 500 }
    )
  }
}
