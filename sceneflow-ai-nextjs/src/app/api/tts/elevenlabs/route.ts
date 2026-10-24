import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { synthesizeElevenLabsMp3 } from '@/lib/elevenlabs/textToSpeech'
import type { ElevenLabsDelivery } from '@/lib/elevenlabs/voicePresets'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import {
  isGeminiTtsConfigured,
  normalizeBlueprintGeminiVoiceId,
  synthesizeGeminiFlashMp3,
} from '@/lib/tts/geminiFlashTts'
import { NARRATION_CHUNK_BYTES } from '@/lib/tts/blueprintTtsConstants'
import { CreditService } from '@/services/CreditService'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import {
  CONCURRENCY_DEFAULTS,
  processWithConcurrency,
} from '@/lib/utils/concurrent-processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface ElevenLabsTtsBody {
  text?: string
  voiceId?: string
  voiceName?: string
  stability?: number
  similarityBoost?: number
  modelId?: string
  saveToBlob?: boolean
  audioType?: string
  projectId?: string
  sceneId?: string
  /** Accepted for client compatibility; multilingual model uses text as-is. */
  language?: string
  style?: number
  useSpeakerBoost?: boolean
  speed?: number
  /** Expressive storytelling delivery (blueprint narration default). */
  delivery?: ElevenLabsDelivery
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs TTS is not configured' },
        { status: 503 }
      )
    }

    const body = (await request.json()) as ElevenLabsTtsBody
    const text = typeof body.text === 'string' ? body.text : ''
    const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : ''

    if (!text.trim()) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }
    if (!voiceId) {
      return NextResponse.json({ error: 'Missing voiceId parameter' }, { status: 400 })
    }

    const saveToBlob = !!body.saveToBlob
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email || null

    if (saveToBlob) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (!body.projectId || typeof body.projectId !== 'string') {
        return NextResponse.json(
          { error: 'projectId is required when saveToBlob is true' },
          { status: 400 }
        )
      }
    }

    const audioType =
      typeof body.audioType === 'string' ? body.audioType.trim() : ''
    const delivery: ElevenLabsDelivery =
      body.delivery === 'storytelling' || body.delivery === 'neutral'
        ? body.delivery
        : audioType === 'blueprint-share' || audioType === 'blueprint'
          ? 'storytelling'
          : 'neutral'

    const useBlueprintGemini =
      delivery === 'storytelling' ||
      audioType === 'blueprint-share' ||
      audioType === 'blueprint'

    if (useBlueprintGemini && isGeminiTtsConfigured()) {
      const geminiVoice = normalizeBlueprintGeminiVoiceId(voiceId)
      const directorNotes =
        typeof (body as { prompt?: string }).prompt === 'string'
          ? (body as { prompt?: string }).prompt
          : undefined
      // Gemini path, so the same UTF-8 byte ceiling applies.
      const chunks = chunkNarrationText(text, NARRATION_CHUNK_BYTES)
      const results = await processWithConcurrency<Buffer>(
        chunks.map((chunk, index) => ({
          id: index,
          execute: () =>
            synthesizeGeminiFlashMp3({
              text: chunk,
              voiceId: geminiVoice,
              directorNotes,
            }),
        })),
        CONCURRENCY_DEFAULTS.AUDIO_GENERATION,
        undefined,
        false
      )
      const failed = results.find((result) => result.status === 'rejected')
      if (failed) {
        throw failed.error ?? new Error('TTS chunk failed')
      }
      const buffers = results.map((result) => result.value!)
      const buffer = buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)

      if (userId) {
        try {
          const geminiTtsCredits = Math.max(
            AUDIO_CREDITS.VOICE_PREVIEW,
            Math.ceil(text.length / 500) * AUDIO_CREDITS.DIALOGUE_PER_LINE
          )
          await CreditService.charge(userId, geminiTtsCredits, 'ai_usage', body.projectId || null, {
            operation: 'gemini_tts_narration',
            audioType: audioType || 'blueprint',
            charCount: text.length,
          })
        } catch (chargeErr) {
          console.warn('[ElevenLabs TTS] Non-blocking Gemini TTS credit charge failed:', chargeErr)
        }
      }

      if (saveToBlob) {
        const projectId = body.projectId as string
        const sceneId =
          typeof body.sceneId === 'string' && body.sceneId.trim()
            ? body.sceneId.trim()
            : 'tts'
        const blobAudioType = audioType || 'blueprint'
        const filename = `audio/${blobAudioType}/${projectId}/${sceneId}-${Date.now()}.mp3`
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: 'audio/mpeg',
          addRandomSuffix: false,
        })
        return NextResponse.json({
          url: blob.url,
          voiceId: geminiVoice,
          voiceName: body.voiceName,
          byteLength: buffer.length,
          provider: 'gemini',
        })
      }

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      })
    }

    const buffer = await synthesizeElevenLabsMp3({
      text,
      voiceId,
      stability: body.stability,
      similarityBoost: body.similarityBoost,
      style: body.style,
      useSpeakerBoost: body.useSpeakerBoost,
      speed: body.speed,
      modelId: body.modelId,
      delivery,
    })

    if (userId) {
      try {
        const elevenLabsCredits = Math.max(
          AUDIO_CREDITS.VOICE_PREVIEW,
          Math.ceil((text.length / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS)
        )
        await CreditService.charge(userId, elevenLabsCredits, 'ai_usage', body.projectId || null, {
          operation: 'elevenlabs_tts',
          audioType: audioType || 'tts',
          charCount: text.length,
        })
      } catch (chargeErr) {
        console.warn('[ElevenLabs TTS] Non-blocking credit charge failed:', chargeErr)
      }
    }

    if (saveToBlob) {
      const projectId = body.projectId as string
      const sceneId =
        typeof body.sceneId === 'string' && body.sceneId.trim()
          ? body.sceneId.trim()
          : 'tts'
      const blobAudioType = audioType || 'tts'
      const filename = `audio/${blobAudioType}/${projectId}/${sceneId}-${Date.now()}.mp3`
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'audio/mpeg',
        addRandomSuffix: false,
      })
      return NextResponse.json({
        url: blob.url,
        voiceId,
        voiceName: body.voiceName,
        byteLength: buffer.length,
      })
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ElevenLabs TTS] Error:', message)
    return NextResponse.json(
      { error: message || 'TTS generation failed' },
      { status: 500 }
    )
  }
}
