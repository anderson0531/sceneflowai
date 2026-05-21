/**
 * ElevenLabs Text-to-Speech (dialogue / narration MP3).
 * Shared by `/api/tts/elevenlabs` and vision scene audio generation.
 */

import {
  type ElevenLabsDelivery,
  applyStorytellingDeliveryTag,
  resolveStorytellingModelId,
  resolveVoiceSettings,
} from './voicePresets'

export interface SynthesizeElevenLabsMp3Params {
  text: string
  voiceId: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
  speed?: number
  /** Override model (default: env ELEVENLABS_TTS_MODEL or eleven_multilingual_v2). */
  modelId?: string
  /** Expressive storytelling preset (lower stability, higher style). */
  delivery?: ElevenLabsDelivery
  /** When true with storytelling delivery, prepend `[Intelligent and Engaging]`. Default true. */
  prependDeliveryTag?: boolean
}

export async function synthesizeElevenLabsMp3(
  params: SynthesizeElevenLabsMp3Params
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured')
  }

  let text = (params.text || '').trim()
  if (!text) {
    throw new Error('TTS text is required')
  }

  const voiceIdRaw = (params.voiceId || '').trim()
  if (!voiceIdRaw) {
    throw new Error('voiceId is required')
  }

  const delivery = params.delivery ?? 'neutral'
  const prependTag = params.prependDeliveryTag !== false
  if (delivery === 'storytelling' && prependTag) {
    text = applyStorytellingDeliveryTag(text)
  }
  const preset = resolveVoiceSettings(delivery)

  const stability =
    typeof params.stability === 'number' && Number.isFinite(params.stability)
      ? Math.min(1, Math.max(0, params.stability))
      : preset.stability
  const similarityBoost =
    typeof params.similarityBoost === 'number' && Number.isFinite(params.similarityBoost)
      ? Math.min(1, Math.max(0, params.similarityBoost))
      : preset.similarity_boost
  const style =
    typeof params.style === 'number' && Number.isFinite(params.style)
      ? Math.min(1, Math.max(0, params.style))
      : preset.style
  const useSpeakerBoost =
    typeof params.useSpeakerBoost === 'boolean' ? params.useSpeakerBoost : preset.use_speaker_boost
  const speed =
    typeof params.speed === 'number' && Number.isFinite(params.speed)
      ? Math.min(4, Math.max(0.25, params.speed))
      : preset.speed ?? 1

  const modelId =
    params.modelId?.trim() ||
    (delivery === 'storytelling' ? resolveStorytellingModelId() : undefined) ||
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
        style,
        use_speaker_boost: useSpeakerBoost,
        speed,
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
