import {
  inferStrongVoiceProfileGender,
  normalizeGender,
} from '@/lib/voiceRecommendation'

export type AutoVoiceGenderSource = 'ai' | 'user'

/**
 * Gender used to score / pick a Gemini base voice during Auto Voice.
 *
 * Vision analysis must not overwrite a confirm-dialog choice or a user-set
 * character gender. Those are the two cases that previously forced a male
 * catalog filter onto a female voice profile.
 */
export function resolveAutoVoiceScoringGender(input: {
  genderOverride?: string | null
  genderSource?: AutoVoiceGenderSource
  characterGender?: string | null
  analysisGender?: string | null
}): 'male' | 'female' | undefined {
  const override = normalizeGender(input.genderOverride ?? undefined)
  if (override) return override

  if (input.genderSource === 'user') {
    const userGender = normalizeGender(input.characterGender ?? undefined)
    if (userGender) return userGender
  }

  return (
    normalizeGender(input.analysisGender ?? undefined) ??
    normalizeGender(input.characterGender ?? undefined) ??
    undefined
  )
}

/**
 * If the profile unambiguously says "female voice" / "male voice", that wins
 * over a conflicting explicit gender (stale AI attribute or a misread portrait).
 */
export function reconcilePickerGender(
  profile: string,
  optionsGender?: string,
): 'male' | 'female' | undefined {
  const explicit = normalizeGender(optionsGender)
  const fromProfile = inferStrongVoiceProfileGender(profile)
  if (fromProfile && explicit && fromProfile !== explicit) return fromProfile
  return explicit ?? fromProfile ?? undefined
}
