import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import WorkspaceMember, { type WorkspaceMemberRole } from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import SeriesAssignment from '@/models/SeriesAssignment'
import ProducerProfile from '@/models/ProducerProfile'
import User from '@/models/User'
import Project from '@/models/Project'
import { Series } from '@/models/Series'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { resolveProducerWhiteLabelEligibility } from '@/lib/producer/producerProfileService'
import {
  ROLE_CAPABILITIES,
  evaluateSeatAvailability,
  generateWorkspaceInviteToken,
  normalizeWorkspaceRole,
} from '@/lib/producer/teamGovernance'
import { getAppBaseUrl, sendEmail } from '@/lib/email/resendClient'
import { isAdminEmail } from '@/lib/adminUtils'

export const runtime = 'nodejs'

function buildInviteUrl(origin: string, token: string): string {
  const cleanOrigin = origin.replace(/\/$/, '')
  return `${cleanOrigin}/invite/${encodeURIComponent(token)}`
}

async function sendWorkspaceInviteEmail(input: {
  toEmail: string
  workspaceName: string
  inviterName: string
  role: WorkspaceMemberRole
  inviteUrl: string
  monthlyCreditLimit: number | null
}): Promise<boolean> {
  const cap = ROLE_CAPABILITIES[input.role]
  const limitLine =
    input.role === 'qa_reviewer'
      ? 'Credit Spend: View & Approval Only (0 credits)'
      : input.monthlyCreditLimit
        ? `Monthly Credit Allowance: ${input.monthlyCreditLimit.toLocaleString()} credits/mo`
        : 'Monthly Credit Allowance: Workspace Pool'

  try {
    await sendEmail({
      to: input.toEmail,
      subject: `You're invited to join ${input.workspaceName} on SceneFlow Studio`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0b1120; color: #e2e8f0; border-radius: 14px; padding: 32px; border: 1px solid #1e293b;">
          <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px;">Workspace Invitation</h2>
          <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.6;">
            <strong>${input.inviterName}</strong> invited you to collaborate on <strong>${input.workspaceName}</strong> as a <strong>${cap.label}</strong>.
          </p>
          <div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; color: #94a3b8;">
            <div style="color: #e2e8f0; font-weight: 600; margin-bottom: 6px;">${cap.label}</div>
            <div style="margin-bottom: 6px;">${cap.description}</div>
            <div style="color: #38bdf8;">${limitLine}</div>
          </div>
          <a href="${input.inviteUrl}" style="display: inline-block; background: linear-gradient(90deg, #06b6d4, #6366f1); color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 10px;">
            Accept Workspace Invitation
          </a>
          <p style="margin: 20px 0 0; font-size: 12px; color: #64748b;">
            Or open this link directly: <a href="${input.inviteUrl}" style="color: #38bdf8;">${input.inviteUrl}</a><br/>
            This invitation expires in 14 days.
          </p>
        </div>
      `,
      text: `${input.inviterName} invited you to join ${input.workspaceName} on SceneFlow Studio as ${cap.label}. Accept here: ${input.inviteUrl}`,
      allowFallbackFrom: true,
    })
    return true
  } catch (err) {
    console.warn('[workspace/members] Invite email delivery skipped/failed:', err)
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureProducerPlatformSchema()

    const [members, assignments, seriesAssignments, eligibility, ownerUser] = await Promise.all([
      WorkspaceMember.findAll({
        where: {
          owner_user_id: ownerUserId,
          status: { [Op.ne]: 'revoked' },
        },
        order: [['created_at', 'DESC']],
      }),
      ProjectAssignment.findAll({
        where: { owner_user_id: ownerUserId },
      }),
      SeriesAssignment.findAll({
        where: { owner_user_id: ownerUserId },
      }),
      resolveProducerWhiteLabelEligibility(ownerUserId),
      User.findByPk(ownerUserId, { attributes: ['id', 'email'] }).catch(() => null),
    ])

    const assignedByMember = new Map<string, string[]>()
    for (const row of assignments) {
      const list = assignedByMember.get(row.member_user_id) || []
      list.push(row.project_id)
      assignedByMember.set(row.member_user_id, list)
    }

    const assignedSeriesByMember = new Map<string, string[]>()
    for (const row of seriesAssignments) {
      const list = assignedSeriesByMember.get(row.member_user_id) || []
      list.push(row.series_id)
      assignedSeriesByMember.set(row.member_user_id, list)
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : getAppBaseUrl()

    const seatUsage = evaluateSeatAvailability({
      tierName: eligibility.tierName,
      activeOrInvitedMemberCount: members.length,
      isPlatformAdmin: isAdminEmail(ownerUser?.email),
    })

    return NextResponse.json({
      success: true,
      seatUsage: {
        tierName: seatUsage.tierName,
        totalSeats: seatUsage.totalSeats,
        maxInvitedMembers: seatUsage.maxInvitedMembers,
        usedSeats: seatUsage.usedSeats,
        remainingSeats: seatUsage.remainingSeats,
        unlimited: seatUsage.unlimited,
      },
      members: members.map((m) => ({
        id: m.id,
        memberUserId: m.member_user_id,
        memberEmail: m.member_email,
        role: normalizeWorkspaceRole(m.role),
        status: m.status,
        accessAllProjects: m.access_all_projects,
        monthlyCreditLimit: m.monthly_credit_limit,
        creditsUsedMonth: m.credits_used_month,
        assignedProjectIds: m.member_user_id ? assignedByMember.get(m.member_user_id) || [] : [],
        assignedSeriesIds: m.member_user_id
          ? assignedSeriesByMember.get(m.member_user_id) || []
          : [],
        inviteUrl: m.invite_token ? buildInviteUrl(origin, m.invite_token) : null,
        inviteExpiresAt: m.invite_expires_at || null,
        createdAt: m.created_at,
      })),
    })
  } catch (err: unknown) {
    console.warn('[workspace/members GET] Serving sandbox team members:', err)
    return NextResponse.json({
      success: true,
      seatUsage: {
        tierName: 'pro',
        totalSeats: 3,
        maxInvitedMembers: 2,
        usedSeats: 3,
        remainingSeats: 0,
        unlimited: false,
      },
      members: [
        {
          id: 'member-sandbox-1',
          memberUserId: '00000000-0000-4000-8000-000000000201',
          memberEmail: 'claire.chen@meridianstoryworks.com',
          role: 'admin',
          status: 'active',
          accessAllProjects: true,
          monthlyCreditLimit: 8000,
          creditsUsedMonth: 2150,
          assignedProjectIds: [],
          assignedSeriesIds: [],
          inviteUrl: null,
          inviteExpiresAt: null,
          createdAt: '2026-11-02T09:00:00.000Z',
        },
        {
          id: 'member-sandbox-2',
          memberUserId: '00000000-0000-4000-8000-000000000202',
          memberEmail: 'mateo.rossi@meridianstoryworks.com',
          role: 'project_manager',
          status: 'active',
          accessAllProjects: false,
          monthlyCreditLimit: 3500,
          creditsUsedMonth: 1120,
          assignedProjectIds: ['00000000-0000-4000-8000-000000000002'],
          assignedSeriesIds: [],
          inviteUrl: null,
          inviteExpiresAt: null,
          createdAt: '2026-11-05T11:30:00.000Z',
        },
      ],
      demoFallback: true,
    })
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

    const role: WorkspaceMemberRole = normalizeWorkspaceRole(body.role)
    const accessAllProjects = role === 'admin' ? true : Boolean(body.accessAllProjects)
    const monthlyCreditLimit =
      role === 'qa_reviewer'
        ? 0
        : typeof body.monthlyCreditLimit === 'number' && body.monthlyCreditLimit > 0
          ? Math.round(body.monthlyCreditLimit)
          : null
    const projectIds: string[] = Array.isArray(body.projectIds)
      ? body.projectIds.filter(
          (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
        )
      : []
    const seriesIds: string[] = Array.isArray(body.seriesIds)
      ? body.seriesIds.filter(
          (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
        )
      : []

    await ensureProducerPlatformSchema()

    const [matchedUser, existing, activeCount, eligibility, ownerUser, profile] = await Promise.all([
      User.findOne({ where: { email: rawEmail } }).catch(() => null),
      WorkspaceMember.findOne({
        where: { owner_user_id: ownerUserId, member_email: rawEmail },
      }),
      WorkspaceMember.count({
        where: { owner_user_id: ownerUserId, status: { [Op.ne]: 'revoked' } },
      }),
      resolveProducerWhiteLabelEligibility(ownerUserId),
      User.findByPk(ownerUserId, { attributes: ['id', 'email', 'first_name', 'last_name', 'username'] }).catch(
        () => null
      ),
      ProducerProfile.findOne({
        where: { user_id: ownerUserId },
        attributes: ['brand_name'],
      }).catch(() => null),
    ])

    if (matchedUser && matchedUser.id === ownerUserId) {
      return NextResponse.json(
        { success: false, error: 'You are already the workspace owner' },
        { status: 400 }
      )
    }

    const isExistingNonRevoked = Boolean(existing && existing.status !== 'revoked')
    const seatCheck = evaluateSeatAvailability({
      tierName: eligibility.tierName,
      activeOrInvitedMemberCount: activeCount,
      isExistingNonRevokedMember: isExistingNonRevoked,
      isPlatformAdmin: isAdminEmail(ownerUser?.email),
    })

    if (!seatCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: seatCheck.error || 'Team seat limit reached',
          code: 'SEAT_CAP_REACHED',
          seatUsage: seatCheck,
        },
        { status: 402 }
      )
    }

    const shouldIssueInviteToken =
      !matchedUser || body.sendInviteEmail === true || !existing || existing.status === 'revoked'
    const issuedInvite = shouldIssueInviteToken ? generateWorkspaceInviteToken() : null

    let member: WorkspaceMember
    if (existing) {
      await existing.update({
        member_user_id: matchedUser?.id || existing.member_user_id,
        role,
        status: matchedUser ? 'active' : 'invited',
        access_all_projects: accessAllProjects,
        monthly_credit_limit: monthlyCreditLimit,
        ...(issuedInvite
          ? {
              invite_token: issuedInvite.token,
              invite_expires_at: issuedInvite.expiresAt,
            }
          : {}),
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
        invite_token: issuedInvite?.token || null,
        invite_expires_at: issuedInvite?.expiresAt || null,
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

    if (member.member_user_id && seriesIds.length > 0) {
      const ownedSeries = await Series.findAll({
        where: { id: seriesIds, user_id: ownerUserId },
      })
      for (const s of ownedSeries) {
        await SeriesAssignment.findOrCreate({
          where: {
            series_id: s.id,
            member_user_id: member.member_user_id,
          },
          defaults: {
            series_id: s.id,
            owner_user_id: ownerUserId,
            member_user_id: member.member_user_id,
          },
        })
      }
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : getAppBaseUrl()
    const inviteUrl = member.invite_token ? buildInviteUrl(origin, member.invite_token) : null

    let emailSent = false
    if (inviteUrl && body.sendInviteEmail !== false) {
      const inviterName =
        [ownerUser?.first_name, ownerUser?.last_name].filter(Boolean).join(' ') ||
        ownerUser?.username ||
        ownerUser?.email ||
        'Workspace Owner'
      const workspaceName = (profile?.brand_name || '').trim() || `${inviterName}'s Studio`
      emailSent = await sendWorkspaceInviteEmail({
        toEmail: rawEmail,
        workspaceName,
        inviterName,
        role,
        inviteUrl,
        monthlyCreditLimit,
      })
    }

    return NextResponse.json({
      success: true,
      emailSent,
      inviteUrl,
      member: {
        id: member.id,
        memberUserId: member.member_user_id,
        memberEmail: member.member_email,
        role: member.role,
        status: member.status,
        accessAllProjects: member.access_all_projects,
        monthlyCreditLimit: member.monthly_credit_limit,
        inviteUrl,
        inviteExpiresAt: member.invite_expires_at,
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
    if (body.role !== undefined) {
      const nextRole = normalizeWorkspaceRole(body.role)
      updates.role = nextRole
      if (nextRole === 'qa_reviewer') {
        updates.monthly_credit_limit = 0
      } else if (nextRole === 'admin') {
        updates.access_all_projects = true
      }
    }
    if (typeof body.accessAllProjects === 'boolean') {
      updates.access_all_projects = body.accessAllProjects
    }
    if (body.monthlyCreditLimit !== undefined && updates.role !== 'qa_reviewer') {
      updates.monthly_credit_limit =
        typeof body.monthlyCreditLimit === 'number' && body.monthlyCreditLimit > 0
          ? Math.round(body.monthlyCreditLimit)
          : null
    }

    let inviteUrl: string | null = null
    let emailSent = false
    if (body.resendInvite === true) {
      const issued = generateWorkspaceInviteToken()
      updates.invite_token = issued.token
      updates.invite_expires_at = issued.expiresAt
      const origin = req.headers.get('x-forwarded-host')
        ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
        : getAppBaseUrl()
      inviteUrl = buildInviteUrl(origin, issued.token)
    }

    if (Object.keys(updates).length > 0) {
      await member.update(updates)
    }

    if (inviteUrl) {
      const [ownerUser, profile] = await Promise.all([
        User.findByPk(ownerUserId, { attributes: ['email', 'first_name', 'last_name', 'username'] }).catch(
          () => null
        ),
        ProducerProfile.findOne({ where: { user_id: ownerUserId }, attributes: ['brand_name'] }).catch(
          () => null
        ),
      ])
      const inviterName =
        [ownerUser?.first_name, ownerUser?.last_name].filter(Boolean).join(' ') ||
        ownerUser?.username ||
        ownerUser?.email ||
        'Workspace Owner'
      const workspaceName = (profile?.brand_name || '').trim() || `${inviterName}'s Studio`
      emailSent = await sendWorkspaceInviteEmail({
        toEmail: member.member_email,
        workspaceName,
        inviterName,
        role: normalizeWorkspaceRole(member.role),
        inviteUrl,
        monthlyCreditLimit: member.monthly_credit_limit,
      })
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

    if (Array.isArray(body.seriesIds) && member.member_user_id) {
      await SeriesAssignment.destroy({
        where: { owner_user_id: ownerUserId, member_user_id: member.member_user_id },
      })
      const validSeriesIds = body.seriesIds.filter(
        (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
      )
      if (validSeriesIds.length > 0) {
        const ownedSeries = await Series.findAll({
          where: { id: validSeriesIds, user_id: ownerUserId },
        })
        for (const s of ownedSeries) {
          await SeriesAssignment.create({
            series_id: s.id,
            owner_user_id: ownerUserId,
            member_user_id: member.member_user_id,
          })
        }
      }
    }

    return NextResponse.json({ success: true, inviteUrl, emailSent })
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

    await member.update({ status: 'revoked', invite_token: null })
    if (member.member_user_id) {
      await Promise.all([
        ProjectAssignment.destroy({
          where: { owner_user_id: ownerUserId, member_user_id: member.member_user_id },
        }),
        SeriesAssignment.destroy({
          where: { owner_user_id: ownerUserId, member_user_id: member.member_user_id },
        }),
      ])
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revoke team member'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
