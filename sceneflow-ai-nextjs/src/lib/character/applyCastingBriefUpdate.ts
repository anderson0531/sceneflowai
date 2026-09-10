import { buildGoogleVoiceAssignment } from '@/lib/tts/pickGeminiBaseVoice'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import {
  requestCastingBrief,
  type RequestCastingBriefInput,
} from '@/lib/character/requestCastingBrief'

export type CastingBriefVoiceConfig = {
  provider?: string
  voiceId?: string
  voiceName?: string
  prompt?: string
}

export type CastingBriefCharacter = {
  name?: string
  type?: string
  role?: string
  gender?: string
  genderSource?: string
  age?: string | number
  ethnicity?: string
  voiceDescription?: string
  voiceConfig?: CastingBriefVoiceConfig
}

export type AppliedCastingBrief = {
  voiceDescription: string
  voiceConfig?: CastingBriefVoiceConfig
}

export function isNarratorCharacter(character: {
  type?: string
  role?: string
  name?: string
}): boolean {
  return (
    character.type === 'narrator' ||
    String(character.role || '').toLowerCase() === 'narrator' ||
    String(character.name || '').toLowerCase() === 'narrator'
  )
}

/**
 * Persist the new Casting Brief as voiceDescription + TTS prompt.
 * If a Gemini voice is already assigned, rematch silently. Never changes gender.
 */
export function applyCastingBriefUpdate(
  character: CastingBriefCharacter,
  brief: string,
  options?: { screenplayContext?: ScreenplayContext },
): AppliedCastingBrief {
  const voiceDescription = brief.trim()
  const existing = character.voiceConfig
  const existingId = existing?.voiceId?.trim()

  if (existingId) {
    const assignment = buildGoogleVoiceAssignment(voiceDescription, {
      gender: character.gender,
      name: character.name,
      age: character.age,
      role: character.role,
      screenplayContext: options?.screenplayContext,
      prompt: voiceDescription,
    })
    return {
      voiceDescription,
      voiceConfig: {
        ...existing,
        ...assignment,
      },
    }
  }

  if (existing) {
    return {
      voiceDescription,
      voiceConfig: {
        ...existing,
        prompt: voiceDescription,
      },
    }
  }

  return { voiceDescription }
}

/** Produces a brief from director inputs. Swapped server-side, where `fetch` has no session. */
export type CastingBriefGenerator = (
  input: RequestCastingBriefInput,
) => Promise<{ voiceDescription: string }>

export async function refreshCastingBriefForAppearance(input: {
  character: CastingBriefCharacter
  appearanceDescription: string
  screenplayContext?: ScreenplayContext
  hasPortrait?: boolean
  /** Defaults to the client route helper; the background worker passes a direct call. */
  generate?: CastingBriefGenerator
}): Promise<AppliedCastingBrief | null> {
  if (isNarratorCharacter(input.character)) return null
  if (!input.character.name?.trim()) return null

  const generate = input.generate ?? requestCastingBrief
  const { voiceDescription } = await generate({
    characterName: input.character.name,
    characterRole: input.character.role,
    gender: input.character.gender,
    age: input.character.age,
    ethnicity: input.character.ethnicity,
    genre: input.screenplayContext?.genre,
    tone: input.screenplayContext?.tone,
    setting: input.screenplayContext?.setting,
    logline: input.screenplayContext?.logline,
    appearanceDescription: input.appearanceDescription,
    currentBrief: input.character.voiceDescription,
    recommendMode: true,
    hasPortrait: input.hasPortrait,
  })

  return applyCastingBriefUpdate(input.character, voiceDescription, {
    screenplayContext: input.screenplayContext,
  })
}
