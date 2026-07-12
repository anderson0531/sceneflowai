import { describe, expect, it } from 'vitest'
import { resolveExpressGenerationMethod } from '@/lib/vision/segmentConfigBuilder'

describe('resolveExpressGenerationMethod', () => {
  it('chooses REF when character references exist', () => {
    expect(resolveExpressGenerationMethod(true, true)).toBe('REF')
    expect(resolveExpressGenerationMethod(true, false)).toBe('REF')
  })

  it('chooses I2V when only a start frame exists', () => {
    expect(resolveExpressGenerationMethod(false, true)).toBe('I2V')
  })
})
