import type { LocationReference, LocationVersion } from '@/types/visionReferences'
import { referenceExpressItemKey } from '@/lib/vision/referenceExpress/types'
import { resolveParentLocationAnchor, sortLocationsParentsFirst } from '@/lib/vision/locationFamily'
import { sortLocationVersionsChronologically } from '@/lib/vision/locationVersionResolve'

export type LocationAgentScopeMode = 'needs-action' | 'regenerate'

export type LocationAgentChecklistRow = {
  key: string
  locationId: string
  locationName: string
  versionId?: string
  name: string
  sceneNumbers: number[]
  hasImage: boolean
  needsImageRegen: boolean
  /** Base still is missing, so a checked version has to draw that still first. */
  baseMissing: boolean
  baseKey: string
  /** Chronological step index (0 for Base, 1..N for Set Versions). */
  stepIndex?: number
  /** Included because an upstream Base or earlier Set Version is updating. */
  cascadedFromUpstream?: boolean
  /** Parent complex base key when this sub-location's parent complex is missing its base. */
  parentBaseKey?: string
}

const hasStill = (url?: string): boolean => Boolean(url && url.trim())

export function locationStillKey(locationId: string, versionId?: string): string {
  return referenceExpressItemKey({
    kind: 'location',
    targetId: locationId,
    versionId,
  })
}

export function locationAgentSceneNumbers(locations: LocationReference[]): number[] {
  const scenes = new Set<number>()
  for (const location of locations) {
    for (const sceneNumber of location.sceneNumbers || []) {
      if (sceneNumber > 0) scenes.add(sceneNumber)
    }
    for (const version of location.versions || []) {
      for (const sceneNumber of version.sceneNumbers || []) {
        if (sceneNumber > 0) scenes.add(sceneNumber)
      }
      const applies = version.appliesFrom?.sceneNumber
      if (applies && applies > 0) scenes.add(applies)
    }
  }
  return [...scenes].sort((a, b) => a - b)
}

export function locationMatchesScene(
  location: LocationReference,
  sceneNumber: number | null
): boolean {
  if (sceneNumber == null) return true
  if (location.sceneNumbers?.includes(sceneNumber)) return true
  return (location.versions || []).some((version) => versionMatchesScene(version, sceneNumber))
}

export function versionMatchesScene(version: LocationVersion, sceneNumber: number | null): boolean {
  if (sceneNumber == null) return true
  if (version.sceneNumbers?.includes(sceneNumber)) return true
  if (version.appliesFrom?.sceneNumber === sceneNumber) return true
  const unscoped = (!version.sceneNumbers || version.sceneNumbers.length === 0) && !version.appliesFrom
  return unscoped
}

export function stillMatchesLocationAgentScope(
  mode: LocationAgentScopeMode,
  still: { hasImage: boolean; needsImageRegen?: boolean }
): boolean {
  if (mode === 'regenerate') return still.hasImage
  return !still.hasImage || !!still.needsImageRegen
}

export function locationAgentChecklist(
  locations: LocationReference[],
  options: { sceneNumber: number | null; mode: LocationAgentScopeMode }
): LocationAgentChecklistRow[] {
  const rows: LocationAgentChecklistRow[] = []
  const orderedLocations = sortLocationsParentsFirst(locations)

  for (const location of orderedLocations) {
    if (!location.id || !locationMatchesScene(location, options.sceneNumber)) continue
    const locationName = location.location?.trim() || location.locationDisplay?.trim() || 'Location'
    const baseKey = locationStillKey(location.id)
    const baseHasImage = hasStill(location.imageUrl)
    const baseMissing = !baseHasImage
    const parentAnchor = resolveParentLocationAnchor(location, orderedLocations)
    const parentLoc = parentAnchor?.parentLocation
    const parentBaseKey =
      parentLoc?.id && !hasStill(parentLoc.imageUrl)
        ? locationStillKey(parentLoc.id)
        : undefined

    const baseRow: LocationAgentChecklistRow = {
      key: baseKey,
      locationId: location.id,
      locationName,
      name: 'Base',
      sceneNumbers: [...(location.sceneNumbers || [])],
      hasImage: baseHasImage,
      needsImageRegen: false,
      baseMissing,
      baseKey,
      stepIndex: 0,
      ...(parentBaseKey ? { parentBaseKey } : {}),
    }
    const baseIncluded = stillMatchesLocationAgentScope(options.mode, baseRow)
    if (baseIncluded) rows.push(baseRow)

    let upstreamUpdating = baseIncluded
    const sortedVersions = sortLocationVersionsChronologically(location.versions || [])
    for (let idx = 0; idx < sortedVersions.length; idx++) {
      const version = sortedVersions[idx]!
      if (!version.id) continue
      const row: LocationAgentChecklistRow = {
        key: locationStillKey(location.id, version.id),
        locationId: location.id,
        locationName,
        versionId: version.id,
        name: version.name?.trim() || 'Set version',
        sceneNumbers: version.sceneNumbers?.length
          ? [...version.sceneNumbers]
          : version.appliesFrom
            ? [version.appliesFrom.sceneNumber]
            : [...(location.sceneNumbers || [])],
        hasImage: hasStill(version.imageUrl),
        needsImageRegen: !!version.needsImageRegen,
        baseMissing,
        baseKey,
        stepIndex: idx + 1,
        ...(parentBaseKey ? { parentBaseKey } : {}),
      }
      const matchesDirectly =
        versionMatchesScene(version, options.sceneNumber) &&
        stillMatchesLocationAgentScope(options.mode, row)
      const shouldCascade =
        upstreamUpdating && Boolean(version.stateNotes?.trim()) && (row.hasImage || row.needsImageRegen)

      if (matchesDirectly || shouldCascade) {
        rows.push(
          shouldCascade && !matchesDirectly
            ? { ...row, cascadedFromUpstream: true }
            : row
        )
        upstreamUpdating = true
      }
    }
  }
  return rows
}

/**
 * Enforces sequential dependency order across connected Location sets:
 * - Checking a version whose base still is missing also checks that base.
 * - Checking a child sub-location whose parent complex base is missing also checks the parent base.
 * - Checking a version at step k also checks any earlier missing/stale version (steps < k)
 *   and cascades to downstream versions (steps > k) so versions never update out of order.
 * - Checking a Base still cascades to all version rows of that location so regenerating
 *   Base updates the entire set chain sequentially without leaving versions in a Changed state.
 */
export function withRequiredBaseStill(
  selectedKeys: string[],
  rows: LocationAgentChecklistRow[],
  toggledKey: string,
  checked: boolean
): string[] {
  const next = new Set(selectedKeys)
  const row = rows.find((entry) => entry.key === toggledKey)
  if (!row) return [...next]

  const locationRows = rows.filter((entry) => entry.locationId === row.locationId)
  const versionRows = locationRows.filter((entry) => Boolean(entry.versionId))
  const toggledVersionIdx = row.versionId
    ? versionRows.findIndex((entry) => entry.key === row.key)
    : -1

  if (checked) {
    next.add(row.key)
    if (row.versionId && row.baseMissing) next.add(row.baseKey)
    if (row.parentBaseKey) next.add(row.parentBaseKey)

    if (!row.versionId) {
      // Checking Base cascades to all versions of this location in chronological order
      for (const vRow of versionRows) {
        next.add(vRow.key)
      }
    } else if (toggledVersionIdx >= 0) {
      // Ensure any earlier missing/stale versions are checked first (cannot skip ahead)
      for (let i = 0; i < toggledVersionIdx; i++) {
        const earlier = versionRows[i]!
        if (!earlier.hasImage || earlier.needsImageRegen) {
          next.add(earlier.key)
        }
      }
      // Cascade to all downstream versions so they update sequentially after this version
      for (let i = toggledVersionIdx + 1; i < versionRows.length; i++) {
        next.add(versionRows[i]!.key)
      }
    }
    return [...next]
  }

  next.delete(row.key)
  if (!row.versionId && row.baseMissing) {
    for (const entry of rows) {
      if (entry.locationId === row.locationId && entry.versionId) next.delete(entry.key)
    }
  } else if (row.versionId && toggledVersionIdx >= 0) {
    // If an earlier missing/stale version is unchecked, downstream versions cannot validly run
    if (!row.hasImage || row.needsImageRegen) {
      for (let i = toggledVersionIdx + 1; i < versionRows.length; i++) {
        next.delete(versionRows[i]!.key)
      }
    }
  }
  return [...next]
}

/**
 * Build the sequential Location Agent scope (`locationIds` + `itemKeys`) to update
 * a connected location set chain (`Parent Base -> Base -> Version 1 -> Version 2 -> ...`)
 * in strict dependency and chronological order.
 */
export function buildSequentialLocationSetAgentSelection(
  locationId: string,
  locations: LocationReference[],
  options?: {
    /** Start from this version onward (unless an earlier version or base is still missing/stale). */
    fromVersionId?: string
    /** Force regenerating the Base still and all versions in chronological order. */
    forceFromBase?: boolean
  }
): { locationIds: string[]; itemKeys: string[] } {
  const location = locations.find((entry) => entry.id === locationId)
  if (!location?.id) return { locationIds: [], itemKeys: [] }

  const locationIds: string[] = []
  const itemKeys: string[] = []

  const parentAnchor = resolveParentLocationAnchor(location, locations)
  const parentLoc = parentAnchor?.parentLocation
  if (parentLoc?.id && !hasStill(parentLoc.imageUrl)) {
    locationIds.push(parentLoc.id)
    itemKeys.push(locationStillKey(parentLoc.id))
  }

  if (!locationIds.includes(location.id)) {
    locationIds.push(location.id)
  }

  const sortedVersions = sortLocationVersionsChronologically(location.versions || []).filter(
    (version) => Boolean(version.id && version.stateNotes?.trim())
  )
  const baseMissing = !hasStill(location.imageUrl)
  const includeBase =
    baseMissing ||
    options?.forceFromBase === true ||
    (!options?.fromVersionId && sortedVersions.length === 0)

  if (includeBase) {
    itemKeys.push(locationStillKey(location.id))
    for (const version of sortedVersions) {
      itemKeys.push(locationStillKey(location.id, version.id))
    }
    return { locationIds, itemKeys }
  }

  const firstPendingIdx = sortedVersions.findIndex(
    (version) => !hasStill(version.imageUrl) || Boolean(version.needsImageRegen)
  )
  const requestedIdx = options?.fromVersionId
    ? sortedVersions.findIndex((version) => version.id === options.fromVersionId)
    : -1

  let startIdx = 0
  if (requestedIdx >= 0 && firstPendingIdx >= 0) {
    // Never allow updating a later version out of order while an earlier version is pending/stale
    startIdx = Math.min(requestedIdx, firstPendingIdx)
  } else if (requestedIdx >= 0) {
    startIdx = requestedIdx
  } else if (firstPendingIdx >= 0) {
    startIdx = firstPendingIdx
  } else {
    startIdx = 0
  }

  for (let idx = startIdx; idx < sortedVersions.length; idx++) {
    const version = sortedVersions[idx]!
    itemKeys.push(locationStillKey(location.id, version.id))
  }

  return { locationIds, itemKeys }
}
