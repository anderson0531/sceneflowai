/**
 * Script → wardrobe sync: match AI suggestions onto existing looks,
 * produce a non-destructive merge diff, and apply it.
 */

import { toCanonicalName } from '@/lib/character/canonical'
import {
  distillAppearanceNotesFromText,
  extractAppearanceNotesFromSceneText,
  type WardrobeAnalysisSceneInput,
} from '@/lib/character/wardrobeAnalysis'

export interface WardrobeSuggestionLike {
  name: string
  description: string
  accessories?: string
  appearanceNotes?: string
  sceneNumbers: number[]
  reason: string
  confidence?: number
}

export interface ExistingWardrobeLike {
  id: string
  name: string
  description: string
  accessories?: string
  appearanceNotes?: string
  sceneNumbers?: number[]
  previewImageUrl?: string
  headshotUrl?: string
  fullBodyUrl?: string
  isDefault?: boolean
  createdAt?: string
  reason?: string
  /** When true, wardrobe image should be regenerated after sync */
  needsImageRegen?: boolean
}

export interface WardrobeSyncUpdate {
  wardrobeId: string
  patch: Partial<ExistingWardrobeLike>
  imageStale: boolean
  reason: string
}

export interface WardrobeSyncCreate {
  name: string
  description: string
  accessories?: string
  appearanceNotes?: string
  sceneNumbers: number[]
  reason: string
}

export interface WardrobeSyncObsolete {
  wardrobeId: string
  name: string
  reason: string
}

export interface WardrobeSyncDiff {
  characterId: string
  characterName: string
  updates: WardrobeSyncUpdate[]
  creates: WardrobeSyncCreate[]
  obsolete: WardrobeSyncObsolete[]
  analysis?: string
}

export interface MergeWardrobeSyncResult {
  wardrobes: ExistingWardrobeLike[]
  staleWardrobeIds: string[]
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
  'outfit',
  'look',
  'wearing',
])

function significantTokens(text: string): Set<string> {
  const cleaned = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
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

export function wardrobeContentFingerprint(w: {
  description?: string
  accessories?: string
  appearanceNotes?: string
}): string {
  return [
    (w.description || '').trim().toLowerCase(),
    (w.accessories || '').trim().toLowerCase(),
    (w.appearanceNotes || '').trim().toLowerCase(),
  ].join('|')
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

/**
 * Match a suggestion to an unmatched existing wardrobe.
 * Prefer exact name, then description similarity, then scene overlap + description.
 */
export function matchSuggestionToExisting(
  suggestion: WardrobeSuggestionLike,
  existing: ExistingWardrobeLike[],
  claimedIds: Set<string>
): ExistingWardrobeLike | null {
  const candidates = existing.filter((w) => !claimedIds.has(w.id))
  if (candidates.length === 0) return null

  const suggestionName = toCanonicalName(suggestion.name).toLowerCase()
  const byName = candidates.find(
    (w) => toCanonicalName(w.name).toLowerCase() === suggestionName
  )
  if (byName) return byName

  const suggestionTokens = significantTokens(
    `${suggestion.description} ${suggestion.accessories || ''} ${suggestion.appearanceNotes || ''}`
  )

  let best: ExistingWardrobeLike | null = null
  let bestScore = 0

  for (const wardrobe of candidates) {
    const descTokens = significantTokens(
      `${wardrobe.description} ${wardrobe.accessories || ''} ${wardrobe.appearanceNotes || ''}`
    )
    const descScore = tokenJaccard(suggestionTokens, descTokens)
    const sceneScore = sceneOverlapScore(suggestion.sceneNumbers, wardrobe.sceneNumbers)
    const score = descScore * 0.75 + sceneScore * 0.25

    if (descScore >= 0.5 && score > bestScore) {
      best = wardrobe
      bestScore = score
    } else if (sceneScore >= 0.5 && descScore >= 0.35 && score > bestScore) {
      best = wardrobe
      bestScore = score
    }
  }

  return bestScore >= 0.4 ? best : null
}

function normalizeSceneNumbers(nums?: number[]): number[] {
  if (!Array.isArray(nums)) return []
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))].sort(
    (a, b) => a - b
  )
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

/**
 * Build a sync diff from AI suggestions against existing wardrobes.
 * Does not filter out name matches — updates them instead.
 */
export function buildWardrobeSyncDiff(
  characterId: string,
  characterName: string,
  existing: ExistingWardrobeLike[],
  suggestions: WardrobeSuggestionLike[],
  analysis?: string
): WardrobeSyncDiff {
  const claimedIds = new Set<string>()
  const updates: WardrobeSyncUpdate[] = []
  const creates: WardrobeSyncCreate[] = []

  for (const suggestion of suggestions) {
    const sceneNumbers = normalizeSceneNumbers(suggestion.sceneNumbers)
    const match = matchSuggestionToExisting(suggestion, existing, claimedIds)

    if (!match) {
      creates.push({
        name: suggestion.name,
        description: suggestion.description,
        accessories: suggestion.accessories,
        appearanceNotes: suggestion.appearanceNotes,
        sceneNumbers,
        reason: suggestion.reason,
      })
      continue
    }

    claimedIds.add(match.id)

    const nextDescription = suggestion.description?.trim() || match.description
    const nextAccessories =
      suggestion.accessories !== undefined
        ? suggestion.accessories
        : match.accessories
    const nextNotes =
      suggestion.appearanceNotes !== undefined
        ? suggestion.appearanceNotes
        : match.appearanceNotes

    const beforeFp = wardrobeContentFingerprint(match)
    const afterFp = wardrobeContentFingerprint({
      description: nextDescription,
      accessories: nextAccessories,
      appearanceNotes: nextNotes,
    })
    const imageStale = beforeFp !== afterFp
    const nextScenes = sceneNumbers.length > 0 ? sceneNumbers : normalizeSceneNumbers(match.sceneNumbers)
    const scenesChanged = !arraysEqual(
      nextScenes,
      normalizeSceneNumbers(match.sceneNumbers)
    )
    const nameChanged =
      toCanonicalName(suggestion.name).toLowerCase() !==
      toCanonicalName(match.name).toLowerCase()

    if (!imageStale && !scenesChanged && !nameChanged) {
      // Still record a no-op update so the look is "claimed" and not obsolete —
      // but skip empty patches by only pushing when something meaningful changed.
      // Scene remap with identical numbers is fine to skip.
      continue
    }

    const patch: Partial<ExistingWardrobeLike> = {}
    if (nameChanged) patch.name = suggestion.name
    if (nextDescription !== match.description) patch.description = nextDescription
    if ((nextAccessories || '') !== (match.accessories || '')) {
      patch.accessories = nextAccessories
    }
    if ((nextNotes || '') !== (match.appearanceNotes || '')) {
      patch.appearanceNotes = nextNotes
    }
    if (scenesChanged) patch.sceneNumbers = nextScenes
    if (suggestion.reason) patch.reason = suggestion.reason
    if (imageStale) patch.needsImageRegen = true

    updates.push({
      wardrobeId: match.id,
      patch,
      imageStale,
      reason: suggestion.reason || 'Updated from script sync',
    })
  }

  const obsolete: WardrobeSyncObsolete[] = existing
    .filter((w) => !claimedIds.has(w.id))
    .map((w) => ({
      wardrobeId: w.id,
      name: w.name,
      reason: 'No longer referenced by any synced script look',
    }))

  return {
    characterId,
    characterName,
    updates,
    creates,
    obsolete,
    analysis,
  }
}

/**
 * Apply a sync diff onto existing wardrobes without wiping unchanged images.
 * Soft-obsolete: clear sceneNumbers; keep looks (and images) unless removeObsolete.
 */
export function mergeWardrobeSyncDiff(
  existing: ExistingWardrobeLike[],
  diff: WardrobeSyncDiff,
  options?: { removeObsolete?: boolean; now?: string }
): MergeWardrobeSyncResult {
  const now = options?.now || new Date().toISOString()
  const staleWardrobeIds: string[] = []
  const byId = new Map(existing.map((w) => [w.id, { ...w }]))

  for (const update of diff.updates) {
    const current = byId.get(update.wardrobeId)
    if (!current) continue
    const next = { ...current, ...update.patch }
    if (update.imageStale) {
      next.needsImageRegen = true
      next.fullBodyUrl = undefined
      next.headshotUrl = undefined
      next.previewImageUrl = undefined
      staleWardrobeIds.push(current.id)
    }
    byId.set(update.wardrobeId, next)
  }

  for (const obsolete of diff.obsolete) {
    const current = byId.get(obsolete.wardrobeId)
    if (!current) continue
    if (options?.removeObsolete) {
      byId.delete(obsolete.wardrobeId)
      continue
    }
    byId.set(obsolete.wardrobeId, {
      ...current,
      sceneNumbers: [],
      reason: obsolete.reason,
    })
  }

  let wardrobes = Array.from(byId.values())

  for (let i = 0; i < diff.creates.length; i++) {
    const create = diff.creates[i]
    wardrobes.push({
      id: `wardrobe-sync-${Date.now()}-${i}`,
      name: create.name,
      description: create.description,
      accessories: create.accessories,
      appearanceNotes: create.appearanceNotes,
      sceneNumbers: normalizeSceneNumbers(create.sceneNumbers),
      reason: create.reason,
      isDefault: false,
      createdAt: now,
      needsImageRegen: true,
    })
    // New looks need images; caller regenerates via UI.
  }

  // Ensure exactly one default
  if (wardrobes.length > 0) {
    const hasDefault = wardrobes.some((w) => w.isDefault)
    if (!hasDefault) {
      // Prefer a look that still has sceneNumbers
      const withScenes = wardrobes.find((w) => (w.sceneNumbers?.length || 0) > 0)
      const target = withScenes || wardrobes[0]
      wardrobes = wardrobes.map((w) => ({
        ...w,
        isDefault: w.id === target.id,
      }))
    } else {
      let seen = false
      wardrobes = wardrobes.map((w) => {
        if (!w.isDefault) return w
        if (seen) return { ...w, isDefault: false }
        seen = true
        return w
      })
    }
  }

  return { wardrobes, staleWardrobeIds }
}

/** Merge beat-derived appearance notes into suggestions when AI omitted them. */
export function enrichSuggestionsWithBeatAppearanceNotes(
  suggestions: WardrobeSuggestionLike[],
  characterScenes: WardrobeAnalysisSceneInput[],
  characterName: string
): WardrobeSuggestionLike[] {
  if (characterScenes.length === 0) return suggestions

  const sceneAppearanceMap = new Map<number, string>()
  for (const scene of characterScenes) {
    const rawNotes = extractAppearanceNotesFromSceneText(scene, characterName)
    const distilled = rawNotes
      .map((n) => distillAppearanceNotesFromText(n))
      .filter(Boolean) as string[]
    if (distilled.length > 0) {
      sceneAppearanceMap.set(scene.sceneNumber, distilled.join('; '))
    }
  }

  if (sceneAppearanceMap.size === 0) return suggestions

  const enriched = suggestions.map((s) => ({ ...s }))

  for (const [sceneNum, notes] of sceneAppearanceMap) {
    const matching = enriched.filter((s) => s.sceneNumbers?.includes(sceneNum))
    const withNotes = matching.find((s) => s.appearanceNotes?.trim())

    if (withNotes) continue

    if (matching.length > 0) {
      const target = matching[0]
      target.appearanceNotes = notes
      if (
        !target.reason.toLowerCase().includes('bruise') &&
        !target.reason.toLowerCase().includes('bloodshot')
      ) {
        target.reason = `${target.reason} Beat-level appearance: ${notes}.`.trim()
      }
    } else if (enriched.length > 0) {
      const nearest =
        enriched.find((s) => s.sceneNumbers?.includes(sceneNum)) ?? enriched[0]
      nearest.appearanceNotes = notes
    } else {
      enriched.push({
        name: `Scene ${sceneNum} — Distressed Look`,
        description: 'Same outfit as baseline — appearance change only',
        appearanceNotes: notes,
        sceneNumbers: [sceneNum],
        reason: `Beat-level appearance details detected: ${notes}`,
        confidence: 0.75,
      })
    }
  }

  return enriched
}

export function summarizeWardrobeSyncDiff(diff: WardrobeSyncDiff): {
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
