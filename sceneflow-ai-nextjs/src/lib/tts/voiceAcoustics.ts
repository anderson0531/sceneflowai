/**
 * Acoustic base-voice selection for Gemini-TTS.
 *
 * Hierarchy is strict: Gender (hard filter) → Register → Harmonic Texture →
 * Resting Cadence. Vocal weight and age are tiny tiebreakers and cannot flip
 * a register band or a gravel/clear phonation conflict.
 *
 * Gemini treats the base voice as the physical substrate — vocal tract
 * resonance, pitch floor, baseline timbre — while the system instruction
 * controls prosody, dialect, and affect.
 */

import {
  GEMINI_VOICE_CATALOG,
  NEUTRAL_GEMINI_VOICE_ID,
  type GeminiVoiceAgeAffinity,
  type GeminiVoiceCadence,
  type GeminiVoiceCatalogEntry,
  type GeminiVoiceRegister,
  type GeminiVoiceTexture,
  type GeminiVoiceWeight,
} from '@/lib/tts/geminiVoiceCatalog'
import { normalizeCharacterAgeBand, normalizeGender } from '@/lib/voiceRecommendation'
import {
  PHYSICAL_TEXTURES,
  REGISTER_SCALE,
  cadenceDistance,
  parseCadenceFromText,
  parseRegisterFromText,
  parseTextureFromText,
  parseWeightFromText,
  registerDistance,
  weightDistance,
} from '@/lib/tts/voiceAcousticWords'

export type VoiceDomainHint = 'corporate' | 'military' | 'street' | 'intimate'

export type AcousticTarget = {
  gender?: 'male' | 'female'
  register?: GeminiVoiceRegister
  vocalWeight?: GeminiVoiceWeight
  texture?: GeminiVoiceTexture
  cadence?: GeminiVoiceCadence
  ageAffinity?: GeminiVoiceAgeAffinity
  /** Last-place tiebreak only — never part of the numeric score. */
  domainHint?: VoiceDomainHint
}

export type AcousticVoiceMatch = {
  voiceId: string
  score: number
  reasons: string[]
}

/** One register band costs more than texture, cadence, weight, and age combined. */
const REGISTER_STEP_PENALTY = 40
const TEXTURE_EXACT_BONUS = 10
const TEXTURE_NEIGHBOR_BONUS = 4
const CADENCE_EXACT_BONUS = 8
const CADENCE_ADJACENT_PENALTY = 6
const CADENCE_EXTREME_PENALTY = 16
/** Weight and age must stay well under one texture step (exact vs neighbor is 6). */
const WEIGHT_STEP_PENALTY = 2
const AGE_MATCH_BONUS = 4
const AGE_OPPOSITE_PENALTY = 4

/**
 * Gravel and breath vs clear/smooth: phonation the prompt cannot add or remove.
 * Larger than any cadence or weight swing so clinical never beats gravel.
 */
const PHYSICAL_TEXTURE_MISMATCH_PENALTY = 32
/** Gravel and breath are opposite phonations; farther than either vs smooth. */
const OPPOSITE_PHONATION_PENALTY = 48

const PROMPTABLE_TEXTURES: GeminiVoiceTexture[] = ['clear', 'smooth']

const DOMAIN_WORDS: Array<[RegExp, VoiceDomainHint]> = [
  [/\b(?:corporate|boardroom|executive|documentary|briefing)\b/, 'corporate'],
  [/\b(?:military|command|tactical|officer)\b/, 'military'],
  [/\b(?:street|urban)\b/, 'street'],
  [/\b(?:intimate|confessional)\b/, 'intimate'],
]

/** Preferred ids when two voices still tie after Gender→Register→Texture→Cadence. */
const DOMAIN_PREFERRED_IDS: Record<VoiceDomainHint, string[]> = {
  corporate: ['gemini-Charon', 'gemini-Iapetus', 'gemini-Sadaltager', 'gemini-Rasalgethi'],
  military: ['gemini-Orus', 'gemini-Alnilam', 'gemini-Kore'],
  street: ['gemini-Fenrir', 'gemini-Algenib', 'gemini-Zubenelgenubi'],
  intimate: ['gemini-Enceladus', 'gemini-Vindemiatrix', 'gemini-Achernar'],
}

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

function normalizeText(...parts: Array<string | undefined | null>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function parseDomainHint(text: string): VoiceDomainHint | undefined {
  const lower = text.toLowerCase()
  for (const [pattern, value] of DOMAIN_WORDS) {
    if (pattern.test(lower)) return value
  }
  return undefined
}

function domainTiebreakRank(voiceId: string, domain?: VoiceDomainHint): number {
  if (!domain) return 99
  const idx = DOMAIN_PREFERRED_IDS[domain].indexOf(voiceId)
  return idx === -1 ? 99 : idx
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
    attrs.pace,
  )
  const briefText = normalizeText(input.brief)
  const combined = normalizeText(structuredText, briefText)

  const explicitRegister = normalizeText(attrs.register, attrs.pitch, attrs.timbre)

  const register =
    (explicitRegister
      ? parseRegisterFromText(explicitRegister, gender, input.apparentAge)
      : undefined) ?? parseRegisterFromText(combined, gender, input.apparentAge)

  const explicitWeight = normalizeText(attrs.vocalWeight, attrs.timbre, attrs.authority)
  const vocalWeight =
    (explicitWeight ? parseWeightFromText(explicitWeight) : undefined) ??
    parseWeightFromText(combined)

  const texture = parseTextureFromText(structuredText) ?? parseTextureFromText(combined)

  const explicitCadence = normalizeText(attrs.pace)
  const cadence =
    (explicitCadence ? parseCadenceFromText(explicitCadence) : undefined) ??
    parseCadenceFromText(combined)

  // Age comes only from the explicit field. Inferring it from prose misfires on
  // substrings ("Bold" reads as "old") and age is a static trait we already collect.
  const ageSource =
    typeof input.apparentAge === 'number' ? String(input.apparentAge) : input.apparentAge
  const ageAffinity = parseAgeAffinity(ageSource)
  const domainHint = parseDomainHint(combined)

  return {
    ...(gender ? { gender } : {}),
    ...(register ? { register } : {}),
    ...(vocalWeight ? { vocalWeight } : {}),
    ...(texture ? { texture } : {}),
    ...(cadence ? { cadence } : {}),
    ...(ageAffinity ? { ageAffinity } : {}),
    ...(domainHint ? { domainHint } : {}),
  }
}

/** True when register, texture, or cadence is present. Weight alone is not enough. */
export function hasAcousticSignal(target: AcousticTarget): boolean {
  return !!(target.register || target.texture || target.cadence)
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

function phonationPenalty(voiceTexture: GeminiVoiceTexture, targetTexture: GeminiVoiceTexture): number {
  if (voiceTexture === targetTexture) return 0
  const physicalVoice = PHYSICAL_TEXTURES.includes(voiceTexture)
  const physicalTarget = PHYSICAL_TEXTURES.includes(targetTexture)
  if (physicalVoice && physicalTarget) return OPPOSITE_PHONATION_PENALTY
  if (
    (physicalVoice || physicalTarget) &&
    (PROMPTABLE_TEXTURES.includes(voiceTexture) || PROMPTABLE_TEXTURES.includes(targetTexture))
  ) {
    return PHYSICAL_TEXTURE_MISMATCH_PENALTY
  }
  return 0
}

export function scoreVoiceAcoustics(
  voice: GeminiVoiceCatalogEntry,
  target: AcousticTarget,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 100

  if (target.register) {
    const distance = registerDistance(voice.register, target.register)
    score -= distance * REGISTER_STEP_PENALTY
    reasons.push(
      distance === 0
        ? `Register match: ${voice.register}`
        : `Register off by ${distance}: ${voice.register} vs ${target.register}`,
    )
    score += measuredF0Nudge(voice, target.register)
  }

  if (target.texture) {
    if (voice.texture === target.texture) {
      score += TEXTURE_EXACT_BONUS
      reasons.push(`Texture match: ${voice.texture}`)
    } else if (TEXTURE_NEIGHBORS[target.texture].includes(voice.texture)) {
      score += TEXTURE_NEIGHBOR_BONUS
      reasons.push(`Texture adjacent: ${voice.texture} near ${target.texture}`)
    } else {
      const penalty = phonationPenalty(voice.texture, target.texture)
      if (penalty > 0) {
        score -= penalty
        reasons.push(`Phonation conflict: ${voice.texture} vs ${target.texture}`)
      }
    }
  }

  if (target.cadence) {
    const distance = cadenceDistance(voice.cadence, target.cadence)
    if (distance === 0) {
      score += CADENCE_EXACT_BONUS
      reasons.push(`Cadence match: ${voice.cadence}`)
    } else if (distance === 1) {
      score -= CADENCE_ADJACENT_PENALTY
      reasons.push(`Cadence adjacent: ${voice.cadence} vs ${target.cadence}`)
    } else if (
      (voice.cadence === 'volatile' && target.cadence === 'deliberate') ||
      (voice.cadence === 'deliberate' && target.cadence === 'volatile')
    ) {
      score -= CADENCE_EXTREME_PENALTY
      reasons.push(`Cadence conflict: ${voice.cadence} vs ${target.cadence}`)
    } else {
      score -= CADENCE_ADJACENT_PENALTY * distance
      reasons.push(`Cadence off by ${distance}: ${voice.cadence} vs ${target.cadence}`)
    }
  }

  if (target.vocalWeight) {
    const distance = weightDistance(voice.vocalWeight, target.vocalWeight)
    score -= distance * WEIGHT_STEP_PENALTY
    reasons.push(
      distance === 0
        ? `Vocal weight match: ${voice.vocalWeight}`
        : `Vocal weight off by ${distance}: ${voice.vocalWeight} vs ${target.vocalWeight}`,
    )
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
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const domainDelta =
        domainTiebreakRank(a.voiceId, target.domainHint) -
        domainTiebreakRank(b.voiceId, target.domainHint)
      if (domainDelta !== 0) return domainDelta
      return a.voiceId.localeCompare(b.voiceId)
    })
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
    target.cadence && `${target.cadence} cadence`,
    target.ageAffinity && target.ageAffinity !== 'neutral' && `${target.ageAffinity} age`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'no acoustic signal'
}
