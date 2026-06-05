import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/moderation/validate/route'
import { CreditService } from '@/services/CreditService'
import Project from '@/models/Project'
import { runStageModeration } from '@/lib/moderation/moderationPipeline'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/config/database', () => ({
  sequelize: { authenticate: vi.fn() },
}))

vi.mock('@/models/Project', () => ({
  default: { findByPk: vi.fn() },
}))

vi.mock('@/services/CreditService', () => ({
  CreditService: {
    ensureCredits: vi.fn(),
    charge: vi.fn(),
    getCreditBreakdown: vi.fn(),
  },
}))

vi.mock('@/lib/moderation/moderationPipeline', () => ({
  runStageModeration: vi.fn(),
}))

import { getServerSession } from 'next-auth'

describe('POST /api/moderation/validate', () => {
  const envBackup = process.env.HIVE_MODERATION_ENABLED

  beforeEach(() => {
    process.env.HIVE_MODERATION_ENABLED = 'true'
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1' },
    } as never)
    vi.mocked(Project.findByPk).mockResolvedValue({
      user_id: 'user-1',
      metadata: { visionPhase: { script: { script: { scenes: [] } } } },
    } as never)
    vi.mocked(runStageModeration).mockResolvedValue({
      id: 'report-1',
      stage: 'script',
      allowed: true,
      action: 'allowed',
      checks: [],
      summary: 'Validation complete',
      createdAt: new Date().toISOString(),
    })
    vi.mocked(CreditService.charge).mockResolvedValue(undefined as never)
    vi.mocked(CreditService.getCreditBreakdown).mockResolvedValue({ total_credits: 500 } as never)
  })

  afterEach(() => {
    process.env.HIVE_MODERATION_ENABLED = envBackup
    vi.clearAllMocks()
  })

  it('returns 402 when credits are insufficient', async () => {
    vi.mocked(CreditService.ensureCredits).mockResolvedValue(false)
    vi.mocked(CreditService.getCreditBreakdown).mockResolvedValue({ total_credits: 10 } as never)

    const req = new NextRequest('http://localhost/api/moderation/validate', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'proj-1',
        stage: 'script',
        source: 'project_script',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(402)
    expect(data.code).toBe('INSUFFICIENT_CREDITS')
    expect(data.creditsRequired).toBe(40)
    expect(data.creditsAvailable).toBe(10)
    expect(runStageModeration).not.toHaveBeenCalled()
    expect(CreditService.charge).not.toHaveBeenCalled()
  })

  it('charges credits and returns report on success', async () => {
    vi.mocked(CreditService.ensureCredits).mockResolvedValue(true)

    const req = new NextRequest('http://localhost/api/moderation/validate', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'proj-1',
        stage: 'script',
        text: 'INT. ROOM - Day',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.creditsCharged).toBe(40)
    expect(data.moderationReport?.stage).toBe('script')
    expect(runStageModeration).toHaveBeenCalledWith(
      expect.objectContaining({
        forceEnabled: true,
        validationMode: true,
        stage: 'script',
      })
    )
    expect(CreditService.charge).toHaveBeenCalledWith(
      'user-1',
      40,
      'ai_usage',
      'proj-1',
      expect.objectContaining({ operation: 'moderation_validate', stage: 'script' })
    )
  })
})
