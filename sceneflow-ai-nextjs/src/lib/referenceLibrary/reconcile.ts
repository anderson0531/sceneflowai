/**
 * Turn generator-proposed assets into a reuse/create manifest for user confirmation.
 */

import { toCanonicalName } from '@/lib/character/canonical'
import { findByCanonicalName, listReferenceAssets } from './assetRepository'
import type {
  ProposedReferenceAsset,
  ReferenceReconcileManifest,
  ReferenceReconcileRequest,
  ReferenceReconcileResult,
  ReferenceAssetKind,
} from '@/types/referenceLibrary'
import {
  createReferenceAsset,
  createReferenceAssetLink,
} from './assetRepository'
import { libraryAssetToCharacter, libraryAssetToLocation, libraryAssetToProp } from './projection'

export async function buildReconcileManifest(
  userId: string,
  proposed: ProposedReferenceAsset[]
): Promise<ReferenceReconcileManifest> {
  const manifest: ReferenceReconcileManifest = {
    reuse: [],
    create: [],
    unmatched: [],
  }

  for (const item of proposed) {
    if (item.matchedLibraryAssetId) {
      manifest.reuse.push({
        proposed: item,
        libraryAssetId: item.matchedLibraryAssetId,
        libraryAssetName: item.name,
      })
      continue
    }

    const existing = await findByCanonicalName(userId, item.kind, item.name)
    if (existing) {
      manifest.reuse.push({
        proposed: item,
        libraryAssetId: existing.id,
        libraryAssetName: existing.name,
      })
    } else {
      manifest.create.push(item)
    }
  }

  return manifest
}

export async function applyReconcileConfirmation(
  userId: string,
  request: ReferenceReconcileRequest
): Promise<ReferenceReconcileResult> {
  const linkedAssetIds: string[] = []
  const createdAssetIds: string[] = []

  const confirmedReuse = new Set(request.confirmedReuseIds || [])
  const confirmedCreate = new Set(request.confirmedCreateTempIds || [])

  const manifest = await buildReconcileManifest(userId, request.proposed)

  for (const entry of manifest.reuse) {
    const reuseKey = entry.proposed.tempId
    if (confirmedReuse.size > 0 && !confirmedReuse.has(reuseKey)) continue

    await createReferenceAssetLink({
      assetId: entry.libraryAssetId,
      userId,
      projectId: request.projectId,
      seriesId: request.seriesId,
      addedBy: 'auto',
    })
    linkedAssetIds.push(entry.libraryAssetId)
  }

  for (const item of manifest.create) {
    if (confirmedCreate.size > 0 && !confirmedCreate.has(item.tempId)) continue

    const asset = await createReferenceAsset({
      userId,
      kind: item.kind,
      name: item.name,
      description: item.description,
      attributes: item.attributes,
      parentAssetId: item.parentAssetId,
      originProjectId: request.projectId,
      originSeriesId: request.seriesId,
    })
    createdAssetIds.push(asset.id)

    await createReferenceAssetLink({
      assetId: asset.id,
      userId,
      projectId: request.projectId,
      seriesId: request.seriesId,
      addedBy: 'auto',
    })
    linkedAssetIds.push(asset.id)
  }

  return { linkedAssetIds, createdAssetIds }
}

/** Match a proposed name against the user's library */
export async function matchProposedToLibrary(
  userId: string,
  kind: ReferenceAssetKind,
  name: string
): Promise<{ assetId: string; confidence: 'exact' | 'canonical' | 'fuzzy' | 'none' }> {
  const exact = await findByCanonicalName(userId, kind, name)
  if (exact) {
    return { assetId: exact.id, confidence: 'canonical' }
  }

  const { assets } = await listReferenceAssets(userId, { kind, q: name, limit: 5 })
  const canonical = toCanonicalName(name)
  for (const a of assets) {
    if (a.name.toLowerCase() === name.toLowerCase()) {
      return { assetId: a.id, confidence: 'exact' }
    }
    if (a.canonicalName === canonical) {
      return { assetId: a.id, confidence: 'canonical' }
    }
  }

  if (assets.length === 1) {
    return { assetId: assets[0].id, confidence: 'fuzzy' }
  }

  return { assetId: '', confidence: 'none' }
}

/** Map confirmed library assets to visionPhase patches */
export function visionPhasePatchFromAssetIds(
  assets: Awaited<ReturnType<typeof import('./assetRepository').getReferenceAssetById>>[]
): Record<string, unknown> {
  const characters: unknown[] = []
  const locationReferences: unknown[] = []
  const objectReferences: unknown[] = []

  for (const asset of assets) {
    if (!asset) continue
    switch (asset.kind) {
      case 'character':
        characters.push(libraryAssetToCharacter(asset))
        break
      case 'location':
        locationReferences.push(libraryAssetToLocation(asset))
        break
      case 'prop':
        objectReferences.push(libraryAssetToProp(asset))
        break
    }
  }

  return {
    characters,
    references: { locationReferences, objectReferences },
  }
}
