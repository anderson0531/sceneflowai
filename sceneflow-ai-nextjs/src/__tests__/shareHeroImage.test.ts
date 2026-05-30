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

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: vi.fn(),
  },
}))

import { put } from '@vercel/blob'
import { downloadGcsAssetFromHttpsUrl } from '@/lib/storage/gcsAssets'
import Project from '@/models/Project'
import {
  applyHeroUrlToPayload,
  isGcsAssetUrl,
  isPublicBlobUrl,
  mirrorBlueprintHeroToBlob,
  resolveShareHeroImageUrl,
  shouldPersistShareHeroUpdate,
} from '@/lib/blueprint/shareHeroImage'
import type { BlueprintSessionPayload } from '@/lib/blueprint/shareTypes'

const mockPut = vi.mocked(put)
const mockDownload = vi.mocked(downloadGcsAssetFromHttpsUrl)
const mockFindByPk = vi.mocked(Project.findByPk)

const BLOB =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/blueprint-share/p1/hero.png'
const GCS =
  'https://storage.googleapis.com/sceneflow-assets/projects/p1/images/treatment/hero.png'

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
      expect.objectContaining({
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
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

describe('applyHeroUrlToPayload', () => {
  it('sets flat and nested hero fields', () => {
    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId: 'p1',
      variantId: 'v1',
      treatment: { title: 'Film' },
    }
    const next = applyHeroUrlToPayload(payload, BLOB)
    expect(next.heroImageUrl).toBe(BLOB)
    expect((next.treatment as { heroImage?: { url?: string } }).heroImage?.url).toBe(BLOB)
  })
})

describe('shouldPersistShareHeroUpdate', () => {
  it('persists when resolved URL is public Blob and differs from payload', () => {
    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId: 'p1',
      variantId: 'v1',
      treatment: { heroImageUrl: GCS },
      heroImageUrl: GCS,
    }
    expect(shouldPersistShareHeroUpdate(payload, BLOB)).toBe(true)
    expect(shouldPersistShareHeroUpdate(payload, GCS)).toBe(false)
    expect(shouldPersistShareHeroUpdate({ ...payload, heroImageUrl: BLOB }, BLOB)).toBe(false)
  })
})

describe('resolveShareHeroImageUrl', () => {
  beforeEach(() => {
    mockFindByPk.mockReset()
    mockPut.mockReset()
    mockDownload.mockReset()
  })

  it('uses project variant Blob when payload has GCS', async () => {
    mockFindByPk.mockResolvedValue({
      metadata: {
        treatmentVariants: [
          {
            id: 'v1',
            heroImage: { url: BLOB, status: 'ready' },
          },
        ],
      },
    } as Awaited<ReturnType<typeof Project.findByPk>>)

    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId: 'p1',
      variantId: 'v1',
      treatment: { heroImage: { url: GCS } },
      heroImageUrl: GCS,
    }

    await expect(resolveShareHeroImageUrl(payload)).resolves.toBe(BLOB)
    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('mirrors GCS when project and payload only have GCS', async () => {
    mockFindByPk.mockResolvedValue({
      metadata: {
        treatmentVariants: [{ id: 'v1', heroImage: { url: GCS } }],
      },
    } as Awaited<ReturnType<typeof Project.findByPk>>)
    mockDownload.mockResolvedValue({
      buffer: Buffer.from('png-bytes'),
      contentType: 'image/png',
    })
    mockPut.mockResolvedValue({
      url: BLOB,
      pathname: 'blueprint-share/p1/hero-abc.png',
      contentType: 'image/png',
      downloadUrl: 'https://example.com/download',
    } as Awaited<ReturnType<typeof put>>)

    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId: 'p1',
      variantId: 'v1',
      treatment: { heroImage: { url: GCS } },
      heroImageUrl: GCS,
    }

    await expect(resolveShareHeroImageUrl(payload)).resolves.toBe(BLOB)
    expect(mockDownload).toHaveBeenCalledWith(GCS)
    expect(mockPut).toHaveBeenCalled()
  })
})
