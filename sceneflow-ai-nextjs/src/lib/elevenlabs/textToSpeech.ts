/**
 * ElevenLabs Text-to-Speech (dialogue / narration MP3).
 * Shared by `/api/tts/elevenlabs` and vision scene audio generation.
 */

import {
  type ElevenLabsDelivery,
  applyStorytellingDeliveryTag,
  isElevenV3AudioTagModel,
  resolveStorytellingModelId,
  resolveVoiceSettings,
  type ElevenLabsVoiceSettings,
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
  /** When true with storytelling delivery, format tag + quoted speakable text. Default true. */
  prependDeliveryTag?: boolean
  /** Per-request timeout in ms (default 90s). */
  timeoutMs?: number
}

const DEFAULT_TTS_TIMEOUT_MS = 90_000
const FALLBACK_STORYTELLING_MODEL = 'eleven_multilingual_v2'

async function requestElevenLabsMp3(args: {
  apiKey: string
  voiceId: string
  text: string
  modelId: string
  voice_settings: Record<string, unknown>
  timeoutMs: number
}): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    args.voiceId
  )}?output_format=mp3_44100_128`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), args.timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': args.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      signal: controller.signal,
      body: JSON.stringify({
        text: args.text,
        model_id: args.modelId,
        voice_settings: args.voice_settings,
      }),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`ElevenLabs TTS timed out after ${args.timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    const error = new Error(
      `ElevenLabs TTS failed: HTTP ${response.status} ${errText.slice(0, 400)}`
    ) as Error & { status?: number; modelId?: string }
    error.status = response.status
    error.modelId = args.modelId
    throw error
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function voiceSettingsForModel(
  modelId: string,
  preset: ElevenLabsVoiceSettings,
  overrides: {
    stability: number
    similarityBoost: number
    style: number
    useSpeakerBoost: boolean
    speed: number
  }
): Record<string, unknown> {
  if (isElevenV3AudioTagModel(modelId)) {
    return { stability: 0.5 }
  }
  return {
    stability: overrides.stability,
    similarity_boost: overrides.similarityBoost,
    style: overrides.style,
    use_speaker_boost: overrides.useSpeakerBoost,
    speed: overrides.speed,
  }
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

  const primaryModelId =
    params.modelId?.trim() ||
    (delivery === 'storytelling' ? resolveStorytellingModelId() : undefined) ||
    process.env.ELEVENLABS_TTS_MODEL?.trim() ||
    'eleven_multilingual_v2'

  const timeoutMs =
    typeof params.timeoutMs === 'number' && params.timeoutMs > 0
      ? params.timeoutMs
      : DEFAULT_TTS_TIMEOUT_MS

  const overrideNums = { stability, similarityBoost, style, useSpeakerBoost, speed }

  const tryModel = async (modelId: string) =>
    requestElevenLabsMp3({
      apiKey,
      voiceId: voiceIdRaw,
      text,
      modelId,
      voice_settings: voiceSettingsForModel(modelId, preset, overrideNums),
      timeoutMs,
    })

  try {
    return await tryModel(primaryModelId)
  } catch (err) {
    const status = (err as { status?: number }).status
    const shouldFallback =
      delivery === 'storytelling' &&
      isElevenV3AudioTagModel(primaryModelId) &&
      (status === 404 || status === 400 || status === 422)

    if (shouldFallback) {
      console.warn(
        `[ElevenLabs TTS] ${primaryModelId} failed (${status}); retrying ${FALLBACK_STORYTELLING_MODEL}`,
        { delivery, voiceId: voiceIdRaw }
      )
      return await tryModel(FALLBACK_STORYTELLING_MODEL)
    }

    console.error('[ElevenLabs TTS] Error:', {
      delivery,
      modelId: primaryModelId,
      voiceId: voiceIdRaw,
      message: err instanceof Error ? err.message : err,
    })
    throw err
  }
}
