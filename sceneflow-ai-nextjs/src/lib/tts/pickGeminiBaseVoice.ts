import {
  enrichGeminiVoicesForScoring,
  getGeminiVoicesForApi,
  NEUTRAL_GEMINI_VOICE_ID,
} from '@/lib/tts/geminiVoiceCatalog'
import {
  hasAcousticSignal,
  parseAcousticTarget,
  selectGeminiBaseVoice,
  type AcousticTarget,
  type AcousticTargetInput,
} from '@/lib/tts/voiceAcoustics'
import { reconcilePickerGender } from '@/lib/tts/autoVoiceGender'
import {
  getCharacterVoiceRecommendations,
  type CharacterContext,
  type ScreenplayContext,
} from '@/lib/voiceRecommendation'

export type GeminiBaseVoicePick = {
  voiceId: string
  /** Human label — never a Gemini star name. */
  voiceName: string
  /** How the voice was chosen, for logging and debug panels. */
  selectedBy: 'acoustics' | 'keywords'
  reasons: string[]
}

function humanVoiceLabel(gender?: string, fallbackName?: string): string {
  const g = gender?.toLowerCase()
  if (g === 'male') return 'Male SceneFlow voice'
  if (g === 'female') return 'Female SceneFlow voice'
  return fallbackName?.trim() || 'SceneFlow voice'
}

export type PickGeminiBaseVoiceOptions = {
  gender?: string
  name?: string
  age?: string | number
  role?: string
  screenplayContext?: ScreenplayContext
  displayName?: string
  /** Structured acoustic attributes from character voice analysis. */
  vocalAttributes?: AcousticTargetInput['vocalAttributes']
  /** Pre-resolved target; skips parsing entirely. */
  acousticTarget?: AcousticTarget
}

/**
 * Map a voice profile (and optional gender) to a hidden gemini-* base voice.
 *
 * Prefers acoustic selection — register and vocal weight decide the physical
 * substrate. Falls back to the legacy keyword scorer only when the profile
 * carries no acoustic signal at all.
 *
 * Callers must persist voiceName as a human label, not the catalog star name.
 */
export function pickGeminiBaseVoice(
  profile: string,
  options?: PickGeminiBaseVoiceOptions,
): GeminiBaseVoicePick {
  const gender = reconcilePickerGender(profile, options?.gender)
  const voiceName = options?.displayName || humanVoiceLabel(gender, options?.name)

  const parsed =
    options?.acousticTarget ??
    parseAcousticTarget({
      gender,
      apparentAge: options?.age,
      vocalAttributes: options?.vocalAttributes,
      brief: profile,
    })
  const target = gender ? { ...parsed, gender } : parsed

  if (hasAcousticSignal(target)) {
    const match = selectGeminiBaseVoice(target)
    return {
      voiceId: match.voiceId,
      voiceName,
      selectedBy: 'acoustics',
      reasons: match.reasons,
    }
  }

  const catalog = getGeminiVoicesForApi().filter(
    (voice) => typeof voice.id === 'string' && voice.id.startsWith('gemini-'),
  )
  const enriched = enrichGeminiVoicesForScoring(catalog)

  const character: CharacterContext = {
    name: options?.name?.trim() || 'Speaker',
    gender,
    age: options?.age,
    role: options?.role,
    voiceDescription: profile.trim(),
    description: profile.trim(),
  }

  const recs = getCharacterVoiceRecommendations(
    enriched,
    character,
    options?.screenplayContext,
    1,
  )

  const picked = enriched.find((voice) => voice.id === recs[0]?.voiceId) || enriched[0]

  if (!picked?.id?.startsWith('gemini-')) {
    const fallback = enriched.find((voice) => voice.id.startsWith('gemini-'))
    return {
      voiceId: fallback?.id || NEUTRAL_GEMINI_VOICE_ID,
      voiceName,
      selectedBy: 'keywords',
      reasons: ['No Gemini candidate scored; used neutral fallback'],
    }
  }

  return {
    voiceId: picked.id,
    voiceName,
    selectedBy: 'keywords',
    reasons: recs[0]?.reasons ?? [],
  }
}

export function buildGoogleVoiceAssignment(
  profile: string,
  options?: PickGeminiBaseVoiceOptions & {
    /** Gemini TTS system instruction. Defaults to the matching profile. */
    prompt?: string
  },
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
    prompt: (options?.prompt ?? profile).trim(),
  }
}
