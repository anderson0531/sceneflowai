/**
 * Split a character into the Auto Voice pieces: identity (catalog filter),
 * acoustic target (base-voice selection), matching brief (fallback scoring),
 * and the system instruction sent to Gemini TTS.
 *
 * Appearance, wardrobe, and plot must not reach Gemini TTS.
 */

import {
  buildCharacterSystemInstruction,
  personaFromVocalAttributes,
} from '@/lib/tts/characterSystemInstruction'
import { parseAcousticTarget, type AcousticTarget } from '@/lib/tts/voiceAcoustics'
import type { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import type {
  VocalAttributes,
  WardrobeVoiceAnalysisResult,
} from '@/lib/character/wardrobeVoiceAnalysis'

export type CharacterVoiceIdentity = {
  gender?: string
  age?: string
  ethnicity?: string
}

export type CharacterVoiceProfile = {
  identity: CharacterVoiceIdentity
  matchingBrief: string
  directorNotes: string
  /** Structured ROLE / AGE & VOCAL PROFILE / DELIVERY RULES block for input.prompt. */
  systemInstruction: string
  /** Physical parameters used to pick the base voice. */
  acousticTarget: AcousticTarget
  vocalAttributes?: VocalAttributes
}

export type NarrativeVoiceInputs = {
  role?: string
  personality?: string
  matchingBrief?: string
  /** Story role/personality only — never appearance or wardrobe. */
  narrative?: string
}

const VOCAL_ONLY_RULES = `
REQUIREMENTS:
1. Write ONLY vocal style. Do NOT write a monologue, sample line, or script for the character to say.
2. Do NOT mention clothing, wardrobe, hair, makeup, body shape, face, eyes, plot beats, or backstory events.
3. "register" and "vocalWeight" pick the physical base voice, so use ONLY the listed enum values.
4. Every other field is one short phrase. No sentences longer than about 20 words.
5. Return ONLY a valid JSON object with exactly the keys shown below.

FIELDS:
- "register" — one of: low, low-mid, mid, mid-high, high. Perceived pitch band within this character's own gender range.
- "vocalWeight" — one of: light, medium, heavy. Heft and body, independent of pitch.
- "timbre" — voice body, e.g. "authoritative, clinical baritone".
- "accent" — e.g. "General American", "British RP".
- "cadence" — pace phrase, e.g. "slow, impeccably measured, completely unhurried".
- "wpm" — integer 95-190. Deliberate ~110, measured ~130, conversational ~150, brisk ~170.
- "emotionalState" — standing affect, plus what NOT to express.
- "inflection" — pitch-contour rule, e.g. "flat and declarative; resolve downward, no up-speak".
- "tone" — how the character colours the material overall.
`

export function narrativeVoiceInputs(character: {
  role?: string
  keyFeature?: string
  personality?: string
  voiceDescription?: string
  description?: string
  appearanceDescription?: string
}): NarrativeVoiceInputs {
  const appearance = character.appearanceDescription?.trim()
  const description = character.description?.trim()
  const narrative =
    description && description !== appearance ? description : undefined

  return {
    role: character.role?.trim() || undefined,
    personality:
      character.personality?.trim() || character.keyFeature?.trim() || undefined,
    matchingBrief: character.voiceDescription?.trim() || undefined,
    narrative,
  }
}

export function characterVoiceProfileFromAnalysis(
  analysis: WardrobeVoiceAnalysisResult,
  context?: { name?: string; role?: string; personality?: string }
): CharacterVoiceProfile {
  const persona = personaFromVocalAttributes({
    name: context?.name,
    role: context?.role,
    age: analysis.apparentAge,
    gender: analysis.gender,
    ethnicity: analysis.ethnicity,
    vocalAttributes: analysis.vocalAttributes,
    personality: context?.personality,
  })

  return {
    identity: {
      gender: analysis.gender,
      age: analysis.apparentAge,
      ethnicity: analysis.ethnicity,
    },
    matchingBrief: analysis.voiceDescription.trim(),
    directorNotes: analysis.audioProfile.trim(),
    systemInstruction: buildCharacterSystemInstruction(persona),
    acousticTarget: parseAcousticTarget({
      gender: analysis.gender,
      apparentAge: analysis.apparentAge,
      vocalAttributes: analysis.vocalAttributes,
      brief: analysis.voiceDescription,
    }),
    vocalAttributes: analysis.vocalAttributes,
  }
}

/** CharacterContext for analysis / director-note APIs — no appearance dump. */
export function vocalCharacterContext(
  character: {
    name?: string
    gender?: string
    age?: string | number
    ethnicity?: string
    referenceImage?: string
  } & Parameters<typeof narrativeVoiceInputs>[0]
): CharacterContext {
  const narrative = narrativeVoiceInputs(character)
  return {
    name: character.name?.trim() || 'Unknown',
    role: narrative.role,
    gender: character.gender,
    age: character.age,
    ethnicity: character.ethnicity,
    personality: narrative.personality,
    voiceDescription: narrative.matchingBrief,
    description: narrative.narrative,
    referenceImage: character.referenceImage,
  }
}

export function buildDirectorNotePrompt(input: {
  characterContext: CharacterContext
  screenplayContext?: ScreenplayContext
  selectedInstructions?: string[]
  hasPortrait?: boolean
  wardrobeTurnaround?: boolean
}): string {
  const { characterContext: ctx, screenplayContext, selectedInstructions } = input
  const matchingBrief = ctx.voiceDescription?.trim()

  let prompt = `You are an expert Voice Director specifying a Gemini TTS performance.

Your output configures the base voice and the system instruction. It is style-only: the model will speak the dialogue text separately. Never write words for the character to say.

CHARACTER:
Name: ${ctx.name || 'Unknown'}
Role: ${ctx.role || 'Not specified'}
Age: ${ctx.age || 'Not specified'}
Gender: ${ctx.gender || 'Not specified'}
Ethnicity / accent cue: ${ctx.ethnicity || 'Not specified'}
Personality: ${ctx.personality || 'Not specified'}`

  if (matchingBrief) {
    prompt += `\nMatching brief (archetype keywords for the base voice): ${matchingBrief}`
  }

  if (input.wardrobeTurnaround) {
    prompt += `

WARDROBE TURNAROUND IMAGE:
A 2-row costume sheet is attached. Use ONLY the TOP ROW headshots to infer vocal age, gender, and demeanor. Ignore outfit and the bottom row.`
  } else if (input.hasPortrait) {
    prompt += `

REFERENCE IMAGE:
A portrait is attached. Infer vocal age, gender, and demeanor from the face only. Do not describe clothing or body.`
  }

  if (selectedInstructions?.length) {
    prompt += `

SELECTED VOICE TRAITS:
${selectedInstructions.map((i) => `- ${i}`).join('\n')}
Incorporate these traits as vocal qualities only.`
  }

  if (screenplayContext) {
    prompt += `

PRODUCTION CONTEXT:
Genre: ${screenplayContext.genre || 'Not specified'}
Tone: ${screenplayContext.tone || 'Not specified'}`
  }

  prompt += `\n${VOCAL_ONLY_RULES}
Example:
{
  "register": "low-mid",
  "vocalWeight": "heavy",
  "timbre": "warm, slightly husky baritone",
  "accent": "General American",
  "cadence": "measured and unhurried",
  "wpm": 130,
  "emotionalState": "thoughtful and forward-leaning; never theatrical or panicked",
  "inflection": "declarative phrasing that resolves downward; no up-speak",
  "tone": "quiet authority that treats hard news plainly"
}`

  return prompt
}

export type DirectorNoteResult = {
  /** Structured block ready for Gemini TTS `input.prompt`. */
  systemInstruction: string
  vocalAttributes: VocalAttributes
}

/**
 * Parse a Voice Director response into a system instruction. Returns null when
 * the model ignored the JSON contract, so callers can fall back to the raw
 * prose (which the prompt assembler still handles on its legacy path).
 */
export function parseDirectorNoteResponse(
  raw: string,
  context: {
    name?: string
    role?: string
    age?: string
    gender?: string
    ethnicity?: string
    personality?: string
  } = {}
): DirectorNoteResult | null {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
  } catch {
    return null
  }

  const str = (key: string): string | undefined => {
    const value = String(parsed[key] ?? '').trim()
    return value ? value.slice(0, 240) : undefined
  }

  const register = normalizeRegisterValue(parsed.register)
  const vocalWeight = normalizeWeightValue(parsed.vocalWeight)
  const timbre = str('timbre')
  if (!register && !vocalWeight && !timbre) return null

  const wpmRaw = Number(parsed.wpm)
  const wpm =
    Number.isFinite(wpmRaw) && wpmRaw >= 80 && wpmRaw <= 220 ? Math.round(wpmRaw) : undefined

  const vocalAttributes: VocalAttributes = {
    ...(register ? { register } : {}),
    ...(vocalWeight ? { vocalWeight } : {}),
    ...(timbre ? { timbre } : {}),
    ...(str('accent') ? { accent: str('accent') } : {}),
    ...(str('cadence') ? { pace: str('cadence') } : {}),
    ...(wpm ? { wpm } : {}),
    ...(str('emotionalState') ? { emotionalDefault: str('emotionalState') } : {}),
    ...(str('inflection') ? { inflection: str('inflection') } : {}),
  }

  const systemInstruction = buildCharacterSystemInstruction({
    name: context.name,
    role: context.role,
    age: context.age,
    gender: context.gender,
    ethnicity: context.ethnicity,
    timbre,
    accent: vocalAttributes.accent,
    cadence: vocalAttributes.pace,
    wpm,
    emotionalState: vocalAttributes.emotionalDefault,
    inflection: vocalAttributes.inflection,
    tone: str('tone') || context.personality,
  })

  return { systemInstruction, vocalAttributes }
}

function normalizeRegisterValue(raw: unknown): string | undefined {
  const value = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '-')
  return ['low', 'low-mid', 'mid', 'mid-high', 'high'].includes(value) ? value : undefined
}

function normalizeWeightValue(raw: unknown): string | undefined {
  const value = String(raw ?? '').trim().toLowerCase()
  return ['light', 'medium', 'heavy'].includes(value) ? value : undefined
}
