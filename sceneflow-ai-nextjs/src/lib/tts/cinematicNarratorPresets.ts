import type { GeminiVoiceGender } from '@/lib/tts/geminiVoiceCatalog'

export interface CinematicNarratorPreset {
  id: string
  displayName: string
  gender: GeminiVoiceGender
  /** Hidden Gemini base voice — never shown as a star name. */
  voiceId: string
  profile: string
}

export const CINEMATIC_NARRATOR_PRESETS: CinematicNarratorPreset[] = [
  {
    id: 'warm-documentary',
    displayName: 'Warm Documentary',
    gender: 'male',
    voiceId: 'gemini-Algenib',
    profile:
      'Warm, intelligent documentary storyteller. Conversational intimacy with cinematic pacing. Clear, resonant, never rushed. Invite the audience into the world rather than announce it.',
  },
  {
    id: 'dark-thriller',
    displayName: 'Dark Thriller',
    gender: 'male',
    voiceId: 'gemini-Charon',
    profile:
      'Low, controlled thriller narrator. Measured pauses, dry gravity, quiet menace without caricature. Intimate and close-miked, as if confiding a secret the audience should not know yet.',
  },
  {
    id: 'epic-adventure',
    displayName: 'Epic Adventure',
    gender: 'male',
    voiceId: 'gemini-Fenrir',
    profile:
      'Bold cinematic adventure narrator. Expansive energy, heroic lift on key lines, still articulate. Feel of a prestige trailer without shouting or camp.',
  },
  {
    id: 'intimate-storyteller',
    displayName: 'Intimate Storyteller',
    gender: 'female',
    voiceId: 'gemini-Kore',
    profile:
      'Close, human storyteller. Warm midrange, thoughtful pacing, emotional clarity. Reads as a trusted companion walking the audience through the story.',
  },
  {
    id: 'authoritative-documentary',
    displayName: 'Authoritative Documentary',
    gender: 'female',
    voiceId: 'gemini-Achernar',
    profile:
      'Crisp, authoritative documentary narrator. Precise diction, calm confidence, prestige-series gravity. Never cold—assured and cinematic.',
  },
  {
    id: 'lyrical-drama',
    displayName: 'Lyrical Drama',
    gender: 'female',
    voiceId: 'gemini-Zephyr',
    profile:
      'Lyrical dramatic narrator. Soft lift, poetic cadence, emotional color without breathiness. Suited to character-driven and prestige drama.',
  },
]

export const DEFAULT_CINEMATIC_NARRATOR = CINEMATIC_NARRATOR_PRESETS[0]

export function getCinematicNarratorPreset(
  idOrVoiceId: string | undefined
): CinematicNarratorPreset | undefined {
  if (!idOrVoiceId) return undefined
  return CINEMATIC_NARRATOR_PRESETS.find(
    (preset) => preset.id === idOrVoiceId || preset.voiceId === idOrVoiceId
  )
}

export function getNarratorPresetsByGender(gender: GeminiVoiceGender): CinematicNarratorPreset[] {
  return CINEMATIC_NARRATOR_PRESETS.filter((preset) => preset.gender === gender)
}
