import { Op, type WhereOptions } from 'sequelize'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

/**
 * Builds a Sequelize `where` clause for `Project` queries that returns:
 * - Projects directly owned by `userId` (`user_id = userId`)
 * - All projects of workspaces where `userId` is an active `admin` or has `access_all_projects`
 * - Assigned projects (`ProjectAssignment`) where `userId` is an active `project_manager`
 */
export async function buildAccessibleProjectsWhere(userId: string): Promise<WhereOptions> {
  let where: WhereOptions = { user_id: userId }
  try {
    await ensureProducerPlatformSchema()
    const memberships = await WorkspaceMember.findAll({
      where: { member_user_id: userId, status: 'active' },
    })
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
      const assignments = await ProjectAssignment.findAll({
        where: {
          member_user_id: userId,
          owner_user_id: { [Op.in]: pmOwnerIds },
        },
      })
      const assignedIds = Array.from(new Set(assignments.map((a) => a.project_id)))
      if (assignedIds.length > 0) {
        orClauses.push({ id: { [Op.in]: assignedIds } })
      }
    }

    if (orClauses.length > 1) {
      where = { [Op.or]: orClauses }
    }
  } catch (err) {
    console.warn('[workspaceProjectsQuery] Team lookup skipped:', err)
  }
  return where
}

/**
 * Resolves all active stakeholder `user_id`s who should receive project collaboration
 * notifications (workspace owner + active workspace admins + assigned project managers).
 */
export async function listProjectStakeholderUserIds(
  projectId: string | undefined,
  primaryUserId: string
): Promise<string[]> {
  const recipients = new Set<string>([primaryUserId])
  if (!projectId) return Array.from(recipients)

  try {
    await ensureProducerPlatformSchema()
    const [members, assignments] = await Promise.all([
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
    ])

    const assignedMemberIds = new Set(assignments.map((a) => a.member_user_id).filter(Boolean))
    for (const m of members) {
      if (!m.member_user_id) continue
      if (m.role === 'admin' || m.access_all_projects || assignedMemberIds.has(m.member_user_id)) {
        recipients.add(m.member_user_id)
      }
    }
    // Also include direct project assignments where the customer initiated the project and assigned a PM
    for (const memberId of assignedMemberIds) {
      recipients.add(memberId)
    }
  } catch (err) {
    console.warn('[workspaceProjectsQuery] Stakeholder lookup skipped:', err)
  }

  return Array.from(recipients)
}
