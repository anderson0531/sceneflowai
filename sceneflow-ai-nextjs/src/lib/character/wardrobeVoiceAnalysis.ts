import type { CharacterWardrobe } from '@/types/vision'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import { normalizeGender } from '@/lib/voiceRecommendation'

export type WardrobeVoiceGender = 'male' | 'female'

export interface VocalAttributes {
  timbre?: string
  pitch?: string
  pace?: string
  authority?: string
  warmth?: string
  accent?: string
  /** Perceived pitch band within the speaker's gender range; drives base-voice selection. */
  register?: string
  /** Perceived heft of the voice, independent of pitch. */
  vocalWeight?: string
  /** Words per minute, so cadence reaches the model as a number it can hold. */
  wpm?: number
  /** Pitch-contour rule, e.g. flat declarative with downward resolution. */
  inflection?: string
  /** Standing emotional state when no scene direction overrides it. */
  emotionalDefault?: string
}

export interface WardrobeVoiceCharacterInput {
  wardrobes?: CharacterWardrobe[]
  defaultWardrobe?: string
  wardrobeAccessories?: string
}

export interface WardrobeVoiceAnalysisResult {
  gender: WardrobeVoiceGender
  apparentAge: string
  ethnicity?: string
  voiceDescription: string
  audioProfile: string
  vocalAttributes?: VocalAttributes
  confidence: 'vision' | 'narrative'
}

/** Resolve wardrobes list including legacy defaultWardrobe synthesis. */
export function resolveCharacterWardrobes(
  character: WardrobeVoiceCharacterInput,
): CharacterWardrobe[] {
  if (character.wardrobes && character.wardrobes.length > 0) {
    return character.wardrobes
  }
  if (character.defaultWardrobe?.trim()) {
    return [
      {
        id: 'legacy-wardrobe',
        name: 'Default Outfit',
        description: character.defaultWardrobe,
        accessories: character.wardrobeAccessories,
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ]
  }
  return []
}

/** Default wardrobe used for voice analysis (isDefault flag, else first with fullBodyUrl). */
export function getDefaultWardrobeForVoice(
  character: WardrobeVoiceCharacterInput,
): CharacterWardrobe | null {
  const wardrobes = resolveCharacterWardrobes(character)
  if (wardrobes.length === 0) return null

  const explicitDefault = wardrobes.find((w) => w.isDefault)
  if (explicitDefault) return explicitDefault

  const withTurnaround = wardrobes.find((w) => getWardrobeVoiceImageUrl(w))
  return withTurnaround ?? wardrobes[0] ?? null
}

/** Voice analysis requires the 2-row turnaround sheet URL. */
export function getWardrobeVoiceImageUrl(wardrobe: CharacterWardrobe | null | undefined): string | null {
  const url = wardrobe?.fullBodyUrl?.trim()
  return url && url.startsWith('http') ? url : null
}

export function getWardrobeVoiceImageForCharacter(
  character: WardrobeVoiceCharacterInput,
): { wardrobe: CharacterWardrobe; imageUrl: string } | null {
  const wardrobe = getDefaultWardrobeForVoice(character)
  if (!wardrobe) return null
  const imageUrl = getWardrobeVoiceImageUrl(wardrobe)
  if (!imageUrl) return null
  return { wardrobe, imageUrl }
}

export function formatVocalAttributesForDescription(attrs: VocalAttributes): string {
  const parts: string[] = []
  if (attrs.register?.trim()) parts.push(`${attrs.register.trim()} register`)
  if (attrs.vocalWeight?.trim()) parts.push(`${attrs.vocalWeight.trim()} vocal weight`)
  if (attrs.timbre?.trim()) parts.push(`${attrs.timbre.trim()} timbre`)
  if (attrs.pitch?.trim()) parts.push(`${attrs.pitch.trim()} pitch`)
  if (attrs.pace?.trim()) parts.push(`${attrs.pace.trim()} pace`)
  if (attrs.authority?.trim()) parts.push(`${attrs.authority.trim()} authority`)
  if (attrs.warmth?.trim()) parts.push(`${attrs.warmth.trim()} warmth`)
  if (attrs.accent?.trim()) parts.push(`${attrs.accent.trim()} accent`)
  return parts.join(', ')
}

export function buildWardrobeVoiceAnalysisPrompt(
  characterName: string,
  options?: {
    screenplayContext?: ScreenplayContext
    characterDescription?: string
    characterRole?: string
    personality?: string
    hasPortrait?: boolean
  },
): string {
  const screenplay = options?.screenplayContext
  const screenplayLines: string[] = []
  if (screenplay?.genre) screenplayLines.push(`Genre: ${screenplay.genre}`)
  if (screenplay?.tone) screenplayLines.push(`Tone: ${screenplay.tone}`)
  if (screenplay?.setting) screenplayLines.push(`Setting: ${screenplay.setting}`)
  if (screenplay?.title) screenplayLines.push(`Project: ${screenplay.title}`)

  const hasPortrait = options?.hasPortrait === true
  const narrativeLines: string[] = []
  if (options?.characterRole?.trim()) {
    narrativeLines.push(`Role in story: ${options.characterRole.trim()}`)
  }
  if (options?.personality?.trim()) {
    narrativeLines.push(`Personality / key traits: ${options.personality.trim()}`)
  }
  if (options?.characterDescription?.trim()) {
    narrativeLines.push(`Story role / personality: ${options.characterDescription.trim()}`)
  }

  const portraitBlock = hasPortrait
    ? `PORTRAIT REFERENCE:
An attached character portrait is provided. Use it to refine gender, apparent age, ethnicity, and vocal timbre — but the narrative profile above is the PRIMARY casting signal. Reconcile portrait cues with the character's role and personality; if they conflict, favor the narrative unless the portrait clearly contradicts gender. Do not describe clothing, hair, or body in the output.`
    : `NO PORTRAIT:
No reference image is attached. Derive the voice profile from role, personality, and production context below.`

  return `You are an expert voice casting director for film, television, and documentary narration.

CHARACTER: ${characterName}

${narrativeLines.length > 0 ? `CHARACTER NARRATIVE (PRIMARY — cast from this first):\n${narrativeLines.join('\n')}` : 'CHARACTER NARRATIVE: Limited — infer voice from name and production context.'}

${screenplayLines.length > 0 ? `\nPRODUCTION CONTEXT:\n${screenplayLines.join('\n')}` : ''}

${portraitBlock}

CASTING GUIDANCE:
- Academic, intellectual, professor, historian, narrator, guide → measured pace, controlled resonance, articulate diction, quiet authority, conviction, lower-mid pitch
- Corporate executive, attorney, judge, military → authoritative, crisp, confident, polished
- Warm mentor, caregiver, empathetic lead → warm, gentle, reassuring timbre
- Youthful protagonist, sidekick, comedic relief → brighter, energetic, approachable
- Veteran, elder, grizzled investigator → gravelly, deep, seasoned, mature timbre

TASK:
Synthesize how this character should sound in Gemini TTS. Return a single JSON object.

REQUIREMENTS:
1. "gender" — exactly "male" or "female" from narrative and${hasPortrait ? ' portrait' : ''} cues.
2. "apparentAge" — short phrase (e.g. "late 40s", "early 60s", "mid 20s").
3. "ethnicity" — optional, brief accent/cultural hint if inferable.
4. "vocalAttributes" — the acoustic parameters. These select the base voice, so be literal, not evocative:
   - "register" — EXACTLY one of: low, low-mid, mid, mid-high, high. Perceived pitch band within this character's own gender range.
   - "vocalWeight" — EXACTLY one of: light, medium, heavy. Heft and body, independent of pitch.
   - "timbre" (e.g. resonant baritone, bright tenor, warm alto)
   - "pitch" (e.g. low, mid, high)
   - "pace" (e.g. measured, brisk, deliberate)
   - "wpm" — integer words per minute, 95–190. Deliberate ≈ 110, measured ≈ 130, conversational ≈ 150, brisk ≈ 170.
   - "inflection" — pitch-contour rule, e.g. "flat and declarative; resolve sentences downward, no up-speak".
   - "emotionalDefault" — standing affect when no scene direction applies, e.g. "clinical detachment".
   - "authority" (e.g. quiet authority, commanding, approachable)
   - "warmth" (e.g. warm, neutral, cool)
   - "accent" (e.g. neutral American, British RP) — optional
5. "voiceDescription" — 200–600 characters MATCHING BRIEF for catalog scoring only. Archetype vocabulary: authoritative, intellectual, measured, resonant, articulate, quiet authority, conviction, corporate, warm, gravelly, crisp, professional, confident, steady, polished, engaging, deep, bright, gentle, energetic. Role and personality only — no clothing, hair, body, plot, or dialogue.
6. "audioProfile" — 4–5 sentences, Director's Note for Gemini TTS. Vocal style only: timbre, pitch, cadence, accent, texture, emotional delivery. Do NOT write dialogue. Do NOT mention appearance, wardrobe, or plot.

OUTPUT: Return ONLY valid JSON, no markdown:
{
  "gender": "male",
  "apparentAge": "late 50s",
  "ethnicity": "optional string",
  "vocalAttributes": {
    "register": "low-mid",
    "vocalWeight": "heavy",
    "timbre": "resonant baritone",
    "pitch": "low-mid",
    "pace": "deliberate and controlled",
    "wpm": 115,
    "inflection": "flat and declarative; resolve sentences downward, no up-speak",
    "emotionalDefault": "calm, composed detachment",
    "authority": "quiet authority",
    "warmth": "cool",
    "accent": "neutral American"
  },
  "voiceDescription": "casting brief paragraph",
  "audioProfile": "Director's Note paragraph"
}`
}

const REGISTER_VALUES = ['low', 'low-mid', 'mid', 'mid-high', 'high'] as const
const WEIGHT_VALUES = ['light', 'medium', 'heavy'] as const

/** Accept only the documented enum values so scoring never sees improvised bands. */
function parseEnum<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
  return allowed.find((option) => option === value)
}

function parseVocalAttributes(raw: unknown): VocalAttributes | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const attrs: VocalAttributes = {}

  const textKeys = [
    'timbre',
    'pitch',
    'pace',
    'authority',
    'warmth',
    'accent',
    'inflection',
    'emotionalDefault',
  ] as const
  for (const key of textKeys) {
    const val = String(obj[key] ?? '').trim()
    if (val) attrs[key] = val.slice(0, 160)
  }

  const register = parseEnum(obj.register, REGISTER_VALUES)
  if (register) attrs.register = register

  const vocalWeight = parseEnum(obj.vocalWeight, WEIGHT_VALUES)
  if (vocalWeight) attrs.vocalWeight = vocalWeight

  const wpm = Number(obj.wpm)
  if (Number.isFinite(wpm) && wpm >= 80 && wpm <= 220) {
    attrs.wpm = Math.round(wpm)
  }

  return Object.keys(attrs).length > 0 ? attrs : undefined
}

export function enrichVoiceDescriptionWithAttributes(
  voiceDescription: string,
  vocalAttributes?: VocalAttributes,
): string {
  if (!vocalAttributes) return voiceDescription
  const attrText = formatVocalAttributesForDescription(vocalAttributes)
  if (!attrText) return voiceDescription
  const base = voiceDescription.trim()
  if (base.toLowerCase().includes(attrText.toLowerCase().slice(0, 12))) return base
  return `${base} Vocal qualities: ${attrText}.`.slice(0, 900)
}

export function parseWardrobeVoiceAnalysisJson(
  raw: string,
  options?: { confidence?: 'vision' | 'narrative' },
): WardrobeVoiceAnalysisResult | null {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const gender = normalizeGender(String(parsed.gender ?? ''))
    if (gender !== 'male' && gender !== 'female') return null

    let voiceDescription = String(parsed.voiceDescription ?? '').trim()
    const audioProfile = String(parsed.audioProfile ?? '').trim()
    const vocalAttributes = parseVocalAttributes(parsed.vocalAttributes)

    voiceDescription = enrichVoiceDescriptionWithAttributes(voiceDescription, vocalAttributes)

    if (voiceDescription.length < 20 || audioProfile.length < 20) return null

    const apparentAge = String(parsed.apparentAge ?? '').trim() || 'adult'
    const ethnicity = String(parsed.ethnicity ?? '').trim() || undefined

    return {
      gender,
      apparentAge,
      ethnicity,
      voiceDescription: voiceDescription.slice(0, 900),
      audioProfile: audioProfile.slice(0, 1200),
      vocalAttributes,
      confidence: options?.confidence ?? 'vision',
    }
  } catch {
    return null
  }
}
