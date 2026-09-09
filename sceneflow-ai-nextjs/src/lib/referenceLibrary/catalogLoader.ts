/**
 * Load reference catalog for a project (linked assets + optional series scope).
 */

import Project from '@/models/Project'
import {
  listReferenceAssets,
  listLinksForProject,
  getReferenceAssetById,
} from './assetRepository'
import { buildReferenceCatalog, formatReferenceCatalogForPrompt } from './projection'
import type { ReferenceCatalog } from '@/types/referenceLibrary'

export async function loadProjectReferenceCatalog(
  projectId: string,
  userId: string
): Promise<ReferenceCatalog> {
  const links = await listLinksForProject(projectId)
  const assets = []

  for (const link of links) {
    const asset = await getReferenceAssetById(link.assetId, userId)
    if (asset) assets.push(asset)
  }

  // Include unlinked visionPhase assets that already have libraryAssetId
  const project = await Project.findByPk(projectId)
  if (project?.user_id === userId) {
    const vp = project.metadata?.visionPhase || {}
    const chars = vp.characters || []
    const locs = vp.references?.locationReferences || []
    const props = vp.references?.objectReferences || []
    const seen = new Set(assets.map((a) => a.id))

    for (const c of chars) {
      if (c.libraryAssetId && !seen.has(c.libraryAssetId)) {
        const a = await getReferenceAssetById(c.libraryAssetId, userId)
        if (a) {
          assets.push(a)
          seen.add(a.id)
        }
      }
    }
    for (const loc of locs) {
      const id = loc.libraryAssetId
      if (id && !seen.has(id)) {
        const a = await getReferenceAssetById(id, userId)
        if (a) {
          assets.push(a)
          seen.add(a.id)
        }
      }
    }
    for (const prop of props) {
      const id = prop.libraryAssetId
      if (id && !seen.has(id)) {
        const a = await getReferenceAssetById(id, userId)
        if (a) {
          assets.push(a)
          seen.add(a.id)
        }
      }
    }
  }

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
    assets = []
    for (const link of links) {
      const a = await getReferenceAssetById(link.assetId, userId)
      if (a) assets.push(a)
    }
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
