import { Op } from 'sequelize'
import WorkspaceMember, { type WorkspaceMemberRole } from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import User from '@/models/User'
import Project from '@/models/Project'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'

export type EffectiveProjectRole = 'owner' | 'admin' | 'project_manager'

export interface WorkspaceAccessGrant {
  allowed: boolean
  role?: EffectiveProjectRole
  billingOwnerUserId?: string
  memberRecord?: WorkspaceMember
}

function currentMonthPeriodKey(now = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Checks whether `actorUserId` is an active Team Member (`admin` or
 * `project_manager`) on `projectOwnerUserId`'s workspace with permission to
 * access `projectId`.
 *
 * Also auto-binds invited rows matching the actor's verified email on first access.
 */
export async function checkWorkspaceProjectAccess(
  projectOwnerUserId: string,
  actorUserId: string,
  projectId: string
): Promise<WorkspaceAccessGrant> {
  if (!projectOwnerUserId || !actorUserId) {
    return { allowed: false }
  }
  if (projectOwnerUserId === actorUserId) {
    return {
      allowed: true,
      role: 'owner',
      billingOwnerUserId: projectOwnerUserId,
    }
  }

  try {
    await ensureProducerPlatformSchema()

    let member = await WorkspaceMember.findOne({
      where: {
        owner_user_id: projectOwnerUserId,
        member_user_id: actorUserId,
        status: { [Op.ne]: 'revoked' },
      },
    })

    if (!member) {
      const actor = await User.findByPk(actorUserId).catch(() => null)
      const email = actor?.email?.trim().toLowerCase()
      if (email) {
        const invited = await WorkspaceMember.findOne({
          where: {
            owner_user_id: projectOwnerUserId,
            member_email: email,
            status: { [Op.ne]: 'revoked' },
          },
        })
        if (invited) {
          await invited.update({
            member_user_id: actorUserId,
            status: 'active',
          })
          member = invited
        }
      }
    }

    if (!member || member.status === 'revoked') {
      return { allowed: false }
    }

    const role = (member.role === 'admin' ? 'admin' : 'project_manager') as WorkspaceMemberRole

    if (role === 'admin' || member.access_all_projects) {
      return {
        allowed: true,
        role,
        billingOwnerUserId: projectOwnerUserId,
        memberRecord: member,
      }
    }

    const assignment = await ProjectAssignment.findOne({
      where: {
        project_id: projectId,
        owner_user_id: projectOwnerUserId,
        member_user_id: actorUserId,
      },
    })

    if (!assignment) {
      return { allowed: false }
    }

    return {
      allowed: true,
      role: 'project_manager',
      billingOwnerUserId: projectOwnerUserId,
      memberRecord: member,
    }
  } catch (err) {
    console.warn('[workspaceAccess] checkWorkspaceProjectAccess fallback:', err)
    return { allowed: false }
  }
}

/**
 * Enforces both:
 * 1. Per-project credit ceiling (`project.metadata.clientOrder.creditBudgetCap`)
 * 2. Per-PM monthly credit limit (`workspace_members.monthly_credit_limit`)
 *
 * Returns the canonical `billingOwnerUserId` whose CreditLot wallet pays for
 * generation, plus audit metadata (`actor_user_id`).
 */
export async function resolveAndGuardProjectCreditSpend(input: {
  project: Project
  actorUserId: string
  requestedCredits: number
}): Promise<
  | {
      ok: true
      billingOwnerUserId: string
      actorUserId: string
      role: EffectiveProjectRole
    }
  | {
      ok: false
      status: number
      error: string
    }
> {
  const projectOwnerId = String((input.project as { user_id?: string }).user_id || '')
  const metadata = (input.project.metadata || {}) as Record<string, unknown>
  const clientOrder = (metadata.clientOrder || {}) as {
    creditBudgetCap?: number | null
    enforceHardCap?: boolean
  }

  const cap = Number(clientOrder.creditBudgetCap ?? 0)
  if (cap > 0 && clientOrder.enforceHardCap !== false && input.requestedCredits > 0) {
    const used = getProjectCreditsUsed(metadata)
    if (used + input.requestedCredits > cap) {
      return {
        ok: false,
        status: 402,
        error: `Project credit cap reached (${used + input.requestedCredits} > ${cap} budgeted credits). Increase project ceiling in Budget Planner to continue.`,
      }
    }
  }

  if (!projectOwnerId || projectOwnerId === input.actorUserId) {
    return {
      ok: true,
      billingOwnerUserId: projectOwnerId || input.actorUserId,
      actorUserId: input.actorUserId,
      role: 'owner',
    }
  }

  const grant = await checkWorkspaceProjectAccess(
    projectOwnerId,
    input.actorUserId,
    input.project.id
  )
  if (!grant.allowed || !grant.memberRecord) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to spend credits on this project',
    }
  }

  const member = grant.memberRecord
  const periodKey = currentMonthPeriodKey()
  const usedThisMonth = member.credits_period_key === periodKey ? Number(member.credits_used_month || 0) : 0

  if (
    typeof member.monthly_credit_limit === 'number' &&
    member.monthly_credit_limit > 0 &&
    input.requestedCredits > 0 &&
    usedThisMonth + input.requestedCredits > member.monthly_credit_limit
  ) {
    return {
      ok: false,
      status: 402,
      error: `Monthly team member credit limit reached (${usedThisMonth + input.requestedCredits} > ${member.monthly_credit_limit} credits). Contact workspace owner.`,
    }
  }

  if (input.requestedCredits > 0) {
    await member.update({
      credits_period_key: periodKey,
      credits_used_month: usedThisMonth + input.requestedCredits,
    })
  }

  return {
    ok: true,
    billingOwnerUserId: projectOwnerId,
    actorUserId: input.actorUserId,
    role: grant.role || 'project_manager',
  }
}
