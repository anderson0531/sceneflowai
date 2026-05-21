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

/** Models that interpret `[tag]` as performance direction (not spoken aloud). */
export function isElevenV3AudioTagModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase()
  return id.includes('eleven_v3') || id === 'eleven_ttv_v3'
}

export function resolveStorytellingModelId(): string {
  const configured =
    process.env.ELEVENLABS_STORYTELLING_MODEL?.trim() ||
    process.env.ELEVENLABS_TTS_MODEL?.trim()
  if (configured) return configured
  // v3 required for bracket audio tags; v2 reads "[Intelligent and Engaging]" aloud.
  return 'eleven_v3'
}

/** ElevenLabs v3 audio tag — performance cue, not narration (must use eleven_v3). */
export const STORYTELLING_DELIVERY_TAG = '[Intelligent and Engaging]'

/** Strip outer ASCII or curly quotes from speakable body. */
function stripOuterQuotes(body: string): string {
  const t = body.trim()
  const ascii = t.match(/^"([\s\S]*)"$/)
  if (ascii) return ascii[1]!.trim()
  const curly = t.match(/^[“]([\s\S]*)[”]$/)
  if (curly) return curly[1]!.trim()
  return t
}

/**
 * Format for ElevenLabs storytelling: bracket tag = direction; only quoted body is spoken.
 * Example: [Intelligent and Engaging] "From concept to season bible…"
 */
export function formatStorytellingTtsText(
  text: string,
  tag: string = STORYTELLING_DELIVERY_TAG
): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  if (/^\[[^\]]+\]\s+"[^"]+"\s*$/s.test(trimmed)) return trimmed

  const leadingTagMatch = trimmed.match(/^(\[[^\]]+\])\s*([\s\S]*)$/)
  const explicitTag = leadingTagMatch?.[1] ?? tag
  let body = (leadingTagMatch?.[2] ?? trimmed).trim()
  body = stripOuterQuotes(body)
  if (!body) return trimmed

  return `${explicitTag} "${body}"`
}

/** @deprecated Use formatStorytellingTtsText — kept as alias for callers. */
export function applyStorytellingDeliveryTag(text: string): string {
  return formatStorytellingTtsText(text)
}
