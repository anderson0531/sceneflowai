/**
 * Split a character into the three Auto Voice pieces:
 * identity (catalog filter), matching brief (base-voice score), director notes (Gemini TTS).
 *
 * Appearance, wardrobe, and plot must not reach Gemini TTS.
 */

import type { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import type { WardrobeVoiceAnalysisResult } from '@/lib/character/wardrobeVoiceAnalysis'

export type CharacterVoiceIdentity = {
  gender?: string
  age?: string
  ethnicity?: string
}

export type CharacterVoiceProfile = {
  identity: CharacterVoiceIdentity
  matchingBrief: string
  directorNotes: string
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
3. Focus on timbre, pitch, cadence, accent, texture, and emotional delivery. Role and personality may shape delivery, not appearance.
4. Be concise (4-5 sentences max).
5. Return a valid JSON object with a single key "audio_profile".
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
  analysis: WardrobeVoiceAnalysisResult
): CharacterVoiceProfile {
  return {
    identity: {
      gender: analysis.gender,
      age: analysis.apparentAge,
      ethnicity: analysis.ethnicity,
    },
    matchingBrief: analysis.voiceDescription.trim(),
    directorNotes: analysis.audioProfile.trim(),
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

  let prompt = `You are an expert Voice Director writing a Director's Note for Gemini TTS.

This note is style-only. The model will speak the dialogue text separately. Never write words for the character to say.

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
  "audio_profile": "A late-40s male baritone, warm and slightly husky. Measured pacing with quiet authority. Neutral American accent. Delivery is thoughtful and forward-leaning, never theatrical."
}`

  return prompt
}
