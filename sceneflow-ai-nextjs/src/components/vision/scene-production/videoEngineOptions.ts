/**
 * User-facing video engine labels — maps capability choices to internal provider/model config.
 */

import type { VideoGenerationConfig } from './types'

export const SCENEFLOW_ENGINE_ID = 'sceneflow' as const

export type SceneFlowQualityTierId = 'standard' | 'cinematic' | 'ultra-4k'

export type AlternativeEngineId =
  | 'natural-dialogue'
  | 'premium-cinematic'
  | 'fast-economical'
  | 'lowest-cost'

export type VideoEngineId = typeof SCENEFLOW_ENGINE_ID | AlternativeEngineId

export const SCENEFLOW_QUALITY_TIERS: Array<{
  id: SceneFlowQualityTierId
  label: string
  description: string
  klingQuality: 'std' | 'pro' | '4k'
  resolution: '720p' | '1080p'
}> = [
  {
    id: 'standard',
    label: 'Standard',
    description: '720p — fast turnaround',
    klingQuality: 'std',
    resolution: '720p',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: '1080p — high-fidelity (recommended)',
    klingQuality: 'pro',
    resolution: '1080p',
  },
  {
    id: 'ultra-4k',
    label: 'Ultra 4K',
    description: 'Native 4K — maximum detail',
    klingQuality: '4k',
    resolution: '1080p',
  },
]

export const ALTERNATIVE_ENGINES: Array<{
  id: AlternativeEngineId
  label: string
  description: string
  provider: 'vertex' | 'aggregator'
  videoModel?: string
  requiresAggregator: boolean
}> = [
  {
    id: 'natural-dialogue',
    label: 'Natural dialogue & lip-sync',
    description: 'Best for spoken dialogue, native audio, and seamless video extension.',
    provider: 'vertex',
    requiresAggregator: false,
  },
  {
    id: 'premium-cinematic',
    label: 'Premium cinematic motion',
    description: 'High-end image-to-video motion; works best with a start frame.',
    provider: 'aggregator',
    videoModel: 'runway-gen4',
    requiresAggregator: true,
  },
  {
    id: 'fast-economical',
    label: 'Fast & economical',
    description: 'Quick generation with native audio at a lower cost per second.',
    provider: 'aggregator',
    videoModel: 'seedance-2.0',
    requiresAggregator: true,
  },
  {
    id: 'lowest-cost',
    label: 'Lowest cost',
    description: 'Budget-friendly generation when speed and cost matter most.',
    provider: 'aggregator',
    videoModel: 'wan-2.6',
    requiresAggregator: true,
  },
]

export const SCENEFLOW_DEFAULT_MODEL = 'kling-v3-omni' as const

export type EngineSelection =
  | { engineId: typeof SCENEFLOW_ENGINE_ID; qualityTierId: SceneFlowQualityTierId }
  | { engineId: AlternativeEngineId }

export type ResolvedEngineConfig = Pick<
  VideoGenerationConfig,
  | 'videoProvider'
  | 'videoModel'
  | 'klingModel'
  | 'klingQuality'
  | 'resolution'
  | 'qualityTier'
  | 'allowVeoFallback'
  | 'allowPolicyFallback'
>

export function resolveEngineConfig(selection: EngineSelection): ResolvedEngineConfig {
  if (selection.engineId === SCENEFLOW_ENGINE_ID) {
    const tier =
      SCENEFLOW_QUALITY_TIERS.find((t) => t.id === selection.qualityTierId) ??
      SCENEFLOW_QUALITY_TIERS.find((t) => t.id === 'cinematic')!
    return {
      videoProvider: 'kling',
      klingModel: SCENEFLOW_DEFAULT_MODEL,
      klingQuality: tier.klingQuality,
      resolution: tier.resolution,
      allowVeoFallback: false,
      allowPolicyFallback: false,
    }
  }

  const alt = ALTERNATIVE_ENGINES.find((e) => e.id === selection.engineId)
  if (!alt) {
    const tier = SCENEFLOW_QUALITY_TIERS.find((t) => t.id === 'cinematic')!
    return {
      videoProvider: 'kling',
      klingModel: SCENEFLOW_DEFAULT_MODEL,
      klingQuality: tier.klingQuality,
      resolution: tier.resolution,
      allowVeoFallback: false,
      allowPolicyFallback: false,
    }
  }

  if (alt.provider === 'vertex') {
    return {
      videoProvider: 'vertex',
      qualityTier: 'fast',
      resolution: '1080p',
      allowVeoFallback: false,
      allowPolicyFallback: false,
    }
  }

  return {
    videoProvider: 'aggregator',
    videoModel: alt.videoModel,
    allowVeoFallback: false,
    allowPolicyFallback: false,
  }
}

export function inferEngineSelectionFromConfig(
  config?: Partial<VideoGenerationConfig> | null
): { engineId: VideoEngineId; qualityTierId: SceneFlowQualityTierId } {
  if (!config) {
    return { engineId: SCENEFLOW_ENGINE_ID, qualityTierId: 'cinematic' }
  }

  if (config.videoProvider === 'vertex') {
    return { engineId: 'natural-dialogue', qualityTierId: 'cinematic' }
  }

  if (config.videoProvider === 'aggregator' && config.videoModel) {
    const match = ALTERNATIVE_ENGINES.find((e) => e.videoModel === config.videoModel)
    if (match) {
      return { engineId: match.id, qualityTierId: 'cinematic' }
    }
  }

  const tierFromQuality =
    SCENEFLOW_QUALITY_TIERS.find((t) => t.klingQuality === config.klingQuality)?.id ?? 'cinematic'

  return { engineId: SCENEFLOW_ENGINE_ID, qualityTierId: tierFromQuality }
}

export function snapDurationForEngine(
  value: number,
  selection: EngineSelection
): number {
  const { videoProvider } = resolveEngineConfig(selection)
  if (videoProvider === 'kling') {
    const opts = [3, 5, 7, 10, 12, 15] as const
    return opts.reduce((best, cur) =>
      Math.abs(cur - value) < Math.abs(best - value) ? cur : best
    , opts[3])
  }
  if (videoProvider === 'aggregator') {
    return value <= 7 ? 5 : 10
  }
  if (value <= 5) return 4
  if (value <= 7) return 6
  if (value <= 9) return 8
  return 10
}

export function isAggregatorEngine(engineId: VideoEngineId): boolean {
  if (engineId === SCENEFLOW_ENGINE_ID) return false
  const alt = ALTERNATIVE_ENGINES.find((e) => e.id === engineId)
  return alt?.requiresAggregator === true
}

export function alternativeEngineUnavailableMessage(
  disabledReason: 'no_api_key' | 'explicitly_disabled' | 'fetch_failed' | 'ok' | undefined
): string {
  switch (disabledReason) {
    case 'no_api_key':
      return 'Alternative engines unavailable — server configuration is incomplete. Contact your administrator.'
    case 'explicitly_disabled':
      return 'Alternative engines are disabled on this server.'
    case 'fetch_failed':
      return 'Could not load alternative engine configuration from the server.'
    default:
      return 'Alternative engines are not available on this server.'
  }
}
