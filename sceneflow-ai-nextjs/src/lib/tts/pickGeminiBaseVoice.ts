import {
  enrichGeminiVoicesForScoring,
  getGeminiVoicesForApi,
} from '@/lib/tts/geminiVoiceCatalog'
import {
  getCharacterVoiceRecommendations,
  type CharacterContext,
  type ScreenplayContext,
} from '@/lib/voiceRecommendation'

export type GeminiBaseVoicePick = {
  voiceId: string
  /** Human label — never a Gemini star name. */
  voiceName: string
}

function humanVoiceLabel(gender?: string, fallbackName?: string): string {
  const g = gender?.toLowerCase()
  if (g === 'male') return 'Male SceneFlow voice'
  if (g === 'female') return 'Female SceneFlow voice'
  return fallbackName?.trim() || 'SceneFlow voice'
}

/**
 * Map a voice profile (and optional gender) to a hidden gemini-* base voice.
 * Callers must persist voiceName as a human label, not the catalog star name.
 */
export function pickGeminiBaseVoice(
  profile: string,
  options?: {
    gender?: string
    name?: string
    age?: string | number
    role?: string
    screenplayContext?: ScreenplayContext
    displayName?: string
  }
): GeminiBaseVoicePick {
  const catalog = getGeminiVoicesForApi().filter(
    (voice) => typeof voice.id === 'string' && voice.id.startsWith('gemini-')
  )
  const enriched = enrichGeminiVoicesForScoring(catalog)

  const character: CharacterContext = {
    name: options?.name?.trim() || 'Speaker',
    gender: options?.gender,
    age: options?.age,
    role: options?.role,
    voiceDescription: profile.trim(),
    description: profile.trim(),
  }

  const recs = getCharacterVoiceRecommendations(
    enriched,
    character,
    options?.screenplayContext,
    1
  )

  const picked =
    enriched.find((voice) => voice.id === recs[0]?.voiceId) || enriched[0]

  if (!picked?.id?.startsWith('gemini-')) {
    const fallback = enriched.find((voice) => voice.id.startsWith('gemini-'))
    return {
      voiceId: fallback?.id || 'gemini-Algenib',
      voiceName: options?.displayName || humanVoiceLabel(options?.gender, options?.name),
    }
  }

  return {
    voiceId: picked.id,
    voiceName: options?.displayName || humanVoiceLabel(options?.gender, options?.name),
  }
}

export function buildGoogleVoiceAssignment(
  profile: string,
  options?: Parameters<typeof pickGeminiBaseVoice>[1]
): {
  provider: 'google'
  voiceId: string
  voiceName: string
  prompt: string
} {
  const pick = pickGeminiBaseVoice(profile, options)
  return {
    provider: 'google',
    voiceId: pick.voiceId,
    voiceName: pick.voiceName,
    prompt: profile.trim(),
  }
}
