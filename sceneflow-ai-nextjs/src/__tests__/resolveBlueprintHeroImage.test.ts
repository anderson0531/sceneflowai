import { describe, it, expect } from 'vitest'
import { resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'

describe('resolveBlueprintHeroImageUrl', () => {
  it('reads heroImage.url from variant', () => {
    expect(
      resolveBlueprintHeroImageUrl({
        title: 'Test Film',
        heroImage: { url: 'https://example.com/hero.jpg', status: 'ready' },
      })
    ).toBe('https://example.com/hero.jpg')
  })

  it('prefers flat heroImageUrl when set', () => {
    expect(
      resolveBlueprintHeroImageUrl({
        heroImageUrl: 'https://flat.example/hero.jpg',
        heroImage: { url: 'https://nested.example/hero.jpg' },
      })
    ).toBe('https://flat.example/hero.jpg')
  })
})
