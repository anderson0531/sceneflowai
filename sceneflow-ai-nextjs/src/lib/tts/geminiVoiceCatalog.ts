/**
 * Gemini-TTS base voices with acoustic metadata for selection and UI.
 *
 * Google publishes one authoritative character label per voice (Zephyr — Bright,
 * Algenib — Gravelly, ...). Those labels are the source of truth here; every
 * structured acoustic field is derived from the label through
 * `ACOUSTICS_BY_LABEL` so each value is auditable rather than invented prose.
 *
 * `register` and `vocalWeight` are perceived bands *within the voice's own
 * gender range*, not absolute pitch. Absolute values come from
 * `geminiVoiceAcoustics.measured.json`, written by
 * `npm run tts:calibrate-voices`, and overlay the label-derived defaults.
 *
 * @see https://ai.google.dev/gemini-api/docs/speech-generation (voice options)
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */

import measuredAcoustics from '@/lib/tts/geminiVoiceAcoustics.measured.json'
import type {
  VoiceRegisterBand,
  VoiceTextureBand,
  VoiceWeightBand,
} from '@/lib/tts/voiceAcousticWords'

export type GeminiVoiceGender = 'male' | 'female'
export type GeminiVoiceAgeBand = 'young' | 'middle' | 'mature'

/** Perceived pitch band relative to the voice's own gender range. */
export type GeminiVoiceRegister = VoiceRegisterBand

/** Perceived heft/body of the voice, independent of pitch. */
export type GeminiVoiceWeight = VoiceWeightBand

export type GeminiVoiceTexture = VoiceTextureBand

/** Only asserted where Google's own label asserts it; everything else is neutral. */
export type GeminiVoiceAgeAffinity = 'young' | 'neutral' | 'mature'

export interface GeminiVoiceAcoustics {
  register: GeminiVoiceRegister
  vocalWeight: GeminiVoiceWeight
  texture: GeminiVoiceTexture
  ageAffinity: GeminiVoiceAgeAffinity
}

export interface GeminiVoiceCatalogEntry extends GeminiVoiceAcoustics {
  id: string
  displayName: string
  gender: GeminiVoiceGender
  languageCode: string
  /** Google's published one-word character label. Source of truth. */
  officialLabel: string
  /** UI copy. Written to agree with `officialLabel`, never to contradict it. */
  archetypeDescription: string
  ageBand: GeminiVoiceAgeBand
  /** Measured median fundamental frequency, when calibration has been run. */
  medianF0Hz?: number
  /** Measured 10th-percentile F0 — the voice's practical pitch floor. */
  pitchFloorHz?: number
}

/**
 * Label to acoustics. This is the whole derivation: change a row here and every
 * voice carrying that label moves together, which keeps the catalog honest.
 *
 * `ageAffinity` is only non-neutral for the two labels where Google states an
 * age ("Mature", "Youthful"). Guessing it elsewhere is what made the previous
 * catalog apply large age penalties to voices it had mislabelled.
 */
const ACOUSTICS_BY_LABEL: Record<string, GeminiVoiceAcoustics> = {
  Bright: { register: 'mid-high', vocalWeight: 'light', texture: 'bright', ageAffinity: 'neutral' },
  Breathy: { register: 'low-mid', vocalWeight: 'light', texture: 'breathy', ageAffinity: 'neutral' },
  Breezy: { register: 'mid-high', vocalWeight: 'light', texture: 'smooth', ageAffinity: 'neutral' },
  Casual: { register: 'mid', vocalWeight: 'medium', texture: 'even', ageAffinity: 'neutral' },
  Clear: { register: 'mid', vocalWeight: 'medium', texture: 'clear', ageAffinity: 'neutral' },
  'Easy-going': { register: 'mid', vocalWeight: 'medium', texture: 'smooth', ageAffinity: 'neutral' },
  Even: { register: 'mid', vocalWeight: 'medium', texture: 'even', ageAffinity: 'neutral' },
  Excitable: { register: 'high', vocalWeight: 'light', texture: 'bright', ageAffinity: 'neutral' },
  Firm: { register: 'mid', vocalWeight: 'heavy', texture: 'even', ageAffinity: 'neutral' },
  Forward: { register: 'mid-high', vocalWeight: 'medium', texture: 'bright', ageAffinity: 'neutral' },
  Friendly: { register: 'mid', vocalWeight: 'medium', texture: 'warm', ageAffinity: 'neutral' },
  Gentle: { register: 'mid', vocalWeight: 'light', texture: 'soft', ageAffinity: 'neutral' },
  // Gravel is a phonation property rather than a pitch one, and Google publishes
  // no F0. 'low' stays reserved for voices calibration actually measures that low.
  Gravelly: { register: 'low-mid', vocalWeight: 'heavy', texture: 'gravelly', ageAffinity: 'neutral' },
  Informative: { register: 'low-mid', vocalWeight: 'medium', texture: 'clear', ageAffinity: 'neutral' },
  Knowledgeable: { register: 'low-mid', vocalWeight: 'medium', texture: 'clear', ageAffinity: 'neutral' },
  Lively: { register: 'mid-high', vocalWeight: 'medium', texture: 'bright', ageAffinity: 'neutral' },
  Mature: { register: 'low-mid', vocalWeight: 'medium', texture: 'warm', ageAffinity: 'mature' },
  Smooth: { register: 'mid', vocalWeight: 'medium', texture: 'smooth', ageAffinity: 'neutral' },
  Soft: { register: 'mid', vocalWeight: 'light', texture: 'soft', ageAffinity: 'neutral' },
  Upbeat: { register: 'mid-high', vocalWeight: 'light', texture: 'bright', ageAffinity: 'neutral' },
  Warm: { register: 'mid', vocalWeight: 'medium', texture: 'warm', ageAffinity: 'neutral' },
  Youthful: { register: 'mid-high', vocalWeight: 'light', texture: 'bright', ageAffinity: 'young' },
}

type VoiceSeed = {
  name: string
  gender: GeminiVoiceGender
  officialLabel: keyof typeof ACOUSTICS_BY_LABEL & string
  archetypeDescription: string
}

/** Google's published voice list: name, gender, and character label. */
const VOICE_SEEDS: VoiceSeed[] = [
  {
    name: 'Achernar',
    gender: 'female',
    officialLabel: 'Soft',
    archetypeDescription:
      'Soft and understated; low-pressure delivery for gentle, intimate, or reassuring moments.',
  },
  {
    name: 'Achird',
    gender: 'male',
    officialLabel: 'Friendly',
    archetypeDescription:
      'Friendly and approachable; easy warmth for conversational leads and everyday dialogue.',
  },
  {
    name: 'Algenib',
    gender: 'male',
    officialLabel: 'Gravelly',
    archetypeDescription:
      'Gravelly and textured; rough-edged low register for weathered, gritty, or hard-worn characters.',
  },
  {
    name: 'Algieba',
    gender: 'male',
    officialLabel: 'Smooth',
    archetypeDescription:
      'Smooth and unbroken; polished legato phrasing for composed speakers and voiceover.',
  },
  {
    name: 'Alnilam',
    gender: 'male',
    officialLabel: 'Firm',
    archetypeDescription:
      'Firm and unwavering; steady weight for decisive, no-nonsense speakers.',
  },
  {
    name: 'Aoede',
    gender: 'female',
    officialLabel: 'Breezy',
    archetypeDescription:
      'Breezy and unforced; light, airy momentum for relaxed and offhand delivery.',
  },
  {
    name: 'Autonoe',
    gender: 'female',
    officialLabel: 'Bright',
    archetypeDescription:
      'Bright and forward-placed; lifted energy for optimistic, alert characters.',
  },
  {
    name: 'Callirrhoe',
    gender: 'female',
    officialLabel: 'Easy-going',
    archetypeDescription:
      'Easy-going and unhurried; relaxed mid-register delivery with no pressure behind it.',
  },
  {
    name: 'Charon',
    gender: 'male',
    officialLabel: 'Informative',
    archetypeDescription:
      'Informative and grounded; measured low-mid delivery for explainers, documentary, and briefings.',
  },
  {
    name: 'Despina',
    gender: 'female',
    officialLabel: 'Smooth',
    archetypeDescription:
      'Smooth and even-flowing; unbroken phrasing for composed, controlled speech.',
  },
  {
    name: 'Enceladus',
    gender: 'male',
    officialLabel: 'Breathy',
    archetypeDescription:
      'Breathy and airy; audible breath for tired, hushed, or deadpan delivery.',
  },
  {
    name: 'Erinome',
    gender: 'female',
    officialLabel: 'Clear',
    archetypeDescription:
      'Clear and precisely articulated; neutral placement that stays legible in any mix.',
  },
  {
    name: 'Fenrir',
    gender: 'male',
    officialLabel: 'Excitable',
    archetypeDescription:
      'Excitable and reactive; high-energy bursts for animated, volatile characters.',
  },
  {
    name: 'Gacrux',
    gender: 'female',
    officialLabel: 'Mature',
    archetypeDescription:
      'Mature and settled; an older female register with lived-in weight.',
  },
  {
    name: 'Iapetus',
    gender: 'male',
    officialLabel: 'Clear',
    archetypeDescription:
      'Clear and unobtrusive; neutral broadcast articulation for secondary speakers.',
  },
  {
    name: 'Kore',
    gender: 'female',
    officialLabel: 'Firm',
    archetypeDescription:
      'Firm and self-assured; grounded weight for leaders and assertive characters.',
  },
  {
    name: 'Laomedeia',
    gender: 'female',
    officialLabel: 'Upbeat',
    archetypeDescription:
      'Upbeat and buoyant; lifted tempo and brightness for enthusiastic delivery.',
  },
  {
    name: 'Leda',
    gender: 'female',
    officialLabel: 'Youthful',
    archetypeDescription:
      'Youthful and open; a younger register for peers, companions, and relatable protagonists.',
  },
  {
    name: 'Orus',
    gender: 'male',
    officialLabel: 'Firm',
    archetypeDescription: 'Firm and planted; solid weight without embellishment.',
  },
  {
    name: 'Pulcherrima',
    gender: 'female',
    officialLabel: 'Forward',
    archetypeDescription:
      'Forward and assertive; presses into the phrase for direct, insistent delivery.',
  },
  {
    name: 'Puck',
    gender: 'male',
    officialLabel: 'Upbeat',
    archetypeDescription:
      'Upbeat and playful; bright bounce for sidekicks and comic relief.',
  },
  {
    name: 'Rasalgethi',
    gender: 'male',
    officialLabel: 'Informative',
    archetypeDescription:
      'Informative and deliberate; low-mid narrative weight for storytelling and exposition.',
  },
  {
    name: 'Sadachbia',
    gender: 'male',
    officialLabel: 'Lively',
    archetypeDescription:
      'Lively and animated; quick brightness for energetic, engaged speech.',
  },
  {
    name: 'Sadaltager',
    gender: 'male',
    officialLabel: 'Knowledgeable',
    archetypeDescription:
      'Knowledgeable and considered; low-mid authority for experts and instructors.',
  },
  {
    name: 'Schedar',
    gender: 'male',
    officialLabel: 'Even',
    archetypeDescription:
      'Even and level; minimal tonal variation for neutral, unshaded delivery.',
  },
  {
    name: 'Sulafat',
    gender: 'female',
    officialLabel: 'Warm',
    archetypeDescription:
      'Warm and rounded; soft-edged warmth for empathetic and inviting speech.',
  },
  {
    name: 'Umbriel',
    gender: 'male',
    officialLabel: 'Easy-going',
    archetypeDescription:
      'Easy-going and conversational; loose mid-register delivery for casual dialogue.',
  },
  {
    name: 'Vindemiatrix',
    gender: 'female',
    officialLabel: 'Gentle',
    archetypeDescription:
      'Gentle and light-touch; soft dynamics for tender or careful moments.',
  },
  {
    name: 'Zephyr',
    gender: 'female',
    officialLabel: 'Bright',
    archetypeDescription:
      'Bright and vibrant; high, clear energy for fast-paced and upbeat needs.',
  },
  {
    name: 'Zubenelgenubi',
    gender: 'male',
    officialLabel: 'Casual',
    archetypeDescription:
      'Casual and offhand; an unpolished conversational register for naturalistic dialogue.',
  },
]

type MeasuredEntry = { medianF0Hz?: number; pitchFloorHz?: number }

const MEASURED_BY_ID = (measuredAcoustics.voices ?? {}) as Record<string, MeasuredEntry>

/** Legacy 3-band age used by the keyword scorer; 'neutral' affinity maps to 'middle'. */
function ageBandFromAffinity(affinity: GeminiVoiceAgeAffinity): GeminiVoiceAgeBand {
  if (affinity === 'young') return 'young'
  if (affinity === 'mature') return 'mature'
  return 'middle'
}

export const GEMINI_VOICE_CATALOG: GeminiVoiceCatalogEntry[] = VOICE_SEEDS.map((seed) => {
  const id = `gemini-${seed.name}`
  const acoustics = ACOUSTICS_BY_LABEL[seed.officialLabel]
  const measured = MEASURED_BY_ID[id]

  return {
    id,
    displayName: `${seed.name} (Gemini)`,
    gender: seed.gender,
    languageCode: 'en-US',
    officialLabel: seed.officialLabel,
    archetypeDescription: seed.archetypeDescription,
    ...acoustics,
    ageBand: ageBandFromAffinity(acoustics.ageAffinity),
    ...(typeof measured?.medianF0Hz === 'number' ? { medianF0Hz: measured.medianF0Hz } : {}),
    ...(typeof measured?.pitchFloorHz === 'number' ? { pitchFloorHz: measured.pitchFloorHz } : {}),
  }
})

const CATALOG_BY_ID = new Map(GEMINI_VOICE_CATALOG.map((v) => [v.id, v]))

/** Neutral male voice used when scoring cannot resolve a candidate. */
export const NEUTRAL_GEMINI_VOICE_ID = 'gemini-Iapetus'

export function getGeminiVoice(id: string): GeminiVoiceCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id)
}

export function getGeminiVoiceAgeBand(id: string): GeminiVoiceAgeBand {
  return CATALOG_BY_ID.get(id)?.ageBand ?? 'middle'
}

/** Acoustics for a catalog id, or undefined for legacy/non-Gemini voices. */
export function getGeminiVoiceAcoustics(id: string): GeminiVoiceAcoustics | undefined {
  const entry = CATALOG_BY_ID.get(id)
  if (!entry) return undefined
  return {
    register: entry.register,
    vocalWeight: entry.vocalWeight,
    texture: entry.texture,
    ageAffinity: entry.ageAffinity,
  }
}

/** Legacy Studio/Neural2 voices still exposed by the Google voices API. */
const LEGACY_GOOGLE_VOICES = [
  {
    id: 'en-US-Studio-O',
    name: 'Sophia (Studio)',
    language: 'en-US',
    gender: 'FEMALE',
    type: 'Studio',
  },
  {
    id: 'en-US-Neural2-C',
    name: 'Emma (Neural2)',
    language: 'en-US',
    gender: 'FEMALE',
    type: 'Neural2',
  },
  {
    id: 'en-US-Studio-M',
    name: 'Marcus (Studio)',
    language: 'en-US',
    gender: 'MALE',
    type: 'Studio',
  },
  {
    id: 'en-US-Studio-Q',
    name: 'Quinn (Studio)',
    language: 'en-US',
    gender: 'MALE',
    type: 'Studio',
  },
] as const

export function getGeminiVoicesForApi() {
  const gemini = GEMINI_VOICE_CATALOG.map((voice) => ({
    id: voice.id,
    name: voice.displayName,
    language: voice.languageCode,
    gender: voice.gender.toUpperCase(),
    type: 'Gemini',
    description: voice.archetypeDescription,
    age: voice.ageBand,
  }))
  return [...gemini, ...LEGACY_GOOGLE_VOICES]
}

export function enrichGeminiVoicesForScoring<
  T extends { id: string; name?: string; gender?: string; description?: string; age?: string },
>(
  apiVoices: T[]
): Array<
  T & {
    description: string
    gender: string
    age: string
    /** Structured phonation, so scorers need not regex the prose copy. */
    texture?: GeminiVoiceTexture
    register?: GeminiVoiceRegister
    vocalWeight?: GeminiVoiceWeight
  }
> {
  return apiVoices.map((voice) => {
    const catalog = CATALOG_BY_ID.get(voice.id)
    const ageBand = catalog?.ageBand ?? getGeminiVoiceAgeBand(voice.id)
    return {
      ...voice,
      description: catalog?.archetypeDescription || voice.description || '',
      gender: catalog?.gender || voice.gender || '',
      name: catalog?.displayName || voice.name || voice.id,
      age: ageBand,
      ...(catalog
        ? {
            texture: catalog.texture,
            register: catalog.register,
            vocalWeight: catalog.vocalWeight,
          }
        : {}),
    }
  })
}

/** Picker-friendly list (gemini-* only) with archetype copy. */
export function getGeminiVoicesForPicker() {
  return GEMINI_VOICE_CATALOG.map((voice) => ({
    id: voice.id,
    name: voice.displayName.replace(' (Gemini)', ' (Premium)'),
    description: voice.archetypeDescription,
    gender: voice.gender === 'male' ? 'Male' : 'Female',
    category: 'Premium',
  }))
}

function geminiBaseName(name: string): string {
  return name.replace(/\s*\((Gemini|Premium)\)\s*$/i, '').trim()
}

function normalizeGenderLabel(gender?: string): string {
  if (!gender) return ''
  const normalized = gender.trim().toLowerCase()
  if (normalized === 'male' || normalized === 'm') return 'Male'
  if (normalized === 'female' || normalized === 'f') return 'Female'
  return gender.trim()
}

function truncateVoiceDescription(text: string, max = 60): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trim()}…`
}

/** Two-line picker copy: title + gender/archetype subtitle. */
export function formatGeminiVoiceListLabel(args: {
  name?: string
  gender?: string
  description?: string
}): { title: string; subtitle: string } {
  const title = geminiBaseName(args.name || '')
  const gender = normalizeGenderLabel(args.gender)
  const description = truncateVoiceDescription(args.description || '')
  const subtitle =
    gender && description ? `${gender}, ${description}` : gender || description

  return { title, subtitle }
}

/** Compact selected-voice label for Voice: buttons, e.g. "Kore (Female)". */
export function formatGeminiVoiceSelectedLabel(args: {
  name?: string
  gender?: string
}): string {
  const title = geminiBaseName(args.name || '')
  const gender = normalizeGenderLabel(args.gender)
  return gender ? `${title} (${gender})` : title
}
