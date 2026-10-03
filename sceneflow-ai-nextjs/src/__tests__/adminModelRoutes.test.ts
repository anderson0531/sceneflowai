import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin/requireAdmin', () => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('@/lib/models/fetchModelCatalogs', () => ({
  fetchModelCatalogs: vi.fn(),
}))

import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { fetchModelCatalogs } from '@/lib/models/fetchModelCatalogs'
import { GET } from '@/app/api/admin/models/route'
import { POST } from '@/app/api/admin/models/analyze/route'

const requireAdminMock = vi.mocked(requireAdminSession)
const fetchCatalogsMock = vi.mocked(fetchModelCatalogs)

describe('admin model routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for inventory and analysis without an admin session', async () => {
    requireAdminMock.mockResolvedValue({ authorized: false, email: null })

    const listRes = await GET()
    const analyzeRes = await POST()

    expect(listRes.status).toBe(401)
    expect(analyzeRes.status).toBe(401)
    expect(fetchCatalogsMock).not.toHaveBeenCalled()
  })

  it('returns registry rows and analysis for an admin', async () => {
    requireAdminMock.mockResolvedValue({ authorized: true, email: 'anderson0531@gmail.com' })
    fetchCatalogsMock.mockResolvedValue([
      { source: 'vertex', status: 'unavailable', error: 'VERTEX_PROJECT_ID is not set', modelIds: [] },
      { source: 'gemini_developer', status: 'unavailable', error: 'GEMINI_API_KEY is not set', modelIds: [] },
      { source: 'gateway', status: 'ok', modelIds: ['gemini-3.8-flash'] },
    ])

    const listRes = await GET()
    const analyzeRes = await POST()
    const listBody = await listRes.json()
    const analyzeBody = await analyzeRes.json()

    expect(listRes.status).toBe(200)
    expect(listBody.entries.some((entry: { symbol: string }) => entry.symbol === 'VEO_MODELS.omni')).toBe(true)
    expect(analyzeRes.status).toBe(200)
    expect(analyzeBody.catalogs).toHaveLength(3)
    expect(analyzeBody.recommendations.length).toBe(analyzeBody.entries.length)
    const omni = analyzeBody.recommendations.find((row: { entryId: string }) => row.entryId === 'video-omni')
    expect(omni.action).toBe('unavailable')
    expect(omni.cursorPrompt).toBeNull()
  })
})
