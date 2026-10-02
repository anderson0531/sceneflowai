import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import { Series } from '@/models/Series'
import { Project } from '@/models/Project'
import { ReferenceAsset } from '@/models/ReferenceAsset'
import { ReferenceAssetLink } from '@/models/ReferenceAssetLink'
import { sequelize } from '@/config/database'
import { isUndefinedTableError } from '@/lib/database/pgErrors'
import {
  referencesFromProjectMetadata,
  type DisplayReference,
  type ReferenceGroups,
} from '@/lib/series/referenceTransfer'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

const emptyGroups = (): ReferenceGroups => ({ characters: [], locations: [], props: [] })

function assetToDisplay(row: {
  id: string
  kind: string
  name: string
  description?: string | null
  reference_image_url?: string | null
  attributes?: Record<string, unknown> | null
}): DisplayReference {
  return {
    id: row.id,
    name: row.name,
    role: typeof row.attributes?.role === 'string' ? row.attributes.role : undefined,
    description: row.description || undefined,
    imageUrl: row.reference_image_url || undefined,
    libraryAssetId: row.id,
  }
}

function pushAsset(groups: ReferenceGroups, asset: DisplayReference, kind: string) {
  if (kind === 'character' || kind === 'wardrobe') groups.characters.push(asset)
  else if (kind === 'location') groups.locations.push(asset)
  else if (kind === 'prop') groups.props.push(asset)
}

/**
 * GET /api/series/[seriesId]/production-references
 * Per-episode Production pictures plus the shared reference library.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params

  try {
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const projectIds = (series.episode_blueprints || [])
      .map((episode) => episode.projectId)
      .filter((id): id is string => Boolean(id))

    const projects = projectIds.length
      ? await Project.findAll({
          where: { id: projectIds },
          attributes: ['id', 'metadata'],
        })
      : []

    const byProjectId: Record<string, ReferenceGroups> = {}
    for (const project of projects) {
      byProjectId[project.id] = referencesFromProjectMetadata(project.metadata || {})
    }

    const library = emptyGroups()
    try {
      const linkWhere =
        projectIds.length > 0
          ? { [Op.or]: [{ series_id: seriesId }, { project_id: { [Op.in]: projectIds } }] }
          : { series_id: seriesId }
      const links = await ReferenceAssetLink.findAll({ where: linkWhere })
      const assetIds = [...new Set(links.map((link) => link.asset_id))]
      if (assetIds.length > 0) {
        const assets = await ReferenceAsset.findAll({
          where: { id: assetIds, archived_at: null },
        })
        const byId = new Map(assets.map((asset) => [asset.id, asset]))
        const seen = new Set<string>()
        for (const link of links) {
          if (!link.series_id && !link.project_id) continue
          const asset = byId.get(link.asset_id)
          if (!asset || seen.has(asset.id)) continue
          seen.add(asset.id)
          pushAsset(library, assetToDisplay(asset), asset.kind)
        }
      }
    } catch (error) {
      if (!isUndefinedTableError(error)) throw error
    }

    return NextResponse.json({ success: true, byProjectId, library })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load reference images' },
      { status: 500 }
    )
  }
}
