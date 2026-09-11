import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { put } from '@vercel/blob'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  adaptPromptForLyria,
  buildLyriaFallbackPrompts,
  LYRIA_RECITATION_ERROR_CODE,
  LYRIA_RECITATION_USER_MESSAGE,
} from '@/lib/audio/lyriaPromptAdapter'
import { getContainerAudioDurationSeconds } from '@/lib/audio/audioContainerDuration'
import {
  buildLyria3Prompt,
  callLyria3,
  clampGenerationDuration,
  clampRequestedPlayDuration,
  lyriaBlobMeta,
  selectLyriaModel,
  type LyriaCallResult,
} from '@/lib/audio/lyriaClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * Lyria 3 Pro is a synchronous Interactions call that can take a couple of
 * minutes to write a full track. Recitation fallbacks need a second attempt
 * after that. 300s is the Vercel ceiling this route already had.
 */
export const maxDuration = 300

const MUSIC_CREDIT_COST = AUDIO_CREDITS.MUSIC_TRACK || 25 // Fallback to 25
/** Leave time to upload the clip and charge after Vertex returns. */
const ROUTE_RESERVE_MS = 20_000
/** One Lyria 3 interaction, including poll. Pro tracks regularly exceed 3 minutes of wait. */
const LYRIA_ATTEMPT_TIMEOUT_MS = 240_000
const LYRIA_MIN_ATTEMPT_MS = 15_000

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }

    const hasCredits = await CreditService.ensureCredits(userId, MUSIC_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: MUSIC_CREDIT_COST,
        operation: 'music_generation',
      }, { status: 402 })
    }

    const { text, projectId, sceneId, cueId, duration: requestedDuration } =
      await request.json()

    const requestedDurationSeconds = clampRequestedPlayDuration(requestedDuration)
    const generationDurationSeconds = clampGenerationDuration(requestedDurationSeconds)

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const gcpProjectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID

    console.log('[Google Music] Vertex AI project configured:', !!gcpProjectId)

    if (!gcpProjectId) {
      console.error('[Google Music] Error: Vertex AI not configured (VERTEX_PROJECT_ID required)')
      return NextResponse.json({ error: 'Music generation API not configured' }, { status: 500 })
    }

    const routeStartedAt = Date.now()
    const remainingBudgetMs = () =>
      maxDuration * 1000 - (Date.now() - routeStartedAt) - ROUTE_RESERVE_MS

    const accessToken = await getVertexAIAuthToken()
    const modelId = selectLyriaModel(generationDurationSeconds)

    const adaptedPrompt = adaptPromptForLyria(text)
    const fallbackPrompts = buildLyriaFallbackPrompts(text)
    const promptAttempts: Array<{ variant: string; prompt: string }> = [
      { variant: 'adapted', prompt: buildLyria3Prompt(adaptedPrompt, generationDurationSeconds) },
      ...fallbackPrompts.map((prompt, i) => ({
        variant: `fallback_${i + 1}`,
        prompt: buildLyria3Prompt(prompt, generationDurationSeconds),
      })),
    ]

    console.log('[Google Music] Lyria prompt plan:', {
      modelId,
      generationDurationSeconds,
      originalLength: text.length,
      adaptedLength: adaptedPrompt.length,
      attemptCount: promptAttempts.length,
    })

    let lastRecitationBody = ''
    let successResult: LyriaCallResult & { ok: true } | null = null
    let winningVariant = ''

    for (const attempt of promptAttempts) {
      const budgetMs = remainingBudgetMs()
      if (budgetMs < LYRIA_MIN_ATTEMPT_MS) {
        console.warn(
          `[Google Music] Skipping ${attempt.variant} — ${budgetMs}ms left, needs ${LYRIA_MIN_ATTEMPT_MS}ms`
        )
        break
      }

      const attemptTimeoutMs = Math.min(LYRIA_ATTEMPT_TIMEOUT_MS, budgetMs)
      console.log(`[Google Music] Trying Lyria (${attempt.variant}):`, {
        modelId,
        prompt: attempt.prompt,
        timeoutMs: attemptTimeoutMs,
      })

      const result = await callLyria3({
        prompt: attempt.prompt,
        model: modelId,
        projectId: gcpProjectId,
        accessToken,
        timeoutMs: attemptTimeoutMs,
      })

      if (result.ok) {
        successResult = result
        winningVariant = attempt.variant
        break
      }

      console.error(
        `[Google Music] Lyria API failed (${attempt.variant}):`,
        result.status,
        result.body.slice(0, 300)
      )

      if (result.timedOut) {
        return NextResponse.json({
          error: 'Music generation timed out. Try again in a moment.',
          details: result.body,
        }, { status: 504 })
      }

      if (result.recitation) {
        lastRecitationBody = result.body
        continue
      }

      return NextResponse.json({
        error: 'Music generation failed',
        details: result.body,
      }, { status: 502 })
    }

    if (!successResult) {
      console.error('[Google Music] All Lyria attempts blocked by recitation checks')
      return NextResponse.json({
        error: LYRIA_RECITATION_USER_MESSAGE,
        code: LYRIA_RECITATION_ERROR_CODE,
        details: lastRecitationBody,
      }, { status: 422 })
    }

    const arrayBuffer = Buffer.from(successResult.base64Data, 'base64')
    const actualDurationSeconds =
      getContainerAudioDurationSeconds(arrayBuffer) ?? generationDurationSeconds
    const { extension, contentType } = lyriaBlobMeta(successResult.mimeType)

    console.log('[Google Music] Music generated successfully:', {
      variant: winningVariant,
      modelId,
      mimeType: successResult.mimeType,
      size: arrayBuffer.byteLength,
      actualDurationSeconds,
      requestedDurationSeconds,
      generationDurationSeconds,
    })

    try {
      await CreditService.charge(
        userId,
        MUSIC_CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'google_music', duration: actualDurationSeconds, prompt: adaptedPrompt.substring(0, 100) }
      )
      console.log(`[Google Music] Charged ${MUSIC_CREDIT_COST} credits to user ${userId}`)

      await trackCost(userId, 'google_music', MUSIC_CREDIT_COST, {
        projectId,
        sceneId,
        model: modelId,
      })
    } catch (chargeError: unknown) {
      console.error(
        '[Google Music] Failed to charge credits:',
        chargeError instanceof Error ? chargeError.message : String(chargeError)
      )
    }

    // Always Blob the file. A 30s Lyria 2 WAV was ~5.7MB and blew Vercel's
    // 4.5MB inline limit; a 2-minute Pro MP3 is smaller but still safer here.
    const timestamp = Date.now()
    const slug = [sceneId || 'music', typeof cueId === 'string' ? cueId : '']
      .filter(Boolean)
      .join('-')
    const filename = `audio/music/${projectId || 'default'}/${slug}-${timestamp}.${extension}`
    const blob = await put(filename, arrayBuffer, {
      access: 'public',
      contentType,
    })
    console.log('[Google Music] Saved to blob:', blob.url)
    return NextResponse.json({
      url: blob.url,
      size: arrayBuffer.byteLength,
      duration: actualDurationSeconds,
      requestedDuration: requestedDurationSeconds,
      model: modelId,
    })
  } catch (error: unknown) {
    console.error(
      '[Google Music] Error:',
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json({
      error: 'Music generation failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
