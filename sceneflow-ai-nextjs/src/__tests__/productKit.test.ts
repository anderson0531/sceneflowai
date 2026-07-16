import { describe, expect, it } from 'vitest'
import { mapSimpleRefsToKlingO3 } from '@/lib/fal/klingImagePromptMapper'

describe('ProductTabList integration via mapper', () => {
  it('mapSimpleRefsToKlingO3 routes location/prop to image_urls', () => {
    const result = mapSimpleRefsToKlingO3('Scene', [
      { imageUrl: 'https://example.com/hero.jpg', name: 'Hero' },
      { imageUrl: 'https://example.com/forest.jpg', name: 'Location forest' },
    ])
    expect(result.elements).toHaveLength(1)
    expect(result.imageUrls).toContain('https://example.com/forest.jpg')
  })
})
