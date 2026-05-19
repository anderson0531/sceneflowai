import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/tts/elevenlabs/voice-design/create
 *
 * Finalize a designed preview into the account library:
 * POST https://api.elevenlabs.io/v1/text-to-voice
 *
 * Body: { voiceName: string, voiceDescription: string, generatedVoiceId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs is not configured' },
        { status: 503 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const voiceName = typeof body.voiceName === 'string' ? body.voiceName.trim() : ''
    const voiceDescription =
      typeof body.voiceDescription === 'string' ? body.voiceDescription.trim() : ''
    const generatedVoiceId =
      typeof body.generatedVoiceId === 'string' ? body.generatedVoiceId.trim() : ''

    if (!voiceName || !voiceDescription || !generatedVoiceId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: voiceName, voiceDescription, generatedVoiceId',
        },
        { status: 400 }
      )
    }

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-voice', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_name: voiceName,
        voice_description: voiceDescription,
        generated_voice_id: generatedVoiceId,
      }),
    })

    const rawText = await response.text()
    if (!response.ok) {
      console.error(
        '[ElevenLabs Voice Design] create failed:',
        response.status,
        rawText.slice(0, 400)
      )
      return NextResponse.json(
        {
          error: 'ElevenLabs failed to save voice',
          details: rawText.slice(0, 300),
        },
        { status: response.status >= 400 ? response.status : 502 }
      )
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from ElevenLabs' },
        { status: 502 }
      )
    }

    const nested = data.voice as Record<string, unknown> | undefined
    const voiceId =
      (typeof data.voice_id === 'string' && data.voice_id) ||
      (typeof nested?.voice_id === 'string' && nested.voice_id) ||
      (typeof nested?.id === 'string' && nested.id) ||
      ''

    const name =
      (typeof data.name === 'string' && data.name) ||
      (typeof nested?.name === 'string' && nested.name) ||
      voiceName

    if (!voiceId) {
      console.error(
        '[ElevenLabs Voice Design] Unexpected create payload:',
        rawText.slice(0, 500)
      )
      return NextResponse.json(
        { error: 'ElevenLabs did not return a voice id', details: rawText.slice(0, 200) },
        { status: 502 }
      )
    }

    return NextResponse.json({
      voice: {
        id: voiceId,
        name,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ElevenLabs Voice Design] create error:', message)
    return NextResponse.json(
      { error: message || 'Voice creation failed' },
      { status: 500 }
    )
  }
}
