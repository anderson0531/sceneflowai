import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const MUSIC_CREDIT_COST = AUDIO_CREDITS.ELEVENLABS_MUSIC

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs music is not configured' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }

    const hasCredits = await CreditService.ensureCredits(userId, MUSIC_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: MUSIC_CREDIT_COST,
          operation: 'elevenlabs_music',
        },
        { status: 402 }
      )
    }

    const body = await request.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const durationSecRaw =
      typeof body.duration === 'number' && Number.isFinite(body.duration) ? body.duration : 30
    const saveToBlob = !!body.saveToBlob
    const projectId = typeof body.projectId === 'string' ? body.projectId : undefined
    const sceneId = typeof body.sceneId === 'string' ? body.sceneId : undefined
    const forceInstrumental =
      typeof body.forceInstrumental === 'boolean' ? body.forceInstrumental : false

    if (!text) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const durationSec = Math.min(600, Math.max(3, durationSecRaw))
    const music_length_ms = Math.min(600_000, Math.max(3_000, Math.round(durationSec * 1000)))

    const apiKey = process.env.ELEVENLABS_API_KEY
    const url =
      'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt: text,
        music_length_ms,
        model_id: 'music_v1',
        force_instrumental: forceInstrumental,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('[ElevenLabs Music] API failed:', response.status, errText.slice(0, 400))
      return NextResponse.json(
        { error: 'Music generation failed', details: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    try {
      await CreditService.charge(userId, MUSIC_CREDIT_COST, 'ai_usage', null, {
        operation: 'elevenlabs_music',
        durationSeconds: durationSec,
        promptPreview: text.slice(0, 120),
      })
      await trackCost(userId, 'elevenlabs_music', MUSIC_CREDIT_COST, {
        projectId,
        sceneId,
      }).catch(() => null)
    } catch (chargeError: unknown) {
      console.error(
        '[ElevenLabs Music] Failed to charge credits:',
        chargeError instanceof Error ? chargeError.message : chargeError
      )
    }

    if (saveToBlob) {
      const timestamp = Date.now()
      const filename = `audio/music/${projectId || 'default'}/${sceneId || 'music'}-${timestamp}.mp3`
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'audio/mpeg',
      })
      return NextResponse.json({
        url: blob.url,
        size: buffer.byteLength,
        duration: durationSec,
        format: 'mp3',
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
    console.error('[ElevenLabs Music] Error:', message)
    return NextResponse.json(
      { error: 'Music generation failed', details: message },
      { status: 500 }
    )
  }
}
