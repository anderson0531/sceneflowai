import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/segments/[segmentId]/preview-api-prompt/route'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

import { getServerSession } from 'next-auth'

describe('POST /api/segments/[segmentId]/preview-api-prompt', () => {
  const params = Promise.resolve({ segmentId: 'seg-1' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/segments/seg-1/preview-api-prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'A scene in an office.' }),
    })

    const res = await POST(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 when prompt is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never)

    const req = new NextRequest('http://localhost/api/segments/seg-1/preview-api-prompt', {
      method: 'POST',
      body: JSON.stringify({ guidePrompt: 'Only guide' }),
    })

    const res = await POST(req, { params })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain('prompt')
  })

  it('returns assembled apiPrompt for authenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never)

    const req = new NextRequest('http://localhost/api/segments/seg-1/preview-api-prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Slow dolly on Elara in an office.',
        guidePrompt: "ELARA says: 'Hello there.'",
        generationMethod: 'T2V',
      }),
    })

    const res = await POST(req, { params })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.apiPrompt).toContain('Slow dolly on Elara')
    expect(data.apiPrompt).toContain("ELARA says: 'Hello there.'")
    expect(data.apiPrompt).toContain('native synchronized audio')
  })
})
