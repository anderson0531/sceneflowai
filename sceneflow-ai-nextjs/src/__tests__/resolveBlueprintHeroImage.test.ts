import { describe, it, expect } from 'vitest'
import {
  pickBestHeroImageUrl,
  resolveBlueprintHeroImageUrl,
} from '@/lib/blueprint/resolveBlueprintHeroImage'

const BLOB =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/blueprint-share/p1/hero.png'
const GCS =
  'https://storage.googleapis.com/sceneflow-assets/projects/p1/images/treatment/hero.png'

describe('pickBestHeroImageUrl', () => {
  it('prefers public Blob over GCS when both present', () => {
    expect(pickBestHeroImageUrl(GCS, BLOB)).toBe(BLOB)
    expect(pickBestHeroImageUrl(BLOB, GCS)).toBe(BLOB)
  })

  it('returns first non-empty URL when no Blob candidate', () => {
    expect(pickBestHeroImageUrl(undefined, GCS, 'https://example.com/x.png')).toBe(GCS)
  })
})

describe('resolveBlueprintHeroImageUrl', () => {
  it('reads heroImage.url from variant', () => {
    expect(
      resolveBlueprintHeroImageUrl({
        title: 'Test Film',
        heroImage: { url: 'https://example.com/hero.jpg', status: 'ready' },
      })
    ).toBe('https://example.com/hero.jpg')
  })

  it('prefers Blob nested URL over flat GCS heroImageUrl', () => {
    expect(
      resolveBlueprintHeroImageUrl({
        heroImageUrl: GCS,
        heroImage: { url: BLOB },
      })
    ).toBe(BLOB)
  })
})
