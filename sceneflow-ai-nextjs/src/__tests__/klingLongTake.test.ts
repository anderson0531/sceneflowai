import { describe, expect, it } from 'vitest'
import {
  planKlingLongTake,
  shouldUseKlingLongTake,
} from '@/lib/kling/longTakePlanner'
import { buildStitchJobSpec } from '@/lib/kling/buildStitchJobSpec'
import { getKlingLongTakeCredits } from '@/lib/credits/creditCosts'
import { KLING_LONG_TAKE_MAX_SEC, KLING_SINGLE_CLIP_MAX_SEC } from '@/lib/kling/types'

describe('planKlingLongTake', () => {
  it('returns no extensions for short targets', () => {
    const plan = planKlingLongTake({ targetSeconds: 8, model: 'kling-v3-omni' })
    expect(plan.baseSeconds).toBe(8)
    expect(plan.extensions).toBe(0)
    expect(plan.totalSeconds).toBe(8)
  })

  it('plans base 10s + extends for 25s target', () => {
    const plan = planKlingLongTake({ targetSeconds: 25, model: 'kling-v3-omni' })
    expect(plan.baseSeconds).toBe(10)
    expect(plan.extensions).toBe(3)
    expect(plan.totalSeconds).toBe(25)
  })

  it('applies 180s hard cap', () => {
    const plan = planKlingLongTake({ targetSeconds: 300, model: 'kling-v3-omni' })
    expect(plan.totalSeconds).toBe(KLING_LONG_TAKE_MAX_SEC)
    expect(plan.warnings).toContain('hard_cap_applied')
  })

  it('warns above 30s and 60s', () => {
    const short = planKlingLongTake({ targetSeconds: 20, model: 'kling-v3' })
    expect(short.warnings).not.toContain('camera_angle_cut')

    const medium = planKlingLongTake({ targetSeconds: 35, model: 'kling-v3' })
    expect(medium.warnings).toContain('camera_angle_cut')
    expect(medium.warnings).not.toContain('drift_risk')

    const long = planKlingLongTake({ targetSeconds: 70, model: 'kling-v3' })
    expect(long.warnings).toContain('camera_angle_cut')
    expect(long.warnings).toContain('drift_risk')
  })

  it('locks model in plan output', () => {
    const plan = planKlingLongTake({ targetSeconds: 40, model: 'kling-v3-turbo' })
    expect(plan.model).toBe('kling-v3-turbo')
    expect(plan.warnings).toContain('model_locked')
  })
})

describe('shouldUseKlingLongTake', () => {
  it('triggers above 15s ceiling', () => {
    expect(shouldUseKlingLongTake(KLING_SINGLE_CLIP_MAX_SEC)).toBe(false)
    expect(shouldUseKlingLongTake(KLING_SINGLE_CLIP_MAX_SEC + 1)).toBe(true)
  })
})

describe('buildStitchJobSpec', () => {
  it('builds stitch render spec with clip list', () => {
    const spec = buildStitchJobSpec({
      projectId: 'proj-1',
      sceneId: 'scene-1',
      clipUrls: ['https://a.mp4', 'https://b.mp4'],
      callbackUrl: 'https://app/callback',
      jobId: 'stitch-job-1',
    })
    expect(spec.renderMode).toBe('stitch')
    expect(spec.clipUrls).toHaveLength(2)
    expect(spec.outputPath).toContain('stitch-job-1')
  })
})

describe('getKlingLongTakeCredits', () => {
  it('charges base + extends + stitch + lipsync', () => {
    const plan = planKlingLongTake({ targetSeconds: 25, model: 'kling-v3-omni' })
    const credits = getKlingLongTakeCredits({
      model: 'kling-v3-omni',
      quality: 'pro',
      plan,
    })
    expect(credits).toBeGreaterThan(0)
  })
})
