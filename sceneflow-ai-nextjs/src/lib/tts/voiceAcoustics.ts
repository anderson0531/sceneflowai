/**
 * Acoustic base-voice selection for Gemini-TTS.
 *
 * Gemini treats the base voice as the physical substrate — vocal tract
 * resonance, pitch floor, baseline timbre — while the system instruction
 * controls prosody, cadence, dialect, and affect. Asking a naturally high,
 * light voice to perform a late-50s baritone produces strain and artifacting,
 * so the voice has to be chosen on register and weight, not on adjectives that
 * the prompt can supply anyway.
 *
 * Selection therefore ranks on physical parameters first (register, then
 * vocal weight), and only uses texture and age as tiebreakers.
 */

import {
  GEMINI_VOICE_CATALOG,
  NEUTRAL_GEMINI_VOICE_ID,
  type GeminiVoiceAgeAffinity,
  type GeminiVoiceCatalogEntry,
  type GeminiVoiceRegister,
  type GeminiVoiceTexture,
  type GeminiVoiceWeight,
} from '@/lib/tts/geminiVoiceCatalog'
import { normalizeCharacterAgeBand, normalizeGender } from '@/lib/voiceRecommendation'

export type AcousticTarget = {
  gender?: 'male' | 'female'
  register?: GeminiVoiceRegister
  vocalWeight?: GeminiVoiceWeight
  texture?: GeminiVoiceTexture
  ageAffinity?: GeminiVoiceAgeAffinity
}

export type AcousticVoiceMatch = {
  voiceId: string
  score: number
  reasons: string[]
}

const REGISTER_SCALE: GeminiVoiceRegister[] = ['low', 'low-mid', 'mid', 'mid-high', 'high']
const WEIGHT_SCALE: GeminiVoiceWeight[] = ['light', 'medium', 'heavy']

/** Register dominates: one band of error costs more than any texture or age bonus. */
const REGISTER_STEP_PENALTY = 26
const WEIGHT_STEP_PENALTY = 10
const TEXTURE_EXACT_BONUS = 8
const TEXTURE_NEIGHBOR_BONUS = 4
const AGE_MATCH_BONUS = 12
const AGE_OPPOSITE_PENALTY = 30

/**
 * Gravel and breath are properties of phonation, not delivery: the prompt can
 * neither add nor remove them. Mismatching one costs nearly a register band,
 * which keeps a rasping voice out of a "clear baritone" role and vice versa.
 */
const PHYSICAL_TEXTURES: GeminiVoiceTexture[] = ['gravelly', 'breathy']
const PHYSICAL_TEXTURE_MISMATCH_PENALTY = 18

/** Near-equivalent textures, used for partial credit only. */
const TEXTURE_NEIGHBORS: Record<GeminiVoiceTexture, GeminiVoiceTexture[]> = {
  gravelly: ['even'],
  breathy: ['soft'],
  smooth: ['warm', 'even'],
  clear: ['even'],
  soft: ['breathy', 'warm'],
  even: ['clear', 'smooth'],
  warm: ['smooth', 'soft'],
  bright: ['clear'],
}

/**
 * Voice-type nouns to register, resolved against the speaker's own gender range.
 * "Baritone" is low-mid for a man; "alto" is low-mid for a woman.
 */
const MALE_VOICE_TYPES: Array<[RegExp, GeminiVoiceRegister]> = [
  [/\bbass(?:o|-baritone)?\b/, 'low'],
  [/\bbari(?:tone)?\b/, 'low-mid'],
  [/\bcounter-?tenor\b|\bfalsetto\b/, 'high'],
  [/\btenor\b/, 'mid-high'],
]

const FEMALE_VOICE_TYPES: Array<[RegExp, GeminiVoiceRegister]> = [
  [/\bcontralto\b|\balto\b/, 'low-mid'],
  [/\bmezzo(?:-soprano)?\b/, 'mid'],
  [/\bsoprano\b/, 'mid-high'],
]

/** Generic pitch words, applied when no voice-type noun is present. */
const REGISTER_WORDS: Array<[RegExp, GeminiVoiceRegister]> = [
  [/\b(?:lower?[-\s]?mid|mid[-\s]?low|low[-\s]?mid)(?:dle)?\b/, 'low-mid'],
  [/\b(?:upper?[-\s]?mid|mid[-\s]?high|high[-\s]?mid)\b/, 'mid-high'],
  [/\b(?:very\s+)?(?:deep|sub-?bass|rumbling|booming|cavernous|basso)\b/, 'low'],
  [/\b(?:low|lower)\b/, 'low-mid'],
  [/\b(?:piercing|shrill|squeaky|high-?pitched)\b/, 'high'],
  [/\bhigh(?:er)?\b/, 'mid-high'],
  [/\b(?:mid|middle|medium|neutral)\b/, 'mid'],
]

const HEAVY_WORDS =
  /\b(?:resonant|resonance|full[-\s]?bodied|booming|weighty|heavy|thick|chesty|barrel|powerful|commanding|stentorian|sonorous|rich)\b/
const LIGHT_WORDS =
  /\b(?:light|thin|slight|airy|wispy|breathy|delicate|feathery|reedy|slender)\b/
const MEDIUM_WORDS = /\b(?:balanced|moderate|even|medium[-\s]?weight)\b/

const TEXTURE_WORDS: Array<[RegExp, GeminiVoiceTexture]> = [
  [/\b(?:gravell?y|gritty|raspy|rasp|rough|hoarse|weathered|grizzled|sandpaper|craggy)\b/, 'gravelly'],
  [/\b(?:breathy|hushed|whispery|whispered|airy)\b/, 'breathy'],
  [/\b(?:smooth|silky|velvety|legato|polished|sleek)\b/, 'smooth'],
  [/\b(?:clear|crisp|precise|articulate|clean|clinical|incisive|cut-?glass)\b/, 'clear'],
  [/\b(?:soft|gentle|tender|intimate|feather|gossamer)\b/, 'soft'],
  [/\b(?:even|level|flat|measured|controlled|steady|deadpan|monotone|unshaded|impassive)\b/, 'even'],
  [/\b(?:warm|rounded|mellow|burnished|honeyed)\b/, 'warm'],
  [/\b(?:bright|vibrant|lively|sparkling|zesty|buoyant|upbeat|energetic)\b/, 'bright'],
]

function normalizeText(...parts: Array<string | undefined | null>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function matchFirst<T>(text: string, table: Array<[RegExp, T]>): T | undefined {
  for (const [pattern, value] of table) {
    if (pattern.test(text)) return value
  }
  return undefined
}

function parseRegister(text: string, gender?: 'male' | 'female'): GeminiVoiceRegister | undefined {
  const voiceTypes =
    gender === 'female' ? FEMALE_VOICE_TYPES : gender === 'male' ? MALE_VOICE_TYPES : []
  const fromVoiceType = matchFirst(text, voiceTypes)
  if (fromVoiceType) return fromVoiceType

  // With no gender known, a voice-type noun still implies a direction.
  if (!gender) {
    const eitherWay = matchFirst(text, [...MALE_VOICE_TYPES, ...FEMALE_VOICE_TYPES])
    if (eitherWay) return eitherWay
  }

  return matchFirst(text, REGISTER_WORDS)
}

function parseWeight(text: string): GeminiVoiceWeight | undefined {
  if (HEAVY_WORDS.test(text)) return 'heavy'
  if (LIGHT_WORDS.test(text)) return 'light'
  if (MEDIUM_WORDS.test(text)) return 'medium'
  return undefined
}

function parseTexture(text: string): GeminiVoiceTexture | undefined {
  return matchFirst(text, TEXTURE_WORDS)
}

function parseAgeAffinity(age?: string): GeminiVoiceAgeAffinity | undefined {
  const band = normalizeCharacterAgeBand(age)
  if (band === 'young') return 'young'
  if (band === 'mature') return 'mature'
  if (band === 'middle') return 'neutral'
  return undefined
}

export type AcousticTargetInput = {
  gender?: string
  apparentAge?: string | number
  /** Structured vocal attributes from character voice analysis. */
  vocalAttributes?: {
    timbre?: string
    pitch?: string
    register?: string
    vocalWeight?: string
    pace?: string
    authority?: string
    warmth?: string
    accent?: string
  }
  /** Free-text matching brief, used when structured attributes are absent. */
  brief?: string
}

/**
 * Build an acoustic target from analysis output, falling back to the free-text
 * brief. Structured fields win over prose so an explicit `register: "low-mid"`
 * is never overridden by an adjective elsewhere in the brief.
 */
export function parseAcousticTarget(input: AcousticTargetInput): AcousticTarget {
  const gender = normalizeGender(input.gender) ?? undefined
  const attrs = input.vocalAttributes ?? {}

  const structuredText = normalizeText(
    attrs.register,
    attrs.vocalWeight,
    attrs.timbre,
    attrs.pitch,
    attrs.authority,
    attrs.warmth,
  )
  const briefText = normalizeText(input.brief)
  const combined = normalizeText(structuredText, briefText)

  const explicitRegister = normalizeText(attrs.register, attrs.pitch, attrs.timbre)

  const register =
    (explicitRegister ? parseRegister(explicitRegister, gender) : undefined) ??
    parseRegister(combined, gender)

  const explicitWeight = normalizeText(attrs.vocalWeight, attrs.timbre, attrs.authority)
  const vocalWeight =
    (explicitWeight ? parseWeight(explicitWeight) : undefined) ?? parseWeight(combined)

  const texture = parseTexture(structuredText) ?? parseTexture(combined)

  // Age comes only from the explicit field. Inferring it from prose misfires on
  // substrings ("Bold" reads as "old") and age is a static trait we already collect.
  const ageSource =
    typeof input.apparentAge === 'number' ? String(input.apparentAge) : input.apparentAge
  const ageAffinity = parseAgeAffinity(ageSource)

  return {
    ...(gender ? { gender } : {}),
    ...(register ? { register } : {}),
    ...(vocalWeight ? { vocalWeight } : {}),
    ...(texture ? { texture } : {}),
    ...(ageAffinity ? { ageAffinity } : {}),
  }
}

/** True when the target carries at least one physical parameter worth ranking on. */
export function hasAcousticSignal(target: AcousticTarget): boolean {
  return !!(target.register || target.vocalWeight || target.texture)
}

/**
 * Tiny tiebreaker (well under one texture bonus) that prefers the voice whose
 * measured pitch sits deepest for low targets and highest for high targets.
 */
function measuredF0Nudge(voice: GeminiVoiceCatalogEntry, register: GeminiVoiceRegister): number {
  const measured = voice.pitchFloorHz ?? voice.medianF0Hz
  if (typeof measured !== 'number' || !Number.isFinite(measured)) return 0

  const direction = REGISTER_SCALE.indexOf(register) <= 1 ? -1 : 1
  // 300 Hz spans the full plausible range, so this contributes at most ~1 point.
  return (direction * measured) / 300
}

export function scoreVoiceAcoustics(
  voice: GeminiVoiceCatalogEntry,
  target: AcousticTarget,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 100

  if (target.register) {
    const distance = Math.abs(
      REGISTER_SCALE.indexOf(voice.register) - REGISTER_SCALE.indexOf(target.register),
    )
    score -= distance * REGISTER_STEP_PENALTY
    reasons.push(
      distance === 0
        ? `Register match: ${voice.register}`
        : `Register off by ${distance}: ${voice.register} vs ${target.register}`,
    )
    score += measuredF0Nudge(voice, target.register)
  }

  if (target.vocalWeight) {
    const distance = Math.abs(
      WEIGHT_SCALE.indexOf(voice.vocalWeight) - WEIGHT_SCALE.indexOf(target.vocalWeight),
    )
    score -= distance * WEIGHT_STEP_PENALTY
    reasons.push(
      distance === 0
        ? `Vocal weight match: ${voice.vocalWeight}`
        : `Vocal weight off by ${distance}: ${voice.vocalWeight} vs ${target.vocalWeight}`,
    )
  }

  if (target.texture) {
    if (voice.texture === target.texture) {
      score += TEXTURE_EXACT_BONUS
      reasons.push(`Texture match: ${voice.texture}`)
    } else if (TEXTURE_NEIGHBORS[target.texture].includes(voice.texture)) {
      score += TEXTURE_NEIGHBOR_BONUS
      reasons.push(`Texture adjacent: ${voice.texture} near ${target.texture}`)
    } else if (
      PHYSICAL_TEXTURES.includes(voice.texture) ||
      PHYSICAL_TEXTURES.includes(target.texture)
    ) {
      score -= PHYSICAL_TEXTURE_MISMATCH_PENALTY
      reasons.push(`Phonation conflict: ${voice.texture} vs ${target.texture}`)
    }
  }

  if (target.ageAffinity) {
    if (voice.ageAffinity === target.ageAffinity) {
      score += AGE_MATCH_BONUS
      reasons.push(`Age affinity match: ${voice.ageAffinity}`)
    } else if (
      (voice.ageAffinity === 'young' && target.ageAffinity === 'mature') ||
      (voice.ageAffinity === 'mature' && target.ageAffinity === 'young')
    ) {
      score -= AGE_OPPOSITE_PENALTY
      reasons.push(`Age affinity conflict: ${voice.ageAffinity} vs ${target.ageAffinity}`)
    }
  }

  return { score, reasons }
}

/**
 * Rank the catalog against an acoustic target. Gender is a hard filter whenever
 * it is known and any voice of that gender exists.
 */
export function rankVoicesByAcoustics(
  target: AcousticTarget,
  topN = 5,
): AcousticVoiceMatch[] {
  let candidates = GEMINI_VOICE_CATALOG
  if (target.gender) {
    const filtered = candidates.filter((voice) => voice.gender === target.gender)
    if (filtered.length > 0) candidates = filtered
  }

  return candidates
    .map((voice) => {
      const { score, reasons } = scoreVoiceAcoustics(voice, target)
      return { voiceId: voice.id, score, reasons }
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.voiceId.localeCompare(b.voiceId)))
    .slice(0, topN)
}

export function selectGeminiBaseVoice(target: AcousticTarget): AcousticVoiceMatch {
  const ranked = rankVoicesByAcoustics(target, 1)
  return ranked[0] ?? { voiceId: NEUTRAL_GEMINI_VOICE_ID, score: 0, reasons: ['No candidates'] }
}

/** Compact one-line summary for logs and debug panels. */
export function describeAcousticTarget(target: AcousticTarget): string {
  const parts = [
    target.gender,
    target.register && `${target.register} register`,
    target.vocalWeight && `${target.vocalWeight} weight`,
    target.texture,
    target.ageAffinity && target.ageAffinity !== 'neutral' && `${target.ageAffinity} age`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'no acoustic signal'
}
