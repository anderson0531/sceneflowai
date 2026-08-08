/**
 * Shared dialogue TTS voice resolution for client + batch/server paths.
 * Bridges script speakers (NARRATOR / narrator) to cast (Narrator / narrator-1)
 * and falls back to project narrationVoice for narrator lines.
 */

import {
  resolveCharacterForDialogueTts,
  toCanonicalName,
  generateAliases,
} from '@/lib/character/canonical'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
} from '@/lib/script/segmentTypes'

const NARRATOR_ROLE_PATTERN = /narrator|narration|voiceover|voice-over|v\.?o\.?/i

export type DialogueTtsCharacter = {
  id?: string
  name?: string
  aliases?: string[]
  type?: string
  voiceConfig?: unknown
}

export function isNarratorDialogueSpeaker(options: {
  kind?: string | null
  characterId?: string | null
  characterName?: string | null
}): boolean {
  if (options.kind === 'narration') return true
  if (options.characterId === NARRATOR_CHARACTER_ID) return true
  if (
    typeof options.characterName === 'string' &&
    toCanonicalName(options.characterName) === toCanonicalName(NARRATOR_CHARACTER)
  ) {
    return true
  }
  if (typeof options.characterName === 'string' && NARRATOR_ROLE_PATTERN.test(options.characterName)) {
    return true
  }
  return false
}

function findNarratorCastCharacter<T extends DialogueTtsCharacter>(characters: T[]): T | undefined {
  return (
    characters.find((c) => c?.type === 'narrator') ||
    characters.find(
      (c) =>
        typeof c?.name === 'string' &&
        (toCanonicalName(c.name) === toCanonicalName(NARRATOR_CHARACTER) ||
          NARRATOR_ROLE_PATTERN.test(c.name))
    ) ||
    characters.find((c) => c?.id === NARRATOR_CHARACTER_ID || c?.id === 'narrator-1')
  )
}

export type ResolveDialogueTtsVoiceResult<T extends DialogueTtsCharacter> = {
  character: T | null
  voiceConfig: T['voiceConfig'] | null
  usedNarrationVoiceFallback: boolean
  resolvedName?: string
  resolvedCharacterId?: string
}

/**
 * Resolve cast character + voice for a dialogue/narration line.
 * Prefer cast match; for narrator lines fall back to narrationVoice.
 */
export function resolveDialogueTtsVoice<T extends DialogueTtsCharacter>(options: {
  characters: T[]
  characterId?: string | null
  characterName?: string | null
  kind?: string | null
  narrationVoice?: T['voiceConfig'] | null
  logContext?: string
}): ResolveDialogueTtsVoiceResult<T> {
  const {
    characters,
    characterId,
    characterName,
    kind,
    narrationVoice,
    logContext,
  } = options

  const isNarratorLine = isNarratorDialogueSpeaker({
    kind,
    characterId,
    characterName,
  })

  let character =
    resolveCharacterForDialogueTts(characters, {
      characterId: characterId || undefined,
      characterName: characterName || undefined,
      logContext,
    }) ?? null

  if (!character && characterName) {
    const canonicalSearchName = toCanonicalName(characterName)
    character =
      characters.find((c) => typeof c?.name === 'string' && toCanonicalName(c.name) === canonicalSearchName) ??
      characters.find((c) => {
        if (typeof c?.name !== 'string') return false
        return generateAliases(toCanonicalName(c.name)).some(
          (alias) => toCanonicalName(alias) === canonicalSearchName
        )
      }) ??
      null
  }

  if (!character && isNarratorLine) {
    character = findNarratorCastCharacter(characters) ?? null
  }

  let voiceConfig = character?.voiceConfig ?? null
  let usedNarrationVoiceFallback = false
  let resolvedName = character?.name
  let resolvedCharacterId = character?.id

  if (!voiceConfig && isNarratorLine && narrationVoice) {
    voiceConfig = narrationVoice
    usedNarrationVoiceFallback = true
    resolvedName = resolvedName || NARRATOR_CHARACTER
    resolvedCharacterId = resolvedCharacterId || NARRATOR_CHARACTER_ID
  }

  return {
    character,
    voiceConfig,
    usedNarrationVoiceFallback,
    resolvedName,
    resolvedCharacterId,
  }
}

/** True when the current speaker cannot produce TTS without user action. */
export function dialogueSpeakerNeedsAssignment<T extends DialogueTtsCharacter>(options: {
  characters: T[]
  characterId?: string | null
  characterName?: string | null
  kind?: string | null
  narrationVoice?: T['voiceConfig'] | null
}): boolean {
  const resolved = resolveDialogueTtsVoice(options)
  return !resolved.voiceConfig
}
