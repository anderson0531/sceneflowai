import { describe, it, expect } from 'vitest'
import {
  DEFAULT_VEO_SFX_QUALITY,
  getVeoCostEstimate,
  getVeoModel,
  VEO_MODELS,
} from '@/lib/config/modelConfig'

describe('modelConfig Veo tiers', () => {
  it('resolves lite model id for SFX tier', () => {
    expect(getVeoModel('lite')).toBe('veo-3.1-lite-generate-001')
    expect(VEO_MODELS.lite).toBe('veo-3.1-lite-generate-001')
  })

  it('defaults SFX quality to lite', () => {
    expect(DEFAULT_VEO_SFX_QUALITY).toBe('lite')
  })

  it('estimates lower cost for lite vs fast', () => {
    expect(getVeoCostEstimate('lite', 8)).toBeLessThan(getVeoCostEstimate('fast', 8))
  })
})
