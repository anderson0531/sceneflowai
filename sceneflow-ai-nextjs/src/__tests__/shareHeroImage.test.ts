import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

vi.mock('@/lib/storage/gcsAssets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage/gcsAssets')>()
  return {
    ...actual,
    downloadGcsAssetFromHttpsUrl: vi.fn(),
  }
})

import { put } from '@vercel/blob'
import { downloadGcsAssetFromHttpsUrl } from '@/lib/storage/gcsAssets'
import {
  isGcsAssetUrl,
  isPublicBlobUrl,
  mirrorBlueprintHeroToBlob,
} from '@/lib/blueprint/shareHeroImage'

const mockPut = vi.mocked(put)
const mockDownload = vi.mocked(downloadGcsAssetFromHttpsUrl)

describe('shareHeroImage helpers', () => {
  it('detects public Blob URLs', () => {
    expect(
      isPublicBlobUrl(
        'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/blueprint-share/proj/hero.png'
      )
    ).toBe(true)
    expect(isPublicBlobUrl('https://storage.googleapis.com/sceneflow-assets/x.png')).toBe(false)
  })

  it('detects sceneflow-assets GCS URLs', () => {
    expect(
      isGcsAssetUrl(
        'https://storage.googleapis.com/sceneflow-assets/projects/p1/images/treatment/hero.png'
      )
    ).toBe(true)
    expect(isGcsAssetUrl('https://example.com/hero.png')).toBe(false)
  })
})

describe('mirrorBlueprintHeroToBlob', () => {
  beforeEach(() => {
    mockPut.mockReset()
    mockDownload.mockReset()
  })

  it('returns Blob URLs unchanged', async () => {
    const blobUrl =
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/blueprint-share/p1/hero.png'
    await expect(mirrorBlueprintHeroToBlob(blobUrl, 'p1')).resolves.toBe(blobUrl)
    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('mirrors GCS hero URLs to public Blob', async () => {
    const gcsUrl =
      'https://storage.googleapis.com/sceneflow-assets/projects/p1/images/treatment/hero-1.png'
    mockDownload.mockResolvedValue({
      buffer: Buffer.from('png-bytes'),
      contentType: 'image/png',
    })
    mockPut.mockResolvedValue({
      url: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/blueprint-share/p1/hero-abc.png',
      pathname: 'blueprint-share/p1/hero-abc.png',
      contentType: 'image/png',
      downloadUrl: 'https://example.com/download',
    } as Awaited<ReturnType<typeof put>>)

    const result = await mirrorBlueprintHeroToBlob(gcsUrl, 'p1')

    expect(mockDownload).toHaveBeenCalledWith(gcsUrl)
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/^blueprint-share\/p1\/hero-[a-f0-9]{16}\.png$/),
      expect.any(Buffer),
      expect.objectContaining({ access: 'public', contentType: 'image/png', addRandomSuffix: false })
    )
    expect(result).toContain('public.blob.vercel-storage.com')
  })

  it('falls back to source URL when mirror fails', async () => {
    const gcsUrl =
      'https://storage.googleapis.com/sceneflow-assets/projects/p1/images/treatment/hero-1.png'
    mockDownload.mockRejectedValue(new Error('GCS unavailable'))

    await expect(mirrorBlueprintHeroToBlob(gcsUrl, 'p1')).resolves.toBe(gcsUrl)
    expect(mockPut).not.toHaveBeenCalled()
  })
})
