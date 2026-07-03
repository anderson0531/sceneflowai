import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VEO_CLIP_DURATION,
  getVeoCostEstimate,
  getVeoModel,
  isOmniVideoModel,
  VEO_COST_PER_SECOND,
} from '@/lib/config/modelConfig'

describe('Omni Flash video duration pipeline', () => {
  it('defaults new segments to 10s via DEFAULT_VEO_CLIP_DURATION', () => {
    expect(DEFAULT_VEO_CLIP_DURATION).toBe(10)
  })

  it('uses omni model for standard segment generation tiers', () => {
    const model = getVeoModel('fast')
    expect(isOmniVideoModel(model)).toBe(true)
    expect(model).toBe('gemini-omni-flash-preview')
  })

  it('estimates provider cost proportionally for 10s omni clips', () => {
    const cost8 = getVeoCostEstimate('fast', 8)
    const cost10 = getVeoCostEstimate('fast', 10)
    expect(cost10).toBe(VEO_COST_PER_SECOND.fast * 10)
    expect(cost10).toBeGreaterThan(cost8)
  })
})
