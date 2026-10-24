/**
 * Load reference catalog for a project (linked assets + optional series scope).
 */

import Project from '@/models/Project'
import {
  listReferenceAssets,
  listLinksForProject,
  getReferenceAssetsByIds,
} from './assetRepository'
import { buildReferenceCatalog, formatReferenceCatalogForPrompt } from './projection'
import type { ReferenceCatalog } from '@/types/referenceLibrary'

export async function loadProjectReferenceCatalog(
  projectId: string,
  userId: string
): Promise<ReferenceCatalog> {
  const [links, project] = await Promise.all([
    listLinksForProject(projectId),
    Project.findByPk(projectId),
  ])

  const wantedIds = new Set<string>()
  for (const link of links) {
    if (link.assetId) wantedIds.add(link.assetId)
  }

  // Include unlinked visionPhase assets that already have libraryAssetId
  if (project?.user_id === userId) {
    const vp = project.metadata?.visionPhase || {}
    const chars = vp.characters || []
    const locs = vp.references?.locationReferences || []
    const props = vp.references?.objectReferences || []

    for (const c of chars) {
      if (c?.libraryAssetId) wantedIds.add(c.libraryAssetId)
    }
    for (const loc of locs) {
      if (loc?.libraryAssetId) wantedIds.add(loc.libraryAssetId)
    }
    for (const prop of props) {
      if (prop?.libraryAssetId) wantedIds.add(prop.libraryAssetId)
    }
  }

  const assets = await getReferenceAssetsByIds([...wantedIds], userId)

  return buildReferenceCatalog(assets)
}

export async function loadUserReferenceCatalogForPrompt(
  userId: string,
  projectId?: string,
  seriesId?: string
): Promise<{ catalog: ReferenceCatalog; promptBlock: string }> {
  let assets

  if (projectId) {
    const links = await listLinksForProject(projectId)
    assets = await getReferenceAssetsByIds(
      links.map((link) => link.assetId),
      userId
    )
  } else if (seriesId) {
    const result = await listReferenceAssets(userId, {
      linkedToSeriesId: seriesId,
      limit: 100,
    })
    assets = result.assets
  } else {
    const result = await listReferenceAssets(userId, { limit: 100 })
    assets = result.assets
  }

  const catalog = buildReferenceCatalog(assets)
  return {
    catalog,
    promptBlock: formatReferenceCatalogForPrompt(catalog),
  }
}
