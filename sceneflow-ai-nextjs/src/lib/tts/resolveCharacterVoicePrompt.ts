export type VoicePromptSource = 'client' | 'db' | 'voiceDescription' | 'none'

export type ResolvedCharacterVoicePrompt = {
  prompt: string
  source: VoicePromptSource
}

type VoiceConfigLike = {
  prompt?: string
}

type CharacterLike = {
  voiceConfig?: VoiceConfigLike
  voiceDescription?: string
}

/**
 * Resolve the Gemini TTS voice profile for a character dialogue line.
 * Casting Brief (`voiceDescription`) is the live profile. A saved
 * `voiceConfig.prompt` is only used when no brief exists (legacy Director's Note).
 */
export function resolveCharacterVoicePrompt(
  clientVoiceConfig: VoiceConfigLike,
  character?: CharacterLike | null
): ResolvedCharacterVoicePrompt {
  const voiceDescription = character?.voiceDescription?.trim()
  if (voiceDescription) {
    return { prompt: voiceDescription, source: 'voiceDescription' }
  }

  const clientPrompt = clientVoiceConfig.prompt?.trim()
  if (clientPrompt) {
    return { prompt: clientPrompt, source: 'client' }
  }

  const dbPrompt = character?.voiceConfig?.prompt?.trim()
  if (dbPrompt) {
    return { prompt: dbPrompt, source: 'db' }
  }

  return { prompt: '', source: 'none' }
}
