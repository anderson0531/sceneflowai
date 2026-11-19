import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import Project from '@/models/Project'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['draft', 'in_progress', 'completed', 'archived'])
const MAX_BULK_IDS = 100

type BulkAction = 'archive' | 'unarchive' | 'status' | 'assign_pm'

export async function POST(req: NextRequest) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '').trim() as BulkAction
    const rawIds: unknown[] = Array.isArray(body.projectIds) ? body.projectIds : []
    const projectIds = Array.from(
      new Set(
        rawIds
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map((id) => id.trim())
      )
    ).slice(0, MAX_BULK_IDS)

    if (projectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one projectId is required' },
        { status: 400 }
      )
    }

    if (!['archive', 'unarchive', 'status', 'assign_pm'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported bulk action' },
        { status: 400 }
      )
    }

    await ensureProducerPlatformSchema()

    // Determine workspaces where the actor is owner or workspace admin
    const adminMemberships = await WorkspaceMember.findAll({
      where: {
        member_user_id: actorUserId,
        status: 'active',
        role: 'admin',
      },
    })
    const authorizedOwnerIds = Array.from(
      new Set([actorUserId, ...adminMemberships.map((m) => m.owner_user_id)])
    )

    const targetProjects = await Project.findAll({
      where: {
        id: { [Op.in]: projectIds },
        user_id: { [Op.in]: authorizedOwnerIds },
      },
      attributes: ['id', 'user_id', 'status'],
    })

    if (targetProjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No authorized projects matched selection' },
        { status: 403 }
      )
    }

    const authorizedProjectIds = targetProjects.map((p) => p.id)

    if (action === 'archive' || action === 'unarchive' || action === 'status') {
      const nextStatus =
        action === 'archive'
          ? 'archived'
          : action === 'unarchive'
            ? 'in_progress'
            : String(body.status || '').trim()

      if (!ALLOWED_STATUSES.has(nextStatus)) {
        return NextResponse.json(
          { success: false, error: 'Invalid target status' },
          { status: 400 }
        )
      }

      await Project.update(
        { status: nextStatus as 'draft' | 'in_progress' | 'completed' | 'archived' },
        { where: { id: { [Op.in]: authorizedProjectIds } } }
      )

      return NextResponse.json({
        success: true,
        action,
        updatedCount: authorizedProjectIds.length,
        status: nextStatus,
      })
    }

    // action === 'assign_pm'
    const memberUserId =
      typeof body.memberUserId === 'string' && body.memberUserId.trim().length > 0
        ? body.memberUserId.trim()
        : null

    if (memberUserId === null) {
      // Unassign all PMs on selected projects
      await ProjectAssignment.destroy({
        where: { project_id: { [Op.in]: authorizedProjectIds } },
      })
      return NextResponse.json({
        success: true,
        action,
        updatedCount: authorizedProjectIds.length,
        assignedMemberUserId: null,
      })
    }

    // Validate the target PM belongs to the owning workspace(s)
    const targetMembers = await WorkspaceMember.findAll({
      where: {
        owner_user_id: { [Op.in]: authorizedOwnerIds },
        member_user_id: memberUserId,
        status: 'active',
      },
    })
    const validOwnersForMember = new Set(targetMembers.map((m) => m.owner_user_id))

    const assignableProjects = targetProjects.filter((p) =>
      validOwnersForMember.has(p.user_id)
    )
    if (assignableProjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selected team member is not active on this workspace' },
        { status: 400 }
      )
    }

    const replaceExisting = body.replaceExisting !== false
    if (replaceExisting) {
      await ProjectAssignment.destroy({
        where: { project_id: { [Op.in]: assignableProjects.map((p) => p.id) } },
      })
    }

    for (const proj of assignableProjects) {
      await ProjectAssignment.findOrCreate({
        where: {
          project_id: proj.id,
          member_user_id: memberUserId,
        },
        defaults: {
          project_id: proj.id,
          owner_user_id: proj.user_id,
          member_user_id: memberUserId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      action,
      updatedCount: assignableProjects.length,
      assignedMemberUserId: memberUserId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bulk project operation failed'
    console.error('[POST /api/projects/bulk] Error:', err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
