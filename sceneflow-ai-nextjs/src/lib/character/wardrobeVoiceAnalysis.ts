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
    narrativeLines.push(`Character description: ${options.characterDescription.trim()}`)
  }

  const portraitBlock = hasPortrait
    ? `PORTRAIT REFERENCE:
An attached character portrait is provided. Use it to refine gender, apparent age, ethnicity, and physical vocal timbre — but the narrative profile above is the PRIMARY casting signal. Reconcile portrait cues with the character's role and personality; if they conflict, favor the narrative unless the portrait clearly contradicts gender.`
    : `NO PORTRAIT:
No reference image is attached. Derive the full voice profile from the character narrative, role, personality, and production context below.`

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
4. "vocalAttributes" — object with short phrases:
   - "timbre" (e.g. resonant baritone, bright tenor, warm alto)
   - "pitch" (e.g. low, mid, high)
   - "pace" (e.g. measured, brisk, deliberate)
   - "authority" (e.g. quiet authority, commanding, approachable)
   - "warmth" (e.g. warm, neutral, cool)
   - "accent" (e.g. neutral American, British RP) — optional
5. "voiceDescription" — 200–600 characters for voice matching. Use archetype vocabulary: authoritative, intellectual, measured, resonant, articulate, quiet authority, conviction, corporate, warm, gravelly, crisp, professional, confident, steady, polished, engaging, deep, bright, gentle, energetic, etc. Reflect role and personality.
6. "audioProfile" — 4–5 sentences, Director's Note for Gemini TTS. Tone, pitch, cadence, texture, emotional delivery. Do NOT write dialogue.

OUTPUT: Return ONLY valid JSON, no markdown:
{
  "gender": "male",
  "apparentAge": "late 50s",
  "ethnicity": "optional string",
  "vocalAttributes": {
    "timbre": "resonant baritone",
    "pitch": "low-mid",
    "pace": "measured",
    "authority": "quiet authority",
    "warmth": "neutral",
    "accent": "neutral British"
  },
  "voiceDescription": "casting brief paragraph",
  "audioProfile": "Director's Note paragraph"
}`
}

function parseVocalAttributes(raw: unknown): VocalAttributes | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const attrs: VocalAttributes = {}
  const keys = ['timbre', 'pitch', 'pace', 'authority', 'warmth', 'accent'] as const
  for (const key of keys) {
    const val = String(obj[key] ?? '').trim()
    if (val) attrs[key] = val.slice(0, 80)
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
