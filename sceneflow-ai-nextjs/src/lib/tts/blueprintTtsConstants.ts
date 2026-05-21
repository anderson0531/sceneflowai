/**
 * Client-safe Blueprint TTS constants and helpers (no Node / Vertex imports).
 */

export const DEFAULT_BLUEPRINT_GEMINI_VOICE = 'gemini-Kore'

export const DEFAULT_GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview'

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
