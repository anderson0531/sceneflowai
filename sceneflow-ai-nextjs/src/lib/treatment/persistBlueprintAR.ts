import { sequelize } from '@/config/database'
import { assertProjectAccess } from '@/lib/projectAccess'
import type { PersistedBlueprintAudienceResonance } from '@/lib/types/audienceResonance'

/**
 * Merge Blueprint AR v3 state into project.metadata (server-side after analyze).
 */
export async function persistBlueprintARToProject(
  projectId: string,
  persisted: PersistedBlueprintAudienceResonance,
  ownerUserId: string,
  legacyOwnerId?: string | null
): Promise<void> {
  await sequelize.authenticate()

  const access = await assertProjectAccess(projectId, ownerUserId, legacyOwnerId)
  if (!access.ok) {
    throw new Error(access.error)
  }

  const project = access.project
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
