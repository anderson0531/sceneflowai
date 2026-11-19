import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import Project from '@/models/Project'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import SeriesAssignment from '@/models/SeriesAssignment'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { buildKanbanMovePatch, KANBAN_COLUMNS, type KanbanStageId } from '@/lib/producer/agencyOps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['draft', 'in_progress', 'completed', 'archived'])
const ALLOWED_KANBAN_STAGES = new Set<string>(KANBAN_COLUMNS.map((c) => c.id))
const MAX_BULK_IDS = 100

type BulkAction = 'archive' | 'unarchive' | 'status' | 'assign_pm' | 'kanban_move' | 'set_sla'

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

    if (
      !['archive', 'unarchive', 'status', 'assign_pm', 'kanban_move', 'set_sla'].includes(action)
    ) {
      return NextResponse.json(
        { success: false, error: 'Unsupported bulk action' },
        { status: 400 }
      )
    }

    await ensureProducerPlatformSchema()

    // Determine workspaces where the actor is owner, workspace admin, or active PM (for kanban_move/set_sla)
    const memberships = await WorkspaceMember.findAll({
      where: {
        member_user_id: actorUserId,
        status: 'active',
      },
    })
    const adminOwnerIds = memberships
      .filter((m) => m.role === 'admin')
      .map((m) => m.owner_user_id)
    const authorizedOwnerIds = Array.from(new Set([actorUserId, ...adminOwnerIds]))

    const pmAllowedAction = action === 'kanban_move' || action === 'set_sla'
    const pmAllProjectOwnerIds = pmAllowedAction
      ? memberships
          .filter((m) => m.role === 'project_manager' && m.access_all_projects)
          .map((m) => m.owner_user_id)
      : []

    let pmAssignedProjectIds: string[] = []
    let pmAssignedSeriesIds: string[] = []
    if (pmAllowedAction) {
      const pmOwnerIds = memberships
        .filter((m) => m.role === 'project_manager' && !m.access_all_projects)
        .map((m) => m.owner_user_id)
      if (pmOwnerIds.length > 0) {
        const [paRows, saRows] = await Promise.all([
          ProjectAssignment.findAll({
            where: {
              member_user_id: actorUserId,
              owner_user_id: { [Op.in]: pmOwnerIds },
              project_id: { [Op.in]: projectIds },
            },
          }),
          SeriesAssignment.findAll({
            where: {
              member_user_id: actorUserId,
              owner_user_id: { [Op.in]: pmOwnerIds },
            },
          }),
        ])
        pmAssignedProjectIds = paRows.map((r) => r.project_id)
        pmAssignedSeriesIds = saRows.map((r) => r.series_id)
      }
    }

    const accessClauses: Record<string | symbol, unknown>[] = [
      { user_id: { [Op.in]: Array.from(new Set([...authorizedOwnerIds, ...pmAllProjectOwnerIds])) } },
    ]
    if (pmAssignedProjectIds.length > 0) {
      accessClauses.push({ id: { [Op.in]: pmAssignedProjectIds } })
    }
    if (pmAssignedSeriesIds.length > 0) {
      accessClauses.push({ series_id: { [Op.in]: pmAssignedSeriesIds } })
    }

    const targetProjects = await Project.findAll({
      where: {
        id: { [Op.in]: projectIds },
        ...(accessClauses.length === 1 ? accessClauses[0] : { [Op.or]: accessClauses }),
      },
      attributes:
        pmAllowedAction ? ['id', 'user_id', 'status', 'current_step', 'metadata'] : ['id', 'user_id', 'status'],
    })

    if (targetProjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No authorized projects matched selection' },
        { status: 403 }
      )
    }

    const authorizedProjectIds = targetProjects.map((p) => p.id)

    if (action === 'kanban_move') {
      const targetStage = String(body.targetStage || '').trim() as KanbanStageId
      if (!ALLOWED_KANBAN_STAGES.has(targetStage)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Kanban targetStage' },
          { status: 400 }
        )
      }
      for (const proj of targetProjects) {
        const patch = buildKanbanMovePatch(
          targetStage,
          (proj.metadata || {}) as Record<string, any>
        )
        await proj.update({
          status: patch.status,
          current_step: patch.current_step,
          metadata: patch.metadata as any,
        })
      }
      return NextResponse.json({
        success: true,
        action,
        targetStage,
        updatedCount: targetProjects.length,
      })
    }

    if (action === 'set_sla') {
      const rawDate = body.targetDeliveryDate
      let normalizedDate: string | null | undefined = undefined
      if (rawDate === null || rawDate === '') {
        normalizedDate = null
      } else if (typeof rawDate === 'string' && Number.isFinite(Date.parse(rawDate))) {
        normalizedDate = new Date(rawDate).toISOString()
      }

      const rawRev = body.revisionCount
      const normalizedRev =
        typeof rawRev === 'number' && Number.isFinite(rawRev) && rawRev >= 0
          ? Math.floor(rawRev)
          : undefined

      const rawPrice = body.clientPriceUsd
      const normalizedPrice =
        typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice >= 0
          ? Math.round(rawPrice)
          : undefined

      for (const proj of targetProjects) {
        const meta = { ...((proj.metadata || {}) as Record<string, any>) }
        const prevOrder =
          meta.clientOrder && typeof meta.clientOrder === 'object' ? { ...meta.clientOrder } : {}

        if (normalizedDate !== undefined) {
          prevOrder.targetDeliveryDate = normalizedDate
        }
        if (normalizedRev !== undefined) {
          prevOrder.revisionCount = normalizedRev
        }
        if (normalizedPrice !== undefined) {
          prevOrder.clientPriceUsd = normalizedPrice
        }
        meta.clientOrder = prevOrder
        await proj.update({ metadata: meta as any })
      }

      return NextResponse.json({
        success: true,
        action,
        updatedCount: targetProjects.length,
        targetDeliveryDate: normalizedDate,
      })
    }

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
