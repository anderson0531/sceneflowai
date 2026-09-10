import { isStructuredSystemInstruction } from '@/lib/tts/characterSystemInstruction'

export type GeminiTtsAudioType = 'narration' | 'dialogue' | 'music' | 'sfx'

export type GeminiTtsPromptLevel = 0 | 1 | 2

const DEFAULT_BLUEPRINT_NARRATION_NOTES =
  'Warm, intelligent, engaging documentary storyteller; natural pacing, subtle emotion.'

/**
 * Cloud TTS caps `input.prompt` at 4,000 bytes independently of `input.text`.
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */
export const GEMINI_TTS_MAX_PROMPT_BYTES = 4000

const GUARD =
  'Speak only the words in the text field. Do not read meta-instructions aloud, do not add filler words, and do not repeat or summarize the line.'

/**
 * Generic prosody coaching for unstructured profiles. Deliberately withheld
 * from structured instructions, whose DELIVERY RULES already specify cadence
 * and inflection — "avoid flat, monotone delivery" directly contradicts a
 * persona built on flat, declarative phrasing.
 */
const PROSODY =
  'Deliver with natural human prosody—conversational rhythm, believable pacing, and subtle emotion. Avoid flat, monotone, or robotic delivery.'

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/** Trim to a UTF-8 byte budget, preferring line boundaries. */
function fitToByteBudget(text: string, maxBytes: number): string {
  if (maxBytes <= 0) return ''
  if (byteLength(text) <= maxBytes) return text

  const lines = text.split('\n')
  while (lines.length > 1) {
    lines.pop()
    const candidate = lines.join('\n')
    if (byteLength(candidate) <= maxBytes) return candidate
  }

  let sliced = lines[0] ?? ''
  while (sliced.length > 0 && byteLength(sliced) > maxBytes) {
    sliced = sliced.slice(0, -Math.max(1, Math.ceil((byteLength(sliced) - maxBytes) / 4)))
  }
  return sliced
}

/** Natural-language style steering for Gemini-TTS (input.prompt). See Cloud TTS Gemini docs. */
export function buildGeminiTtsPrompt(params: {
  audioType?: GeminiTtsAudioType
  voicePrompt?: string
  deliveryCues?: string[]
  /** Runtime scene wrapper from `buildSceneDirection`. */
  sceneDirection?: string
  /** 0 = full prompt; 1 = drop scene direction and cues; 2 = prosody + guard only (policy retry simplification). */
  promptLevel?: GeminiTtsPromptLevel
}): string {
  const audioType = params.audioType ?? 'narration'
  const deliveryCues = params.deliveryCues ?? []
  const promptLevel = params.promptLevel ?? 0

  const profileSource =
    params.voicePrompt?.trim() ||
    (audioType === 'narration' ? DEFAULT_BLUEPRINT_NARRATION_NOTES : '')

  // The guard is never negotiable: without it the model reads directions aloud.
  const guardBudget = byteLength(GUARD) + 4

  if (promptLevel <= 1 && isStructuredSystemInstruction(profileSource)) {
    let sceneDirection = ''
    if (promptLevel === 0) {
      sceneDirection =
        params.sceneDirection?.trim() ||
        (deliveryCues.length > 0
          ? `SCENE DIRECTION: Delivery cues: ${deliveryCues.join('; ')}.`
          : '')
    }

    // Scene direction yields before the persona; the persona is the identity.
    if (byteLength(profileSource) + byteLength(sceneDirection) + guardBudget >
      GEMINI_TTS_MAX_PROMPT_BYTES) {
      sceneDirection = ''
    }

    const personaBudget =
      GEMINI_TTS_MAX_PROMPT_BYTES - guardBudget - byteLength(sceneDirection)
    const persona = fitToByteBudget(profileSource, personaBudget)

    return [persona, sceneDirection, GUARD].filter((b) => b.length > 0).join('\n\n')
  }

  const acting =
    promptLevel === 0 && deliveryCues.length > 0
      ? ` Acting direction for this performance: ${deliveryCues.join('; ')}.`
      : ''

  const profileBudget =
    GEMINI_TTS_MAX_PROMPT_BYTES - guardBudget - byteLength(PROSODY) - byteLength(acting) - 160
  const profileText =
    promptLevel <= 1 && profileSource ? fitToByteBudget(profileSource, profileBudget) : ''

  const profile = profileText
    ? audioType === 'dialogue'
      ? ` IMPORTANT: Maintain this exact vocal character—timbre, age, accent, and manner—throughout the entire spoken line. Character voice profile (style only, not spoken as dialogue): ${profileText}.`
      : ` Voice profile—apply as delivery style without narrating this sentence verbatim: ${profileText}.`
    : ''

  return `${PROSODY}${acting}${profile} ${GUARD}`.trim()
}
