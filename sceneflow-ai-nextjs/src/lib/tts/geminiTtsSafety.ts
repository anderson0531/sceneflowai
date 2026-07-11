/**
 * Gemini TTS advanced voice options — relax harm-category filters on synthesis requests.
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts (advancedVoiceOptions.safetySettings)
 */

export const GEMINI_TTS_HARM_CATEGORIES = [
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
] as const

export type GeminiTtsHarmCategory = (typeof GEMINI_TTS_HARM_CATEGORIES)[number]

export const GEMINI_TTS_SAFETY_THRESHOLDS = [
  'BLOCK_LOW_AND_ABOVE',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_ONLY_HIGH',
  'BLOCK_NONE',
  'OFF',
] as const

export type GeminiTtsSafetyThreshold = (typeof GEMINI_TTS_SAFETY_THRESHOLDS)[number]

export type GeminiTtsAdvancedVoiceOptions = {
  safetySettings: {
    settings: Array<{
      category: GeminiTtsHarmCategory
      threshold: GeminiTtsSafetyThreshold
    }>
  }
}

const DEFAULT_THRESHOLD: GeminiTtsSafetyThreshold = 'BLOCK_NONE'

function isValidThreshold(value: string): value is GeminiTtsSafetyThreshold {
  return (GEMINI_TTS_SAFETY_THRESHOLDS as readonly string[]).includes(value)
}

/**
 * Reads GEMINI_TTS_SAFETY_THRESHOLD. When unset, defaults to BLOCK_NONE.
 * GOOGLE_DEFAULT or empty string omits advancedVoiceOptions (Google's built-in filtering).
 */
export function getGeminiTtsSafetyThreshold(
  envValue?: string
): GeminiTtsSafetyThreshold | 'GOOGLE_DEFAULT' {
  const raw = envValue !== undefined ? envValue : process.env.GEMINI_TTS_SAFETY_THRESHOLD

  if (raw === undefined) {
    return DEFAULT_THRESHOLD
  }

  const trimmed = raw.trim()
  if (!trimmed || trimmed.toUpperCase() === 'GOOGLE_DEFAULT') {
    return 'GOOGLE_DEFAULT'
  }
  const normalized = trimmed.toUpperCase()
  if (isValidThreshold(normalized)) {
    return normalized
  }
  return DEFAULT_THRESHOLD
}

/** Returns advancedVoiceOptions for Gemini TTS, or undefined when using Google defaults. */
export function buildGeminiTtsAdvancedVoiceOptions(
  envValue?: string
): GeminiTtsAdvancedVoiceOptions | undefined {
  const threshold = getGeminiTtsSafetyThreshold(envValue)
  if (threshold === 'GOOGLE_DEFAULT') {
    return undefined
  }

  return {
    safetySettings: {
      settings: GEMINI_TTS_HARM_CATEGORIES.map((category) => ({
        category,
        threshold,
      })),
    },
  }
}
