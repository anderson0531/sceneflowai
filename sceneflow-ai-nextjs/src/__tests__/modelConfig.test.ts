import { describe, it, expect } from 'vitest'
import {
  DEFAULT_VEO_CLIP_DURATION,
  DEFAULT_VEO_SFX_QUALITY,
  getVeoCostEstimate,
  getVeoModel,
  getVertexApiBaseUrl,
  getVertexHostname,
  getVertexLocation,
  isOmniVideoModel,
  MAX_VEO_VIDEO_CLIP_SECONDS,
  VEO_CLIP_DURATION_OPTIONS,
  clampToVeoClipDuration,
  VEO_MODELS,
} from '@/lib/config/modelConfig'

describe('modelConfig Veo tiers', () => {
  it('resolves lite model id for SFX tier', () => {
    expect(getVeoModel('lite')).toBe('veo-3.1-lite-generate-001')
    expect(VEO_MODELS.lite).toBe('veo-3.1-lite-generate-001')
  })

  it('routes fast and premium tiers to Gemini Omni Flash', () => {
    expect(getVeoModel('fast')).toBe('gemini-omni-flash-preview')
    expect(getVeoModel('premium')).toBe('gemini-omni-flash-preview')
    expect(getVeoModel('standard')).toBe('gemini-omni-flash-preview')
    expect(VEO_MODELS.omni).toBe('gemini-omni-flash-preview')
  })

  it('defaults segment clip duration to 10 seconds', () => {
    expect(DEFAULT_VEO_CLIP_DURATION).toBe(10)
    expect(MAX_VEO_VIDEO_CLIP_SECONDS).toBe(10)
    expect(VEO_CLIP_DURATION_OPTIONS).toEqual([4, 6, 8, 10])
  })

  it('clamps numeric durations to valid clip lengths', () => {
    expect(clampToVeoClipDuration(3)).toBe(4)
    expect(clampToVeoClipDuration(5)).toBe(4)
    expect(clampToVeoClipDuration(7)).toBe(6)
    expect(clampToVeoClipDuration(9)).toBe(8)
    expect(clampToVeoClipDuration(12)).toBe(10)
  })

  it('detects Omni video models', () => {
    expect(isOmniVideoModel('gemini-omni-flash-preview')).toBe(true)
    expect(isOmniVideoModel('veo-3.1-fast-generate-001')).toBe(false)
  })

  it('defaults SFX quality to lite', () => {
    expect(DEFAULT_VEO_SFX_QUALITY).toBe('lite')
  })

  it('estimates lower cost for lite vs fast', () => {
    expect(getVeoCostEstimate('lite', 8)).toBeLessThan(getVeoCostEstimate('fast', 8))
  })

  it('scales cost estimate with duration', () => {
    expect(getVeoCostEstimate('fast', 10)).toBeGreaterThan(getVeoCostEstimate('fast', 8))
  })

  it('routes Omni models to global Vertex location', () => {
    expect(getVertexLocation('gemini-omni-flash-preview')).toBe('global')
    expect(getVertexLocation('veo-3.1-fast-generate-001')).toBe('us-central1')
  })

  it('builds correct Vertex hostnames', () => {
    expect(getVertexHostname('global')).toBe('aiplatform.googleapis.com')
    expect(getVertexHostname('us-central1')).toBe('us-central1-aiplatform.googleapis.com')
  })

  it('builds Omni Interactions API base URL on global endpoint', () => {
    expect(getVertexApiBaseUrl('my-project', 'global', 'v1beta1')).toBe(
      'https://aiplatform.googleapis.com/v1beta1/projects/my-project/locations/global'
    )
  })
})
