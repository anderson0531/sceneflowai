/**
 * Promo voice-over uses a voice the production already cast.
 * The narrator wins. A protagonist is the fallback. Gemini Kore is last.
 */

import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  normalizeBlueprintGeminiVoiceId,
} from '@/lib/tts/blueprintTtsConstants'

export interface PromoNarrationVoiceCharacter {
  type?: string
  role?: string
  voiceConfig?: { voiceId?: string } | null
}

export interface PromoNarrationVoiceInput {
  characters?: PromoNarrationVoiceCharacter[] | null
  narrationVoice?: { voiceId?: string } | null
}

function voiceIdOf(character?: PromoNarrationVoiceCharacter | null): string | undefined {
  const id = character?.voiceConfig?.voiceId?.trim()
  return id || undefined
}

/** Gemini voice id for the promo narration track. */
export function resolvePromoNarrationVoiceId(input: PromoNarrationVoiceInput): string {
  const characters = input.characters ?? []
  const narrator = characters.find((character) => character?.type === 'narrator')
  const fromNarrator = voiceIdOf(narrator)
  if (fromNarrator) return normalizeBlueprintGeminiVoiceId(fromNarrator)

  const stored = input.narrationVoice?.voiceId?.trim()
  if (stored) return normalizeBlueprintGeminiVoiceId(stored)

  const protagonist =
    characters.find((character) => character?.role === 'protagonist' && voiceIdOf(character)) ||
    characters.find((character) => character?.role === 'main' && voiceIdOf(character))
  const fromCast = voiceIdOf(protagonist)
  if (fromCast) return normalizeBlueprintGeminiVoiceId(fromCast)

  return DEFAULT_BLUEPRINT_GEMINI_VOICE
}
