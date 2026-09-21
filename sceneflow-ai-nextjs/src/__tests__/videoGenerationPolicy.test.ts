import { describe, expect, it } from 'vitest'
import {
  applyVideoGenerationToConfig,
  estimateVideoAgentCredits,
  parseVideoGenerationMode,
  parseVideoGenerationQuality,
  resolveVideoGeneration,
  SCENEFLOW_VIDEO_KLING_MODEL,
} from '@/lib/video/videoGenerationPolicy'
import { VIDEO_CREDITS, getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'
import type { VideoGenerationConfig } from '@/components/vision/scene-production/types'

const baseConfig: VideoGenerationConfig = {
  mode: 'I2V',
  prompt: 'a take',
  motionPrompt: 'a take',
  visualPrompt: 'a take',
  negativePrompt: '',
  aspectRatio: '16:9',
  resolution: '1080p',
  duration: 10,
  startFrameUrl: null,
  endFrameUrl: null,
  sourceVideoUrl: null,
  approvalStatus: 'auto-ready',
  confidence: 80,
}

describe('resolveVideoGeneration', () => {
  it('maps Draft + Standard to Vertex fast 720p', () => {
    expect(resolveVideoGeneration({ quality: 'draft', mode: 'standard' })).toEqual({
      quality: 'draft',
      mode: 'standard',
      videoProvider: 'vertex',
      qualityTier: 'fast',
      resolution: '720p',
      allowPolicyFallback: false,
      allowVeoFallback: false,
    })
  })

  it('maps Final + Standard to Vertex premium 1080p', () => {
    expect(resolveVideoGeneration({ quality: 'final', mode: 'standard' })).toEqual({
      quality: 'final',
      mode: 'standard',
      videoProvider: 'vertex',
      qualityTier: 'premium',
      resolution: '1080p',
      allowPolicyFallback: false,
      allowVeoFallback: false,
    })
  })

  it('maps Draft + Creative to Kling std 720p', () => {
    expect(resolveVideoGeneration({ quality: 'draft', mode: 'creative' })).toEqual({
      quality: 'draft',
      mode: 'creative',
      videoProvider: 'kling',
      klingModel: SCENEFLOW_VIDEO_KLING_MODEL,
      klingQuality: 'std',
      resolution: '720p',
      allowPolicyFallback: false,
      allowVeoFallback: false,
    })
  })

  it('maps Final + Creative to Kling pro 1080p', () => {
    expect(resolveVideoGeneration({ quality: 'final', mode: 'creative' })).toEqual({
      quality: 'final',
      mode: 'creative',
      videoProvider: 'kling',
      klingModel: SCENEFLOW_VIDEO_KLING_MODEL,
      klingQuality: 'pro',
      resolution: '1080p',
      allowPolicyFallback: false,
      allowVeoFallback: false,
    })
  })

  it('defaults to Draft Standard', () => {
    expect(resolveVideoGeneration()).toMatchObject({
      quality: 'draft',
      mode: 'standard',
      videoProvider: 'vertex',
    })
  })
})

describe('applyVideoGenerationToConfig', () => {
  it('clears Kling fields on Standard and stamps Vertex policy', () => {
    const patched = applyVideoGenerationToConfig(
      {
        ...baseConfig,
        videoProvider: 'kling',
        klingModel: 'kling-v3-omni',
        klingQuality: 'pro',
      },
      resolveVideoGeneration({ quality: 'draft', mode: 'standard' }),
      { expressMode: true }
    )
    expect(patched.videoProvider).toBe('vertex')
    expect(patched.klingModel).toBeUndefined()
    expect(patched.klingQuality).toBeUndefined()
    expect(patched.qualityTier).toBe('fast')
    expect(patched.resolution).toBe('720p')
    expect(patched.expressMode).toBe(true)
    expect(patched.allowPolicyFallback).toBe(false)
  })
})

describe('estimateVideoAgentCredits', () => {
  it('uses Kling std pricing for Draft Creative', () => {
    const per = getKlingCreditsForGeneration({
      model: SCENEFLOW_VIDEO_KLING_MODEL,
      quality: 'std',
      durationSeconds: 10,
    })
    expect(estimateVideoAgentCredits({ count: 2, quality: 'draft', mode: 'creative' })).toBe(
      per * 2
    )
  })

  it('uses Veo lite pricing for Draft Standard', () => {
    expect(estimateVideoAgentCredits({ count: 3, quality: 'draft', mode: 'standard' })).toBe(
      3 * VIDEO_CREDITS.VEO_LITE
    )
  })
})

describe('parse helpers', () => {
  it('accepts draft/final and standard/creative only', () => {
    expect(parseVideoGenerationQuality('draft')).toBe('draft')
    expect(parseVideoGenerationQuality('final')).toBe('final')
    expect(parseVideoGenerationQuality('max')).toBeUndefined()
    expect(parseVideoGenerationMode('standard')).toBe('standard')
    expect(parseVideoGenerationMode('creative')).toBe('creative')
    expect(parseVideoGenerationMode('safety')).toBeUndefined()
  })
})
