/**
 * Structured System Instruction for Gemini-TTS.
 *
 * Google documents `input.prompt` as a system instruction ("AI Studio calls
 * this Style Instructions"), so it wants directives, not a prose character
 * sketch. A paragraph of adjectives leaves cadence, inflection, and affect
 * unspecified and the model fills the gaps differently on every take.
 *
 * Static traits — timbre, age, accent, standing demeanour — belong in the
 * persistent instruction below. Per-line state (urgency, recipient, emotional
 * suppression) belongs in the runtime scene wrapper so the persona stays
 * byte-identical across a character's whole dialogue tree.
 *
 * @see https://cloud.google.com/text-to-speech/docs/reference/rest/v1beta1/SynthesisInput
 */

export type CharacterPersona = {
  name?: string
  /** Occupation or standing, e.g. "Senior Director of Corporate Risk". */
  role?: string
  /** Age phrase, e.g. "late 50s". */
  age?: string
  gender?: string
  ethnicity?: string
  /** Voice body, e.g. "authoritative, clinical baritone". */
  timbre?: string
  /** Articulation, e.g. "dry, crisp diction". */
  diction?: string
  /** e.g. "General American". */
  accent?: string
  /** Pace phrase, e.g. "slow, impeccably measured, completely unhurried". */
  cadence?: string
  /** Words per minute. Derived from `cadence` when omitted. */
  wpm?: number
  /** Standing affect, e.g. "absolute bureaucratic detachment". */
  emotionalState?: string
  /** Pitch contour rules, e.g. "flat, declarative; no up-speak". */
  inflection?: string
  /** How the character colours the material overall. */
  tone?: string
}

export type SceneDeliveryState = {
  /** e.g. "high", "none — the room is calm". */
  urgency?: string
  /** Emotional state for this line only. */
  emotion?: string
  /** Who the line is addressed to. */
  recipient?: string
  /** Where the line is spoken. */
  location?: string
  /** Per-line acting cues, typically lifted from bracketed script directions. */
  cues?: string[]
}

/**
 * Pace phrase to words per minute. Conversational English sits near 150 WPM;
 * the bands below bracket it so "deliberate" and "urgent" land on real numbers
 * the model can hold rather than an adjective it has to guess at.
 */
const PACE_WPM: Array<[RegExp, number]> = [
  [/\b(?:glacial|halting|very\s+slow|painstaking)\b/, 95],
  [/\b(?:slow|deliberate|unhurried|languid|drawn[-\s]?out|ponderous)\b/, 110],
  [/\b(?:measured|controlled|considered|even|steady|clipped)\b/, 130],
  [/\b(?:conversational|natural|relaxed|easy|casual)\b/, 150],
  [/\b(?:brisk|quick|lively|animated|energetic|eager)\b/, 170],
  [/\b(?:rapid|fast|breakneck|frantic|urgent|breathless)\b/, 185],
]

const DEFAULT_WPM = 145

export function wpmForPace(pace?: string): number {
  const text = pace?.toLowerCase().trim()
  if (!text) return DEFAULT_WPM
  for (const [pattern, wpm] of PACE_WPM) {
    if (pattern.test(text)) return wpm
  }
  return DEFAULT_WPM
}

function cadencePhraseForWpm(wpm: number): string {
  if (wpm <= 100) return 'Very slow and halting'
  if (wpm <= 115) return 'Slow, deliberate, and unhurried'
  if (wpm <= 135) return 'Measured and controlled'
  if (wpm <= 155) return 'Natural conversational pace'
  if (wpm <= 175) return 'Brisk and forward-moving'
  return 'Rapid and pressed'
}

function sentence(text?: string): string {
  const trimmed = text?.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

function joinClause(parts: Array<string | undefined>): string {
  return parts.filter((p): p is string => !!p?.trim()).join(' ')
}

const DEFAULT_EMOTIONAL_STATE =
  'Even and self-possessed. Let the words carry the meaning rather than added performance'
const DEFAULT_INFLECTION =
  'Natural declarative phrasing. Resolve statements with downward pitch; reserve rising pitch for genuine questions and never lift pitch at phrase ends (no up-speak)'
const DEFAULT_TONE =
  'Match the emotional weight of the text without amplifying it'

/**
 * Gemini-TTS ignores `temperature`, `top_k`, and `top_p`, so run-to-run
 * stability has to be asked for in the instruction itself.
 *
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */
const CONSISTENCY_RULE =
  'Hold this vocal identity constant across every take — same pitch floor, same tempo, same intensity. Do not improvise, embellish, or overact.'

export function buildCharacterSystemInstruction(persona: CharacterPersona): string {
  const lines: string[] = []

  const roleParts = [persona.name?.trim(), persona.role?.trim()].filter(
    (p): p is string => !!p,
  )
  lines.push(`ROLE: ${sentence(roleParts.join(', ') || 'Unnamed speaker')}`)

  const identity = sentence(
    joinClause([persona.age?.trim(), persona.ethnicity?.trim(), persona.gender?.trim()]) ||
      undefined,
  )
  const body = persona.diction?.trim()
    ? sentence(`${persona.timbre?.trim() || 'Neutral voice'} with ${persona.diction.trim()}`)
    : sentence(persona.timbre)
  const accent = persona.accent?.trim() ? sentence(`${persona.accent.trim()} accent`) : ''
  const vocalProfile = joinClause([identity, body, accent])
  lines.push(`AGE & VOCAL PROFILE: ${vocalProfile || 'Not specified.'}`)

  const wpm = persona.wpm ?? wpmForPace(persona.cadence)
  const cadenceText = persona.cadence?.trim()
    ? sentence(persona.cadence).replace(/\.$/, '')
    : cadencePhraseForWpm(wpm)

  lines.push('DELIVERY RULES:')
  lines.push(`- Cadence: ${cadenceText} (~${wpm}-${wpm + 10} WPM).`)
  lines.push(`- Emotional State: ${sentence(persona.emotionalState || DEFAULT_EMOTIONAL_STATE)}`)
  lines.push(`- Inflection: ${sentence(persona.inflection || DEFAULT_INFLECTION)}`)
  lines.push(`- Tone: ${sentence(persona.tone || DEFAULT_TONE)}`)
  lines.push(`- Consistency: ${CONSISTENCY_RULE}`)

  return lines.join('\n')
}

/** True for instructions produced by `buildCharacterSystemInstruction`. */
export function isStructuredSystemInstruction(text?: string): boolean {
  if (!text?.trim()) return false
  return /(?:^|\n)\s*DELIVERY RULES:/.test(text) || /^\s*ROLE:/.test(text)
}

/**
 * Runtime wrapper for the dynamic half of the performance. Returns an empty
 * string when the scene supplies no state, so the persona is sent unchanged.
 */
export function buildSceneDirection(state?: SceneDeliveryState): string {
  if (!state) return ''

  const parts: string[] = []
  if (state.recipient?.trim()) parts.push(`Addressing ${state.recipient.trim()}`)
  if (state.location?.trim()) parts.push(`Location: ${state.location.trim()}`)
  if (state.urgency?.trim()) parts.push(`Urgency: ${state.urgency.trim()}`)
  if (state.emotion?.trim()) parts.push(`Emotional state for this line: ${state.emotion.trim()}`)

  const cues = (state.cues ?? [])
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
  if (cues.length > 0) parts.push(`Delivery cues: ${cues.join('; ')}`)

  if (parts.length === 0) return ''
  return `SCENE DIRECTION: ${parts.map((p) => sentence(p)).join(' ')}`
}

/**
 * Build a persona from the structured vocal attributes that character voice
 * analysis already returns, so callers do not have to map fields by hand.
 */
export function personaFromVocalAttributes(input: {
  name?: string
  role?: string
  age?: string
  gender?: string
  ethnicity?: string
  vocalAttributes?: {
    timbre?: string
    pitch?: string
    pace?: string
    authority?: string
    warmth?: string
    accent?: string
    register?: string
    vocalWeight?: string
    wpm?: number
    inflection?: string
    emotionalDefault?: string
  }
  personality?: string
}): CharacterPersona {
  const attrs = input.vocalAttributes ?? {}

  const timbre = joinClause([
    attrs.timbre?.trim(),
    attrs.pitch?.trim() ? `pitched in the ${attrs.pitch.trim()} range` : undefined,
  ])

  return {
    name: input.name,
    role: input.role,
    age: input.age,
    gender: input.gender,
    ethnicity: input.ethnicity,
    timbre: timbre || undefined,
    accent: attrs.accent,
    cadence: attrs.pace,
    wpm: attrs.wpm,
    emotionalState:
      attrs.emotionalDefault?.trim() ||
      [attrs.warmth?.trim(), attrs.authority?.trim()].filter(Boolean).join(', ') ||
      undefined,
    inflection: attrs.inflection,
    tone: input.personality,
  }
}
