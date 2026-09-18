/**
 * How well a rewritten still prompt still carries the beat's directed intent.
 *
 * Used in Director after Safety / rewrite so the user can see direction drift
 * before saving. Dialog-only — not persisted on the beat.
 */

import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { BeatDirection, SceneBeat } from '@/lib/script/segmentTypes'

export type DirectionFidelityBand = 'strong' | 'moderate' | 'drifted'

export interface DirectionFidelityScore {
  score: number
  band: DirectionFidelityBand
  driftedFacets: string[]
  heldFacets: string[]
  note: string
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'from',
  'that',
  'this',
  'for',
  'into',
  'onto',
  'over',
  'under',
  'his',
  'her',
  'their',
  'she',
  'him',
  'hers',
  'they',
  'them',
  'are',
  'was',
  'were',
  'been',
  'being',
  'have',
  'has',
  'had',
  'not',
  'but',
  'off',
  'out',
  'near',
  'beside',
  'against',
  'while',
  'both',
  'each',
  'fully',
  'frame',
  'shot',
  'person',
])

interface WeightedFacet {
  key: string
  label: string
  weight: number
}

const FACETS: WeightedFacet[] = [
  { key: 'castInFrame', label: 'cast', weight: 20 },
  { key: 'keyProps', label: 'props', weight: 20 },
  { key: 'frozenMoment', label: 'frozen moment', weight: 20 },
  { key: 'shotType', label: 'shot type', weight: 10 },
  { key: 'blocking', label: 'blocking', weight: 10 },
  { key: 'emotion', label: 'emotion', weight: 10 },
  { key: 'cameraAngle', label: 'camera', weight: 5 },
  { key: 'gaze', label: 'gaze', weight: 5 },
]

function trimOrEmpty(value?: string | null): string {
  return value?.trim() ?? ''
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function uniqueTokens(text: string): string[] {
  return [...new Set(tokenize(text))]
}

function coverage(required: string[], haystack: string): number {
  if (required.length === 0) return 1
  const hay = haystack.toLowerCase()
  let hit = 0
  for (const token of required) {
    const needle = token.trim().toLowerCase()
    if (!needle) continue
    if (hay.includes(needle)) hit += 1
  }
  return hit / required.length
}

function facetSource(direction: BeatDirection | undefined, key: string): string[] {
  if (!direction) return []
  if (key === 'castInFrame') {
    return (direction.castInFrame ?? []).map((name) => name.trim()).filter(Boolean)
  }
  if (key === 'keyProps') {
    return (direction.keyProps ?? []).map((name) => name.trim()).filter(Boolean)
  }
  const value = trimOrEmpty((direction as Record<string, unknown>)[key] as string | undefined)
  if (!value) return []
  if (key === 'shotType' || key === 'cameraAngle') return [value]
  return uniqueTokens(value)
}

function bandForScore(score: number): DirectionFidelityBand {
  if (score >= 80) return 'strong'
  if (score >= 50) return 'moderate'
  return 'drifted'
}

function buildNote(score: DirectionFidelityScore): string {
  if (score.driftedFacets.length === 0) {
    return 'Rewritten prompt still matches the beat direction.'
  }
  const drifted = score.driftedFacets.join(' and ')
  const held =
    score.heldFacets.length > 0
      ? `; ${score.heldFacets.join(' and ')} held`
      : ''
  return `${drifted} softened or missing${held}.`
}

export function scoreBeatDirectionFidelity(args: {
  beat: SceneBeat
  rewrittenFraming: string
  patch?: StillDirectorPatch | null
}): DirectionFidelityScore {
  const originalFraming = composeBeatActionFraming(args.beat)
  const direction = args.beat.beatDirection
  const patchText = [
    args.patch?.actionFraming,
    args.patch?.frozenMoment,
    args.patch?.blocking,
    args.patch?.emotion,
    args.patch?.shotType,
    args.patch?.cameraAngle,
    args.patch?.gaze,
    ...(args.patch?.castInFrame ?? []),
    ...(args.patch?.keyProps ?? []),
  ]
    .filter(Boolean)
    .join(' ')

  const haystack = (
    args.rewrittenFraming.trim() ||
    patchText ||
    originalFraming
  ).trim()

  let weightedSum = 0
  let weightTotal = 0
  const driftedFacets: string[] = []
  const heldFacets: string[] = []

  for (const facet of FACETS) {
    const required = facetSource(direction, facet.key)
    if (required.length === 0) continue
    const ratio = coverage(required, haystack)
    weightedSum += facet.weight * ratio
    weightTotal += facet.weight
    if (ratio < 0.6) driftedFacets.push(facet.label)
    else heldFacets.push(facet.label)
  }

  if (weightTotal === 0) {
    const originalTokens = uniqueTokens(originalFraming)
    const ratio = coverage(originalTokens, haystack)
    const score = Math.round(ratio * 100)
    const result: DirectionFidelityScore = {
      score,
      band: bandForScore(score),
      driftedFacets: ratio < 0.6 ? ['action'] : [],
      heldFacets: ratio >= 0.6 ? ['action'] : [],
      note: '',
    }
    result.note = buildNote(result)
    return result
  }

  const score = Math.round((weightedSum / weightTotal) * 100)
  const result: DirectionFidelityScore = {
    score,
    band: bandForScore(score),
    driftedFacets,
    heldFacets,
    note: '',
  }
  result.note = buildNote(result)
  return result
}
