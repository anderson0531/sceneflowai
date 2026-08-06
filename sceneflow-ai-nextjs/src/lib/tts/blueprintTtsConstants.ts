/**
 * Client-safe Blueprint TTS constants and helpers (no Node / Vertex imports).
 */

export const DEFAULT_BLUEPRINT_GEMINI_VOICE = 'gemini-Kore'

export const DEFAULT_GEMINI_TTS_MODEL = 'gemini-2.5-flash-tts'

/**
 * Hard ceiling Cloud TTS enforces on `input.text`, in UTF-8 bytes. Exceeding it
 * fails the whole request with HTTP 400, so every chunk has to fit.
 */
export const GEMINI_TTS_MAX_INPUT_BYTES = 4000

/**
 * Budget we actually chunk to, kept under the ceiling.
 *
 * The margin exists because the ceiling applies to the text after our own
 * sanitizing, and a chunk sized exactly at the limit leaves no room for a future
 * step that adds a character rather than removing one.
 */
export const NARRATION_CHUNK_BYTES = 3500

export function isGeminiTtsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  )
}

export function isBlueprintGeminiVoiceId(voiceId?: string): boolean {
  return !!voiceId?.trim().startsWith('gemini-')
}

/** Map legacy ElevenLabs narrator ids to default Gemini voice. */
export function normalizeBlueprintGeminiVoiceId(voiceId?: string): string {
  const id = voiceId?.trim()
  if (id && isBlueprintGeminiVoiceId(id)) return id
  return DEFAULT_BLUEPRINT_GEMINI_VOICE
}
