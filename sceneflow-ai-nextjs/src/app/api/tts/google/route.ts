import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import { synthesizeGeminiFlashMp3, isGeminiTtsConfigured } from '@/lib/tts/geminiFlashTts'
import { synthesizeDesignedGeminiVoiceWav } from '@/lib/tts/geminiDesignedVoiceTts'
import { isDesignedGeminiVoiceId, prepareDesignedVoiceLine } from '@/lib/tts/geminiVoiceDesign'
import { pickGeminiBaseVoice } from '@/lib/tts/pickGeminiBaseVoice'
import { NARRATION_CHUNK_BYTES } from '@/lib/tts/blueprintTtsConstants'
import type { GeminiTtsAudioType } from '@/lib/tts/geminiTtsPrompt'
import { CreditService } from '@/services/CreditService'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway'
import {
  CONCURRENCY_DEFAULTS,
  processWithConcurrency,
} from '@/lib/utils/concurrent-processor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isValidInternalRequest(request: NextRequest): boolean {
  const apiSecret = process.env.INTERNAL_API_SECRET?.trim()
  const jobSecret = process.env.INTERNAL_JOB_SECRET?.trim()
  const apiKeyHeader = request.headers.get('x-internal-api-key')?.trim()
  const jobHeader = request.headers.get('x-internal-job')?.trim()
  if (apiSecret && apiKeyHeader && apiKeyHeader === apiSecret) return true
  if (jobSecret && jobHeader && jobHeader === jobSecret) return true
  return false
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const sessionUserId = session?.user?.id || session?.user?.email || null
    const isInternal = isValidInternalRequest(request)

    if (!sessionUserId && !isInternal) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const { text, voiceId, prompt, audioType, designPrompt, projectId, userId: internalUserId } =
      await request.json()

    const billingUserId =
      sessionUserId || (isInternal && typeof internalUserId === 'string' ? internalUserId : null)

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

    let voice = typeof voiceId === 'string' && voiceId.trim() ? voiceId.trim() : 'gemini-Kore'
    const wantsDesigned = isDesignedGeminiVoiceId(voice)
    const ttsAudioType: GeminiTtsAudioType =
      audioType === 'dialogue' || audioType === 'narration' || audioType === 'music' || audioType === 'sfx'
        ? audioType
        : 'narration'

    const designedCredits = Math.max(
      AUDIO_CREDITS.VOICE_PREVIEW,
      Math.ceil(cleanText.length / 250) * AUDIO_CREDITS.DIALOGUE_PER_LINE
    )
    const standardCredits = Math.max(
      AUDIO_CREDITS.VOICE_PREVIEW,
      Math.ceil(cleanText.length / 500) * AUDIO_CREDITS.DIALOGUE_PER_LINE
    )
    const reserveAmount = wantsDesigned ? designedCredits : standardCredits

    const runSynthesis = async (): Promise<{
      buffer: Buffer
      contentType: 'audio/wav' | 'audio/mpeg'
      usedDesigned: boolean
      usedVoice: string
    }> => {
      if (wantsDesigned) {
        const resolvedDesignPrompt =
          typeof designPrompt === 'string' && designPrompt.trim()
            ? designPrompt.trim()
            : directorNotes
        try {
          const prepared = prepareDesignedVoiceLine({ text: cleanText })
          const designed = await synthesizeDesignedGeminiVoiceWav({
            text: prepared.text || cleanText,
            voiceId: voice,
            style: prepared.style,
            designPrompt: resolvedDesignPrompt,
            displayName: 'SceneFlow character',
          })
          return {
            buffer: designed,
            contentType: 'audio/wav',
            usedDesigned: true,
            usedVoice: voice,
          }
        } catch (designedErr) {
          const matchedFallback = pickGeminiBaseVoice(resolvedDesignPrompt || directorNotes || '')
          console.warn(
            `[Google TTS] Designed voice ${voice} synthesis failed; falling back to ${matchedFallback.voiceId}:`,
            (designedErr as Error)?.message || designedErr
          )
          voice = matchedFallback.voiceId
        }
      }

      // Same Gemini ceiling as the Blueprint route: a UTF-8 byte budget, since a
      // character budget lets non-Latin text past the limit.
      const chunks = chunkNarrationText(cleanText, NARRATION_CHUNK_BYTES)
      const results = await processWithConcurrency<Buffer>(
        chunks.map((chunkText, i) => ({
          id: i,
          execute: () => {
            console.log(
              `[Google TTS] chunk ${i + 1}/${chunks.length} (${chunkText.length} chars) voice=${voice}`
            )
            return synthesizeGeminiFlashMp3({
              text: chunkText,
              voiceId: voice,
              directorNotes,
              audioType: ttsAudioType,
            })
          },
        })),
        CONCURRENCY_DEFAULTS.AUDIO_GENERATION,
        undefined,
        false
      )

      const failed = results.find((result) => result.status === 'rejected')
      if (failed) {
        throw failed.error ?? new Error('TTS chunk failed')
      }

      const audioBuffers = results.map((result) => result.value!)
      const finalAudioBuffer =
        audioBuffers.length === 1 ? audioBuffers[0]! : Buffer.concat(audioBuffers)

      return {
        buffer: finalAudioBuffer,
        contentType: 'audio/mpeg',
        usedDesigned: false,
        usedVoice: voice,
      }
    }

    let synthesisResult: Awaited<ReturnType<typeof runSynthesis>>
    if (billingUserId) {
      const metered = await executeMeteredProviderCall({
        userId: billingUserId,
        projectId: projectId || null,
        route: '/api/tts/google',
        provider: 'vertex',
        model: 'gemini-tts',
        operation: wantsDesigned ? 'google_designed_voice_tts' : 'google_gemini_tts',
        flatCredits: reserveAmount,
        estimatedCogsUsd: Math.max(0.002, (cleanText.length / 1000) * 0.02),
        meta: {
          voiceId: voice,
          audioType: ttsAudioType,
          charCount: cleanText.length,
        },
        execute: runSynthesis,
        resolveSettlement: (res) => ({
          finalCredits: res.usedDesigned ? designedCredits : standardCredits,
          estimatedCogsUsd: Math.max(0.002, (cleanText.length / 1000) * (res.usedDesigned ? 0.04 : 0.02)),
          meta: {
            operation: res.usedDesigned ? 'google_designed_voice_tts' : 'google_gemini_tts',
            usedVoice: res.usedVoice,
          },
        }),
      })
      synthesisResult = metered.result
    } else {
      synthesisResult = await runSynthesis()
    }

    return new Response(new Uint8Array(synthesisResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': synthesisResult.contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      )
    }
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
