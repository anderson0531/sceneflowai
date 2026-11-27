/**
 * Engine-aware video credit estimation — mirrors production charging without
 * importing UI-layer engine config.
 *
 * These operation costs are the current published schedule. Model savings are
 * delivered as more credits per new dollar (see SAVINGS_DELIVERED_AS), not by
 * lowering the credits an existing operation costs while old balances remain.
 */

import { type VideoQuality } from './creditCosts'
import {
  getAggregatorCreditsForModel,
  getAggregatorModel,
  getDefaultAggregatorModelId,
} from '@/lib/aggregator/modelRegistry'
import {
  creditsForProviderUsd,
  DEFAULT_MARKUP,
  OMNI_MODEL_ID,
  quoteGenerationCredits,
  REFERENCE_IMAGE_ADDON_CREDITS,
  VEO_FAST_MODEL_ID,
  VEO_PREMIUM_MODEL_ID,
  type RateCardMap,
  type VideoResolution,
} from './quoteGenerationCredits'
import { SAVINGS_DELIVERED_AS } from './creditSchedulePolicy'

export const VIDEO_CREDIT_SCHEDULE_POLICY = SAVINGS_DELIVERED_AS

export const SCENEFLOW_ENGINE_ID = 'sceneflow' as const

export type SceneFlowQualityTierId = 'standard' | 'cinematic' | 'ultra-4k'

export type AlternativeEngineId =
  | 'natural-dialogue'
  | 'premium-cinematic'
  | 'fast-economical'
  | 'lowest-cost'

export type VideoEngineId = typeof SCENEFLOW_ENGINE_ID | AlternativeEngineId

/** Extended engine ids supported by live rate-card estimators and budget planners. */
export type BudgetVideoEngineId = VideoEngineId | 'vertex_omni' | 'veo' | 'aggregator'

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
    label: '720p',
    description: '720p — fast turnaround',
    klingQuality: 'std',
  },
  {
    id: 'cinematic',
    label: '1080p',
    description: '1080p — high-fidelity (recommended)',
    klingQuality: 'pro',
  },
  {
    id: 'ultra-4k',
    label: '4K',
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
  /** Optional average continuity reference images attached per clip */
  referenceImageCount?: number
  /** Optional native audio flag (defaults to true) */
  audio?: boolean
  /** Optional Kling voice control flag */
  voiceControl?: boolean
}

export interface VideoClipEstimateOptions {
  /** Live published Admin Rate Card map (from `useLiveRateCard()` or server snapshot) */
  rateCard?: RateCardMap
  /** Continuity reference images attached per clip (+5 cr/ref add-on) */
  referenceImageCount?: number
  /** Whether native audio generation is enabled (default true) */
  audio?: boolean
  /** Kling voice control / video-ref mode */
  voiceControl?: boolean
  /** Explicit resolution override (e.g. '720p', '1080p', '4k') */
  resolution?: VideoResolution
  /** Explicit aggregator model id when engine === 'aggregator' */
  aggregatorModelId?: string
}

export interface VideoClipEstimate {
  creditsEach: number
  providerUsd: number
  operation: string
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
    referenceImageCount?: number
    avgReferenceImages?: number
    audio?: boolean
    voiceControl?: boolean
  }> | null
): NormalizedVideoParameters {
  const segmentDuration = Math.max(3, Number(video?.segmentDuration) || 8)
  const totalMinutes = Math.max(1, Number(video?.totalMinutes) || 4)
  const rawRefCount = video?.referenceImageCount ?? video?.avgReferenceImages
  const referenceImageCount =
    typeof rawRefCount === 'number' && Number.isFinite(rawRefCount) && rawRefCount > 0
      ? Math.round(rawRefCount)
      : undefined
  const extras = {
    ...(referenceImageCount !== undefined ? { referenceImageCount } : {}),
    ...(video?.audio !== undefined ? { audio: Boolean(video.audio) } : {}),
    ...(video?.voiceControl !== undefined ? { voiceControl: Boolean(video.voiceControl) } : {}),
  }

  if (video?.model === 'veo_fast' || video?.model === 'veo_quality_4k') {
    const legacy = legacyModelToEngineSelection(video.model)
    return {
      engine: legacy.selection.engineId,
      qualityTier: 'cinematic',
      segmentDuration,
      totalMinutes,
      veoQuality: legacy.veoQuality,
      ...extras,
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
    ...extras,
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

export type VideoClipQuoteInput = Omit<NormalizedVideoParameters, 'engine'> & {
  engine: BudgetVideoEngineId
}

/**
 * Full engine-aware video clip quote returning both credits and live provider COGS (USD).
 * Responds dynamically to published Admin Rate Card updates (`options.rateCard`) across
 * Kling (`sceneflow`), Vertex Omni (`vertex_omni` / `natural-dialogue`), Veo (`veo`),
 * and Aggregator (`aggregator` / alternative models).
 */
export function estimateVideoClipQuote(
  video: VideoClipQuoteInput,
  options?: VideoClipEstimateOptions
): VideoClipEstimate {
  const rateCard = options?.rateCard
  const referenceImageCount = Math.max(
    0,
    Math.round(options?.referenceImageCount ?? video.referenceImageCount ?? 0)
  )
  const audio = options?.audio ?? video.audio ?? true
  const voiceControl = options?.voiceControl ?? video.voiceControl ?? false

  if (video.engine === 'vertex_omni') {
    const duration = Math.min(15, Math.max(3, Math.round(video.segmentDuration) || 10))
    const resolution: VideoResolution =
      options?.resolution ??
      (video.veoQuality === 'max' || video.qualityTier === 'ultra-4k'
        ? '4k'
        : video.qualityTier === 'standard'
          ? '720p'
          : '1080p')
    const quote = quoteGenerationCredits({
      kind: 'clip',
      provider: 'google_vertex',
      model: OMNI_MODEL_ID,
      resolution,
      durationSeconds: duration,
      audio,
      referenceImageCount,
      rateCard,
    })
    return {
      creditsEach: quote.credits,
      providerUsd: quote.providerUsd,
      operation: quote.operation,
      label: `Vertex Omni (${resolution === '4k' ? '4K' : resolution}) ${duration}s`,
      providerLabel: 'Vertex / Omni',
    }
  }

  if (video.engine === 'veo') {
    const duration = snapSegmentDurationForEngine(video.segmentDuration, {
      engineId: 'natural-dialogue',
    })
    const isPremium =
      video.veoQuality === 'max' ||
      video.qualityTier === 'ultra-4k' ||
      options?.resolution === '4k'
    const resolution: VideoResolution =
      options?.resolution ?? (isPremium ? '4k' : '1080p')
    const model = isPremium ? VEO_PREMIUM_MODEL_ID : VEO_FAST_MODEL_ID
    const quote = quoteGenerationCredits({
      kind: 'clip',
      provider: 'google_vertex',
      model,
      resolution,
      durationSeconds: duration,
      audio,
      referenceImageCount,
      rateCard,
    })
    return {
      creditsEach: quote.credits,
      providerUsd: quote.providerUsd,
      operation: quote.operation,
      label: `Veo 3.1 (${isPremium ? (resolution === '4k' ? '4K' : 'Premium') : 'Fast'}) ${duration}s`,
      providerLabel: 'Vertex / Veo',
    }
  }

  if (video.engine === 'aggregator') {
    const modelId = options?.aggregatorModelId ?? getDefaultAggregatorModelId()
    const duration = video.segmentDuration <= 7 ? 5 : 10
    const billableSeconds = Math.max(4, duration)
    const model = getAggregatorModel(modelId) || getAggregatorModel(getDefaultAggregatorModelId())
    const opKey = `aggregator_${modelId}`
    const appliedRate = rateCard?.[opKey] ?? rateCard?.[modelId]
    const usdPerSec = appliedRate?.usdPerUnit ?? model?.costPerSecondUsd ?? 0.08
    const markup = appliedRate?.markup ?? DEFAULT_MARKUP
    const providerUsd = usdPerSec * billableSeconds
    const baseCredits = appliedRate
      ? Math.max(
          40,
          creditsForProviderUsd(
            providerUsd,
            markup,
            appliedRate.creditsPerUnitOverride,
            billableSeconds
          )
        )
      : getAggregatorCreditsForModel(modelId, duration, markup)
    return {
      creditsEach: baseCredits + referenceImageCount * REFERENCE_IMAGE_ADDON_CREDITS,
      providerUsd,
      operation: opKey,
      label: `${model?.label ?? 'Aggregator'} ${duration}s`,
      providerLabel: 'Aggregator',
    }
  }

  const selection = toEngineSelection(video.engine, video.qualityTier)
  const duration = snapSegmentDurationForEngine(video.segmentDuration, selection)

  if (selection.engineId === SCENEFLOW_ENGINE_ID) {
    const tier =
      SCENEFLOW_QUALITY_TIERS.find((t) => t.id === selection.qualityTierId) ??
      SCENEFLOW_QUALITY_TIERS.find((t) => t.id === 'cinematic')!
    const resolution: VideoResolution =
      options?.resolution ??
      (tier.klingQuality === '4k' ? '4k' : tier.klingQuality === 'std' ? '720p' : '1080p')
    const quote = quoteGenerationCredits({
      kind: 'clip',
      provider: 'kling',
      model: SCENEFLOW_DEFAULT_MODEL,
      resolution,
      durationSeconds: Math.max(3, duration),
      audio,
      voiceControl,
      referenceImageCount,
      rateCard,
    })
    return {
      creditsEach: quote.credits,
      providerUsd: quote.providerUsd,
      operation: quote.operation,
      label: `SceneFlow ${tier.label} ${duration}s`,
      providerLabel: 'Kling',
    }
  }

  const alt = ALTERNATIVE_ENGINES.find((e) => e.id === selection.engineId)
  if (!alt) {
    const tier = SCENEFLOW_QUALITY_TIERS.find((t) => t.id === 'cinematic')!
    const quote = quoteGenerationCredits({
      kind: 'clip',
      provider: 'kling',
      model: SCENEFLOW_DEFAULT_MODEL,
      resolution: options?.resolution ?? '1080p',
      durationSeconds: Math.max(3, duration),
      audio,
      voiceControl,
      referenceImageCount,
      rateCard,
    })
    return {
      creditsEach: quote.credits,
      providerUsd: quote.providerUsd,
      operation: quote.operation,
      label: `SceneFlow ${tier.label} ${duration}s`,
      providerLabel: 'Kling',
    }
  }

  if (alt.provider === 'vertex') {
    const resolution: VideoResolution =
      options?.resolution ?? (video.veoQuality === 'max' ? '4k' : '1080p')
    const quote = quoteGenerationCredits({
      kind: 'clip',
      provider: 'google_vertex',
      model: OMNI_MODEL_ID,
      resolution,
      durationSeconds: duration,
      audio,
      referenceImageCount,
      rateCard,
    })
    const qualityLabel = resolution === '4k' ? '4K' : resolution
    return {
      creditsEach: quote.credits,
      providerUsd: quote.providerUsd,
      operation: quote.operation,
      label: `Omni Natural-Dialogue (${qualityLabel}) ${duration}s`,
      providerLabel: 'Vertex / Omni',
    }
  }

  const modelId = options?.aggregatorModelId ?? alt.videoModel!
  const billableSeconds = Math.max(4, duration)
  const model = getAggregatorModel(modelId) || getAggregatorModel(getDefaultAggregatorModelId())
  const opKey = `aggregator_${modelId}`
  const appliedRate = rateCard?.[opKey] ?? rateCard?.[modelId]
  const usdPerSec = appliedRate?.usdPerUnit ?? model?.costPerSecondUsd ?? 0.08
  const markup = appliedRate?.markup ?? DEFAULT_MARKUP
  const providerUsd = usdPerSec * billableSeconds
  const baseCredits = appliedRate
    ? Math.max(
        40,
        creditsForProviderUsd(
          providerUsd,
          markup,
          appliedRate.creditsPerUnitOverride,
          billableSeconds
        )
      )
    : getAggregatorCreditsForModel(modelId, duration, markup)
  return {
    creditsEach: baseCredits + referenceImageCount * REFERENCE_IMAGE_ADDON_CREDITS,
    providerUsd,
    operation: opKey,
    label: `${alt.label} ${duration}s`,
    providerLabel: 'Aggregator',
  }
}

export function estimateVideoClipCredits(
  video: VideoClipQuoteInput,
  options?: VideoClipEstimateOptions
): VideoClipEstimate {
  return estimateVideoClipQuote(video, options)
}

export function buildCreditsBudgetParams(
  video: NormalizedVideoParameters,
  extras?: { byokExcludeMedia?: boolean }
): {
  engine: VideoEngineId
  qualityTier?: SceneFlowQualityTierId
  segmentDuration: number
  byokExcludeMedia?: boolean
} {
  const byok =
    extras?.byokExcludeMedia !== undefined
      ? { byokExcludeMedia: Boolean(extras.byokExcludeMedia) }
      : {}
  if (video.engine === SCENEFLOW_ENGINE_ID) {
    return {
      engine: video.engine,
      qualityTier: video.qualityTier,
      segmentDuration: video.segmentDuration,
      ...byok,
    }
  }
  return {
    engine: video.engine,
    segmentDuration: video.segmentDuration,
    ...byok,
  }
}
