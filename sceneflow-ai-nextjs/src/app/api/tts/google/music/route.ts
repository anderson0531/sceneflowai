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
  isLyriaRecitationError,
  LYRIA_RECITATION_ERROR_CODE,
  LYRIA_RECITATION_USER_MESSAGE,
} from '@/lib/audio/lyriaPromptAdapter'
import { getWavDurationSeconds } from '@/lib/audio/audioContainerDuration'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * Lyria's predict call is synchronous and returns ~30s of WAV. One attempt
 * regularly takes longer than a minute; recitation fallbacks need a second
 * attempt after that. 60s is why production logged
 * "Task timed out after 60 seconds" mid-generate.
 */
export const maxDuration = 300

const MUSIC_CREDIT_COST = AUDIO_CREDITS.MUSIC_TRACK || 25 // Fallback to 25
/** Leave time to upload the clip and charge after Vertex returns. */
const ROUTE_RESERVE_MS = 20_000
/** One Lyria predict; recitation errors return in seconds, not this long. */
const LYRIA_ATTEMPT_TIMEOUT_MS = 180_000
const LYRIA_MIN_ATTEMPT_MS = 15_000

type LyriaCallResult =
  | { ok: true; base64Data: string }
  | { ok: false; status: number; body: string; recitation: boolean; timedOut?: boolean }

async function callLyria(
  prompt: string,
  endpoint: string,
  accessToken: string,
  timeoutMs: number
): Promise<LyriaCallResult> {
  const requestBody = {
    instances: [{ prompt }],
    parameters: { sample_count: 1 },
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      body: error instanceof Error ? error.message : String(error),
      recitation: false,
      timedOut,
    }
  }

  if (!response.ok) {
    const errorText = await response.text()
    return {
      ok: false,
      status: response.status,
      body: errorText,
      recitation: isLyriaRecitationError(errorText),
    }
  }

  const data = await response.json()
  const predictions = data?.predictions

  if (!predictions || predictions.length === 0) {
    return {
      ok: false,
      status: 500,
      body: JSON.stringify(data).slice(0, 500),
      recitation: false,
    }
  }

  const prediction = predictions[0]
  const base64Data =
    prediction.bytesBase64Encoded ||
    prediction.audioContent ||
    prediction.audio ||
    prediction.content

  if (!base64Data) {
    return {
      ok: false,
      status: 500,
      body: JSON.stringify(prediction).slice(0, 500),
      recitation: false,
    }
  }

  return { ok: true, base64Data }
}

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

    const requestedDurationSeconds =
      typeof requestedDuration === 'number' && requestedDuration > 0
        ? Math.min(Math.round(requestedDuration), 600)
        : 30

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const gcpProjectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
    const region = process.env.GCP_REGION || 'us-central1'

    console.log('[Google Music] Vertex AI project configured:', !!gcpProjectId)

    if (!gcpProjectId) {
      console.error('[Google Music] Error: Vertex AI not configured (VERTEX_PROJECT_ID required)')
      return NextResponse.json({ error: 'Music generation API not configured' }, { status: 500 })
    }

    const routeStartedAt = Date.now()
    const remainingBudgetMs = () =>
      maxDuration * 1000 - (Date.now() - routeStartedAt) - ROUTE_RESERVE_MS

    const accessToken = await getVertexAIAuthToken()
    const modelId = 'lyria-002'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${region}/publishers/google/models/${modelId}:predict`

    const adaptedPrompt = adaptPromptForLyria(text)
    const fallbackPrompts = buildLyriaFallbackPrompts(text)
    const promptAttempts: Array<{ variant: string; prompt: string }> = [
      { variant: 'adapted', prompt: adaptedPrompt },
      ...fallbackPrompts.map((prompt, i) => ({ variant: `fallback_${i + 1}`, prompt })),
    ]

    console.log('[Google Music] Lyria prompt plan:', {
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
        prompt: attempt.prompt,
        timeoutMs: attemptTimeoutMs,
      })

      const result = await callLyria(attempt.prompt, endpoint, accessToken, attemptTimeoutMs)

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
    const actualDurationSeconds = getWavDurationSeconds(arrayBuffer)

    console.log('[Google Music] Music generated successfully:', {
      variant: winningVariant,
      size: arrayBuffer.byteLength,
      actualDurationSeconds,
      requestedDurationSeconds,
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
      })
    } catch (chargeError: unknown) {
      console.error(
        '[Google Music] Failed to charge credits:',
        chargeError instanceof Error ? chargeError.message : String(chargeError)
      )
    }

    // Always Blob the WAV. A 30s Lyria clip is ~5.7MB uncompressed, which is
    // over Vercel's 4.5MB response body limit — returning the bytes inline is
    // what produced the buffer/payload-size failures.
    const timestamp = Date.now()
    const slug = [sceneId || 'music', typeof cueId === 'string' ? cueId : '']
      .filter(Boolean)
      .join('-')
    const filename = `audio/music/${projectId || 'default'}/${slug}-${timestamp}.wav`
    const blob = await put(filename, arrayBuffer, {
      access: 'public',
      contentType: 'audio/wav',
    })
    console.log('[Google Music] Saved to blob:', blob.url)
    return NextResponse.json({
      url: blob.url,
      size: arrayBuffer.byteLength,
      duration: actualDurationSeconds,
      requestedDuration: requestedDurationSeconds,
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
