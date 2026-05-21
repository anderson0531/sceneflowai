export type GeminiTtsAudioType = 'narration' | 'dialogue' | 'music' | 'sfx'

const DEFAULT_BLUEPRINT_NARRATION_NOTES =
  'Warm, intelligent, engaging documentary storyteller; natural pacing, subtle emotion.'

/** Natural-language style steering for Gemini-TTS (input.prompt). See Cloud TTS Gemini docs. */
export function buildGeminiTtsPrompt(params: {
  audioType?: GeminiTtsAudioType
  voicePrompt?: string
  deliveryCues?: string[]
}): string {
  const audioType = params.audioType ?? 'narration'
  const deliveryCues = params.deliveryCues ?? []
  const guard =
    'Speak only the words in the text field. Do not read meta-instructions aloud, do not add filler words, and do not repeat or summarize the line.'
  const prosody =
    'Deliver with natural human prosody—conversational rhythm, believable pacing, and subtle emotion. Avoid flat, monotone, or robotic delivery.'
  const acting =
    deliveryCues.length > 0
      ? ` Acting direction for this performance: ${deliveryCues.join('; ')}.`
      : ''
  const profileSource =
    params.voicePrompt?.trim() || (audioType === 'narration' ? DEFAULT_BLUEPRINT_NARRATION_NOTES : '')
  const profile = profileSource
    ? audioType === 'dialogue'
      ? ` Character voice profile for timbre and manner (style only, not spoken as dialogue): ${profileSource.slice(0, 700)}.`
      : ` Voice profile—apply as delivery style without narrating this sentence verbatim: ${profileSource.slice(0, 800)}.`
    : ''
  return `${prosody}${acting}${profile} ${guard}`.trim()
}
