/**
 * Shared helpers for Cast / Location / Object Agents and the Update
 * catalog step that those agents run first.
 */

import type { LocationReference, LocationVersion } from '@/types/visionReferences'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import {
  mergeLocationVersionSyncDiff,
  summarizeLocationVersionSyncDiff,
  type LocationVersionSyncDiff,
} from '@/lib/vision/locationScriptSync'
import { locationDescriptionWithMountedFixtures } from '@/lib/vision/mountedSetFixtures'
import type { ReferenceExpressKind } from '@/lib/vision/referenceExpress/types'
import { resolveReferenceReadiness } from '@/lib/vision/referenceReadiness'

export type ExtractedHeadingLocation = {
  location: string
  intExt?: LocationReference['intExt']
  timeOfDay?: string
  headings: string[]
  sceneNumbers: number[]
  description: string
}

export type HeadingLocationScene = {
  heading?: string | { text?: string }
  sceneDirection?: {
    scene?: {
      location?: string
      atmosphere?: string
      keyProps?: string[]
    }
  }
  [key: string]: unknown
}

const SCENE_CODE_REGEX =
  /^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.\/EXT|EXT\.\/INT|INT\. |EXT\. |INT\/EXT|EXT\/INT|INT\.|EXT\.|INT|EXT)\s*(.*)$/i

function headingText(scene: HeadingLocationScene): string {
  const heading = scene.heading
  if (typeof heading === 'string') return heading
  return heading?.text || ''
}

function parseSceneHeadingMeta(heading: string): {
  intExt?: LocationReference['intExt']
  timeOfDay?: string
} {
  const match = heading.trim().toUpperCase().match(SCENE_CODE_REGEX)
  if (!match) return {}

  const codeRaw = match[1]?.toUpperCase().replace(/[\.\s]/g, '') || ''
  const intExt = (
    ['INT', 'EXT', 'INTEXT', 'EXTINT'].includes(codeRaw.replace('/', ''))
      ? (codeRaw
          .replace(/\./g, '')
          .replace('INTEXT', 'INT/EXT')
          .replace('EXTINT', 'EXT/INT') as LocationReference['intExt'])
      : undefined
  )

  const remainder = match[2]?.trim() || ''
  const parts = remainder.split(/\s+-\s+/)
  let timeOfDay: string | undefined
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]?.trim()
    if (lastPart) {
      const isModifier =
        /^(DAY|NIGHT|MORNING|EVENING|SUNSET|SUNRISE|DUSK|DAWN|CONTINUOUS|LATER|SAME|MOMENTS LATER)$/.test(
          lastPart
        ) ||
        /\bTO\b/.test(lastPart) ||
        /LATER$/.test(lastPart) ||
        /^(FLASHBACK|DREAM|MONTAGE)/.test(lastPart) ||
        /^(19|20)\d{2}$/.test(lastPart)
      if (isModifier) timeOfDay = lastPart
    }
  }
  return { intExt, timeOfDay }
}

/** Unique heading locations from the script, with scene numbers and set notes. */
export function extractHeadingLocationsFromScenes(
  scenes: HeadingLocationScene[]
): ExtractedHeadingLocation[] {
  const locationMap = new Map<
    string,
    {
      location: string
      intExt?: LocationReference['intExt']
      timeOfDay?: string
      headings: string[]
      sceneNumbers: number[]
      description?: string
    }
  >()

  scenes.forEach((scene, idx) => {
    const text = headingText(scene)
    if (!text) return
    const location = extractLocation(text)
    if (!location) return

    const existing = locationMap.get(location)
    if (existing) {
      existing.sceneNumbers.push(idx + 1)
      if (!existing.headings.includes(text)) existing.headings.push(text)
      return
    }

    const meta = parseSceneHeadingMeta(text)
    let description: string | undefined
    if (scene.sceneDirection?.scene?.location) {
      description = scene.sceneDirection.scene.location
      if (scene.sceneDirection.scene.atmosphere) {
        description += `. ${scene.sceneDirection.scene.atmosphere}`
      }
    }

    locationMap.set(location, {
      location,
      intExt: meta.intExt,
      timeOfDay: meta.timeOfDay,
      headings: [text],
      sceneNumbers: [idx + 1],
      description,
    })
  })

  return Array.from(locationMap.values()).map((loc) => ({
    ...loc,
    description: locationDescriptionWithMountedFixtures(loc, scenes),
  }))
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

export function referenceExpressAgentLabel(
  kinds?: ReferenceExpressKind[],
  options?: { sceneScoped?: boolean }
): string {
  if (options?.sceneScoped && !kinds?.length) return 'Scene Ref Agent'
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

type LocationAgentRow = {
  imageUrl?: string
  versions?: Array<{ stateNotes?: string; imageUrl?: string; needsImageRegen?: boolean }>
}

function pendingVersionCountForLocation(location: LocationAgentRow): number {
  let n = 0
  for (const version of location.versions || []) {
    if (!version.stateNotes?.trim()) continue
    if (!hasImage(version.imageUrl) || version.needsImageRegen) n++
  }
  return n
}

export type LocationCameraStatus = 'missing-base' | 'versions-pending' | 'ready'

export type LocationCameraStatusResult = {
  status: LocationCameraStatus
  pendingVersionCount: number
}

/**
 * Collapsed-row camera: gray until the base exists, amber while drawable
 * set versions remain, green only when the base and every noted version are done.
 */
export function locationCameraStatus(location: LocationAgentRow): LocationCameraStatusResult {
  const pendingVersionCount = pendingVersionCountForLocation(location)
  if (!hasImage(location.imageUrl)) {
    return { status: 'missing-base', pendingVersionCount }
  }
  if (pendingVersionCount > 0) {
    return { status: 'versions-pending', pendingVersionCount }
  }
  return { status: 'ready', pendingVersionCount: 0 }
}

export function countLocationAgentItems(locations: LocationAgentRow[]): number {
  let n = 0
  for (const location of locations) {
    if (!hasImage(location.imageUrl)) n++
    n += pendingVersionCountForLocation(location)
  }
  return n
}

/** Units for Location Agent button copy: bases vs set stills. */
export function locationAgentCopyUnits(locations: LocationAgentRow[]): {
  bases: number
  versions: number
} {
  const breakdown = summarizeLocationBreakdown(locations)
  return {
    bases: breakdown.missingBases,
    versions: breakdown.missingVersions + breakdown.staleVersions,
  }
}

export function countObjectAgentItems(
  objects: Array<{ imageUrl?: string }>
): number {
  return objects.filter((object) => !hasImage(object.imageUrl)).length
}

export type LibraryPrimaryAction = 'library' | 'location' | 'cast' | 'object'

export type LibraryActionReason =
  | 'missing-library-bases'
  | 'missing-location-bases'
  | 'stale-location-versions'
  | 'missing-location-versions'
  | 'missing-cast-identity'
  | 'stale-cast-wardrobes'
  | 'missing-objects'

export type LibraryTabAttention = 'missing' | 'stale' | 'ready'

export type LibraryTabKey = 'cast' | 'locations' | 'object'

export type LibraryRequiredActionsInput = {
  characters?: Array<{
    name?: string
    type?: string
    referenceImage?: string
    referenceImageUrl?: string
    wardrobes?: Array<{ needsImageRegen?: boolean }>
  }> | null
  locationReferences?: Array<{
    location?: string
    locationDisplay?: string
    name?: string
    imageUrl?: string
    versions?: Array<{ stateNotes?: string; imageUrl?: string; needsImageRegen?: boolean }>
  }> | null
  objectReferences?: Array<{ name?: string; imageUrl?: string }> | null
}

export type LibraryRequiredActionsSummary = {
  primaryAction: LibraryPrimaryAction | null
  reason: LibraryActionReason | null
  reasonCount: number
  libraryMissingTotal: number
  locationCount: number
  castCount: number
  objectCount: number
  locations: {
    missingBases: number
    missingVersions: number
    staleVersions: number
  }
  cast: {
    missingIdentity: number
    staleWardrobes: number
  }
  objects: {
    missing: number
  }
  tabAttention: {
    cast: LibraryTabAttention
    locations: LibraryTabAttention
    object: LibraryTabAttention
  }
}

function tabAttention(missing: number, stale: number): LibraryTabAttention {
  if (missing > 0) return 'missing'
  if (stale > 0) return 'stale'
  return 'ready'
}

function summarizeLocationBreakdown(
  locations: NonNullable<LibraryRequiredActionsInput['locationReferences']>
): LibraryRequiredActionsSummary['locations'] {
  let missingBases = 0
  let missingVersions = 0
  let staleVersions = 0
  for (const location of locations) {
    if (!hasImage(location.imageUrl)) missingBases++
    for (const version of location.versions || []) {
      if (!version.stateNotes?.trim()) continue
      if (!hasImage(version.imageUrl)) missingVersions++
      else if (version.needsImageRegen) staleVersions++
    }
  }
  return { missingBases, missingVersions, staleVersions }
}

function summarizeCastBreakdown(
  characters: NonNullable<LibraryRequiredActionsInput['characters']>
): LibraryRequiredActionsSummary['cast'] {
  let missingIdentity = 0
  let staleWardrobes = 0
  for (const character of characters) {
    if (character.type === 'narrator' || character.type === 'description') continue
    if (!hasImage(character.referenceImage)) missingIdentity++
    for (const wardrobe of character.wardrobes || []) {
      if (wardrobe.needsImageRegen) staleWardrobes++
    }
  }
  return { missingIdentity, staleWardrobes }
}

/**
 * What the Reference Library should shout about next: missing stills that
 * still gate frames (Library Agent), then leftover kind-agent work.
 */
export function summarizeLibraryRequiredActions(
  input: LibraryRequiredActionsInput
): LibraryRequiredActionsSummary {
  const characters = input.characters ?? []
  const locationReferences = input.locationReferences ?? []
  const objectReferences = input.objectReferences ?? []

  const readiness = resolveReferenceReadiness({
    characters,
    locationReferences,
    objectReferences,
  })
  const locations = summarizeLocationBreakdown(locationReferences)
  const cast = summarizeCastBreakdown(characters)
  const objects = { missing: countObjectAgentItems(objectReferences) }
  const locationCount = countLocationAgentItems(locationReferences)
  const castCount = countCastAgentItems(characters)
  const objectCount = objects.missing
  const libraryMissingTotal = readiness.missingTotal

  let primaryAction: LibraryPrimaryAction | null = null
  let reason: LibraryActionReason | null = null
  let reasonCount = 0

  if (libraryMissingTotal > 0) {
    primaryAction = 'library'
    const onlyLocations =
      readiness.missingCast.length === 0 &&
      readiness.missingObjects.length === 0 &&
      readiness.missingLocations.length > 0
    const onlyCast =
      readiness.missingLocations.length === 0 &&
      readiness.missingObjects.length === 0 &&
      readiness.missingCast.length > 0
    const onlyObjects =
      readiness.missingCast.length === 0 &&
      readiness.missingLocations.length === 0 &&
      readiness.missingObjects.length > 0
    if (onlyLocations) {
      reason = 'missing-location-bases'
      reasonCount = readiness.missingLocations.length
    } else if (onlyCast) {
      reason = 'missing-cast-identity'
      reasonCount = readiness.missingCast.length
    } else if (onlyObjects) {
      reason = 'missing-objects'
      reasonCount = readiness.missingObjects.length
    } else {
      reason = 'missing-library-bases'
      reasonCount = libraryMissingTotal
    }
  } else if (locationCount > 0) {
    primaryAction = 'location'
    reason = 'missing-location-versions'
    reasonCount = locations.missingVersions + locations.staleVersions
  } else if (castCount > 0) {
    primaryAction = 'cast'
    if (cast.staleWardrobes > 0) {
      reason = 'stale-cast-wardrobes'
      reasonCount = cast.staleWardrobes
    } else {
      reason = 'missing-cast-identity'
      reasonCount = cast.missingIdentity
    }
  } else if (objectCount > 0) {
    primaryAction = 'object'
    reason = 'missing-objects'
    reasonCount = objectCount
  }

  return {
    primaryAction,
    reason,
    reasonCount,
    libraryMissingTotal,
    locationCount,
    castCount,
    objectCount,
    locations,
    cast,
    objects,
    tabAttention: {
      cast: tabAttention(cast.missingIdentity, cast.staleWardrobes),
      locations: tabAttention(
        locations.missingBases + locations.missingVersions,
        locations.staleVersions
      ),
      object: tabAttention(objects.missing, 0),
    },
  }
}

/** Left-to-right gating stills first, then leftover kind-agent work. */
export function firstLibraryTabWithRequiredWork(
  summary: LibraryRequiredActionsSummary
): LibraryTabKey {
  if (summary.cast.missingIdentity > 0) return 'cast'
  if (summary.locations.missingBases > 0) return 'locations'
  if (summary.objects.missing > 0) return 'object'
  if (summary.locationCount > 0) return 'locations'
  if (summary.castCount > 0) return 'cast'
  if (summary.objectCount > 0) return 'object'
  return 'cast'
}

export function libraryTabForPrimaryAction(
  action: LibraryPrimaryAction | null,
  summary: LibraryRequiredActionsSummary
): LibraryTabKey {
  if (action === 'cast') return 'cast'
  if (action === 'location') return 'locations'
  if (action === 'object') return 'object'
  return firstLibraryTabWithRequiredWork(summary)
}

/** Kind agents run in the mounted tab; Library Agent runs from the parent. */
export function pendingKindAgentRunForAction(
  action: LibraryPrimaryAction | null
): ReferenceExpressKind | null {
  if (action === 'cast') return 'cast'
  if (action === 'location') return 'location'
  if (action === 'object') return 'prop'
  return null
}

export function kindAgentToolbarLabel(
  agentName: 'Cast Agent' | 'Location Agent' | 'Object Agent',
  count: number
): string {
  if (count > 0) return `Run ${agentName} — ${count} needed`
  return `${agentName} (${count})`
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
