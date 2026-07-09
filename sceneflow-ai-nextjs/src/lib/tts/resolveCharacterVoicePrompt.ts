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
 * Resolve the Gemini TTS director prompt for a character dialogue line.
 * Priority: client voiceConfig.prompt → DB character voiceConfig.prompt → voiceDescription.
 */
export function resolveCharacterVoicePrompt(
  clientVoiceConfig: VoiceConfigLike,
  character?: CharacterLike | null
): ResolvedCharacterVoicePrompt {
  const clientPrompt = clientVoiceConfig.prompt?.trim()
  if (clientPrompt) {
    return { prompt: clientPrompt, source: 'client' }
  }

  const dbPrompt = character?.voiceConfig?.prompt?.trim()
  if (dbPrompt) {
    return { prompt: dbPrompt, source: 'db' }
  }

  const voiceDescription = character?.voiceDescription?.trim()
  if (voiceDescription) {
    return { prompt: voiceDescription, source: 'voiceDescription' }
  }

  return { prompt: '', source: 'none' }
}
