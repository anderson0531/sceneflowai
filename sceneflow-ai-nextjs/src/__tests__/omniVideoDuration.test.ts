import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VEO_CLIP_DURATION,
  getVeoCostEstimate,
  getVeoModel,
  isOmniVideoModel,
  resolveVideoModel,
  VEO_COST_PER_SECOND,
  VEO_MODELS,
} from '@/lib/config/modelConfig'

describe('Video duration and model routing', () => {
  it('defaults new segments to 8s via DEFAULT_VEO_CLIP_DURATION', () => {
    expect(DEFAULT_VEO_CLIP_DURATION).toBe(8)
  })

  it('uses Veo 3.1 production models for standard fast/premium tiers', () => {
    const model = getVeoModel('fast')
    expect(isOmniVideoModel(model)).toBe(false)
    expect(model).toBe('veo-3.1-fast-generate-001')
  })

  it('routes explicit 10s requests to Omni preview', () => {
    const model = resolveVideoModel('fast', { durationSeconds: 10 })
    expect(isOmniVideoModel(model)).toBe(true)
    expect(model).toBe(VEO_MODELS.omni)
  })

  it('estimates provider cost proportionally for longer clips', () => {
    const cost8 = getVeoCostEstimate('fast', 8)
    const cost10 = getVeoCostEstimate('fast', 10)
    expect(cost10).toBe(VEO_COST_PER_SECOND.fast * 10)
    expect(cost10).toBeGreaterThan(cost8)
  })
})
