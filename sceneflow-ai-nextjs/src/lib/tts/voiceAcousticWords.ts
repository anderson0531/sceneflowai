/**
 * Shared vocabulary for reading acoustic parameters out of a voice brief.
 *
 * Deliberately dependency-free. Both the acoustic selector and the legacy
 * keyword scorer need these tables, and they sit on opposite sides of the
 * import graph, so a leaf module is the only way to keep one definition.
 */

/** Perceived pitch band relative to the speaker's own gender range. */
export type VoiceRegisterBand = 'low' | 'low-mid' | 'mid' | 'mid-high' | 'high'

/** Perceived heft of the voice, independent of pitch. */
export type VoiceWeightBand = 'light' | 'medium' | 'heavy'

export type VoiceTextureBand =
  | 'gravelly'
  | 'breathy'
  | 'smooth'
  | 'clear'
  | 'soft'
  | 'even'
  | 'warm'
  | 'bright'

/** Resting delivery pace. Adjacent steps are close; the extremes oppose. */
export type VoiceCadenceBand = 'deliberate' | 'steady' | 'dynamic' | 'volatile'

export const REGISTER_SCALE: VoiceRegisterBand[] = ['low', 'low-mid', 'mid', 'mid-high', 'high']
export const WEIGHT_SCALE: VoiceWeightBand[] = ['light', 'medium', 'heavy']
export const CADENCE_SCALE: VoiceCadenceBand[] = ['deliberate', 'steady', 'dynamic', 'volatile']

/**
 * Textures produced by phonation rather than delivery. The prompt can neither
 * add nor remove them, so a mismatch here is a physical conflict rather than a
 * stylistic preference.
 */
export const PHYSICAL_TEXTURES: VoiceTextureBand[] = ['gravelly', 'breathy']

/**
 * Voice-type nouns resolved against the speaker's own gender range.
 * "Baritone" is low-mid for a man; "alto" is low-mid for a woman.
 */
export const MALE_VOICE_TYPES: Array<[RegExp, VoiceRegisterBand]> = [
  [/\bbass(?:o|-baritone)?\b/, 'low'],
  [/\bbari(?:tone)?\b/, 'low-mid'],
  [/\bcounter-?tenor\b|\bfalsetto\b/, 'high'],
  [/\btenor\b/, 'mid-high'],
]

export const FEMALE_VOICE_TYPES: Array<[RegExp, VoiceRegisterBand]> = [
  [/\bcontralto\b|\balto\b/, 'low-mid'],
  [/\bmezzo(?:-soprano)?\b/, 'mid'],
  [/\bsoprano\b/, 'mid-high'],
]

/** Generic pitch words, applied when no voice-type noun is present. */
export const REGISTER_WORDS: Array<[RegExp, VoiceRegisterBand]> = [
  [/\b(?:lower?[-\s]?mid|mid[-\s]?low|low[-\s]?mid)(?:dle)?\b/, 'low-mid'],
  [/\b(?:upper?[-\s]?mid|mid[-\s]?high|high[-\s]?mid)\b/, 'mid-high'],
  [/\b(?:very\s+)?(?:deep|sub-?bass|rumbling|booming|cavernous|basso)\b/, 'low'],
  [/\b(?:low|lower)\b/, 'low-mid'],
  [/\b(?:piercing|shrill|squeaky|high-?pitched)\b/, 'high'],
  [/\bhigh(?:er)?\b/, 'mid-high'],
  [/\b(?:mid|middle|medium|neutral)\b/, 'mid'],
]

export const HEAVY_WORDS =
  /\b(?:resonant|resonance|full[-\s]?bodied|booming|weighty|heavy|thick|chesty|barrel|powerful|commanding|stentorian|sonorous|rich)\b/
export const LIGHT_WORDS =
  /\b(?:light|thin|slight|airy|wispy|breathy|delicate|feathery|reedy|slender)\b/
export const MEDIUM_WORDS = /\b(?:balanced|moderate|even|medium[-\s]?weight)\b/

/**
 * Gravel/rasp/dry win over clinical/clear. Phonation cannot be prompted in, so
 * a "clinical baritone with a dry, gravelly edge" is gravelly, not clear.
 */
export const GRAVEL_WORDS =
  /\b(?:gravell?y(?:\s+edge)?|gritty|raspy|rasp|rough|hoarse|weathered|grizzled|sandpaper|craggy|dry)\b/

export const TEXTURE_WORDS: Array<[RegExp, VoiceTextureBand]> = [
  [GRAVEL_WORDS, 'gravelly'],
  [/\b(?:breathy|hushed|whispery|whispered|airy)\b/, 'breathy'],
  [/\b(?:smooth|silky|velvety|legato|polished|sleek)\b/, 'smooth'],
  [/\b(?:clear|crisp|precise|articulate|clean|clinical|incisive|cut-?glass)\b/, 'clear'],
  [/\b(?:soft|gentle|tender|intimate|feather|gossamer)\b/, 'soft'],
  [/\b(?:even|level|flat|controlled|deadpan|monotone|unshaded|impassive|firm|decisive)\b/, 'even'],
  [/\b(?:warm|rounded|mellow|burnished|honeyed)\b/, 'warm'],
  [/\b(?:bright|vibrant|lively|sparkling|zesty|buoyant|upbeat)\b/, 'bright'],
]

export const CADENCE_WORDS: Array<[RegExp, VoiceCadenceBand]> = [
  [/\b(?:erratic|frantic|volatile|chaotic|manic)\b/, 'volatile'],
  [/\b(?:unhurried|measured|deliberate|methodical|slow|leisurely)\b/, 'deliberate'],
  [/\b(?:energetic|projected|propulsive|animated|excitable)\b/, 'dynamic'],
  [/\b(?:steady|informative|even[-\s]?paced|moderate)\b/, 'steady'],
]

function matchFirst<T>(text: string, table: Array<[RegExp, T]>): T | undefined {
  for (const [pattern, value] of table) {
    if (pattern.test(text)) return value
  }
  return undefined
}

/**
 * Baritone is low-mid unless the brief also places it deep / late-50s / lower.
 * "lower-mid" must not trip the deepen check.
 */
const DEEPEN_BARITONE =
  /\b(?:deep|sub-?bass|rumbling|booming|cavernous)\b|\blower(?![-\s]?mid)\b|\blate[-\s]*(?:[4-9]\d(?:s)?|fifties|sixties|seventies)\b/

function haystackWithAge(text: string, apparentAge?: string | number): string {
  const agePart =
    typeof apparentAge === 'number'
      ? String(apparentAge)
      : typeof apparentAge === 'string'
        ? apparentAge
        : ''
  return `${text} ${agePart}`.toLowerCase()
}

export function shouldDeepenBaritone(text: string, apparentAge?: string | number): boolean {
  const haystack = haystackWithAge(text, apparentAge)
  if (DEEPEN_BARITONE.test(haystack)) return true
  if (typeof apparentAge === 'number' && apparentAge >= 50) return true
  return false
}

export function parseRegisterFromText(
  text: string,
  gender?: 'male' | 'female',
  apparentAge?: string | number,
): VoiceRegisterBand | undefined {
  const lower = text.toLowerCase()
  const voiceTypes =
    gender === 'female' ? FEMALE_VOICE_TYPES : gender === 'male' ? MALE_VOICE_TYPES : []
  const fromVoiceType = matchFirst(lower, voiceTypes)
  if (fromVoiceType) {
    if (
      fromVoiceType === 'low-mid' &&
      /\bbari(?:tone)?\b/.test(lower) &&
      shouldDeepenBaritone(lower, apparentAge)
    ) {
      return 'low'
    }
    return fromVoiceType
  }

  // With no gender known, a voice-type noun still implies a direction.
  if (!gender) {
    const eitherWay = matchFirst(lower, [...MALE_VOICE_TYPES, ...FEMALE_VOICE_TYPES])
    if (eitherWay) {
      if (
        eitherWay === 'low-mid' &&
        /\bbari(?:tone)?\b/.test(lower) &&
        shouldDeepenBaritone(lower, apparentAge)
      ) {
        return 'low'
      }
      return eitherWay
    }
  }

  return matchFirst(lower, REGISTER_WORDS)
}

export function parseWeightFromText(text: string): VoiceWeightBand | undefined {
  const lower = text.toLowerCase()
  if (HEAVY_WORDS.test(lower)) return 'heavy'
  if (LIGHT_WORDS.test(lower)) return 'light'
  if (MEDIUM_WORDS.test(lower)) return 'medium'
  return undefined
}

export function parseTextureFromText(text: string): VoiceTextureBand | undefined {
  const lower = text.toLowerCase()
  // Gravel/dry/rasp beat clinical/clear when both appear in the same brief.
  if (GRAVEL_WORDS.test(lower)) return 'gravelly'
  return matchFirst(lower, TEXTURE_WORDS)
}

export function parseCadenceFromText(text: string): VoiceCadenceBand | undefined {
  return matchFirst(text.toLowerCase(), CADENCE_WORDS)
}

/** Distance in bands, for penalties that scale with how far off the voice is. */
export function registerDistance(a: VoiceRegisterBand, b: VoiceRegisterBand): number {
  return Math.abs(REGISTER_SCALE.indexOf(a) - REGISTER_SCALE.indexOf(b))
}

export function weightDistance(a: VoiceWeightBand, b: VoiceWeightBand): number {
  return Math.abs(WEIGHT_SCALE.indexOf(a) - WEIGHT_SCALE.indexOf(b))
}

export function cadenceDistance(a: VoiceCadenceBand, b: VoiceCadenceBand): number {
  return Math.abs(CADENCE_SCALE.indexOf(a) - CADENCE_SCALE.indexOf(b))
}
