import type { CharacterWardrobe } from '@/types/vision'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import { normalizeGender } from '@/lib/voiceRecommendation'

export type WardrobeVoiceGender = 'male' | 'female'

export interface VocalAttributes {
  timbre?: string
  /** Vocal fold phonation & surface grain (e.g. subtle gravel, smoky rasp, airy breathiness, velvety chest warmth). */
  texture?: string
  /** Consonant attack & articulatory precision (e.g. crisp clipped consonants, relaxed conversational elision). */
  diction?: string
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
  /** Direct studio-acoustic Voice Design persona matched to the character portrait for Vertex VOICE_TYPE_PROMPTED. */
  voiceDesignPrompt?: string
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

/** Wardrobe used for voice analysis (first look with an image URL, else first look). */
export function getDefaultWardrobeForVoice(
  character: WardrobeVoiceCharacterInput,
): CharacterWardrobe | null {
  const wardrobes = resolveCharacterWardrobes(character)
  if (wardrobes.length === 0) return null

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
  if (
    attrs.texture?.trim() &&
    !attrs.timbre?.toLowerCase().includes(attrs.texture.trim().toLowerCase())
  ) {
    parts.push(`${attrs.texture.trim()} texture`)
  }
  if (attrs.diction?.trim()) parts.push(attrs.diction.trim())
  if (attrs.pitch?.trim()) parts.push(`${attrs.pitch.trim()} pitch`)
  if (attrs.pace?.trim()) parts.push(`${attrs.pace.trim()} pace`)
  if (attrs.authority?.trim()) parts.push(`${attrs.authority.trim()} authority`)
  if (attrs.warmth?.trim() && !/^neutral$/i.test(attrs.warmth.trim())) {
    parts.push(`${attrs.warmth.trim()} warmth`)
  }
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
    appearanceDescription?: string
    existingCastingBrief?: string
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

  const appearance = options?.appearanceDescription?.trim()
  const appearanceBlock = appearance
    ? `\nPHYSICAL IDENTITY (from Body Description — use this for age, ethnicity, build, face, and hair cues):\n${appearance}\n`
    : ''

  const existingBrief = options?.existingCastingBrief?.trim()
  const existingBriefBlock = existingBrief
    ? `\nEXISTING CASTING BRIEF (preserve explicit director vocal intent such as regional accent or specific vocal character, but replace any generic announcer stereotypes with physical specificity from the portrait and appearance):\n${existingBrief}\n`
    : ''

  const portraitBlock = hasPortrait
    ? `PORTRAIT REFERENCE (MULTIMODAL VOCAL PHYSIOLOGY ANCHOR — match the voice directly to this visible person like Veo / Gemini Omni):
An attached character reference image is provided. Inspect the visible person closely so the voice unmistakably belongs to this exact human being on screen:
1. Craniofacial & Vocal Tract Resonance: Read jaw width, cheekbone/nasal structure, neck thickness, and chest/shoulder frame to infer vocal tract length, deep chest vs. forward oral/mask placement, physical "vocalWeight", and "register".
2. Exact Age & Vocal Fold Physiology: Read skin texture, eye lines, vitality, and posture to pinpoint half-decade age (e.g. "early 20s", "mid 30s", "late 50s", "early 70s") and age-authentic vocal fold texture (youthful taut clarity, settled midlife warmth, lived-in grain, weathered gravel, dry smoky rasp, subtle breathy air, or reediness).
3. Resting Tension & Micro-Articulation: Read jaw tension, gaze, and demeanor to infer "texture" and "diction" (crisp clipped consonants vs. relaxed conversational elision, working-class directness vs. cultivated precision).
4. Cultural, Regional & Sociolect Specificity: Combine visible heritage cues, character name, ethnicity, and production setting to infer an authentic regional, cultural, or class-grounded accent/cadence. Do NOT default everyone to "neutral American" when regional or international specificity fits.
Reconcile portrait cues with narrative role; if narrative and portrait conflict on gender, favor explicit narrative gender unless the portrait clearly shows otherwise. If the image is a multi-panel reference sheet, read the portrait head and physical build while ignoring outfits. Do not describe clothing or wardrobe.`
    : `NO PORTRAIT:
No reference image is attached. Derive the physical voice profile from role, physical identity, name, ethnicity, and production context below.`

  return `You are an expert multimodal film voice casting director and acoustic vocal physiologist for cinema, television, and documentary production.

CHARACTER: ${characterName}

${narrativeLines.length > 0 ? `CHARACTER NARRATIVE (PRIMARY — role & persona context):\n${narrativeLines.join('\n')}` : 'CHARACTER NARRATIVE: Limited — infer voice from portrait, physical identity, name, and production context.'}
${appearanceBlock}${existingBriefBlock}${screenplayLines.length > 0 ? `\nPRODUCTION CONTEXT:\n${screenplayLines.join('\n')}` : ''}

${portraitBlock}

ANTI-GENERIC CASTING RULES (CRITICAL):
- Avoid smooth, interchangeable "AI radio announcer" or corporate narrator voices unless the character is literally a professional broadcaster or narrator.
- NEVER default every man to "resonant baritone" + "measured pace" + "quiet authority" or every woman to "warm alto" + "measured pace".
- Differentiate real human voices through physical anatomy and vocal fold texture: e.g. gritty bass-baritone, nasal-bright lyric tenor, reedy quick-talking baritone, booming chesty bass, smoky husky contralto, airy intimate mezzo-soprano, crisp bright soprano, dry weathered alto, subtle vocal fry, breathy trail, or gravelled edge.
- Never set "warmth" to the bland word "neutral" when a real tonal color applies (use e.g. "warm and earthy", "dry and understated", "cool and flinty", "bright and open", "velvety").

TASK:
Synthesize how this exact person sounds in Gemini Voice Design & TTS. Return a single JSON object.

REQUIREMENTS:
1. "gender" — exactly "male" or "female" from narrative and${hasPortrait ? ' portrait' : ''} cues.
2. "apparentAge" — exact half-decade or age band (e.g. "early 20s", "mid 30s", "late 40s", "early 60s", "mid 70s").
3. "ethnicity" — brief heritage / regional cultural cue if inferable.
4. "vocalAttributes" — concrete physical acoustic parameters matched to this individual:
   - "register" — EXACTLY one of: low, low-mid, mid, mid-high, high (within this character's gender range).
   - "vocalWeight" — EXACTLY one of: light, medium, heavy (physical chest/vocal-tract heft, independent of pitch).
   - "timbre" — specific voice body & placement (e.g. "chest-heavy bass-baritone", "bright forward lyric tenor", "smoky contralto", "clear agile mezzo-soprano", "dry reedy baritone").
   - "texture" — vocal fold surface grain & phonation (e.g. "subtle weathered gravel", "velvety chest resonance", "light breathy edge", "dry smoky rasp", "crisp clean ring").
   - "diction" — consonant & phrasing articulation (e.g. "crisp clipped consonants", "relaxed conversational elision", "unpolished working-class cadence", "deliberate articulate phrasing").
   - "pitch" — short pitch placement phrase (e.g. "deep low", "grounded low-mid", "conversational mid", "bright mid-high").
   - "pace" — natural speaking rhythm (e.g. "unhurried and deliberate", "natural conversational", "brisk and agile", "clipped and economical").
   - "wpm" — integer words per minute, 95–190. Deliberate ≈ 110, measured ≈ 130, conversational ≈ 150, brisk ≈ 170.
   - "inflection" — pitch-contour rule, e.g. "grounded declarative contour resolving downward" or "lively conversational melody with quick emphasis".
   - "emotionalDefault" — standing baseline demeanor when speaking normally (no extreme safety-trigger emotions).
   - "authority" — social vocal presence (e.g. "grounded working-class directness", "easy approachable candor", "weathered command", "guarded restraint").
   - "warmth" — tonal color (e.g. "warm and earthy", "dry and understated", "cool and flinty", "bright and open").
   - "accent" — specific regional, sociolect, or international accent (e.g. "working-class Rust Belt American", "soft Southern Piedmont American", "cultivated London British", "East Coast urban American", "General American").
   - "voiceDesignPrompt" — 1–2 concise studio-acoustic sentences (120–260 characters) written directly for Vertex Gemini Voice Design (VOICE_TYPE_PROMPTED). Start with age decade + "man" or "woman" (NEVER include character names or story labels like "protagonist", "supporting", "antagonist"), then specify physical vocal weight/resonance, timbre, vocal fold texture, specific accent, speaking pace, and diction so the synthesized voice matches the face in the portrait.
5. "voiceDescription" — 200–600 characters CASTING BRIEF. Combine standing physical identity (age, ethnicity, build, face, hair) with role, demeanor, vocal texture, cadence, and accent. This is the matching brief and the Gemini voice profile. Do NOT mention clothing, wardrobe, plot, or dialogue.
6. "audioProfile" — 4–5 sentences, Director's Note for Gemini TTS. Vocal style only: timbre, vocal tract resonance, texture, pitch, cadence, diction, accent, and baseline delivery. Do NOT write dialogue. Do NOT mention clothing, wardrobe, or plot.

OUTPUT: Return ONLY valid JSON, no markdown:
{
  "gender": "male | female",
  "apparentAge": "<exact age band, e.g. mid 20s | early 40s | late 60s>",
  "ethnicity": "<optional cultural/regional cue>",
  "vocalAttributes": {
    "register": "<low | low-mid | mid | mid-high | high>",
    "vocalWeight": "<light | medium | heavy>",
    "timbre": "<specific non-generic timbre matched to face & build>",
    "texture": "<specific vocal fold phonation texture>",
    "diction": "<specific consonant & phrasing articulation>",
    "pitch": "<pitch placement>",
    "pace": "<speaking rhythm>",
    "wpm": 145,
    "inflection": "<pitch-contour rule>",
    "emotionalDefault": "<standing baseline affect>",
    "authority": "<social vocal presence>",
    "warmth": "<specific tonal color>",
    "accent": "<specific regional, cultural, or General accent>",
    "voiceDesignPrompt": "<1-2 sentence pure studio-acoustic Voice Design prompt with age, man/woman, resonance, timbre, texture, accent, pace, and diction — no names or story-role nouns>"
  },
  "voiceDescription": "<200-600 char casting brief combining physical identity + vocal profile>",
  "audioProfile": "<4-5 sentence vocal-only Director's Note>"
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
    'texture',
    'diction',
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

  const voiceDesignPrompt = String(obj.voiceDesignPrompt ?? '').trim()
  if (voiceDesignPrompt.length >= 20) {
    attrs.voiceDesignPrompt = voiceDesignPrompt.slice(0, 320)
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
