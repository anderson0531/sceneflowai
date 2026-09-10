import {
  clipVoiceDesignPrompt,
  isVoiceDesignPrompt,
  stripVoiceDesignTranscript,
  withVoiceDesignScene,
} from '@/lib/tts/geminiVoiceDesignPrompt'

export type GeminiTtsAudioType = 'narration' | 'dialogue' | 'music' | 'sfx'

export type GeminiTtsPromptLevel = 0 | 1 | 2

const DEFAULT_BLUEPRINT_NARRATION_NOTES =
  'Warm, intelligent, engaging documentary storyteller; natural pacing, subtle emotion.'

const GUARD =
  'Speak only the words in the text field. Do not read meta-instructions aloud, do not add filler words, and do not repeat or summarize the line.'

const PROSODY =
  'Deliver with natural human prosody—conversational rhythm, believable pacing, and subtle emotion. Avoid flat, monotone, or robotic delivery.'

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/** Natural-language style steering for Gemini-TTS (input.prompt). See Cloud TTS Gemini docs. */
export function buildGeminiTtsPrompt(params: {
  audioType?: GeminiTtsAudioType
  voicePrompt?: string
  deliveryCues?: string[]
  /** 0 = full prompt; 1 = drop delivery cues; 2 = prosody + guard only (policy retry simplification). */
  promptLevel?: GeminiTtsPromptLevel
}): string {
  const audioType = params.audioType ?? 'narration'
  const deliveryCues = params.deliveryCues ?? []
  const promptLevel = params.promptLevel ?? 0
  const profileSource =
    params.voicePrompt?.trim() ||
    (audioType === 'narration' ? DEFAULT_BLUEPRINT_NARRATION_NOTES : '')

  if (promptLevel <= 1 && isVoiceDesignPrompt(profileSource)) {
    let design = stripVoiceDesignTranscript(profileSource)
    if (promptLevel === 0 && deliveryCues.length > 0) {
      design = withVoiceDesignScene(design, deliveryCues.join('; '))
    }
    const reserve = byteLength(GUARD) + 4
    const persona = clipVoiceDesignPrompt(design, reserve)
    return [persona, GUARD].filter((b) => b.length > 0).join('\n\n')
  }

  const acting =
    promptLevel === 0 && deliveryCues.length > 0
      ? ` Acting direction for this performance: ${deliveryCues.join('; ')}.`
      : ''
  const profile =
    promptLevel <= 1 && profileSource
      ? audioType === 'dialogue'
        ? ` IMPORTANT: Maintain this exact vocal character—timbre, age, accent, and manner—throughout the entire spoken line. Character voice profile (style only, not spoken as dialogue): ${profileSource.slice(0, 700)}.`
        : ` Voice profile—apply as delivery style without narrating this sentence verbatim: ${profileSource.slice(0, 800)}.`
      : ''
  return `${PROSODY}${acting}${profile} ${GUARD}`.trim()
}
