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
import {
  PHYSICAL_TEXTURES,
  REGISTER_SCALE,
  WEIGHT_SCALE,
  parseRegisterFromText,
  parseTextureFromText,
  parseWeightFromText,
  registerDistance,
  weightDistance,
} from '@/lib/tts/voiceAcousticWords'

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

function normalizeText(...parts: Array<string | undefined | null>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
    .toLowerCase()
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
    (explicitRegister ? parseRegisterFromText(explicitRegister, gender) : undefined) ??
    parseRegisterFromText(combined, gender)

  const explicitWeight = normalizeText(attrs.vocalWeight, attrs.timbre, attrs.authority)
  const vocalWeight =
    (explicitWeight ? parseWeightFromText(explicitWeight) : undefined) ??
    parseWeightFromText(combined)

  const texture = parseTextureFromText(structuredText) ?? parseTextureFromText(combined)

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
    const distance = registerDistance(voice.register, target.register)
    score -= distance * REGISTER_STEP_PENALTY
    reasons.push(
      distance === 0
        ? `Register match: ${voice.register}`
        : `Register off by ${distance}: ${voice.register} vs ${target.register}`,
    )
    score += measuredF0Nudge(voice, target.register)
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
