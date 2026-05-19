/**
 * ElevenLabs Text-to-Speech (dialogue / narration MP3).
 * Shared by `/api/tts/elevenlabs` and vision scene audio generation.
 */

export interface SynthesizeElevenLabsMp3Params {
  text: string
  voiceId: string
  stability?: number
  similarityBoost?: number
  /** Override model (default: env ELEVENLABS_TTS_MODEL or eleven_multilingual_v2). */
  modelId?: string
}

export async function synthesizeElevenLabsMp3(
  params: SynthesizeElevenLabsMp3Params
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured')
  }

  const text = (params.text || '').trim()
  if (!text) {
    throw new Error('TTS text is required')
  }

  const voiceIdRaw = (params.voiceId || '').trim()
  if (!voiceIdRaw) {
    throw new Error('voiceId is required')
  }

  const stability =
    typeof params.stability === 'number' && Number.isFinite(params.stability)
      ? Math.min(1, Math.max(0, params.stability))
      : 0.5
  const similarityBoost =
    typeof params.similarityBoost === 'number' && Number.isFinite(params.similarityBoost)
      ? Math.min(1, Math.max(0, params.similarityBoost))
      : 0.75

  const modelId =
    params.modelId?.trim() ||
    process.env.ELEVENLABS_TTS_MODEL?.trim() ||
    'eleven_multilingual_v2'

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceIdRaw
  )}?output_format=mp3_44100_128`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(
      `ElevenLabs TTS failed: HTTP ${response.status} ${errText.slice(0, 400)}`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
