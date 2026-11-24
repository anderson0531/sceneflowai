import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetAuthenticatedUserId = vi.fn()
const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/projectAccess', () => ({
  getAuthenticatedUserId: (...args: unknown[]) => mockGetAuthenticatedUserId(...args),
  assertProjectAccess: vi.fn(),
}))

import { GET as getActiveShare } from '@/app/api/blueprint/share/active/route'
import { POST as createShare } from '@/app/api/blueprint/share/create/route'
import { GET as getSharedBlueprint } from '@/app/api/blueprint/share/[token]/route'
import { DEMO_MEMOIR_PROJECT_ID } from '@/lib/demo/uiSandboxProject'

describe('Blueprint Share Link — Sandbox / Demo Project & Auth Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthenticatedUserId.mockResolvedValue(null)
    mockGetServerSession.mockResolvedValue(null)
  })

  it('returns 200 inactive instead of 401 on /api/blueprint/share/active for demo memoir project when unauthenticated', async () => {
    const req = new NextRequest(
      `https://sceneflowai.studio/api/blueprint/share/active?projectId=${DEMO_MEMOIR_PROJECT_ID}`
    )
    const res = await getActiveShare(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.active).toBe(false)
    expect(data.demoSandbox).toBe(true)
  })

  it('still enforces 401 Unauthorized on /api/blueprint/share/active for real non-demo projects when unauthenticated', async () => {
    const req = new NextRequest(
      'https://sceneflowai.studio/api/blueprint/share/active?projectId=11111111-1111-4111-8111-111111111111'
    )
    const res = await getActiveShare(req)
    expect(res.status).toBe(401)
  })

  it('creates a live demo Blueprint share URL instead of 401 for 00000000-0000-4000-8000-000000000002 and resolves it cleanly', async () => {
    const createReq = new NextRequest('https://sceneflowai.studio/api/blueprint/share/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: DEMO_MEMOIR_PROJECT_ID,
        variantId: 'memoir-v1',
        treatment: { id: 'memoir-v1', title: 'Harbor Books' },
      }),
    })
    const createRes = await createShare(createReq)
    expect(createRes.status).toBe(200)
    const createData = await createRes.json()
    expect(createData.success).toBe(true)
    expect(createData.token).toBe('demo-blueprint-harbor-books')
    expect(createData.url).toBe(
      'https://sceneflowai.studio/blueprint/share/demo-blueprint-harbor-books'
    )

    // Opening the returned Blueprint share link resolves full treatment + hero poster with 200
    const getReq = new NextRequest(
      `https://sceneflowai.studio/api/blueprint/share/${createData.token}`
    )
    const getRes = await getSharedBlueprint(getReq, {
      params: Promise.resolve({ token: createData.token }),
    })
    expect(getRes.status).toBe(200)
    const getData = await getRes.json()
    expect(getData.success).toBe(true)
    expect(getData.payload.projectId).toBe(DEMO_MEMOIR_PROJECT_ID)
    expect(getData.payload.heroImageUrl).toBe('/images/trailers/video-memoir-poster.webp')
    expect(getData.payload.treatment).toBeTruthy()
  })

  it('still enforces 401 Unauthorized on /api/blueprint/share/create for non-demo projects when unauthenticated', async () => {
    const createReq = new NextRequest('https://sceneflowai.studio/api/blueprint/share/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: '11111111-1111-4111-8111-111111111111',
        variantId: 'v1',
        treatment: { id: 'v1', title: 'Private Film' },
      }),
    })
    const res = await createShare(createReq)
    expect(res.status).toBe(401)
  })
})
