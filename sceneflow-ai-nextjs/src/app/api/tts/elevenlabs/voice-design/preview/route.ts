import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/tts/elevenlabs/voice-design/preview
 *
 * Proxies ElevenLabs Text-to-Voice **design** step:
 * POST https://api.elevenlabs.io/v1/text-to-voice/design
 *
 * Body: { voiceDescription: string, previewText?: string, modelId?: string }
 *
 * Preview text must be 100–1000 chars when sent as `text`; otherwise we set
 * `auto_generate_text: true` so ElevenLabs picks suitable sample lines.
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
    const voiceDescription =
      typeof body.voiceDescription === 'string' ? body.voiceDescription.trim() : ''
    const previewTextRaw =
      typeof body.previewText === 'string' ? body.previewText.trim() : ''

    if (voiceDescription.length < 20) {
      return NextResponse.json(
        { error: 'voiceDescription must be at least 20 characters' },
        { status: 400 }
      )
    }

    const modelIdRaw =
      typeof body.modelId === 'string' ? body.modelId.trim() : ''
    const model_id =
      modelIdRaw === 'eleven_ttv_v3'
        ? 'eleven_ttv_v3'
        : process.env.ELEVENLABS_TTV_MODEL?.trim() === 'eleven_ttv_v3'
          ? 'eleven_ttv_v3'
          : 'eleven_multilingual_ttv_v2'

    const payload: Record<string, unknown> = {
      voice_description: voiceDescription,
      model_id,
      guidance_scale:
        typeof body.guidanceScale === 'number' && Number.isFinite(body.guidanceScale)
          ? body.guidanceScale
          : 5,
      stream_previews: false,
      should_enhance: !!body.shouldEnhance,
    }

    if (previewTextRaw.length >= 100 && previewTextRaw.length <= 1000) {
      payload.text = previewTextRaw
    } else if (previewTextRaw.length > 1000) {
      payload.text = previewTextRaw.slice(0, 1000)
    } else {
      payload.auto_generate_text = true
    }

    const url =
      'https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_128'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const rawText = await response.text()
    if (!response.ok) {
      console.error(
        '[ElevenLabs Voice Design] design failed:',
        response.status,
        rawText.slice(0, 400)
      )
      return NextResponse.json(
        {
          error: 'ElevenLabs voice design failed',
          details: rawText.slice(0, 300),
        },
        { status: response.status >= 400 ? response.status : 502 }
      )
    }

    let data: {
      previews?: Array<{
        audio_base_64?: string
        generated_voice_id?: string
        media_type?: string
      }>
      text?: string
    }
    try {
      data = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from ElevenLabs' },
        { status: 502 }
      )
    }

    const previews = Array.isArray(data.previews)
      ? data.previews.map((p, index) => ({
          generatedVoiceId: p.generated_voice_id || `preview-${index}`,
          audioBase64: p.audio_base_64 || '',
          mediaType: p.media_type || 'audio/mpeg',
        }))
      : []

    return NextResponse.json({
      previews,
      previewScriptText: data.text ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ElevenLabs Voice Design] preview error:', message)
    return NextResponse.json(
      { error: message || 'Voice preview failed' },
      { status: 500 }
    )
  }
}
