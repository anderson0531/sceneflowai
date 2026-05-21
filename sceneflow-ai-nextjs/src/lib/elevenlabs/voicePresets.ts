/**
 * ElevenLabs delivery presets.
 * Storytelling: lower stability + higher style for expressive, engaging narration.
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech/convert
 */

export type ElevenLabsDelivery = 'neutral' | 'storytelling'

export type ElevenLabsVoiceSettings = {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
  speed?: number
}

/** Balanced default (existing behavior). */
export const NEUTRAL_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  speed: 1,
}

/** Drama / pitch-style delivery — more emotional range and stylistic emphasis. */
export const STORYTELLING_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.32,
  similarity_boost: 0.8,
  style: 0.58,
  use_speaker_boost: true,
  speed: 0.98,
}

export function resolveVoiceSettings(
  delivery: ElevenLabsDelivery = 'neutral',
  overrides?: Partial<ElevenLabsVoiceSettings>
): ElevenLabsVoiceSettings {
  const base =
    delivery === 'storytelling' ? STORYTELLING_VOICE_SETTINGS : NEUTRAL_VOICE_SETTINGS
  return { ...base, ...overrides }
}

export function resolveStorytellingModelId(): string {
  return (
    process.env.ELEVENLABS_STORYTELLING_MODEL?.trim() ||
    process.env.ELEVENLABS_TTS_MODEL?.trim() ||
    'eleven_multilingual_v2'
  )
}

/** ElevenLabs v3 audio tag — single delivery hint for blueprint narration. */
export const STORYTELLING_DELIVERY_TAG = '[Intelligent and Engaging]'

/** Prepend the storytelling delivery tag once (strips other leading bracket tags). */
export function applyStorytellingDeliveryTag(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith(STORYTELLING_DELIVERY_TAG)) return trimmed
  const withoutLeadingTag = trimmed.replace(/^\[[^\]]+\]\s*/, '').trim()
  return `${STORYTELLING_DELIVERY_TAG} ${withoutLeadingTag}`
}
