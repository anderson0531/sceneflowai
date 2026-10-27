/**
 * Draft vs Final and Standard vs Creative for Motion Video.
 *
 * Footage toolbar Standard | Creative picks the model for every beat:
 * - Standard — Google Vertex / Veo (Omni Flash)
 * - Creative — Direct Kling Omni
 *
 * Draft | Final picks the quality tier. Creative is not a silent fallback;
 * the user switches to it the same way Frames do.
 */

import type { VideoGenerationConfig } from '@/components/vision/scene-production/types'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'
import { OMNI_MODEL_ID, quoteGenerationCredits } from '@/lib/credits/quoteGenerationCredits'

export type VideoGenerationQuality = 'draft' | 'final'
export type VideoGenerationMode = 'standard' | 'creative'
export type VideoSourceMethod = 'reference' | 'frame'

export const SCENEFLOW_VIDEO_KLING_MODEL = 'kling-v3-omni' as const

export interface VideoGenerationParams {
  quality: VideoGenerationQuality
  mode: VideoGenerationMode
  sourceMethod: VideoSourceMethod
  videoProvider: 'vertex' | 'kling'
  klingModel?: typeof SCENEFLOW_VIDEO_KLING_MODEL
  klingQuality?: 'std' | 'pro'
  qualityTier?: 'fast' | 'premium'
  resolution: '720p' | '1080p'
  allowPolicyFallback: false
  allowVeoFallback: false
}

export function parseVideoGenerationQuality(value: unknown): VideoGenerationQuality | undefined {
  if (value === 'draft' || value === 'final') return value
  return undefined
}

export function parseVideoGenerationMode(value: unknown): VideoGenerationMode | undefined {
  if (value === 'standard' || value === 'creative') return value
  return undefined
}

export function parseVideoSourceMethod(value: unknown): VideoSourceMethod | undefined {
  if (value === 'reference' || value === 'frame') return value
  return undefined
}

export function resolveVideoGeneration(opts?: {
  quality?: VideoGenerationQuality | null
  mode?: VideoGenerationMode | null
  sourceMethod?: VideoSourceMethod | null
}): VideoGenerationParams {
  const quality: VideoGenerationQuality = opts?.quality === 'final' ? 'final' : 'draft'
  const mode: VideoGenerationMode = opts?.mode === 'creative' ? 'creative' : 'standard'
  // Creative (Kling) requires F2V (frame); Standard defaults to 'reference' unless 'frame' is chosen.
  const sourceMethod: VideoSourceMethod =
    mode === 'creative'
      ? 'frame'
      : opts?.sourceMethod === 'frame'
        ? 'frame'
        : 'reference'

  if (mode === 'creative') {
    return {
      quality,
      mode,
      sourceMethod,
      videoProvider: 'kling',
      klingModel: SCENEFLOW_VIDEO_KLING_MODEL,
      klingQuality: quality === 'final' ? 'pro' : 'std',
      resolution: quality === 'final' ? '1080p' : '720p',
      allowPolicyFallback: false,
      allowVeoFallback: false,
    }
  }

  return {
    quality,
    mode,
    sourceMethod,
    videoProvider: 'vertex',
    qualityTier: quality === 'final' ? 'premium' : 'fast',
    resolution: quality === 'final' ? '1080p' : '720p',
    allowPolicyFallback: false,
    allowVeoFallback: false,
  }
}

export function applyVideoGenerationToConfig(
  config: VideoGenerationConfig,
  policy: VideoGenerationParams,
  extras?: Partial<
    Pick<VideoGenerationConfig, 'mode' | 'expressMode' | 'duration' | 'resolution'>
  >
): VideoGenerationConfig {
  return {
    ...config,
    videoProvider: policy.videoProvider,
    klingModel: policy.mode === 'creative' ? policy.klingModel : undefined,
    klingQuality: policy.mode === 'creative' ? policy.klingQuality : undefined,
    qualityTier: policy.mode === 'standard' ? policy.qualityTier : undefined,
    resolution: extras?.resolution ?? policy.resolution,
    allowPolicyFallback: policy.allowPolicyFallback,
    allowVeoFallback: policy.allowVeoFallback,
    ...extras,
  }
}

export function estimateVideoAgentCredits(args: {
  count: number
  quality: VideoGenerationQuality
  mode: VideoGenerationMode
  durationSeconds?: number
}): number {
  const count = Math.max(0, args.count)
  if (count === 0) return 0
  const policy = resolveVideoGeneration({ quality: args.quality, mode: args.mode })
  const durationSeconds = args.durationSeconds ?? 10
  if (policy.videoProvider === 'kling') {
    return (
      count *
      getKlingCreditsForGeneration({
        model: policy.klingModel,
        quality: policy.klingQuality,
        durationSeconds,
      })
    )
  }
  const perClip = quoteGenerationCredits({
    kind: 'clip',
    provider: 'google_vertex',
    model: OMNI_MODEL_ID,
    resolution: policy.resolution,
    durationSeconds,
    audio: true,
  }).credits
  return count * perClip
}
