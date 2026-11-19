import { Op, literal, type WhereOptions } from 'sequelize'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import SeriesAssignment from '@/models/SeriesAssignment'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

export interface WorkspaceScopeOptions {
  /**
   * Optional workspace scope selector from the Workspace Switcher:
   * - `'all'` or omitted: own projects/series + all accessible team workspaces
   * - `'personal'` or equal to `userId`: strictly own projects/series
   * - `<ownerUserId>`: strictly that agency workspace's accessible projects/series
   */
  activeWorkspaceOwnerId?: string | null
}

/**
 * Builds a Sequelize `where` clause for `Project` queries that returns:
 * - Projects directly owned by `userId` (`user_id = userId`)
 * - All projects of workspaces where `userId` is an active `admin` or has `access_all_projects`
 * - Directly assigned projects (`ProjectAssignment`)
 * - Child episode projects of assigned Series (`SeriesAssignment`)
 *
 * When `options.activeWorkspaceOwnerId` is provided, isolates the query to that workspace.
 */
export async function buildAccessibleProjectsScope(
  userId: string,
  options?: WorkspaceScopeOptions
): Promise<{
  where: WhereOptions
  accessibleOwnerIds: Set<string>
  selfAssignedProjectIds: string[]
}> {
  const scope = (options?.activeWorkspaceOwnerId || '').trim()
  if (scope === 'personal' || scope === userId) {
    return {
      where: { user_id: userId },
      accessibleOwnerIds: new Set([userId]),
      selfAssignedProjectIds: [],
    }
  }

  let where: WhereOptions = { user_id: userId }
  const accessibleOwnerIds = new Set<string>([userId])
  const selfAssignedProjectIds: string[] = []

  try {
    await ensureProducerPlatformSchema()
    const memberWhere: WhereOptions =
      scope && scope !== 'all'
        ? { member_user_id: userId, owner_user_id: scope, status: 'active' }
        : { member_user_id: userId, status: 'active' }

    const memberships = await WorkspaceMember.findAll({ where: memberWhere })

    if (scope && scope !== 'all') {
      accessibleOwnerIds.clear()
      if (memberships.length === 0) {
        return {
          where: literal('1 = 0'),
          accessibleOwnerIds,
          selfAssignedProjectIds,
        }
      }
      const m = memberships[0]
      if (m.role === 'admin' || m.access_all_projects) {
        accessibleOwnerIds.add(m.owner_user_id)
        return {
          where: { user_id: m.owner_user_id },
          accessibleOwnerIds,
          selfAssignedProjectIds,
        }
      }

      const [assignments, seriesAssignments] = await Promise.all([
        ProjectAssignment.findAll({
          where: { member_user_id: userId, owner_user_id: m.owner_user_id },
        }),
        SeriesAssignment.findAll({
          where: { member_user_id: userId, owner_user_id: m.owner_user_id },
        }),
      ])
      const assignedIds = Array.from(new Set(assignments.map((a) => a.project_id)))
      const assignedSeriesIds = Array.from(new Set(seriesAssignments.map((a) => a.series_id)))
      selfAssignedProjectIds.push(...assignedIds)

      const clauses: WhereOptions[] = []
      if (assignedIds.length > 0) {
        clauses.push({ id: { [Op.in]: assignedIds } })
      }
      if (assignedSeriesIds.length > 0) {
        clauses.push({ series_id: { [Op.in]: assignedSeriesIds } })
      }
      if (clauses.length === 0) {
        return {
          where: literal('1 = 0'),
          accessibleOwnerIds,
          selfAssignedProjectIds,
        }
      }
      return {
        where:
          clauses.length === 1
            ? { [Op.and]: [{ user_id: m.owner_user_id }, clauses[0]] }
            : { [Op.and]: [{ user_id: m.owner_user_id }, { [Op.or]: clauses }] },
        accessibleOwnerIds,
        selfAssignedProjectIds,
      }
    }

    if (memberships.length === 0) {
      return { where, accessibleOwnerIds, selfAssignedProjectIds }
    }

    const orClauses: WhereOptions[] = [{ user_id: userId }]
    const pmOwnerIds: string[] = []
    for (const m of memberships) {
      if (m.role === 'admin' || m.access_all_projects) {
        orClauses.push({ user_id: m.owner_user_id })
        accessibleOwnerIds.add(m.owner_user_id)
      } else {
        pmOwnerIds.push(m.owner_user_id)
      }
    }

    if (pmOwnerIds.length > 0) {
      const [assignments, seriesAssignments] = await Promise.all([
        ProjectAssignment.findAll({
          where: {
            member_user_id: userId,
            owner_user_id: { [Op.in]: pmOwnerIds },
          },
        }),
        SeriesAssignment.findAll({
          where: {
            member_user_id: userId,
            owner_user_id: { [Op.in]: pmOwnerIds },
          },
        }),
      ])
      const assignedIds = Array.from(new Set(assignments.map((a) => a.project_id)))
      const assignedSeriesIds = Array.from(new Set(seriesAssignments.map((a) => a.series_id)))
      selfAssignedProjectIds.push(...assignedIds)

      if (assignedIds.length > 0) {
        orClauses.push({ id: { [Op.in]: assignedIds } })
      }
      if (assignedSeriesIds.length > 0) {
        orClauses.push({ series_id: { [Op.in]: assignedSeriesIds } })
      }
    }

    if (orClauses.length > 1) {
      where = { [Op.or]: orClauses }
    }
  } catch (err) {
    console.warn('[workspaceProjectsQuery] Team lookup skipped:', err)
  }

  return { where, accessibleOwnerIds, selfAssignedProjectIds }
}

/**
 * Backwards-compatible helper returning only the Sequelize `WhereOptions` clause.
 */
export async function buildAccessibleProjectsWhere(
  userId: string,
  options?: WorkspaceScopeOptions
): Promise<WhereOptions> {
  const scope = await buildAccessibleProjectsScope(userId, options)
  return scope.where
}

/**
 * Builds a Sequelize `where` clause for `Series` queries honoring:
 * - Series directly owned by `userId`
 * - All series of workspaces where `userId` is active `admin` or `access_all_projects`
 * - Assigned series (`SeriesAssignment`)
 * - Optional Workspace Switcher isolation (`activeWorkspaceOwnerId`)
 */
export async function buildAccessibleSeriesWhere(
  userId: string,
  options?: WorkspaceScopeOptions
): Promise<WhereOptions> {
  const scope = (options?.activeWorkspaceOwnerId || '').trim()
  if (scope === 'personal' || scope === userId) {
    return { user_id: userId }
  }

  let where: WhereOptions = { user_id: userId }
  try {
    await ensureProducerPlatformSchema()
    const memberWhere: WhereOptions =
      scope && scope !== 'all'
        ? { member_user_id: userId, owner_user_id: scope, status: 'active' }
        : { member_user_id: userId, status: 'active' }

    const memberships = await WorkspaceMember.findAll({ where: memberWhere })

    if (scope && scope !== 'all') {
      if (memberships.length === 0) return literal('1 = 0')
      const m = memberships[0]
      if (m.role === 'admin' || m.access_all_projects) {
        return { user_id: m.owner_user_id }
      }
      const seriesAssignments = await SeriesAssignment.findAll({
        where: { member_user_id: userId, owner_user_id: m.owner_user_id },
      })
      const assignedSeriesIds = Array.from(new Set(seriesAssignments.map((a) => a.series_id)))
      if (assignedSeriesIds.length === 0) return literal('1 = 0')
      return { id: { [Op.in]: assignedSeriesIds }, user_id: m.owner_user_id }
    }

    if (memberships.length === 0) return where

    const orClauses: WhereOptions[] = [{ user_id: userId }]
    const pmOwnerIds: string[] = []
    for (const m of memberships) {
      if (m.role === 'admin' || m.access_all_projects) {
        orClauses.push({ user_id: m.owner_user_id })
      } else {
        pmOwnerIds.push(m.owner_user_id)
      }
    }

    if (pmOwnerIds.length > 0) {
      const seriesAssignments = await SeriesAssignment.findAll({
        where: {
          member_user_id: userId,
          owner_user_id: { [Op.in]: pmOwnerIds },
        },
      })
      const assignedSeriesIds = Array.from(new Set(seriesAssignments.map((a) => a.series_id)))
      if (assignedSeriesIds.length > 0) {
        orClauses.push({ id: { [Op.in]: assignedSeriesIds } })
      }
    }

    if (orClauses.length > 1) {
      where = { [Op.or]: orClauses }
    }
  } catch (err) {
    console.warn('[workspaceProjectsQuery] Series team lookup skipped:', err)
  }

  return where
}

/**
 * Resolves all active stakeholder `user_id`s who should receive project collaboration
 * notifications (workspace owner + active workspace admins + assigned PMs via project or series).
 */
export async function listProjectStakeholderUserIds(
  projectId: string | undefined,
  primaryUserId: string,
  seriesId?: string | null
): Promise<string[]> {
  const recipients = new Set<string>([primaryUserId])
  if (!projectId) return Array.from(recipients)

  try {
    await ensureProducerPlatformSchema()
    const [members, assignments, seriesAssignments] = await Promise.all([
      WorkspaceMember.findAll({
        where: {
          owner_user_id: primaryUserId,
          status: 'active',
        },
      }),
      ProjectAssignment.findAll({
        where: {
          project_id: projectId,
        },
      }),
      seriesId
        ? SeriesAssignment.findAll({ where: { series_id: seriesId } })
        : Promise.resolve([]),
    ])

    const assignedMemberIds = new Set([
      ...assignments.map((a) => a.member_user_id).filter(Boolean),
      ...seriesAssignments.map((a) => a.member_user_id).filter(Boolean),
    ])
    for (const m of members) {
      if (!m.member_user_id) continue
      if (m.role === 'admin' || m.access_all_projects || assignedMemberIds.has(m.member_user_id)) {
        recipients.add(m.member_user_id)
      }
    }
    for (const memberId of assignedMemberIds) {
      recipients.add(memberId)
    }
  } catch (err) {
    console.warn('[workspaceProjectsQuery] Stakeholder lookup skipped:', err)
  }

  return Array.from(recipients)
}
