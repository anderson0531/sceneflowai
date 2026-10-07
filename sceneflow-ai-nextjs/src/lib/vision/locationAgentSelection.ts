import type { LocationReference, LocationVersion } from '@/types/visionReferences'
import { referenceExpressItemKey } from '@/lib/vision/referenceExpress/types'

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
  for (const location of locations) {
    if (!location.id || !locationMatchesScene(location, options.sceneNumber)) continue
    const locationName = location.location?.trim() || location.locationDisplay?.trim() || 'Location'
    const baseKey = locationStillKey(location.id)
    const baseHasImage = hasStill(location.imageUrl)
    const baseMissing = !baseHasImage
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
    }
    if (stillMatchesLocationAgentScope(options.mode, baseRow)) rows.push(baseRow)

    for (const version of location.versions || []) {
      if (!version.id || !versionMatchesScene(version, options.sceneNumber)) continue
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
      }
      if (stillMatchesLocationAgentScope(options.mode, row)) rows.push(row)
    }
  }
  return rows
}

/** Checking a version whose base still is missing also checks that base. */
export function withRequiredBaseStill(
  selectedKeys: string[],
  rows: LocationAgentChecklistRow[],
  toggledKey: string,
  checked: boolean
): string[] {
  const next = new Set(selectedKeys)
  const row = rows.find((entry) => entry.key === toggledKey)
  if (!row) return [...next]
  if (checked) {
    next.add(row.key)
    if (row.versionId && row.baseMissing) next.add(row.baseKey)
    return [...next]
  }
  next.delete(row.key)
  if (!row.versionId && row.baseMissing) {
    for (const entry of rows) {
      if (entry.locationId === row.locationId && entry.versionId) next.delete(entry.key)
    }
  }
  return [...next]
}
