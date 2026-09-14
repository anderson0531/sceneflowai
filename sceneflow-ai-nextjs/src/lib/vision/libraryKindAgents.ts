/**
 * Shared helpers for Cast / Location / Object Agents and the Update
 * catalog step that those agents run first.
 */

import type { LocationReference, LocationVersion } from '@/types/visionReferences'
import {
  mergeLocationVersionSyncDiff,
  summarizeLocationVersionSyncDiff,
  type LocationVersionSyncDiff,
} from '@/lib/vision/locationScriptSync'
import type { ReferenceExpressKind } from '@/lib/vision/referenceExpress/types'

export type ExtractedHeadingLocation = {
  location: string
  intExt?: LocationReference['intExt']
  timeOfDay?: string
  headings: string[]
  sceneNumbers: number[]
  description: string
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

export function referenceExpressAgentLabel(kinds?: ReferenceExpressKind[]): string {
  if (!kinds?.length) return 'Library Agent'
  if (kinds.length === 1) {
    if (kinds[0] === 'cast') return 'Cast Agent'
    if (kinds[0] === 'location') return 'Location Agent'
    if (kinds[0] === 'prop') return 'Object Agent'
  }
  return 'Library Agent'
}

/** Missing identity stills plus wardrobe looks flagged for regeneration. */
export function countCastAgentItems(
  characters: Array<{
    type?: string
    referenceImage?: string
    wardrobes?: Array<{ needsImageRegen?: boolean }>
  }>
): number {
  let n = 0
  for (const character of characters) {
    if (character.type === 'narrator' || character.type === 'description') continue
    if (!hasImage(character.referenceImage)) n++
    for (const wardrobe of character.wardrobes || []) {
      if (wardrobe.needsImageRegen) n++
    }
  }
  return n
}

/**
 * A version is drawable once the parent has a base still, the version has
 * set-state notes, and the version still is missing or marked stale.
 */
export function locationVersionNeedsGeneration(
  location: { imageUrl?: string },
  version: { stateNotes?: string; imageUrl?: string; needsImageRegen?: boolean }
): boolean {
  if (!hasImage(location.imageUrl)) return false
  if (!version.stateNotes?.trim()) return false
  return !hasImage(version.imageUrl) || !!version.needsImageRegen
}

export function countLocationAgentItems(
  locations: Array<{
    imageUrl?: string
    versions?: Array<{ stateNotes?: string; imageUrl?: string; needsImageRegen?: boolean }>
  }>
): number {
  let n = 0
  for (const location of locations) {
    if (!hasImage(location.imageUrl)) n++
    for (const version of location.versions || []) {
      if (!version.stateNotes?.trim()) continue
      if (!hasImage(version.imageUrl) || version.needsImageRegen) n++
    }
  }
  return n
}

export function countObjectAgentItems(
  objects: Array<{ imageUrl?: string }>
): number {
  return objects.filter((object) => !hasImage(object.imageUrl)).length
}

/** Ids whose bases are still empty — snapshot this *after* catalog extract. */
export function idsMissingLocationBase(
  locations: Array<{ id: string; imageUrl?: string }>
): string[] {
  return locations.filter((location) => !hasImage(location.imageUrl)).map((location) => location.id)
}

/**
 * Locations that had no base when Express started and now do — the ones
 * whose set versions still need a first script sync.
 */
export function locationsThatGainedBase<T extends { id: string; imageUrl?: string }>(
  locations: T[],
  idsMissingBase: Iterable<string>
): T[] {
  const missing = new Set(idsMissingBase)
  return locations.filter((location) => missing.has(location.id) && hasImage(location.imageUrl))
}

export function collectMissingExtractedLocations(
  extracted: ExtractedHeadingLocation[],
  existing: Array<{ location: string }>
): ExtractedHeadingLocation[] {
  const existingNames = new Set(existing.map((row) => row.location))
  return extracted.filter((row) => !existingNames.has(row.location))
}

export function toLocationReferenceFromExtracted(
  loc: ExtractedHeadingLocation,
  id: string
): LocationReference {
  return {
    id,
    location: loc.location,
    locationDisplay: loc.headings[0] || loc.location,
    imageUrl: '',
    sourceSceneIndex: loc.sceneNumbers[0] - 1,
    sourceSceneHeading: loc.headings[0] || loc.location,
    pinnedAt: new Date().toISOString(),
    intExt: loc.intExt,
    timeOfDay: loc.timeOfDay,
    description: loc.description,
    sceneNumbers: loc.sceneNumbers,
    autoExtracted: true,
  }
}

/** Apply the sync-from-script merge (create / patch / soft-obsolete). */
export function applyLocationUpdateFromSyncDiff(
  location: LocationReference,
  diff: LocationVersionSyncDiff
): {
  location: LocationReference
  created: number
  updated: number
  stale: number
} {
  const { versions } = mergeLocationVersionSyncDiff(location.versions || [], diff)
  const summary = summarizeLocationVersionSyncDiff(diff)
  return {
    location: { ...location, versions: versions as LocationVersion[] },
    created: summary.createCount,
    updated: summary.updateCount,
    stale: summary.staleImageCount,
  }
}
