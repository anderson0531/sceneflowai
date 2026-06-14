import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()

vi.mock('@vercel/blob', () => ({
  get: (...args: unknown[]) => mockGet(...args),
}))

vi.mock('@/lib/storage/gcs', () => ({
  downloadImageAsBase64: vi.fn().mockResolvedValue('gcs-base64-data'),
}))

import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'

describe('fetchReferenceImageAsBase64', () => {
  const originalFetch = global.fetch
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token'
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (originalToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken
    }
  })

  it('parses data URLs without network calls', async () => {
    const result = await fetchReferenceImageAsBase64('data:image/png;base64,abc123', {
      label: 'inline ref',
    })
    expect(result).toEqual({ base64: 'abc123', mimeType: 'image/png' })
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('uses Vercel Blob get() for blob URLs', async () => {
    const blobUrl =
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/refs/prop-1.jpg'
    const payload = new Uint8Array([1, 2, 3])
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(payload)
          controller.close()
        },
      }),
      blob: { contentType: 'image/jpeg' },
    })

    const result = await fetchReferenceImageAsBase64(blobUrl, { label: 'Prop Sword' })

    expect(mockGet).toHaveBeenCalledWith(blobUrl, {
      access: 'public',
      token: 'test-blob-token',
    })
    expect(result.mimeType).toBe('image/jpeg')
    expect(result.base64).toBe(Buffer.from(payload).toString('base64'))
  })

  it('includes label and hostname on HTTP 403 errors', async () => {
    const blobUrl =
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/refs/missing.jpg'
    mockGet.mockResolvedValue({ statusCode: 403 })

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }) as typeof fetch

    await expect(
      fetchReferenceImageAsBase64(blobUrl, { label: 'Prop Lantern' })
    ).rejects.toThrow(
      'Failed to download reference "Prop Lantern" (xxavfkdhdebrqida.public.blob.vercel-storage.com): HTTP 403'
    )
  })

  it('falls back to plain fetch when blob token is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const blobUrl =
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/refs/prop-2.jpg'

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => Uint8Array.from([9, 8, 7]).buffer,
    }) as typeof fetch

    const result = await fetchReferenceImageAsBase64(blobUrl)

    expect(mockGet).not.toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalled()
    expect(result.mimeType).toBe('image/png')
  })
})
