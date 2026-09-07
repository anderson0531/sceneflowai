import { describe, expect, it } from 'vitest'
import { ENHANCE_IDENTITY_ASPECT_RATIO } from '@/lib/character/enhanceIdentityImage'

describe('identity headshot aspect', () => {
  it('locks generate and enhance identity images to 9:16', () => {
    expect(ENHANCE_IDENTITY_ASPECT_RATIO).toBe('9:16')
  })
})
