import { sequelize } from '@/config/database'
import Project from '@/models/Project'
import type { PersistedBlueprintAudienceResonance } from '@/lib/types/audienceResonance'

/**
 * Merge Blueprint AR v3 state into project.metadata (server-side after analyze).
 */
export async function persistBlueprintARToProject(
  projectId: string,
  persisted: PersistedBlueprintAudienceResonance,
  userId?: string
): Promise<void> {
  await sequelize.authenticate()

  const project = await Project.findByPk(projectId, {
    attributes: ['id', 'user_id', 'metadata'],
  })

  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  if (userId && project.user_id !== userId) {
    throw new Error('Forbidden')
  }

  const existing = (project.metadata || {}) as Record<string, unknown>
  const mergedMetadata: Record<string, unknown> = {
    ...existing,
    audienceDefinition: persisted.audienceDefinition,
    blueprintAudienceResonance: persisted,
  }

  project.set('metadata', mergedMetadata)
  project.changed('metadata', true)
  await project.save()
}
