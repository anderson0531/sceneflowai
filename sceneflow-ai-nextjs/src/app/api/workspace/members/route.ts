import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import WorkspaceMember, { type WorkspaceMemberRole } from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import User from '@/models/User'
import Project from '@/models/Project'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureProducerPlatformSchema()

    const members = await WorkspaceMember.findAll({
      where: {
        owner_user_id: ownerUserId,
        status: { [Op.ne]: 'revoked' },
      },
      order: [['created_at', 'DESC']],
    })

    const assignments = await ProjectAssignment.findAll({
      where: { owner_user_id: ownerUserId },
    })

    const assignedByMember = new Map<string, string[]>()
    for (const row of assignments) {
      const list = assignedByMember.get(row.member_user_id) || []
      list.push(row.project_id)
      assignedByMember.set(row.member_user_id, list)
    }

    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.id,
        memberUserId: m.member_user_id,
        memberEmail: m.member_email,
        role: m.role,
        status: m.status,
        accessAllProjects: m.access_all_projects,
        monthlyCreditLimit: m.monthly_credit_limit,
        creditsUsedMonth: m.credits_used_month,
        assignedProjectIds: m.member_user_id ? assignedByMember.get(m.member_user_id) || [] : [],
        createdAt: m.created_at,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list workspace members'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const rawEmail = String(body.email || '').trim().toLowerCase()
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { success: false, error: 'Valid team member email is required' },
        { status: 400 }
      )
    }

    const role: WorkspaceMemberRole = body.role === 'admin' ? 'admin' : 'project_manager'
    const accessAllProjects = role === 'admin' ? true : Boolean(body.accessAllProjects)
    const monthlyCreditLimit =
      typeof body.monthlyCreditLimit === 'number' && body.monthlyCreditLimit > 0
        ? Math.round(body.monthlyCreditLimit)
        : null
    const projectIds: string[] = Array.isArray(body.projectIds)
      ? body.projectIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : []

    await ensureProducerPlatformSchema()

    const matchedUser = await User.findOne({ where: { email: rawEmail } }).catch(() => null)
    if (matchedUser && matchedUser.id === ownerUserId) {
      return NextResponse.json(
        { success: false, error: 'You are already the workspace owner' },
        { status: 400 }
      )
    }

    const existing = await WorkspaceMember.findOne({
      where: { owner_user_id: ownerUserId, member_email: rawEmail },
    })

    let member: WorkspaceMember
    if (existing) {
      await existing.update({
        member_user_id: matchedUser?.id || existing.member_user_id,
        role,
        status: matchedUser ? 'active' : 'invited',
        access_all_projects: accessAllProjects,
        monthly_credit_limit: monthlyCreditLimit,
      })
      member = existing
    } else {
      member = await WorkspaceMember.create({
        owner_user_id: ownerUserId,
        member_user_id: matchedUser?.id || null,
        member_email: rawEmail,
        role,
        status: matchedUser ? 'active' : 'invited',
        access_all_projects: accessAllProjects,
        monthly_credit_limit: monthlyCreditLimit,
      })
    }

    if (member.member_user_id && projectIds.length > 0) {
      const ownedProjects = await Project.findAll({
        where: { id: projectIds, user_id: ownerUserId },
      })
      for (const proj of ownedProjects) {
        await ProjectAssignment.findOrCreate({
          where: {
            project_id: proj.id,
            member_user_id: member.member_user_id,
          },
          defaults: {
            project_id: proj.id,
            owner_user_id: ownerUserId,
            member_user_id: member.member_user_id,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        memberUserId: member.member_user_id,
        memberEmail: member.member_email,
        role: member.role,
        status: member.status,
        accessAllProjects: member.access_all_projects,
        monthlyCreditLimit: member.monthly_credit_limit,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to invite team member'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const memberId = String(body.memberId || '').trim()
    if (!memberId) {
      return NextResponse.json({ success: false, error: 'memberId is required' }, { status: 400 })
    }

    await ensureProducerPlatformSchema()
    const member = await WorkspaceMember.findOne({
      where: { id: memberId, owner_user_id: ownerUserId },
    })
    if (!member) {
      return NextResponse.json({ success: false, error: 'Team member not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (body.role === 'admin' || body.role === 'project_manager') {
      updates.role = body.role
    }
    if (typeof body.accessAllProjects === 'boolean') {
      updates.access_all_projects = body.accessAllProjects
    }
    if (body.monthlyCreditLimit !== undefined) {
      updates.monthly_credit_limit =
        typeof body.monthlyCreditLimit === 'number' && body.monthlyCreditLimit > 0
          ? Math.round(body.monthlyCreditLimit)
          : null
    }
    if (Object.keys(updates).length > 0) {
      await member.update(updates)
    }

    if (Array.isArray(body.projectIds) && member.member_user_id) {
      await ProjectAssignment.destroy({
        where: { owner_user_id: ownerUserId, member_user_id: member.member_user_id },
      })
      const validIds = body.projectIds.filter(
        (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
      )
      if (validIds.length > 0) {
        const ownedProjects = await Project.findAll({
          where: { id: validIds, user_id: ownerUserId },
        })
        for (const proj of ownedProjects) {
          await ProjectAssignment.create({
            project_id: proj.id,
            owner_user_id: ownerUserId,
            member_user_id: member.member_user_id,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update team member'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const memberId = req.nextUrl.searchParams.get('memberId')?.trim()
    if (!memberId) {
      return NextResponse.json({ success: false, error: 'memberId is required' }, { status: 400 })
    }

    await ensureProducerPlatformSchema()
    const member = await WorkspaceMember.findOne({
      where: { id: memberId, owner_user_id: ownerUserId },
    })
    if (!member) {
      return NextResponse.json({ success: false, error: 'Team member not found' }, { status: 404 })
    }

    await member.update({ status: 'revoked' })
    if (member.member_user_id) {
      await ProjectAssignment.destroy({
        where: { owner_user_id: ownerUserId, member_user_id: member.member_user_id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revoke team member'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
