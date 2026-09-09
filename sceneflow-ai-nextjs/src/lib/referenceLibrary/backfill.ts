/**
 * Idempotent backfill from production_bible and visionPhase into reference_assets.
 */

import Project from '@/models/Project'
import { Series } from '@/models/Series'
import {
  createReferenceAsset,
  createReferenceAssetLink,
  findByCanonicalName,
} from './assetRepository'
import {
  projectCharacterToCreateInput,
  seriesCharacterToCreateInput,
  seriesLocationToCreateInput,
  seriesPropToCreateInput,
  locationToLibraryAttributes,
  propToLibraryAttributes,
  characterToLibraryAttributes,
  type ProjectCharacter,
} from './projection'
import type { SeriesProductionBible } from '@/types/series'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

export interface BackfillResult {
  created: number
  linked: number
  skipped: number
  updatedVisionPhase: boolean
}

async function upsertAsset(
  input: Parameters<typeof createReferenceAsset>[0],
  link?: { projectId?: string; seriesId?: string }
): Promise<{ assetId: string; created: boolean }> {
  const existing = await findByCanonicalName(input.userId, input.kind, input.name)
  if (existing) {
    if (link) {
      await createReferenceAssetLink({
        assetId: existing.id,
        userId: input.userId,
        projectId: link.projectId,
        seriesId: link.seriesId,
        addedBy: 'auto',
      })
    }
    return { assetId: existing.id, created: false }
  }

  const asset = await createReferenceAsset(input)
  if (link) {
    await createReferenceAssetLink({
      assetId: asset.id,
      userId: input.userId,
      projectId: link.projectId,
      seriesId: link.seriesId,
      addedBy: 'auto',
    })
  }
  return { assetId: asset.id, created: true }
}

export async function backfillSeriesLibrary(
  seriesId: string,
  userId: string
): Promise<BackfillResult> {
  const result: BackfillResult = { created: 0, linked: 0, skipped: 0, updatedVisionPhase: false }
  const series = await Series.findByPk(seriesId)
  if (!series || series.user_id !== userId) return result

  const bible = (series.production_bible || {}) as SeriesProductionBible

  for (const char of bible.characters || []) {
    const { assetId, created } = await upsertAsset(
      seriesCharacterToCreateInput(char, userId, seriesId),
      { seriesId }
    )
    if (created) result.created++
    else result.linked++
    void assetId
  }

  for (const loc of bible.locations || []) {
    const { created } = await upsertAsset(
      seriesLocationToCreateInput(loc, userId, seriesId),
      { seriesId }
    )
    if (created) result.created++
    else result.linked++
  }

  for (const prop of bible.props || []) {
    const { created } = await upsertAsset(
      seriesPropToCreateInput(prop, userId, seriesId),
      { seriesId }
    )
    if (created) result.created++
    else result.linked++
  }

  return result
}

export async function backfillProjectLibrary(
  projectId: string,
  userId: string
): Promise<BackfillResult> {
  const result: BackfillResult = { created: 0, linked: 0, skipped: 0, updatedVisionPhase: false }
  const project = await Project.findByPk(projectId)
  if (!project || project.user_id !== userId) return result

  const metadata = { ...(project.metadata || {}) }
  const visionPhase = { ...(metadata.visionPhase || {}) }
  const refs = visionPhase.references || {}
  let dirty = false

  const characters = (visionPhase.characters || []) as ProjectCharacter[]
  for (const char of characters) {
    if (char.libraryAssetId) {
      await createReferenceAssetLink({
        assetId: char.libraryAssetId,
        userId,
        projectId,
        addedBy: 'auto',
      })
      result.skipped++
      continue
    }

    const { assetId, created } = await upsertAsset(
      projectCharacterToCreateInput(char, userId, projectId),
      { projectId }
    )
    char.libraryAssetId = assetId
    dirty = true
    if (created) result.created++
    else result.linked++
  }

  const locationReferences = (refs.locationReferences || []) as LocationReference[]
  for (const loc of locationReferences) {
    const libId = (loc as LocationReference & { libraryAssetId?: string }).libraryAssetId
    if (libId) {
      await createReferenceAssetLink({ assetId: libId, userId, projectId, addedBy: 'auto' })
      result.skipped++
      continue
    }

    const { assetId, created } = await upsertAsset(
      {
        userId,
        kind: 'location',
        name: loc.location || loc.locationDisplay || 'Location',
        description: loc.description,
        referenceImageUrl: loc.imageUrl,
        originProjectId: projectId,
        attributes: locationToLibraryAttributes(loc),
      },
      { projectId }
    )
    ;(loc as LocationReference & { libraryAssetId?: string }).libraryAssetId = assetId
    dirty = true
    if (created) result.created++
    else result.linked++
  }

  const objectReferences = (refs.objectReferences || []) as VisualReference[]
  for (const prop of objectReferences) {
    const libId = (prop as VisualReference & { libraryAssetId?: string }).libraryAssetId
    if (libId) {
      await createReferenceAssetLink({ assetId: libId, userId, projectId, addedBy: 'auto' })
      result.skipped++
      continue
    }

    const { assetId, created } = await upsertAsset(
      {
        userId,
        kind: 'prop',
        name: prop.name,
        description: prop.description,
        referenceImageUrl: prop.imageUrl,
        originProjectId: projectId,
        attributes: propToLibraryAttributes(prop),
      },
      { projectId }
    )
    ;(prop as VisualReference & { libraryAssetId?: string }).libraryAssetId = assetId
    dirty = true
    if (created) result.created++
    else result.linked++
  }

  if (dirty) {
    visionPhase.characters = characters
    visionPhase.references = {
      ...refs,
      locationReferences,
      objectReferences,
    }
    metadata.visionPhase = visionPhase
    await project.update({ metadata })
    result.updatedVisionPhase = true
  }

  if (project.series_id) {
    const seriesResult = await backfillSeriesLibrary(project.series_id, userId)
    result.created += seriesResult.created
    result.linked += seriesResult.linked
  }

  return result
}

export async function backfillUserLibrary(userId: string): Promise<BackfillResult> {
  const aggregate: BackfillResult = {
    created: 0,
    linked: 0,
    skipped: 0,
    updatedVisionPhase: false,
  }

  const seriesList = await Series.findAll({ where: { user_id: userId }, attributes: ['id'] })
  for (const s of seriesList) {
    const r = await backfillSeriesLibrary(s.id, userId)
    aggregate.created += r.created
    aggregate.linked += r.linked
  }

  const projects = await Project.findAll({ where: { user_id: userId }, attributes: ['id'] })
  for (const p of projects) {
    const r = await backfillProjectLibrary(p.id, userId)
    aggregate.created += r.created
    aggregate.linked += r.linked
    aggregate.skipped += r.skipped
    if (r.updatedVisionPhase) aggregate.updatedVisionPhase = true
  }

  return aggregate
}
