/**
 * Engine-aware video credit estimation — mirrors production charging without
 * importing UI-layer engine config.
 */

import {
  getKlingCreditsForGeneration,
  getVideoCredits,
  type VideoQuality,
} from './creditCosts'
import { getAggregatorCreditsForModel } from '@/lib/aggregator/modelRegistry'

export const SCENEFLOW_ENGINE_ID = 'sceneflow' as const

export type SceneFlowQualityTierId = 'standard' | 'cinematic' | 'ultra-4k'

export type AlternativeEngineId =
  | 'natural-dialogue'
  | 'premium-cinematic'
  | 'fast-economical'
  | 'lowest-cost'

export type VideoEngineId = typeof SCENEFLOW_ENGINE_ID | AlternativeEngineId

export type EngineSelection =
  | { engineId: typeof SCENEFLOW_ENGINE_ID; qualityTierId: SceneFlowQualityTierId }
  | { engineId: AlternativeEngineId }

export const SCENEFLOW_QUALITY_TIERS: Array<{
  id: SceneFlowQualityTierId
  label: string
  description: string
  klingQuality: 'std' | 'pro' | '4k'
}> = [
  {
    id: 'standard',
    label: 'Standard',
    description: '720p — fast turnaround',
    klingQuality: 'std',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: '1080p — high-fidelity (recommended)',
    klingQuality: 'pro',
  },
  {
    id: 'ultra-4k',
    label: 'Ultra 4K',
    description: 'Native 4K — maximum detail',
    klingQuality: '4k',
  },
]

export const ALTERNATIVE_ENGINES: Array<{
  id: AlternativeEngineId
  label: string
  description: string
  provider: 'vertex' | 'aggregator'
  videoModel?: string
}> = [
  {
    id: 'natural-dialogue',
    label: 'Natural dialogue & lip-sync',
    description: 'Best for spoken dialogue, native audio, and seamless video extension.',
    provider: 'vertex',
  },
  {
    id: 'premium-cinematic',
    label: 'Premium cinematic motion',
    description: 'High-end image-to-video motion; works best with a start frame.',
    provider: 'aggregator',
    videoModel: 'runway-gen4',
  },
  {
    id: 'fast-economical',
    label: 'Fast & economical',
    description: 'Quick generation with native audio at a lower cost per second.',
    provider: 'aggregator',
    videoModel: 'seedance-2.0',
  },
  {
    id: 'lowest-cost',
    label: 'Lowest cost',
    description: 'Budget-friendly generation when speed and cost matter most.',
    provider: 'aggregator',
    videoModel: 'wan-2.6',
  },
]

export const SCENEFLOW_DEFAULT_MODEL = 'kling-v3-omni' as const

export const DEFAULT_VIDEO_ENGINE_SELECTION: EngineSelection = {
  engineId: SCENEFLOW_ENGINE_ID,
  qualityTierId: 'cinematic',
}

export interface NormalizedVideoParameters {
  engine: VideoEngineId
  qualityTier: SceneFlowQualityTierId
  segmentDuration: number
  totalMinutes: number
  /** Legacy Veo flat-rate quality when engine maps from veo_fast / veo_quality_4k */
  veoQuality: VideoQuality
}

export interface VideoClipEstimate {
  creditsEach: number
  label: string
  providerLabel: string
}

/** Map legacy veo_fast / veo_quality_4k model ids to engine selection. */
export function legacyModelToEngineSelection(
  model: 'veo_fast' | 'veo_quality_4k'
): { selection: EngineSelection; veoQuality: VideoQuality } {
  return {
    selection: { engineId: 'natural-dialogue' },
    veoQuality: model === 'veo_quality_4k' ? 'max' : 'fast',
  }
}

export function toEngineSelection(
  engine: VideoEngineId,
  qualityTier?: SceneFlowQualityTierId
): EngineSelection {
  if (engine === SCENEFLOW_ENGINE_ID) {
    return {
      engineId: SCENEFLOW_ENGINE_ID,
      qualityTierId: qualityTier ?? 'cinematic',
    }
  }
  return { engineId: engine }
}

export function normalizeVideoParameters(
  video?: Partial<{
    model?: 'veo_fast' | 'veo_quality_4k'
    engine?: VideoEngineId
    qualityTier?: SceneFlowQualityTierId
    segmentDuration?: number
    totalMinutes?: number
  }> | null
): NormalizedVideoParameters {
  const segmentDuration = Math.max(3, Number(video?.segmentDuration) || 8)
  const totalMinutes = Math.max(1, Number(video?.totalMinutes) || 4)

  if (video?.model === 'veo_fast' || video?.model === 'veo_quality_4k') {
    const legacy = legacyModelToEngineSelection(video.model)
    return {
      engine: legacy.selection.engineId,
      qualityTier: 'cinematic',
      segmentDuration,
      totalMinutes,
      veoQuality: legacy.veoQuality,
    }
  }

  const engine = video?.engine ?? SCENEFLOW_ENGINE_ID
  const qualityTier =
    engine === SCENEFLOW_ENGINE_ID
      ? (video?.qualityTier ?? 'cinematic')
      : 'cinematic'

  return {
    engine,
    qualityTier,
    segmentDuration,
    totalMinutes,
    veoQuality: 'fast',
  }
}

export function snapSegmentDurationForEngine(
  value: number,
  selection: EngineSelection
): number {
  if (selection.engineId === SCENEFLOW_ENGINE_ID) {
    const opts = [3, 5, 7, 10, 12, 15] as const
    return opts.reduce(
      (best, cur) => (Math.abs(cur - value) < Math.abs(best - value) ? cur : best),
      opts[3]
    )
  }

  const alt = ALTERNATIVE_ENGINES.find((e) => e.id === selection.engineId)
  if (alt?.provider === 'aggregator') {
    return value <= 7 ? 5 : 10
  }

  if (value <= 5) return 4
  if (value <= 7) return 6
  if (value <= 9) return 8
  return 10
}

export function estimateVideoClipCredits(
  video: NormalizedVideoParameters
): VideoClipEstimate {
  const selection = toEngineSelection(video.engine, video.qualityTier)
  const duration = snapSegmentDurationForEngine(video.segmentDuration, selection)

  if (selection.engineId === SCENEFLOW_ENGINE_ID) {
    const tier =
      SCENEFLOW_QUALITY_TIERS.find((t) => t.id === selection.qualityTierId) ??
      SCENEFLOW_QUALITY_TIERS.find((t) => t.id === 'cinematic')!
    const creditsEach = getKlingCreditsForGeneration({
      model: SCENEFLOW_DEFAULT_MODEL,
      quality: tier.klingQuality,
      durationSeconds: duration,
    })
    return {
      creditsEach,
      label: `SceneFlow ${tier.label} ${duration}s`,
      providerLabel: 'Kling',
    }
  }

  const alt = ALTERNATIVE_ENGINES.find((e) => e.id === selection.engineId)
  if (!alt) {
    const tier = SCENEFLOW_QUALITY_TIERS.find((t) => t.id === 'cinematic')!
    const creditsEach = getKlingCreditsForGeneration({
      model: SCENEFLOW_DEFAULT_MODEL,
      quality: tier.klingQuality,
      durationSeconds: duration,
    })
    return {
      creditsEach,
      label: `SceneFlow ${tier.label} ${duration}s`,
      providerLabel: 'Kling',
    }
  }

  if (alt.provider === 'vertex') {
    const creditsEach = getVideoCredits(video.veoQuality)
    const qualityLabel = video.veoQuality === 'max' ? '4K' : 'Fast'
    return {
      creditsEach,
      label: `Veo Natural-Dialogue (${qualityLabel}) ${duration}s`,
      providerLabel: 'Vertex / Veo',
    }
  }

  const creditsEach = getAggregatorCreditsForModel(alt.videoModel!, duration)
  return {
    creditsEach,
    label: `${alt.label} ${duration}s`,
    providerLabel: 'Aggregator',
  }
}

export function buildCreditsBudgetParams(
  video: NormalizedVideoParameters
): {
  engine: VideoEngineId
  qualityTier?: SceneFlowQualityTierId
  segmentDuration: number
} {
  if (video.engine === SCENEFLOW_ENGINE_ID) {
    return {
      engine: video.engine,
      qualityTier: video.qualityTier,
      segmentDuration: video.segmentDuration,
    }
  }
  return {
    engine: video.engine,
    segmentDuration: video.segmentDuration,
  }
}
