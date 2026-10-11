import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { generateSceneContentHash } from '@/lib/utils/contentHash'

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

  it('stores a Location Agent run on the locations the checklist kept', async () => {
    vi.mocked(CreditService.ensureCredits).mockResolvedValue(true)
    loadContext.mockResolvedValue({
      characters: [],
      locations: [
        {
          id: 'l1',
          location: 'Dock',
          imageUrl: '',
          versions: [{ id: 'v1', name: 'Door', stateNotes: 'Gone', imageUrl: '' }],
        },
        { id: 'l2', location: 'Lab', imageUrl: '', versions: [] },
      ],
      props: [],
      scenes: [],
      screenplayContext: {},
    })

    const res = await post({
      projectId: 'proj-1',
      kinds: ['location'],
      locationIds: ['l1'],
      itemKeys: ['location:l1', 'location:l1::v1'],
    })
    const data = await res.json()

    expect(res.status).toBe(202)
    expect(data.catalogSync).toBe('location')
    const payload = createGenerationJob.mock.calls[0]?.[0]?.payload
    expect(payload.locationIds).toEqual(['l1'])
    expect(payload.preexistingVersionIds).toEqual(['v1'])
    expect(payload.items.map((item: { targetId: string }) => item.targetId)).toEqual(['l1'])
    expect(payload.items.some((item: { versionId?: string }) => item.versionId)).toBe(false)
  })

  it('plans Continuity Agent from the promo shots and does not force a redraw', async () => {
    vi.mocked(CreditService.ensureCredits).mockResolvedValue(true)
    const sceneBody = {
      isExpanded: true,
      heading: 'EXT. DOCKYARD - NIGHT',
      action: 'Mira turns the brass key.',
      beats: [
        {
          beatId: 'shot-1',
          referenceSelection: {
            characterIds: ['c1'],
            characterWardrobes: [{ characterId: 'c1', wardrobeId: 'wd-1' }],
            locationRefId: 'l1',
            objectRefIds: ['p1'],
          },
        },
      ],
    }
    loadContext.mockResolvedValue({
      characters: [
        {
          id: 'c1',
          name: 'Mira',
          type: 'lead',
          description: 'A tired courier',
          referenceImage: 'https://cdn/mira.png',
          wardrobes: [{ id: 'wd-1', name: 'Parka', description: 'Grease-stained parka' }],
        },
      ],
      locations: [
        { id: 'l1', location: 'Dockyard', description: 'Rusted cranes' },
        { id: 'l2', location: 'Atrium', description: 'Glass and stone' },
      ],
      props: [
        { id: 'p1', name: 'Brass key', description: 'Worn smooth' },
        { id: 'p2', name: 'Ledger', description: 'Bound', imageUrl: 'https://cdn/ledger.png' },
      ],
      scenes: [
        {
          ...sceneBody,
          sceneDirection: {
            scene: { location: 'Dockyard' },
            basedOnContentHash: generateSceneContentHash(sceneBody),
          },
        },
      ],
      screenplayContext: {},
    })

    const res = await post({
      projectId: 'proj-1',
      continuityShots: [{ sceneIndex: 0, beatId: 'shot-1' }],
      itemKeys: ['location:l2'],
    })
    const data = await res.json()

    expect(res.status).toBe(202)
    expect(data.itemCount).toBeGreaterThan(0)
    const payload = createGenerationJob.mock.calls[0]?.[0]?.payload
    expect(payload.agentLabel).toBe('Continuity Agent')
    expect(payload.includeNestedStills).toBe(true)
    expect(payload.itemKeys).toBeUndefined()
    expect(payload.items.map((item: { targetId: string; wardrobeId?: string }) => item.wardrobeId || item.targetId)).toEqual([
      'wd-1',
      'l1',
      'p1',
    ])
    expect(payload.items.every((item: { forceRegenerate?: boolean }) => item.forceRegenerate !== true)).toBe(true)
  })
})
