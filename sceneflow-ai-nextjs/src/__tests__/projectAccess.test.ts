import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindByPk = vi.fn()
const mockResolveUser = vi.fn()
const mockResolveUserId = vi.fn()

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/AuthService', () => ({
  AuthService: {
    verifyToken: vi.fn(),
  },
}))

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
  },
}))

vi.mock('@/lib/userHelper', () => ({
  resolveUser: (...args: unknown[]) => mockResolveUser(...args),
  resolveUserId: (...args: unknown[]) => mockResolveUserId(...args),
}))

import { assertProjectAccess, isSyntheticTempUserEmail } from '@/lib/projectAccess'

describe('isSyntheticTempUserEmail', () => {
  it('detects synthetic localStorage placeholder emails', () => {
    expect(isSyntheticTempUserEmail('user-12345678-1234-4123-8123-123456789abc@temp.sceneflow.ai')).toBe(true)
    expect(isSyntheticTempUserEmail('brian@sceneflowai.studio')).toBe(false)
    expect(isSyntheticTempUserEmail(null)).toBe(false)
  })
})

describe('assertProjectAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('migrates projects owned by synthetic @temp.sceneflow.ai placeholder users to the authenticated user', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const project = {
      id: '8aecf301-c509-49d2-aeb2-33181931b12e',
      user_id: 'temp-local-uuid',
      metadata: {},
      update,
    }
    mockFindByPk.mockResolvedValue(project)
    mockResolveUser.mockResolvedValue({
      id: 'temp-local-uuid',
      email: 'user-temp-local-uuid@temp.sceneflow.ai',
    })

    const res = await assertProjectAccess(project.id, 'real-owner-uuid')
    expect(res).toEqual({ ok: true, project, migrated: true })
    expect(update).toHaveBeenCalledWith({ user_id: 'real-owner-uuid' })
  })

  it('migrates projects owned by orphan localStorage UUIDs with no user row', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const project = {
      id: '8aecf301-c509-49d2-aeb2-33181931b12e',
      user_id: 'orphan-uuid',
      metadata: {},
      update,
    }
    mockFindByPk.mockResolvedValue(project)
    mockResolveUser.mockRejectedValue(new Error('User not found: orphan-uuid'))

    const res = await assertProjectAccess(project.id, 'real-owner-uuid')
    expect(res).toEqual({ ok: true, project, migrated: true })
    expect(update).toHaveBeenCalledWith({ user_id: 'real-owner-uuid' })
  })

  it('rejects projects owned by a different real user account with 403', async () => {
    const update = vi.fn()
    const project = {
      id: '8aecf301-c509-49d2-aeb2-33181931b12e',
      user_id: 'other-user-uuid',
      metadata: {},
      update,
    }
    mockFindByPk.mockResolvedValue(project)
    mockResolveUser.mockResolvedValue({
      id: 'other-user-uuid',
      email: 'someone-else@example.com',
    })

    const res = await assertProjectAccess(project.id, 'real-owner-uuid')
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(403)
    }
    expect(update).not.toHaveBeenCalled()
  })
})
