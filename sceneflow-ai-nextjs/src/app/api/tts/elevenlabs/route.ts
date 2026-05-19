import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { synthesizeElevenLabsMp3 } from '@/lib/elevenlabs/textToSpeech'

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

    if (saveToBlob) {
      const session = await getServerSession(authOptions)
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

    const buffer = await synthesizeElevenLabsMp3({
      text,
      voiceId,
      stability: body.stability,
      similarityBoost: body.similarityBoost,
      modelId: body.modelId,
    })

    if (saveToBlob) {
      const projectId = body.projectId as string
      const sceneId =
        typeof body.sceneId === 'string' && body.sceneId.trim()
          ? body.sceneId.trim()
          : 'tts'
      const audioType =
        typeof body.audioType === 'string' && body.audioType.trim()
          ? body.audioType.trim()
          : 'tts'
      const filename = `audio/${audioType}/${projectId}/${sceneId}-${Date.now()}.mp3`
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
