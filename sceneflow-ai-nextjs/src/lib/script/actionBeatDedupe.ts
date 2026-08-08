/**
 * Detect and remove action beats that restate adjacent spoken (or action) staging.
 * Keeps true inserts / geography / cutaways that add new visual information.
 */

import type { BeatKind, SceneBeat } from '@/lib/script/segmentTypes'

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'at',
  'with',
  'his',
  'her',
  'their',
  'him',
  'hers',
  'is',
  'are',
  'was',
  'were',
  'be',
  'as',
  'from',
  'into',
  'for',
  'by',
  'over',
  'under',
  'that',
  'this',
  'then',
  'than',
  'very',
  'just',
  'about',
  'shot',
  'close',
  'medium',
  'wide',
  'camera',
  'shallow',
  'depth',
  'field',
  'dof',
  'light',
  'lighting',
])

/** Distinct visual beats that should survive even with some lexical overlap. */
const DISTINCT_VISUAL_CUE =
  /\b(insert|cutaway|establishing|extreme\s+wide|aerial|overhead|pov|b-?roll|montage|timelapse|time-lapse|environment|exterior|landscape|detail\s+of|object\s+insert)\b/i

function isSpokenBeatKind(kind: BeatKind): boolean {
  return kind === 'dialogue' || kind === 'narration'
}

/** Significant tokens for overlap checks (emotion tags stripped). */
export function significantBeatTokens(text: string): Set<string> {
  const cleaned = (text || '')
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  return new Set(tokens)
}

export function tokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  return intersection / (a.size + b.size - intersection)
}

function actionCoverageOfShared(actionTokens: Set<string>, otherTokens: Set<string>): number {
  if (actionTokens.size === 0) return 0
  let shared = 0
  for (const token of actionTokens) {
    if (otherTokens.has(token)) shared++
  }
  return shared / actionTokens.size
}

function spokenNeighborText(beat: SceneBeat): string {
  const parts = [beat.character, beat.line, beat.voiceDirection].filter(Boolean)
  return parts.join(' ')
}

/**
 * True when an action description largely restates neighboring spoken/action content
 * and does not introduce a distinct insert/geography/cutaway beat.
 */
export function isRedundantActionDescription(
  actionDescription: string,
  neighborText: string
): boolean {
  const action = (actionDescription || '').trim()
  const neighbor = (neighborText || '').trim()
  if (!action || !neighbor) return false

  const actionTokens = significantBeatTokens(action)
  const neighborTokens = significantBeatTokens(neighbor)
  if (actionTokens.size === 0 || neighborTokens.size === 0) return false

  const overlap = tokenJaccard(actionTokens, neighborTokens)
  const coverage = actionCoverageOfShared(actionTokens, neighborTokens)
  const looksDistinct = DISTINCT_VISUAL_CUE.test(action) && coverage < 0.75

  if (looksDistinct) return false
  return overlap >= 0.45 || coverage >= 0.6
}

/** Indices of action beats that are redundant with an adjacent spoken or action beat. */
export function findRedundantActionBeatIndices(beats: SceneBeat[]): number[] {
  const redundant: number[] = []
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    if (beat.kind !== 'action') continue
    const desc = beat.actionDescription || ''
    if (!desc.trim()) continue

    let isRedundant = false
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= beats.length) continue
      const neighbor = beats[j]
      const neighborText =
        neighbor.kind === 'action'
          ? neighbor.actionDescription || ''
          : isSpokenBeatKind(neighbor.kind)
            ? spokenNeighborText(neighbor)
            : ''
      if (!neighborText.trim()) continue
      if (isRedundantActionDescription(desc, neighborText)) {
        isRedundant = true
        break
      }
    }
    if (isRedundant) redundant.push(i)
  }
  return redundant
}

/**
 * Drop action beats that restate adjacent spoken/action staging.
 * Preserves inserts/geography/cutaways that add new visual information.
 */
export function dedupeRedundantActionBeats(beats: SceneBeat[]): SceneBeat[] {
  if (!Array.isArray(beats) || beats.length < 2) return beats
  const drop = new Set(findRedundantActionBeatIndices(beats))
  if (drop.size === 0) return beats
  return beats.filter((_, index) => !drop.has(index))
}
