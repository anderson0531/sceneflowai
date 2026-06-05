import { describe, expect, it, vi, beforeEach } from 'vitest'
import { enqueueC2paSigning } from '@/lib/provenance/c2paWorkflow'

describe('c2paWorkflow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.ASSET_PROVENANCE_SECRET = 'test-secret'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  it('enqueueC2paSigning posts to internal API with auth header', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await enqueueC2paSigning({
      provenanceId: 'prov-1',
      assetUrl: 'https://storage.googleapis.com/bucket/video.mp4',
      contentHash: 'abc',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/internal/provenance/c2pa-sign',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-secret',
        }),
      })
    )
  })
})
