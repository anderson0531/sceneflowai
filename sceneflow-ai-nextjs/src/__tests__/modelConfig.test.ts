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
  isOmniInteractionContinuationRef,
  resolveVideoModel,
  clampDurationForVeoPredictLongRunning,
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

  it('routes fast and premium tiers to Veo 3.1 production models', () => {
    expect(getVeoModel('fast')).toBe('veo-3.1-fast-generate-001')
    expect(getVeoModel('premium')).toBe('veo-3.1-generate-001')
    expect(getVeoModel('standard')).toBe('veo-3.1-generate-001')
    expect(VEO_MODELS.omni).toBe('gemini-omni-flash-preview')
  })

  it('defaults segment clip duration to 8 seconds (Veo predictLongRunning max)', () => {
    expect(DEFAULT_VEO_CLIP_DURATION).toBe(8)
    expect(MAX_VEO_VIDEO_CLIP_SECONDS).toBe(10)
    expect(VEO_CLIP_DURATION_OPTIONS).toEqual([4, 6, 8, 10])
  })

  it('resolveVideoModel routes Omni only for explicit 10s or EXT interaction refs', () => {
    expect(resolveVideoModel('fast', { durationSeconds: 10 })).toBe(VEO_MODELS.omni)
    expect(resolveVideoModel('fast', { sourceVideo: 'interaction:v1_abc123' })).toBe(VEO_MODELS.omni)
    expect(resolveVideoModel('fast', { sourceVideo: 'v1_abc123' })).toBe(VEO_MODELS.omni)
    expect(resolveVideoModel('fast', { durationSeconds: 8 })).toBe(VEO_MODELS.fast)
    expect(resolveVideoModel('premium', { durationSeconds: 8 })).toBe(VEO_MODELS.premium)
  })

  it('resolveVideoModel routes reference-image requests to premium Veo', () => {
    expect(resolveVideoModel('fast', { hasReferenceImages: true })).toBe(VEO_MODELS.premium)
    expect(resolveVideoModel('premium', { hasReferenceImages: true })).toBe(VEO_MODELS.premium)
  })

  it('detects Omni interaction continuation refs', () => {
    expect(isOmniInteractionContinuationRef('interaction:v1_abc')).toBe(true)
    expect(isOmniInteractionContinuationRef('v1_abc')).toBe(true)
    expect(isOmniInteractionContinuationRef('projects/p/locations/global/interactions/abc')).toBe(true)
    expect(isOmniInteractionContinuationRef('gs://bucket/video.mp4')).toBe(false)
  })

  it('clamps duration for Veo predictLongRunning to 8s max', () => {
    expect(clampDurationForVeoPredictLongRunning(10)).toBe(8)
    expect(clampDurationForVeoPredictLongRunning(6)).toBe(6)
    expect(clampDurationForVeoPredictLongRunning(undefined)).toBe(8)
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
