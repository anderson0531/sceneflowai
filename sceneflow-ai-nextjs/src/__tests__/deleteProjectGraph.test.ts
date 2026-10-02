import { describe, expect, it } from 'vitest'
import type { Transaction } from 'sequelize'
import {
  COLLAB_SESSION_CLEANUP_STEPS,
  deleteProjectWithDependents,
  type CollabCleanupStep,
  type DeleteProjectGraphDeps,
  type ReleasableSeries,
} from '@/lib/projects/deleteProjectGraph'

const PROJECT_ID = '0ea0f025-2b3b-4410-890f-bb9f34aa7123'
const SESSION_ID = 'session-1'

function harness(options?: { failDestroy?: boolean; sessionIds?: string[] }) {
  const calls: string[] = []
  const wheres: Array<{ step: CollabCleanupStep; where: Record<string, string[]> }> = []
  let committedBlueprints: Array<{ projectId?: string; status: string }> | null = null
  const series: ReleasableSeries = {
    episode_blueprints: [
      { projectId: PROJECT_ID, status: 'in_progress' },
      { projectId: 'other-project', status: 'in_progress' },
    ],
    changed() {},
    async save() {
      calls.push('series.save')
    },
  }

  const deps: DeleteProjectGraphDeps = {
    async transaction(work) {
      const pending = series.episode_blueprints?.map((episode) => ({ ...episode })) ?? []
      try {
        const result = await work({} as Transaction)
        committedBlueprints = series.episode_blueprints?.map((episode) => ({ ...episode })) ?? pending
        return result
      } catch (error) {
        series.episode_blueprints = pending
        throw error
      }
    },
    async findCollabSessionIds() {
      return options?.sessionIds ?? [SESSION_ID]
    },
    async destroyCollabStep(step, where) {
      calls.push(step)
      wheres.push({ step, where })
    },
    async findProject() {
      return { series_id: 'series-1' }
    },
    async findSeries() {
      return series
    },
    async destroyProject() {
      calls.push('project.destroy')
      if (options?.failDestroy) throw new Error('collab_sessions_project_id_fkey')
      return 1
    },
  }

  return { calls, wheres, series, deps, getCommitted: () => committedBlueprints }
}

describe('deleteProjectWithDependents', () => {
  it('deletes collaboration children before the session, then releases the episode', async () => {
    const { calls, wheres, deps, getCommitted } = harness()

    const deleted = await deleteProjectWithDependents(PROJECT_ID, deps)

    expect(deleted).toBe(1)
    expect(calls).toEqual([
      ...COLLAB_SESSION_CLEANUP_STEPS.map((step) => step.name),
      'series.save',
      'project.destroy',
    ])
    expect(calls.indexOf('participants')).toBeLessThan(calls.indexOf('sessions'))
    expect(calls.indexOf('sessions')).toBeLessThan(calls.indexOf('project.destroy'))
    expect(wheres).toEqual([
      { step: 'blueprintFeedback', where: { sessionId: [SESSION_ID] } },
      { step: 'scores', where: { session_id: [SESSION_ID] } },
      { step: 'comments', where: { session_id: [SESSION_ID] } },
      { step: 'recommendations', where: { session_id: [SESSION_ID] } },
      { step: 'chatMessages', where: { sessionId: [SESSION_ID] } },
      { step: 'participants', where: { session_id: [SESSION_ID] } },
      { step: 'sessions', where: { id: [SESSION_ID] } },
    ])
    expect(getCommitted()).toEqual([
      { status: 'blueprint' },
      { projectId: 'other-project', status: 'in_progress' },
    ])
  })

  it('does not commit the series unlink when project destroy fails', async () => {
    const { calls, series, deps, getCommitted } = harness({ failDestroy: true })

    await expect(deleteProjectWithDependents(PROJECT_ID, deps)).rejects.toThrow(
      'collab_sessions_project_id_fkey'
    )

    expect(calls).toContain('series.save')
    expect(calls.at(-1)).toBe('project.destroy')
    expect(getCommitted()).toBeNull()
    expect(series.episode_blueprints).toEqual([
      { projectId: PROJECT_ID, status: 'in_progress' },
      { projectId: 'other-project', status: 'in_progress' },
    ])
  })

  it('skips collaboration deletes when the project has no sessions', async () => {
    const { calls, deps } = harness({ sessionIds: [] })

    await deleteProjectWithDependents(PROJECT_ID, deps)

    expect(calls).toEqual(['series.save', 'project.destroy'])
  })
})
