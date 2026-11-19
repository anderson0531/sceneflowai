import { NextRequest, NextResponse } from 'next/server'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProducerProfile from '@/models/ProducerProfile'
import User from '@/models/User'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import {
  ROLE_CAPABILITIES,
  isInviteTokenExpired,
  normalizeWorkspaceRole,
} from '@/lib/producer/teamGovernance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const cleanToken = (token || '').trim()
    if (!cleanToken) {
      return NextResponse.json({ success: false, error: 'Invalid invite token' }, { status: 400 })
    }

    await ensureProducerPlatformSchema()
    const member = await WorkspaceMember.findOne({
      where: { invite_token: cleanToken },
    })

    if (!member || member.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'This workspace invitation is invalid or has been revoked.' },
        { status: 404 }
      )
    }

    const expired = isInviteTokenExpired(member.invite_expires_at)
    const [profile, owner] = await Promise.all([
      ProducerProfile.findOne({
        where: { user_id: member.owner_user_id },
        attributes: ['brand_name', 'brand_logo_url', 'primary_color'],
      }).catch(() => null),
      User.findByPk(member.owner_user_id, {
        attributes: ['first_name', 'last_name', 'username', 'email'],
      }).catch(() => null),
    ])

    const ownerName =
      [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') ||
      owner?.username ||
      'Workspace Owner'
    const workspaceBrandName = (profile?.brand_name || '').trim() || `${ownerName}'s Studio`
    const role = normalizeWorkspaceRole(member.role)
    const cap = ROLE_CAPABILITIES[role]

    return NextResponse.json({
      success: true,
      invite: {
        valid: !expired && member.status !== 'revoked',
        expired,
        status: member.status,
        workspaceOwnerId: member.owner_user_id,
        workspaceBrandName,
        brandLogoUrl: profile?.brand_logo_url || null,
        primaryColor: profile?.primary_color || '#06b6d4',
        ownerName,
        memberEmail: member.member_email,
        role,
        roleLabel: cap.label,
        roleDescription: cap.description,
        monthlyCreditLimit: member.monthly_credit_limit,
        accessAllProjects: member.access_all_projects,
        expiresAt: member.invite_expires_at,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load invitation'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to accept this workspace invitation.' },
        { status: 401 }
      )
    }

    const { token } = await ctx.params
    const cleanToken = (token || '').trim()
    if (!cleanToken) {
      return NextResponse.json({ success: false, error: 'Invalid invite token' }, { status: 400 })
    }

    await ensureProducerPlatformSchema()
    const member = await WorkspaceMember.findOne({
      where: { invite_token: cleanToken },
    })

    if (!member || member.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'This workspace invitation is invalid or has been revoked.' },
        { status: 404 }
      )
    }

    if (isInviteTokenExpired(member.invite_expires_at)) {
      return NextResponse.json(
        {
          success: false,
          error: 'This invitation link has expired. Ask the workspace owner to send a fresh invite.',
        },
        { status: 410 }
      )
    }

    if (member.owner_user_id === actorUserId) {
      return NextResponse.json(
        { success: false, error: 'You are already the owner of this workspace.' },
        { status: 400 }
      )
    }

    const actor = await User.findByPk(actorUserId, { attributes: ['id', 'email'] }).catch(
      () => null
    )
    const actorEmail = actor?.email?.trim().toLowerCase()
    const invitedEmail = member.member_email.trim().toLowerCase()

    // Bind actor account and clear single-use token
    await member.update({
      member_user_id: actorUserId,
      member_email: actorEmail || invitedEmail,
      status: 'active',
      invite_token: null,
      invite_expires_at: null,
    })

    const profile = await ProducerProfile.findOne({
      where: { user_id: member.owner_user_id },
      attributes: ['brand_name'],
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      workspaceOwnerId: member.owner_user_id,
      workspaceBrandName: (profile?.brand_name || '').trim() || 'Agency Workspace',
      role: normalizeWorkspaceRole(member.role),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to accept invitation'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
