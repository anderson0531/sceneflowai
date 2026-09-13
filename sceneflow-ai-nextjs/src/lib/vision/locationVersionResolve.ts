/**
 * Resolve which nested location version a beat should use.
 *
 * Versions are sticky-forward: once a lasting set change starts, later beats
 * at the same location keep that look until a newer version's start.
 */

import type { LocationReference, LocationVersion } from '@/types/visionReferences'

export const LOCATION_VERSION_REQUIREMENT_SEP = '::'

export function locationVersionRequirementId(locationId: string, versionId: string): string {
  return `${locationId}${LOCATION_VERSION_REQUIREMENT_SEP}${versionId}`
}

export function parseLocationVersionRequirementId(
  id: string
): { locationId: string; versionId: string } | null {
  const idx = String(id || '').indexOf(LOCATION_VERSION_REQUIREMENT_SEP)
  if (idx <= 0) return null
  const locationId = id.slice(0, idx).trim()
  const versionId = id.slice(idx + LOCATION_VERSION_REQUIREMENT_SEP.length).trim()
  if (!locationId || !versionId) return null
  return { locationId, versionId }
}

export function isLocationVersionRequirementId(id: string): boolean {
  return parseLocationVersionRequirementId(id) !== null
}

export type BeatPosition = {
  sceneNumber: number
  beatIndex: number
}

export function compareBeatPosition(a: BeatPosition, b: BeatPosition): number {
  if (a.sceneNumber !== b.sceneNumber) return a.sceneNumber - b.sceneNumber
  return a.beatIndex - b.beatIndex
}

export function versionStart(version: LocationVersion): BeatPosition | null {
  if (
    version.appliesFrom &&
    Number.isFinite(version.appliesFrom.sceneNumber) &&
    Number.isFinite(version.appliesFrom.beatIndex)
  ) {
    return {
      sceneNumber: version.appliesFrom.sceneNumber,
      beatIndex: version.appliesFrom.beatIndex,
    }
  }
  const scenes = (version.sceneNumbers || []).filter((n) => Number.isFinite(n) && n > 0)
  if (scenes.length === 0) return null
  return { sceneNumber: Math.min(...scenes), beatIndex: 0 }
}

export function findLocationVersion(
  location: Pick<LocationReference, 'versions'> | null | undefined,
  versionId: string | null | undefined
): LocationVersion | null {
  if (!versionId) return null
  const versions = Array.isArray(location?.versions) ? location!.versions! : []
  return versions.find((version) => version.id === versionId) ?? null
}

export function resolveLocationVersionForBeat(
  location: Pick<LocationReference, 'versions'> | null | undefined,
  beat: { sceneNumber: number; beatIndex: number; beatId?: string },
  explicitVersionId?: string | null
): LocationVersion | null {
  const versions = Array.isArray(location?.versions) ? location!.versions! : []
  if (versions.length === 0) return null

  if (explicitVersionId) {
    return versions.find((version) => version.id === explicitVersionId) ?? null
  }

  const current: BeatPosition = {
    sceneNumber: beat.sceneNumber,
    beatIndex: beat.beatIndex,
  }

  let best: LocationVersion | null = null
  let bestStart: BeatPosition | null = null
  for (const version of versions) {
    const start = versionStart(version)
    if (!start) continue
    if (compareBeatPosition(start, current) > 0) continue
    if (!best || !bestStart || compareBeatPosition(start, bestStart) >= 0) {
      best = version
      bestStart = start
    }
  }
  return best
}

/**
 * Clone a location so generation attaches the version still (or the base
 * when the version has no image yet). Parent `id` is preserved for labels.
 */
export function locationReferenceForGeneration(
  location: LocationReference,
  versionId?: string | null
): LocationReference {
  if (!versionId) {
    const { boundVersionId: _ignored, ...rest } = location
    return rest
  }
  const version = findLocationVersion(location, versionId)
  if (!version?.imageUrl?.trim()) return location
  return {
    ...location,
    imageUrl: version.imageUrl,
    generationPrompt: version.generationPrompt ?? location.generationPrompt,
    boundVersionId: version.id,
  }
}

/** After the base establishing shot changes, existing version images are stale. */
export function withStaleVersionsAfterBaseChange(
  location: LocationReference
): LocationReference {
  const versions = (location.versions || []).map((version) =>
    version.imageUrl?.trim() ? { ...version, needsImageRegen: true } : version
  )
  return { ...location, versions }
}

export function patchLocationVersion(
  location: LocationReference,
  versionId: string,
  patch: Partial<LocationVersion>
): LocationReference {
  const versions = (location.versions || []).map((version) =>
    version.id === versionId ? { ...version, ...patch } : version
  )
  return { ...location, versions }
}
