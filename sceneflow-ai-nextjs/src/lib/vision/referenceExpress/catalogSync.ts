/**
 * Location Agent catalog-sync phase: extract missing heading locations, then
 * LLM-sync set versions one location per step, then plan image items.
 */

import { randomUUID } from 'crypto'
import {
  applyLocationUpdateFromSyncDiff,
  collectMissingExtractedLocations,
  extractHeadingLocationsFromScenes,
  toLocationReferenceFromExtracted,
} from '@/lib/vision/libraryKindAgents'
import { filterScenesForLocation } from '@/lib/vision/mountedSetFixtures'
import {
  loadReferenceExpressContext,
  planSceneReferenceExpressItems,
  type LocationSource,
} from '@/lib/vision/referenceExpress/planItems'
import { persistLocationCatalogPatch } from '@/lib/vision/referenceExpress/persistLocationCatalog'
import {
  referenceExpressItemKey,
  type ReferenceExpressItem,
  type ReferenceExpressScope,
} from '@/lib/vision/referenceExpress/types'
import {
  analyzeLocationVersionsFromScript,
  buildLocationVersionAnalysisScenes,
} from '@/lib/vision/syncLocationVersionsFromScript'
import type { LocationReference } from '@/types/visionReferences'

export type LocationCatalogSyncStatus = 'pending' | 'syncing' | 'done'

export type LocationCatalogSyncState = {
  status: LocationCatalogSyncStatus
  cursor: number
  locationIds: string[]
}

export type LocationCatalogSyncOutcome =
  | { kind: 'continue'; catalogSync: LocationCatalogSyncState; items?: ReferenceExpressItem[] }
  | { kind: 'nothing-to-generate'; catalogSync: LocationCatalogSyncState }

function asLocationReference(location: LocationSource): LocationReference {
  return {
    id: location.id,
    location: location.location || location.locationDisplay || '',
    locationDisplay: location.locationDisplay || location.location || '',
    imageUrl: location.imageUrl || '',
    versions: (location.versions || []) as LocationReference['versions'],
    intExt: location.intExt as LocationReference['intExt'],
    timeOfDay: location.timeOfDay,
    description: location.description,
    sceneNumbers: location.sceneNumbers,
  }
}

function locationIdsFrom(locations: LocationSource[]): string[] {
  return locations.map((location) => location.id).filter((id): id is string => Boolean(id))
}

async function extractMissingLocations(projectId: string): Promise<string[]> {
  const context = await loadReferenceExpressContext(projectId)
  if (!context) return []

  const extracted = extractHeadingLocationsFromScenes(context.scenes)
  const missing = collectMissingExtractedLocations(extracted, context.locations)
  const append = missing.map((row) =>
    toLocationReferenceFromExtracted(row, `loc-${randomUUID()}`)
  )
  if (append.length > 0) {
    await persistLocationCatalogPatch({
      projectId,
      append: append as unknown as Array<Record<string, unknown>>,
    })
  }

  const next = await loadReferenceExpressContext(projectId)
  const merged = new Map<string, true>()
  for (const id of locationIdsFrom(next?.locations ?? context.locations)) {
    merged.set(id, true)
  }
  for (const location of append) {
    if (location.id) merged.set(location.id, true)
  }
  return [...merged.keys()]
}

async function syncOneLocation(projectId: string, locationId: string): Promise<void> {
  const context = await loadReferenceExpressContext(projectId)
  if (!context) return
  const location = context.locations.find((row) => row.id === locationId)
  if (!location) return

  const matched = filterScenesForLocation(
    {
      location: location.location || location.locationDisplay,
      sceneNumbers: location.sceneNumbers,
    },
    context.scenes
  )
  const scoped = matched.length > 0 ? matched : context.scenes
  if (scoped.length === 0) return

  const analysis = await analyzeLocationVersionsFromScript({
    location: {
      id: location.id,
      location: location.location || location.locationDisplay || '',
      description: location.description,
      versions: (location.versions || []) as LocationReference['versions'],
    },
    scenes: buildLocationVersionAnalysisScenes(scoped),
    screenplayContext: context.screenplayContext,
  })
  const applied = applyLocationUpdateFromSyncDiff(
    asLocationReference(location),
    analysis.diff
  )
  await persistLocationCatalogPatch({
    projectId,
    patchById: { id: location.id, versions: applied.location.versions || [] },
  })
}

async function planLocationItems(projectId: string): Promise<ReferenceExpressItem[]> {
  const context = await loadReferenceExpressContext(projectId)
  if (!context) return []
  const scope: ReferenceExpressScope = {
    kinds: ['location'],
    includeNestedStills: true,
  }
  return planSceneReferenceExpressItems(context, scope)
}

function mergeItems(
  existing: ReferenceExpressItem[],
  planned: ReferenceExpressItem[]
): ReferenceExpressItem[] {
  const seen = new Set(existing.map((item) => referenceExpressItemKey(item)))
  const next = [...existing]
  for (const item of planned) {
    const key = referenceExpressItemKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

/**
 * Advance catalog sync by one step: extract on the first call, then one
 * location's version LLM per later call, then plan stills.
 */
export async function runLocationCatalogSyncStep(input: {
  projectId: string
  catalogSync: LocationCatalogSyncState
  items: ReferenceExpressItem[]
}): Promise<LocationCatalogSyncOutcome> {
  let state = input.catalogSync
  let items = input.items

  if (state.status === 'pending') {
    const locationIds = await extractMissingLocations(input.projectId)
    if (locationIds.length === 0) {
      const planned = await planLocationItems(input.projectId)
      items = mergeItems(items, planned)
      const done = { status: 'done' as const, cursor: 0, locationIds: [] }
      return items.length === 0
        ? { kind: 'nothing-to-generate', catalogSync: done }
        : { kind: 'continue', catalogSync: done, items }
    }
    return {
      kind: 'continue',
      catalogSync: { status: 'syncing', cursor: 0, locationIds },
      items,
    }
  }

  if (state.status === 'syncing' && state.cursor < state.locationIds.length) {
    const locationId = state.locationIds[state.cursor]!
    await syncOneLocation(input.projectId, locationId)
    state = {
      ...state,
      cursor: state.cursor + 1,
    }
  }

  if (state.status === 'syncing' && state.cursor >= state.locationIds.length) {
    const planned = await planLocationItems(input.projectId)
    items = mergeItems(items, planned)
    const done: LocationCatalogSyncState = {
      status: 'done',
      cursor: state.cursor,
      locationIds: state.locationIds,
    }
    return items.length === 0
      ? { kind: 'nothing-to-generate', catalogSync: done }
      : { kind: 'continue', catalogSync: done, items }
  }

  return { kind: 'continue', catalogSync: state, items }
}
