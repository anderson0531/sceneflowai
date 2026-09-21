import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createGenerationJob = vi.fn()
const loadContext = vi.fn()

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))
vi.mock('@/config/database', () => ({ sequelize: { transaction: vi.fn() } }))
vi.mock('@/lib/jobs/jobService', () => ({
  cancelActiveJobsForProject: vi.fn(async () => ({ cancelledIds: [] })),
  createGenerationJob: (...args: unknown[]) => createGenerationJob(...args),
}))
vi.mock('@/lib/jobs/dispatchReferenceExpressStep', () => ({
  scheduleReferenceExpressStep: vi.fn(),
}))
vi.mock('@/lib/auth/sessionUser', () => ({
  getSessionUserId: vi.fn(async () => 'user-1'),
}))
vi.mock('@/services/CreditService', () => ({
  CreditService: {
    ensureCredits: vi.fn(),
    getCreditBreakdown: vi.fn(),
  },
}))
vi.mock('@/lib/vision/referenceExpress/planItems', async () => {
  const actual = await vi.importActual<typeof import('@/lib/vision/referenceExpress/planItems')>(
    '@/lib/vision/referenceExpress/planItems'
  )
  return {
    ...actual,
    loadReferenceExpressContext: (...args: unknown[]) => loadContext(...args),
  }
})

import { POST } from '@/app/api/vision/references/express/start/route'
import { CreditService } from '@/services/CreditService'

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost/api/vision/references/express/start', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  loadContext.mockResolvedValue({
    characters: [],
    locations: [],
    props: [],
    scenes: [],
    screenplayContext: {},
  })
  createGenerationJob.mockResolvedValue({
    job: { id: 'job-1' },
    dispatched: true,
  })
})

describe('POST /api/vision/references/express/start', () => {
  it('returns 202 with catalogSync=location even when no stills are planned yet', async () => {
    const res = await post({ projectId: 'proj-1', kinds: ['location'] })
    const data = await res.json()

    expect(res.status).toBe(202)
    expect(data).toMatchObject({
      jobId: 'job-1',
      itemCount: 0,
      catalogSync: 'location',
    })
    expect(CreditService.ensureCredits).not.toHaveBeenCalled()
    expect(createGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: 'reference_express',
        payload: expect.objectContaining({
          items: [],
          catalogSync: 'location',
          kinds: ['location'],
          includeNestedStills: true,
          agentLabel: 'Location Agent',
        }),
      })
    )
  })

  it('still 409s other empty plans that are not a Location Agent catalog run', async () => {
    const res = await post({ projectId: 'proj-1', kinds: ['prop'] })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.code).toBe('NOTHING_TO_GENERATE')
    expect(createGenerationJob).not.toHaveBeenCalled()
  })
})
