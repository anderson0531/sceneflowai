export type GeminiTtsAudioType = 'narration' | 'dialogue' | 'music' | 'sfx'

export type GeminiTtsPromptLevel = 0 | 1 | 2

const DEFAULT_BLUEPRINT_NARRATION_NOTES =
  'Warm, intelligent, engaging documentary storyteller; natural pacing, subtle emotion.'

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
  const guard =
    'Speak only the words in the text field. Do not read meta-instructions aloud, do not add filler words, and do not repeat or summarize the line.'
  const prosody =
    'Deliver with natural human prosody—conversational rhythm, believable pacing, and subtle emotion. Avoid flat, monotone, or robotic delivery.'
  const acting =
    promptLevel === 0 && deliveryCues.length > 0
      ? ` Acting direction for this performance: ${deliveryCues.join('; ')}.`
      : ''
  const profileSource =
    params.voicePrompt?.trim() || (audioType === 'narration' ? DEFAULT_BLUEPRINT_NARRATION_NOTES : '')
  const profile =
    promptLevel <= 1 && profileSource
      ? audioType === 'dialogue'
        ? ` IMPORTANT: Maintain this exact vocal character—timbre, age, accent, and manner—throughout the entire spoken line. Character voice profile (style only, not spoken as dialogue): ${profileSource.slice(0, 700)}.`
        : ` Voice profile—apply as delivery style without narrating this sentence verbatim: ${profileSource.slice(0, 800)}.`
      : ''
  return `${prosody}${acting}${profile} ${guard}`.trim()
}
