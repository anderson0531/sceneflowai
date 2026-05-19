import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lists voices from the ElevenLabs account (premade + custom).
 * Optional BYOK: `x-elevenlabs-api-key` header overrides `ELEVENLABS_API_KEY`.
 */
export async function GET(req: NextRequest) {
  const apiKey =
    req.headers.get('x-elevenlabs-api-key')?.trim() ||
    process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        enabled: false,
        error: 'ElevenLabs is not configured',
        voices: [],
      },
      { status: 503 }
    )
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ElevenLabs Voices] API error:', res.status, errText.slice(0, 300))
      return NextResponse.json(
        {
          enabled: false,
          error: `ElevenLabs voices request failed (${res.status})`,
          details: errText.slice(0, 300),
          voices: [],
        },
        { status: 502 }
      )
    }

    const data = (await res.json()) as { voices?: unknown[] }
    const raw = Array.isArray(data?.voices) ? data.voices : []

    const voices = raw.map((v: Record<string, unknown>) => {
      const labels =
        v.labels && typeof v.labels === 'object' && v.labels !== null
          ? (v.labels as Record<string, string>)
          : {}
      const voiceId = typeof v.voice_id === 'string' ? v.voice_id : ''
      return {
        id: voiceId,
        name: typeof v.name === 'string' ? v.name : voiceId,
        description: typeof v.description === 'string' ? v.description : undefined,
        category: typeof v.category === 'string' ? v.category : undefined,
        labels,
        previewUrl: typeof v.preview_url === 'string' ? v.preview_url : undefined,
        language: labels.language,
        gender: labels.gender,
        age: labels.age,
        accent: labels.accent,
        useCase: labels.use_case,
      }
    })

    return NextResponse.json({
      enabled: true,
      voices,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ElevenLabs Voices] Error:', message)
    return NextResponse.json(
      {
        enabled: false,
        error: message || 'Failed to fetch ElevenLabs voices',
        voices: [],
      },
      { status: 500 }
    )
  }
}
