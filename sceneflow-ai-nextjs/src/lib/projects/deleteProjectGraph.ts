import type { Transaction } from 'sequelize'
import { resetEpisodesForMissingProjects } from '@/lib/series/seriesHealth'

/** Child rows first, then the session. Keys match Sequelize attribute names. */
export const COLLAB_SESSION_CLEANUP_STEPS = [
  { name: 'blueprintFeedback', key: 'sessionId' },
  { name: 'scores', key: 'session_id' },
  { name: 'comments', key: 'session_id' },
  { name: 'recommendations', key: 'session_id' },
  { name: 'chatMessages', key: 'sessionId' },
  { name: 'participants', key: 'session_id' },
  { name: 'sessions', key: 'id' },
] as const

export type CollabCleanupStep = (typeof COLLAB_SESSION_CLEANUP_STEPS)[number]['name']

export function collabCleanupWhere(
  step: CollabCleanupStep,
  ids: string[]
): Record<string, string[]> {
  const spec = COLLAB_SESSION_CLEANUP_STEPS.find((item) => item.name === step)
  if (!spec) throw new Error(`Unknown collab cleanup step: ${step}`)
  return { [spec.key]: ids }
}

interface ReleasableEpisode {
  projectId?: string
  status: string
}

export interface ReleasableSeries {
  episode_blueprints?: ReleasableEpisode[]
  changed(key: string, value: boolean): void
  save(options: { transaction: Transaction }): Promise<unknown>
}

export interface DeleteProjectGraphDeps {
  transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T>
  findCollabSessionIds(projectId: string, transaction: Transaction): Promise<string[]>
  destroyCollabStep(
    step: CollabCleanupStep,
    where: Record<string, string[]>,
    transaction: Transaction
  ): Promise<unknown>
  findProject(
    projectId: string,
    transaction: Transaction
  ): Promise<{ series_id?: string | null } | null>
  findSeries(seriesId: string, transaction: Transaction): Promise<ReleasableSeries | null>
  destroyProject(projectId: string, transaction: Transaction): Promise<number>
}

/**
 * Removes collaboration rows that reference the project, releases the linked
 * series episode, then deletes the project. All of it shares one transaction,
 * so a failed project delete does not leave the episode unlinked.
 */
export async function deleteProjectWithDependents(
  projectId: string,
  deps: DeleteProjectGraphDeps
): Promise<number> {
  return deps.transaction(async (transaction) => {
    const sessionIds = await deps.findCollabSessionIds(projectId, transaction)
    if (sessionIds.length > 0) {
      for (const step of COLLAB_SESSION_CLEANUP_STEPS) {
        await deps.destroyCollabStep(step.name, collabCleanupWhere(step.name, sessionIds), transaction)
      }
    }

    const project = await deps.findProject(projectId, transaction)
    if (project?.series_id) {
      const series = await deps.findSeries(project.series_id, transaction)
      if (series) {
        const remainingProjectIds = new Set(
          (series.episode_blueprints || [])
            .map((episode) => episode.projectId)
            .filter((linkedId): linkedId is string => Boolean(linkedId) && linkedId !== projectId)
        )
        const released = resetEpisodesForMissingProjects(
          series.episode_blueprints || [],
          remainingProjectIds
        )
        if (released.changed) {
          series.episode_blueprints = released.episodes
          series.changed('episode_blueprints', true)
          await series.save({ transaction })
        }
      }
    }

    return deps.destroyProject(projectId, transaction)
  })
}
