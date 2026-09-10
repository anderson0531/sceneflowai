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

export const REGISTER_SCALE: VoiceRegisterBand[] = ['low', 'low-mid', 'mid', 'mid-high', 'high']
export const WEIGHT_SCALE: VoiceWeightBand[] = ['light', 'medium', 'heavy']

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

export const TEXTURE_WORDS: Array<[RegExp, VoiceTextureBand]> = [
  [/\b(?:gravell?y|gritty|raspy|rasp|rough|hoarse|weathered|grizzled|sandpaper|craggy)\b/, 'gravelly'],
  [/\b(?:breathy|hushed|whispery|whispered|airy)\b/, 'breathy'],
  [/\b(?:smooth|silky|velvety|legato|polished|sleek)\b/, 'smooth'],
  [/\b(?:clear|crisp|precise|articulate|clean|clinical|incisive|cut-?glass)\b/, 'clear'],
  [/\b(?:soft|gentle|tender|intimate|feather|gossamer)\b/, 'soft'],
  [/\b(?:even|level|flat|measured|controlled|steady|deadpan|monotone|unshaded|impassive)\b/, 'even'],
  [/\b(?:warm|rounded|mellow|burnished|honeyed)\b/, 'warm'],
  [/\b(?:bright|vibrant|lively|sparkling|zesty|buoyant|upbeat|energetic)\b/, 'bright'],
]

function matchFirst<T>(text: string, table: Array<[RegExp, T]>): T | undefined {
  for (const [pattern, value] of table) {
    if (pattern.test(text)) return value
  }
  return undefined
}

export function parseRegisterFromText(
  text: string,
  gender?: 'male' | 'female'
): VoiceRegisterBand | undefined {
  const lower = text.toLowerCase()
  const voiceTypes =
    gender === 'female' ? FEMALE_VOICE_TYPES : gender === 'male' ? MALE_VOICE_TYPES : []
  const fromVoiceType = matchFirst(lower, voiceTypes)
  if (fromVoiceType) return fromVoiceType

  // With no gender known, a voice-type noun still implies a direction.
  if (!gender) {
    const eitherWay = matchFirst(lower, [...MALE_VOICE_TYPES, ...FEMALE_VOICE_TYPES])
    if (eitherWay) return eitherWay
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
  return matchFirst(text.toLowerCase(), TEXTURE_WORDS)
}

/** Distance in bands, for penalties that scale with how far off the voice is. */
export function registerDistance(a: VoiceRegisterBand, b: VoiceRegisterBand): number {
  return Math.abs(REGISTER_SCALE.indexOf(a) - REGISTER_SCALE.indexOf(b))
}

export function weightDistance(a: VoiceWeightBand, b: VoiceWeightBand): number {
  return Math.abs(WEIGHT_SCALE.indexOf(a) - WEIGHT_SCALE.indexOf(b))
}
