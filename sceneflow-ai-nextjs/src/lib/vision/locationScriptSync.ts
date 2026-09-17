/**
 * Script → location version sync: match AI suggestions onto existing versions,
 * produce a non-destructive merge diff, and apply it.
 */

import {
  extractLocationStateHitsFromScene,
  type LocationAnalysisSceneInput,
} from '@/lib/vision/locationStateAnalysis'
import { compareBeatPosition, versionStart } from '@/lib/vision/locationVersionResolve'
import type {
  LocationReference,
  LocationVersion,
  LocationVersionAppliesFrom,
} from '@/types/visionReferences'

export interface LocationVersionSuggestionLike {
  name: string
  stateNotes: string
  sceneNumbers: number[]
  appliesFrom?: LocationVersionAppliesFrom
  reason: string
  confidence?: number
}

export interface ExistingLocationVersionLike {
  id: string
  name: string
  stateNotes: string
  sceneNumbers?: number[]
  appliesFrom?: LocationVersionAppliesFrom
  imageUrl?: string
  generationPrompt?: string
  needsImageRegen?: boolean
  reason?: string
  createdAt?: string
}

export interface LocationVersionSyncUpdate {
  versionId: string
  patch: Partial<ExistingLocationVersionLike>
  imageStale: boolean
  reason: string
}

export interface LocationVersionSyncCreate {
  name: string
  stateNotes: string
  sceneNumbers: number[]
  appliesFrom?: LocationVersionAppliesFrom
  reason: string
}

export interface LocationVersionSyncObsolete {
  versionId: string
  name: string
  reason: string
}

export interface LocationVersionSyncDiff {
  locationId: string
  locationName: string
  updates: LocationVersionSyncUpdate[]
  creates: LocationVersionSyncCreate[]
  obsolete: LocationVersionSyncObsolete[]
  analysis?: string
}

export interface MergeLocationVersionSyncResult {
  versions: ExistingLocationVersionLike[]
  staleVersionIds: string[]
}

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
  'for',
  'by',
  'from',
  'as',
  'same',
  'location',
  'set',
  'room',
])

function significantTokens(text: string): Set<string> {
  const cleaned = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  return new Set(
    cleaned
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  )
}

export function tokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  return intersection / (a.size + b.size - intersection)
}

const NOTES_SIMILARITY_THRESHOLD = 0.85
const NOTES_COVERAGE_THRESHOLD = 0.7

export function isLocationStateNotesChanged(before?: string, after?: string): boolean {
  const b = (before || '').trim()
  const a = (after || '').trim()
  if (!b && !a) return false
  if (!b || !a) return true
  return tokenJaccard(significantTokens(b), significantTokens(a)) < NOTES_SIMILARITY_THRESHOLD
}

export function notesCoverState(existingNotes: string, nextNotes: string): boolean {
  const next = (nextNotes || '').trim()
  if (!next) return true
  const existing = (existingNotes || '').trim()
  if (!existing) return false
  const nextTokens = significantTokens(next)
  if (nextTokens.size === 0) return true
  let covered = 0
  const existingSet = significantTokens(existing)
  for (const token of nextTokens) {
    if (existingSet.has(token)) covered++
  }
  return covered / nextTokens.size >= NOTES_COVERAGE_THRESHOLD
}

function sceneOverlapScore(a?: number[], b?: number[]): number {
  if (!a?.length || !b?.length) return 0
  const setB = new Set(b)
  let shared = 0
  for (const n of a) {
    if (setB.has(n)) shared++
  }
  return shared / Math.max(a.length, b.length)
}

function canonicalName(name: string): string {
  return (name || '').trim().toLowerCase()
}

function normalizeSceneNumbers(nums?: number[]): number[] {
  if (!Array.isArray(nums)) return []
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b)
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function appliesFromEqual(
  a?: LocationVersionAppliesFrom,
  b?: LocationVersionAppliesFrom
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.sceneNumber === b.sceneNumber && a.beatIndex === b.beatIndex
}

export function matchSuggestionToExistingVersion(
  suggestion: LocationVersionSuggestionLike,
  existing: ExistingLocationVersionLike[],
  claimedIds: Set<string>
): ExistingLocationVersionLike | null {
  const candidates = existing.filter((v) => !claimedIds.has(v.id))
  if (candidates.length === 0) return null

  const suggestionName = canonicalName(suggestion.name)
  const byName = candidates.find((v) => canonicalName(v.name) === suggestionName)
  if (byName) return byName

  const suggestionTokens = significantTokens(suggestion.stateNotes)
  let best: ExistingLocationVersionLike | null = null
  let bestScore = 0

  for (const version of candidates) {
    const notesScore = tokenJaccard(suggestionTokens, significantTokens(version.stateNotes))
    const sceneScore = sceneOverlapScore(suggestion.sceneNumbers, version.sceneNumbers)
    const score = notesScore * 0.8 + sceneScore * 0.2
    if (notesScore >= 0.5 && score > bestScore) {
      best = version
      bestScore = score
    } else if (sceneScore >= 0.5 && notesScore >= 0.35 && score > bestScore) {
      best = version
      bestScore = score
    }
  }

  return bestScore >= 0.4 ? best : null
}

/**
 * Later versions must carry earlier lasting damage (door gone AND later fire).
 */
export function accumulateStateNotes(
  versions: Array<{ stateNotes: string; appliesFrom?: LocationVersionAppliesFrom; sceneNumbers?: number[] }>
): string[] {
  const ordered = versions
    .map((v, index) => ({ ...v, index }))
    .sort((a, b) => {
      const aStart = a.appliesFrom
        ? { sceneNumber: a.appliesFrom.sceneNumber, beatIndex: a.appliesFrom.beatIndex }
        : versionStart({
            id: '',
            name: '',
            stateNotes: a.stateNotes,
            sceneNumbers: a.sceneNumbers,
            createdAt: '',
          })
      const bStart = b.appliesFrom
        ? { sceneNumber: b.appliesFrom.sceneNumber, beatIndex: b.appliesFrom.beatIndex }
        : versionStart({
            id: '',
            name: '',
            stateNotes: b.stateNotes,
            sceneNumbers: b.sceneNumbers,
            createdAt: '',
          })
      if (!aStart && !bStart) return a.index - b.index
      if (!aStart) return -1
      if (!bStart) return 1
      return compareBeatPosition(aStart, bStart)
    })

  const accumulated: string[] = new Array(versions.length).fill('')
  let running = ''
  for (const item of ordered) {
    const notes = (item.stateNotes || '').trim()
    if (!running) {
      running = notes
    } else if (notes && !notesCoverState(notes, running)) {
      running = running ? `${running}; ${notes}` : notes
    } else if (notes) {
      running = notes
    }
    accumulated[item.index] = running
  }
  return accumulated
}

export function buildLocationVersionSyncDiff(
  locationId: string,
  locationName: string,
  existing: ExistingLocationVersionLike[],
  suggestions: LocationVersionSuggestionLike[],
  analysis?: string
): LocationVersionSyncDiff {
  const claimedIds = new Set<string>()
  const updates: LocationVersionSyncUpdate[] = []
  const creates: LocationVersionSyncCreate[] = []

  const withAccumulated = suggestions.map((s, i) => ({ ...s, i }))
  const accumulatedNotes = accumulateStateNotes(suggestions)

  for (let i = 0; i < withAccumulated.length; i++) {
    const suggestion = withAccumulated[i]
    const sceneNumbers = normalizeSceneNumbers(suggestion.sceneNumbers)
    const stateNotes = accumulatedNotes[i] || suggestion.stateNotes
    const match = matchSuggestionToExistingVersion(
      { ...suggestion, stateNotes },
      existing,
      claimedIds
    )

    if (!match) {
      creates.push({
        name: suggestion.name,
        stateNotes,
        sceneNumbers,
        appliesFrom: suggestion.appliesFrom,
        reason: suggestion.reason,
      })
      continue
    }

    claimedIds.add(match.id)

    const nextNotes = stateNotes.trim() || match.stateNotes
    const notesChanged = isLocationStateNotesChanged(match.stateNotes, nextNotes)
    const nextScenes =
      sceneNumbers.length > 0 ? sceneNumbers : normalizeSceneNumbers(match.sceneNumbers)
    const scenesChanged = !arraysEqual(nextScenes, normalizeSceneNumbers(match.sceneNumbers))
    const nameChanged = canonicalName(suggestion.name) !== canonicalName(match.name)
    const appliesChanged = !appliesFromEqual(suggestion.appliesFrom, match.appliesFrom)
    const imageStale = notesChanged

    if (!imageStale && !scenesChanged && !nameChanged && !appliesChanged) continue

    const patch: Partial<ExistingLocationVersionLike> = {}
    if (nameChanged) patch.name = suggestion.name
    if ((nextNotes || '') !== (match.stateNotes || '')) patch.stateNotes = nextNotes
    if (scenesChanged) patch.sceneNumbers = nextScenes
    if (appliesChanged && suggestion.appliesFrom) patch.appliesFrom = suggestion.appliesFrom
    if (suggestion.reason) patch.reason = suggestion.reason
    if (imageStale) patch.needsImageRegen = true

    updates.push({
      versionId: match.id,
      patch,
      imageStale,
      reason: suggestion.reason || 'Updated from script sync',
    })
  }

  const obsolete: LocationVersionSyncObsolete[] = existing
    .filter((v) => !claimedIds.has(v.id))
    .map((v) => ({
      versionId: v.id,
      name: v.name,
      reason: 'No longer referenced by any synced set-state version',
    }))

  return {
    locationId,
    locationName,
    updates,
    creates,
    obsolete,
    analysis,
  }
}

export function mergeLocationVersionSyncDiff(
  existing: ExistingLocationVersionLike[],
  diff: LocationVersionSyncDiff,
  options?: { removeObsolete?: boolean; now?: string }
): MergeLocationVersionSyncResult {
  const now = options?.now || new Date().toISOString()
  const staleVersionIds: string[] = []
  const byId = new Map(existing.map((v) => [v.id, { ...v }]))

  for (const update of diff.updates) {
    const current = byId.get(update.versionId)
    if (!current) continue
    const next = { ...current, ...update.patch }
    if (update.imageStale) {
      next.needsImageRegen = true
      staleVersionIds.push(current.id)
    }
    byId.set(update.versionId, next)
  }

  for (const obsolete of diff.obsolete) {
    const current = byId.get(obsolete.versionId)
    if (!current) continue
    if (options?.removeObsolete) {
      byId.delete(obsolete.versionId)
      continue
    }
    byId.set(obsolete.versionId, {
      ...current,
      sceneNumbers: [],
      reason: obsolete.reason,
    })
  }

  const versions = Array.from(byId.values())

  for (let i = 0; i < diff.creates.length; i++) {
    const create = diff.creates[i]
    versions.push({
      id: `loc-ver-sync-${Date.now()}-${i}`,
      name: create.name,
      stateNotes: create.stateNotes,
      sceneNumbers: normalizeSceneNumbers(create.sceneNumbers),
      appliesFrom: create.appliesFrom,
      reason: create.reason,
      createdAt: now,
      needsImageRegen: true,
    })
  }

  return { versions, staleVersionIds }
}

/** Merge beat-derived set-state notes into suggestions when the LLM omitted them. */
export function enrichSuggestionsWithBeatLocationState(
  suggestions: LocationVersionSuggestionLike[],
  scenes: LocationAnalysisSceneInput[],
  existing?: ExistingLocationVersionLike[]
): LocationVersionSuggestionLike[] {
  const hits = scenes.flatMap((scene) => extractLocationStateHitsFromScene(scene))
  if (hits.length === 0) return suggestions

  const enriched = suggestions.map((s) => ({ ...s }))

  for (const hit of hits) {
    const matching = enriched.filter((s) => s.sceneNumbers?.includes(hit.sceneNumber))
    const covering = matching.find((s) => notesCoverState(s.stateNotes || '', hit.notes))
    if (covering) {
      if (!covering.appliesFrom) {
        covering.appliesFrom = {
          sceneNumber: hit.sceneNumber,
          beatIndex: hit.beatIndex,
          beatId: hit.beatId,
        }
      }
      continue
    }

    if (matching.length > 0) {
      const target = matching[0]
      const existingMatch = existing?.length
        ? matchSuggestionToExistingVersion(target, existing, new Set())
        : null
      if (existingMatch && notesCoverState(existingMatch.stateNotes || '', hit.notes)) {
        continue
      }
      target.stateNotes = target.stateNotes?.trim()
        ? `${target.stateNotes}; ${hit.notes}`
        : hit.notes
      if (!target.appliesFrom) {
        target.appliesFrom = {
          sceneNumber: hit.sceneNumber,
          beatIndex: hit.beatIndex,
          beatId: hit.beatId,
        }
      }
      continue
    }

    enriched.push({
      name: `Scene ${hit.sceneNumber} — Set change`,
      stateNotes: hit.notes,
      sceneNumbers: [hit.sceneNumber],
      appliesFrom: {
        sceneNumber: hit.sceneNumber,
        beatIndex: hit.beatIndex,
        beatId: hit.beatId,
      },
      reason: `Beat-level set change detected: ${hit.notes}`,
      confidence: 0.75,
    })
  }

  return enriched
}

export function summarizeLocationVersionSyncDiff(diff: LocationVersionSyncDiff): {
  updateCount: number
  createCount: number
  obsoleteCount: number
  staleImageCount: number
} {
  return {
    updateCount: diff.updates.length,
    createCount: diff.creates.length,
    obsoleteCount: diff.obsolete.length,
    staleImageCount: diff.updates.filter((u) => u.imageStale).length + diff.creates.length,
  }
}

export interface DirectedLocationVersionInput {
  name: string
  stateNotes: string
  appliesFrom: LocationVersionAppliesFrom
}

/** User-directed set version. Sticky-forward from `appliesFrom` like script-sync versions. */
export function appendDirectedLocationVersion(
  location: LocationReference,
  input: DirectedLocationVersionInput,
  options?: { now?: string; versionId?: string }
): { location: LocationReference; version: LocationVersion } {
  const now = options?.now || new Date().toISOString()
  const name = input.name.trim()
  const stateNotes = input.stateNotes.trim()
  const sceneNumber = input.appliesFrom.sceneNumber
  const version: LocationVersion = {
    id: options?.versionId || `loc-ver-directed-${Date.now()}`,
    name,
    stateNotes,
    sceneNumbers: Number.isFinite(sceneNumber) && sceneNumber > 0 ? [sceneNumber] : [],
    appliesFrom: { ...input.appliesFrom },
    createdAt: now,
    needsImageRegen: true,
  }
  return {
    location: {
      ...location,
      versions: [...(location.versions || []), version],
    },
    version,
  }
}

/** First generate that picks a version without appliesFrom starts it at this beat. */
export function stampLocationVersionAppliesFrom(
  location: LocationReference,
  versionId: string,
  appliesFrom: LocationVersionAppliesFrom
): LocationReference {
  const versions = (location.versions || []).map((version) => {
    if (version.id !== versionId) return version
    if (version.appliesFrom) return version
    const sceneNumbers = Array.isArray(version.sceneNumbers) ? [...version.sceneNumbers] : []
    if (
      Number.isFinite(appliesFrom.sceneNumber) &&
      appliesFrom.sceneNumber > 0 &&
      !sceneNumbers.includes(appliesFrom.sceneNumber)
    ) {
      sceneNumbers.push(appliesFrom.sceneNumber)
      sceneNumbers.sort((a, b) => a - b)
    }
    return { ...version, appliesFrom, sceneNumbers }
  })
  return { ...location, versions }
}
