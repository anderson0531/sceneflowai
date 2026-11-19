import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProducerProfile from '@/models/ProducerProfile'
import User from '@/models/User'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { normalizeWorkspaceRole, ROLE_CAPABILITIES } from '@/lib/producer/teamGovernance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface WorkspaceContextOption {
  ownerUserId: string
  label: string
  role: 'owner' | 'admin' | 'project_manager' | 'qa_reviewer'
  roleLabel: string
  isPersonal: boolean
  primaryColor?: string
  accessAllProjects?: boolean
  monthlyCreditLimit?: number | null
  creditsUsedMonth?: number
}

export async function GET(req: NextRequest) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureProducerPlatformSchema()

    const [ownProfile, memberships] = await Promise.all([
      ProducerProfile.findOne({
        where: { user_id: actorUserId },
        attributes: ['brand_name', 'primary_color'],
      }).catch(() => null),
      WorkspaceMember.findAll({
        where: {
          member_user_id: actorUserId,
          status: 'active',
        },
        order: [['created_at', 'ASC']],
      }),
    ])

    const contexts: WorkspaceContextOption[] = [
      {
        ownerUserId: actorUserId,
        label: (ownProfile?.brand_name || '').trim() || 'Personal Workspace',
        role: 'owner',
        roleLabel: ROLE_CAPABILITIES.owner.label,
        isPersonal: true,
        primaryColor: ownProfile?.primary_color || '#06b6d4',
      },
    ]

    if (memberships.length > 0) {
      const ownerIds = Array.from(new Set(memberships.map((m) => m.owner_user_id)))
      const [profiles, owners] = await Promise.all([
        ProducerProfile.findAll({
          where: { user_id: { [Op.in]: ownerIds } },
          attributes: ['user_id', 'brand_name', 'primary_color'],
        }),
        User.findAll({
          where: { id: { [Op.in]: ownerIds } },
          attributes: ['id', 'first_name', 'last_name', 'username', 'email'],
        }),
      ])

      const profileByOwner = new Map(profiles.map((p) => [p.user_id, p]))
      const ownerById = new Map(owners.map((u) => [u.id, u]))

      for (const m of memberships) {
        if (m.owner_user_id === actorUserId) continue
        const prof = profileByOwner.get(m.owner_user_id)
        const owner = ownerById.get(m.owner_user_id)
        const fallbackName =
          [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') ||
          owner?.username ||
          owner?.email ||
          'Agency Studio'
        const role = normalizeWorkspaceRole(m.role)

        contexts.push({
          ownerUserId: m.owner_user_id,
          label: (prof?.brand_name || '').trim() || fallbackName,
          role,
          roleLabel: ROLE_CAPABILITIES[role].label,
          isPersonal: false,
          primaryColor: prof?.primary_color || '#7c3aed',
          accessAllProjects: m.access_all_projects,
          monthlyCreditLimit: m.monthly_credit_limit,
          creditsUsedMonth: m.credits_used_month,
        })
      }
    }

    return NextResponse.json({
      success: true,
      hasExternalWorkspaces: contexts.length > 1,
      contexts,
    })
  } catch (err: unknown) {
    console.warn('[workspace/contexts GET] Fallback:', err)
    return NextResponse.json({
      success: true,
      hasExternalWorkspaces: false,
      contexts: [],
    })
  }
}
