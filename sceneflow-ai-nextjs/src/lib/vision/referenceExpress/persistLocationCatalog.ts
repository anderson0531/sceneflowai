/**
 * Narrow writes to `visionPhase.references.locationReferences`.
 *
 * Same safety rule as persistReferenceImage: never PUT the whole metadata
 * blob, so a background Location Agent cannot clobber a newer script edit.
 */

import '@/models'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'

export async function persistLocationCatalogPatch(input: {
  projectId: string
  append?: Array<Record<string, unknown>>
  patchById?: { id: string; versions: unknown[] }
}): Promise<{ saved: boolean }> {
  const { projectId, append, patchById } = input
  if ((!append || append.length === 0) && !patchById) return { saved: false }

  return sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(projectId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!project) return { saved: false }

    const metadata: Record<string, any> = { ...(project.metadata || {}) }
    const visionPhase: Record<string, any> = { ...(metadata.visionPhase || {}) }
    const references: Record<string, any> = { ...(visionPhase.references || {}) }
    let list: Array<Record<string, unknown>> = Array.isArray(references.locationReferences)
      ? [...references.locationReferences]
      : []

    let saved = false

    if (append && append.length > 0) {
      const existingIds = new Set(list.map((row) => String(row?.id || '')))
      const extra = append.filter((row) => row?.id && !existingIds.has(String(row.id)))
      if (extra.length > 0) {
        list = [...list, ...extra]
        saved = true
      }
    }

    if (patchById) {
      let found = false
      list = list.map((entry) => {
        if (entry?.id !== patchById.id) return entry
        found = true
        saved = true
        return { ...entry, versions: patchById.versions }
      })
      if (!found) return { saved: false }
    }

    if (!saved) return { saved: false }

    references.locationReferences = list
    visionPhase.references = references
    metadata.visionPhase = visionPhase
    project.metadata = metadata
    project.changed('metadata', true)
    await project.save({ transaction })
    return { saved: true }
  })
}
