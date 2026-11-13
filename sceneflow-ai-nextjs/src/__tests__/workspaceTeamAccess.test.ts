import { describe, it, expect, vi, beforeEach } from 'vitest'

const findMemberMock = vi.fn()
const findAssignmentMock = vi.fn()
const findUserByPkMock = vi.fn()
const findProjectByPkMock = vi.fn()

vi.mock('@/lib/database/migrateProducerPlatform', () => ({
  ensureProducerPlatformSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/WorkspaceMember', () => ({
  default: {
    findOne: (...args: unknown[]) => findMemberMock(...args),
  },
}))

vi.mock('@/models/ProjectAssignment', () => ({
  default: {
    findOne: (...args: unknown[]) => findAssignmentMock(...args),
  },
}))

vi.mock('@/models/User', () => ({
  default: {
    findByPk: (...args: unknown[]) => findUserByPkMock(...args),
  },
}))

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: (...args: unknown[]) => findProjectByPkMock(...args),
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/services/AuthService', () => ({ AuthService: { verifyToken: vi.fn() } }))
vi.mock('@/lib/userHelper', () => ({
  resolveUser: vi.fn(),
  resolveUserId: vi.fn(),
}))

import {
  checkWorkspaceProjectAccess,
  resolveAndGuardProjectCreditSpend,
} from '@/lib/producer/workspaceAccess'
import { assertProjectAccess } from '@/lib/projectAccess'

describe('Universal Workspace Team RBAC & Credit Ceiling Guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('grants owner and active workspace admin access to any workspace project', async () => {
    const ownerGrant = await checkWorkspaceProjectAccess('owner-1', 'owner-1', 'proj-1')
    expect(ownerGrant).toEqual({
      allowed: true,
      role: 'owner',
      billingOwnerUserId: 'owner-1',
    })

    findMemberMock.mockResolvedValue({
      id: 'mem-admin',
      role: 'admin',
      status: 'active',
      access_all_projects: true,
    })

    const adminGrant = await checkWorkspaceProjectAccess('owner-1', 'admin-user', 'proj-99')
    expect(adminGrant.allowed).toBe(true)
    expect(adminGrant.role).toBe('admin')
    expect(adminGrant.billingOwnerUserId).toBe('owner-1')
  })

  it('grants assigned Project Manager access to assigned project (200) and blocks unassigned project (403)', async () => {
    findProjectByPkMock.mockImplementation(async (id: string) => ({
      id,
      user_id: 'owner-1',
      metadata: {},
    }))
    findMemberMock.mockResolvedValue({
      id: 'mem-pm',
      role: 'project_manager',
      status: 'active',
      access_all_projects: false,
    })

    // Assigned to proj-assigned
    findAssignmentMock.mockImplementation(async ({ where }: any) =>
      where.project_id === 'proj-assigned' ? { id: 'assign-1' } : null
    )

    const allowedRes = await assertProjectAccess('proj-assigned', 'pm-user-1')
    expect(allowedRes.ok).toBe(true)
    if (allowedRes.ok) {
      expect(allowedRes.accessRole).toBe('project_manager')
      expect(allowedRes.billingOwnerUserId).toBe('owner-1')
    }

    const deniedRes = await assertProjectAccess('proj-unassigned', 'pm-user-1')
    expect(deniedRes.ok).toBe(false)
    if (!deniedRes.ok) {
      expect(deniedRes.status).toBe(403)
    }
  })

  it('enforces per-project creditBudgetCap (402) and per-PM monthly_credit_limit (402)', async () => {
    const cappedProject: any = {
      id: 'proj-capped',
      user_id: 'owner-1',
      metadata: {
        creditsUsed: 900,
        clientOrder: {
          isClientProject: true,
          creditBudgetCap: 950,
          enforceHardCap: true,
        },
      },
    }

    const projectCapBlocked = await resolveAndGuardProjectCreditSpend({
      project: cappedProject,
      actorUserId: 'owner-1',
      requestedCredits: 100, // 900 + 100 > 950
    })
    expect(projectCapBlocked.ok).toBe(false)
    if (!projectCapBlocked.ok) {
      expect(projectCapBlocked.status).toBe(402)
      expect(projectCapBlocked.error).toContain('Project credit cap reached')
    }

    // Within project cap, test PM monthly limit
    const now = new Date()
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    findMemberMock.mockResolvedValue({
      id: 'mem-pm',
      role: 'project_manager',
      status: 'active',
      access_all_projects: true,
      monthly_credit_limit: 500,
      credits_used_month: 480,
      credits_period_key: currentPeriod,
    })

    const pmCapBlocked = await resolveAndGuardProjectCreditSpend({
      project: {
        id: 'proj-open',
        user_id: 'owner-1',
        metadata: { creditsUsed: 100 },
      } as any,
      actorUserId: 'pm-user-1',
      requestedCredits: 40, // 480 + 40 > 500
    })
    expect(pmCapBlocked.ok).toBe(false)
    if (!pmCapBlocked.ok) {
      expect(pmCapBlocked.status).toBe(402)
    }
  })
})
