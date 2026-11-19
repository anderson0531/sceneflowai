import { Op } from 'sequelize'
import WorkspaceMember, { type WorkspaceMemberRole } from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import SeriesAssignment from '@/models/SeriesAssignment'
import ProducerProfile from '@/models/ProducerProfile'
import User from '@/models/User'
import Project from '@/models/Project'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'
import {
  canRoleSpendCredits,
  normalizeLocalePmRouting,
  normalizeWorkspaceRole,
  resolveAutoAssignedPmForLocale,
  type EffectiveWorkspaceRole,
} from '@/lib/producer/teamGovernance'

export type EffectiveProjectRole = EffectiveWorkspaceRole

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

async function resolveActiveMemberRecord(
  ownerUserId: string,
  actorUserId: string
): Promise<WorkspaceMember | null> {
  let member = await WorkspaceMember.findOne({
    where: {
      owner_user_id: ownerUserId,
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
          owner_user_id: ownerUserId,
          member_email: email,
          status: { [Op.ne]: 'revoked' },
        },
      })
      if (invited) {
        await invited.update({
          member_user_id: actorUserId,
          status: 'active',
          invite_token: null,
        })
        member = invited
      }
    }
  }

  if (!member || member.status === 'revoked') {
    return null
  }
  return member
}

/**
 * Checks whether `actorUserId` is an active Team Member (`admin`,
 * `project_manager`, or `qa_reviewer`) on `projectOwnerUserId`'s workspace with
 * permission to access `projectId` (via all-projects flag, direct
 * `ProjectAssignment`, or inherited parent `SeriesAssignment`).
 *
 * Also auto-binds invited rows matching the actor's verified email on first access.
 */
export async function checkWorkspaceProjectAccess(
  projectOwnerUserId: string,
  actorUserId: string,
  projectId: string,
  seriesIdHint?: string | null
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

    const member = await resolveActiveMemberRecord(projectOwnerUserId, actorUserId)
    if (!member) {
      return { allowed: false }
    }

    const role: WorkspaceMemberRole = normalizeWorkspaceRole(member.role)

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

    if (assignment) {
      return {
        allowed: true,
        role,
        billingOwnerUserId: projectOwnerUserId,
        memberRecord: member,
      }
    }

    // Inherit access if this project is an episode of an assigned Series
    let effectiveSeriesId = seriesIdHint || null
    if (!effectiveSeriesId) {
      const proj = await Project.findByPk(projectId, {
        attributes: ['id', 'series_id'],
      }).catch(() => null)
      effectiveSeriesId = (proj as { series_id?: string | null } | null)?.series_id || null
    }

    if (effectiveSeriesId) {
      const seriesGrant = await SeriesAssignment.findOne({
        where: {
          series_id: effectiveSeriesId,
          owner_user_id: projectOwnerUserId,
          member_user_id: actorUserId,
        },
      })
      if (seriesGrant) {
        return {
          allowed: true,
          role,
          billingOwnerUserId: projectOwnerUserId,
          memberRecord: member,
        }
      }
    }

    return { allowed: false }
  } catch (err) {
    console.warn('[workspaceAccess] checkWorkspaceProjectAccess fallback:', err)
    return { allowed: false }
  }
}

/**
 * Checks whether `actorUserId` may access a Series Room Bible & episode list
 * owned by `seriesOwnerUserId` (via owner match, active workspace admin /
 * `access_all_projects`, or explicit `SeriesAssignment`).
 */
export async function checkWorkspaceSeriesAccess(
  seriesOwnerUserId: string,
  actorUserId: string,
  seriesId: string
): Promise<WorkspaceAccessGrant> {
  if (!seriesOwnerUserId || !actorUserId) {
    return { allowed: false }
  }
  if (seriesOwnerUserId === actorUserId) {
    return {
      allowed: true,
      role: 'owner',
      billingOwnerUserId: seriesOwnerUserId,
    }
  }

  try {
    await ensureProducerPlatformSchema()
    const member = await resolveActiveMemberRecord(seriesOwnerUserId, actorUserId)
    if (!member) {
      return { allowed: false }
    }

    const role: WorkspaceMemberRole = normalizeWorkspaceRole(member.role)
    if (role === 'admin' || member.access_all_projects) {
      return {
        allowed: true,
        role,
        billingOwnerUserId: seriesOwnerUserId,
        memberRecord: member,
      }
    }

    const seriesAssignment = await SeriesAssignment.findOne({
      where: {
        series_id: seriesId,
        owner_user_id: seriesOwnerUserId,
        member_user_id: actorUserId,
      },
    })
    if (!seriesAssignment) {
      return { allowed: false }
    }

    return {
      allowed: true,
      role,
      billingOwnerUserId: seriesOwnerUserId,
      memberRecord: member,
    }
  } catch (err) {
    console.warn('[workspaceAccess] checkWorkspaceSeriesAccess fallback:', err)
    return { allowed: false }
  }
}

/**
 * Automatically assigns a newly created client intake project to the workspace's
 * configured PM for `locale` (or `default` fallback) if that PM is active.
 */
export async function autoAssignProjectByLocale(input: {
  ownerUserId: string
  projectId: string
  locale?: string | null
}): Promise<{ assignedMemberUserId: string | null }> {
  try {
    await ensureProducerPlatformSchema()
    const profile = await ProducerProfile.findOne({
      where: { user_id: input.ownerUserId },
      attributes: ['id', 'locale_pm_routing'],
    })
    const routing = normalizeLocalePmRouting(profile?.locale_pm_routing)
    const targetMemberUserId = resolveAutoAssignedPmForLocale(routing, input.locale)
    if (!targetMemberUserId) {
      return { assignedMemberUserId: null }
    }

    const activeMember = await WorkspaceMember.findOne({
      where: {
        owner_user_id: input.ownerUserId,
        member_user_id: targetMemberUserId,
        status: 'active',
      },
    })
    if (!activeMember) {
      return { assignedMemberUserId: null }
    }

    await ProjectAssignment.findOrCreate({
      where: {
        project_id: input.projectId,
        member_user_id: targetMemberUserId,
      },
      defaults: {
        project_id: input.projectId,
        owner_user_id: input.ownerUserId,
        member_user_id: targetMemberUserId,
      },
    })
    return { assignedMemberUserId: targetMemberUserId }
  } catch (err) {
    console.warn('[workspaceAccess] autoAssignProjectByLocale skipped:', err)
    return { assignedMemberUserId: null }
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
    input.project.id,
    (input.project as { series_id?: string | null }).series_id
  )
  if (!grant.allowed || !grant.memberRecord) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to spend credits on this project',
    }
  }

  if (!canRoleSpendCredits(grant.role)) {
    return {
      ok: false,
      status: 403,
      error: 'QA Reviewers have review and approval access only and cannot spend generation credits.',
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
