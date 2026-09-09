/**
 * CRUD and search for user-scoped reference assets.
 */

import { Op, QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import ReferenceAsset from '@/models/ReferenceAsset'
import ReferenceAssetLink from '@/models/ReferenceAssetLink'
import { toCanonicalName } from '@/lib/character/canonical'
import type {
  ReferenceAssetKind,
  ReferenceAssetListQuery,
  ReferenceAssetListResult,
  ReferenceAssetRecord,
  ReferenceAssetAttributes,
  ReferenceLinkAddedBy,
} from '@/types/referenceLibrary'

function toRecord(row: ReferenceAsset): ReferenceAssetRecord {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    parentAssetId: row.parent_asset_id ?? null,
    name: row.name,
    canonicalName: row.canonical_name,
    description: row.description ?? null,
    referenceImageUrl: row.reference_image_url ?? null,
    attributes: row.attributes || {},
    tags: row.tags || [],
    originProjectId: row.origin_project_id ?? null,
    originSeriesId: row.origin_series_id ?? null,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    archivedAt: row.archived_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export interface CreateReferenceAssetInput {
  userId: string
  kind: ReferenceAssetKind
  name: string
  description?: string
  referenceImageUrl?: string
  attributes?: ReferenceAssetAttributes
  tags?: string[]
  parentAssetId?: string
  originProjectId?: string
  originSeriesId?: string
}

export interface UpdateReferenceAssetInput {
  name?: string
  description?: string | null
  referenceImageUrl?: string | null
  attributes?: ReferenceAssetAttributes
  tags?: string[]
  archivedAt?: Date | null
}

export async function createReferenceAsset(
  input: CreateReferenceAssetInput
): Promise<ReferenceAssetRecord> {
  const row = await ReferenceAsset.create({
    user_id: input.userId,
    kind: input.kind,
    name: input.name,
    canonical_name: toCanonicalName(input.name),
    description: input.description,
    reference_image_url: input.referenceImageUrl,
    attributes: input.attributes || {},
    tags: input.tags || [],
    parent_asset_id: input.parentAssetId,
    origin_project_id: input.originProjectId,
    origin_series_id: input.originSeriesId,
  })
  return toRecord(row)
}

export async function getReferenceAssetById(
  assetId: string,
  userId: string
): Promise<ReferenceAssetRecord | null> {
  const row = await ReferenceAsset.findOne({
    where: { id: assetId, user_id: userId },
  })
  return row ? toRecord(row) : null
}

export async function findByCanonicalName(
  userId: string,
  kind: ReferenceAssetKind,
  name: string
): Promise<ReferenceAssetRecord | null> {
  const canonical = toCanonicalName(name)
  const row = await ReferenceAsset.findOne({
    where: {
      user_id: userId,
      kind,
      canonical_name: canonical,
      archived_at: null,
    },
  })
  return row ? toRecord(row) : null
}

export async function updateReferenceAsset(
  assetId: string,
  userId: string,
  input: UpdateReferenceAssetInput
): Promise<ReferenceAssetRecord | null> {
  const row = await ReferenceAsset.findOne({
    where: { id: assetId, user_id: userId },
  })
  if (!row) return null

  if (input.name !== undefined) {
    row.name = input.name
    row.canonical_name = toCanonicalName(input.name)
  }
  if (input.description !== undefined) row.description = input.description
  if (input.referenceImageUrl !== undefined) row.reference_image_url = input.referenceImageUrl
  if (input.attributes !== undefined) row.attributes = input.attributes
  if (input.tags !== undefined) row.tags = input.tags
  if (input.archivedAt !== undefined) row.archived_at = input.archivedAt

  await row.save()
  return toRecord(row)
}

export async function deleteReferenceAsset(
  assetId: string,
  userId: string
): Promise<boolean> {
  const deleted = await ReferenceAsset.destroy({
    where: { id: assetId, user_id: userId },
  })
  return deleted > 0
}

export async function listReferenceAssets(
  userId: string,
  query: ReferenceAssetListQuery = {}
): Promise<ReferenceAssetListResult> {
  const limit = Math.min(query.limit ?? 50, 100)
  const where: Record<string, unknown> = { user_id: userId }

  if (query.kind) where.kind = query.kind
  if (!query.includeArchived) where.archived_at = null

  if (query.tags?.length) {
    where.tags = { [Op.overlap]: query.tags }
  }

  if (query.q?.trim()) {
    const q = query.q.trim()
    where[Op.or as unknown as string] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { canonical_name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
    ]
  }

  let assetIdsFilter: string[] | undefined

  if (query.linkedToProjectId) {
    const links = await ReferenceAssetLink.findAll({
      where: { project_id: query.linkedToProjectId },
      attributes: ['asset_id'],
    })
    assetIdsFilter = links.map((l) => l.asset_id)
  } else if (query.linkedToSeriesId) {
    const links = await ReferenceAssetLink.findAll({
      where: { series_id: query.linkedToSeriesId },
      attributes: ['asset_id'],
    })
    assetIdsFilter = links.map((l) => l.asset_id)
  }

  if (assetIdsFilter !== undefined) {
    if (assetIdsFilter.length === 0) {
      return { assets: [], nextCursor: undefined }
    }
    where.id = { [Op.in]: assetIdsFilter }
  }

  if (query.cursor) {
    where.id = where.id
      ? { [Op.and]: [{ [Op.in]: assetIdsFilter }, { [Op.gt]: query.cursor }] }
      : { [Op.gt]: query.cursor }
  }

  const rows = await ReferenceAsset.findAll({
    where,
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit: limit + 1,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    assets: page.map(toRecord),
    nextCursor: hasMore ? page[page.length - 1].id : undefined,
  }
}

export async function createReferenceAssetLink(input: {
  assetId: string
  userId: string
  projectId?: string
  seriesId?: string
  addedBy?: ReferenceLinkAddedBy
}): Promise<{ id: string } | null> {
  const asset = await ReferenceAsset.findOne({
    where: { id: input.assetId, user_id: input.userId },
  })
  if (!asset) return null
  if (!input.projectId && !input.seriesId) return null

  const [link] = await ReferenceAssetLink.findOrCreate({
    where: {
      asset_id: input.assetId,
      ...(input.projectId ? { project_id: input.projectId } : {}),
      ...(input.seriesId ? { series_id: input.seriesId } : {}),
    },
    defaults: {
      asset_id: input.assetId,
      project_id: input.projectId ?? null,
      series_id: input.seriesId ?? null,
      added_by: input.addedBy ?? 'user',
    },
  })

  return { id: link.id }
}

export async function deleteReferenceAssetLink(
  linkId: string,
  userId: string
): Promise<boolean> {
  const links = (await sequelize.query(
    `SELECT l.id FROM reference_asset_links l
     JOIN reference_assets a ON a.id = l.asset_id
     WHERE l.id = :linkId AND a.user_id = :userId`,
    {
      replacements: { linkId, userId },
      type: QueryTypes.SELECT,
    }
  )) as Array<{ id: string }>

  if (links.length === 0) return false

  await ReferenceAssetLink.destroy({ where: { id: linkId } })
  return true
}

export async function listLinksForProject(projectId: string): Promise<
  Array<{ linkId: string; assetId: string; addedBy: ReferenceLinkAddedBy }>
> {
  const links = await ReferenceAssetLink.findAll({
    where: { project_id: projectId },
  })
  return links.map((l) => ({
    linkId: l.id,
    assetId: l.asset_id,
    addedBy: l.added_by,
  }))
}

export async function recordAssetUsage(assetId: string, userId: string): Promise<void> {
  await ReferenceAsset.update(
    {
      use_count: sequelize.literal('use_count + 1') as unknown as number,
      last_used_at: new Date(),
    },
    { where: { id: assetId, user_id: userId } }
  )
}
