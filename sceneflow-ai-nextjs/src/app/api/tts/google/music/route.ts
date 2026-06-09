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

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for music generation

const MUSIC_CREDIT_COST = AUDIO_CREDITS.MUSIC_TRACK || 25 // Fallback to 25

type LyriaCallResult =
  | { ok: true; base64Data: string }
  | { ok: false; status: number; body: string; recitation: boolean }

async function callLyria(
  prompt: string,
  endpoint: string,
  accessToken: string
): Promise<LyriaCallResult> {
  const requestBody = {
    instances: [{ prompt }],
    parameters: { sample_count: 1 },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

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

    const { text, projectId, sceneId, saveToBlob = false } = await request.json()

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
      console.log(`[Google Music] Trying Lyria (${attempt.variant}):`, {
        prompt: attempt.prompt,
      })

      const result = await callLyria(attempt.prompt, endpoint, accessToken)

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

    console.log('[Google Music] Music generated successfully:', {
      variant: winningVariant,
      size: arrayBuffer.byteLength,
    })

    try {
      await CreditService.charge(
        userId,
        MUSIC_CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'google_music', duration: 30, prompt: adaptedPrompt.substring(0, 100) }
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

    if (saveToBlob) {
      const timestamp = Date.now()
      const filename = `audio/music/${projectId || 'default'}/${sceneId || 'music'}-${timestamp}.wav`
      const blob = await put(filename, arrayBuffer, {
        access: 'public',
        contentType: 'audio/wav',
      })
      console.log('[Google Music] Saved to blob:', blob.url)
      return NextResponse.json({
        url: blob.url,
        size: arrayBuffer.byteLength,
        duration: 30,
      })
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
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
