/**
 * Production Budget Manager — estimate engine.
 *
 * Plans credit spend from fixed scene/beat counts + Draft/Final resolution
 * (provider is not a budget factor). Reconciles against live actuals.
 */

import {
  BLUEPRINT_CREDITS,
  IMAGE_CREDITS,
  TEXT_CREDITS,
  VIDEO_CREDITS,
  getKlingCreditsForGeneration,
} from '@/lib/credits/creditCosts'
import { getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import {
  SCENEFLOW_ENGINE_ID,
  type SceneFlowQualityTierId,
  type VideoEngineId,
} from '@/lib/credits/videoEnginePricing'

export type ProductionMethodId =
  | 'animatic_first'
  | 'draft_production'
  | 'final_delivery'
  | 'express_sprint'

export type FrameQuality = 'draft' | 'final'
export type VideoQuality = 'draft' | 'final' | 'none'

export type SuggestionId =
  | 'use_animatic_first'
  | 'stay_on_draft'
  | 'lower_frame_iterations'
  | 'lower_video_iterations'
  | 'disable_topaz'
  | 'enable_byok'

/** First-take success → planned iterations. */
export const FRAME_FIRST_TAKE_RATE = 0.8
export const VIDEO_FIRST_TAKE_RATE = 0.9
export const DEFAULT_FRAME_ITERATIONS = 1 / FRAME_FIRST_TAKE_RATE // 1.25
export const DEFAULT_VIDEO_ITERATIONS = 1 / VIDEO_FIRST_TAKE_RATE // ~1.111…

export const FRAME_QUALITY_RATES: Record<FrameQuality, number> = {
  draft: IMAGE_CREDITS.FRAME_GENERATION,
  final: IMAGE_CREDITS.FAL_KLING_IMAGE,
}

export const TOPAZ_CREDITS_PER_MINUTE = VIDEO_CREDITS.TOPAZ_UPSCALE_PER_MIN

export interface ProductionMethodDefaults {
  id: ProductionMethodId
  frameQuality: FrameQuality
  videoQuality: VideoQuality
  frameIterations: number
  videoIterations: number
  topazEnabled: boolean
  intelligenceEnabled: boolean
}

export const PRODUCTION_METHODS: Record<ProductionMethodId, ProductionMethodDefaults> = {
  animatic_first: {
    id: 'animatic_first',
    frameQuality: 'draft',
    videoQuality: 'none',
    frameIterations: DEFAULT_FRAME_ITERATIONS,
    videoIterations: 0,
    topazEnabled: false,
    intelligenceEnabled: true,
  },
  draft_production: {
    id: 'draft_production',
    frameQuality: 'draft',
    videoQuality: 'draft',
    frameIterations: DEFAULT_FRAME_ITERATIONS,
    videoIterations: DEFAULT_VIDEO_ITERATIONS,
    topazEnabled: false,
    intelligenceEnabled: true,
  },
  final_delivery: {
    id: 'final_delivery',
    frameQuality: 'final',
    videoQuality: 'final',
    frameIterations: DEFAULT_FRAME_ITERATIONS,
    videoIterations: DEFAULT_VIDEO_ITERATIONS,
    topazEnabled: true,
    intelligenceEnabled: true,
  },
  express_sprint: {
    id: 'express_sprint',
    frameQuality: 'draft',
    videoQuality: 'draft',
    frameIterations: 1.35,
    videoIterations: 1.2,
    topazEnabled: false,
    intelligenceEnabled: true,
  },
}

export const DEFAULT_PRODUCTION_METHOD: ProductionMethodId = 'animatic_first'

export function getFrameUnitCost(quality: FrameQuality): number {
  return FRAME_QUALITY_RATES[quality]
}

export function getVideoUnitCost(
  quality: VideoQuality,
  segmentDurationSec: number
): number {
  if (quality === 'none') return 0
  const duration = Math.min(15, Math.max(3, Math.round(segmentDurationSec) || 10))
  return getKlingCreditsForGeneration({
    quality: quality === 'draft' ? 'std' : 'pro',
    durationSeconds: duration,
  })
}

export function intelligencePackageCredits(scenes: number): number {
  const sceneCount = Math.max(0, Math.floor(scenes))
  return (
    BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS +
    sceneCount * TEXT_CREDITS.SCRIPT_PER_SCENE +
    BLUEPRINT_CREDITS.BLUEPRINT_OPTIMIZE +
    BLUEPRINT_CREDITS.BLUEPRINT_REFINE
  )
}

export function topazMinutes(beats: number, segmentDurationSec: number): number {
  const duration = Math.max(0, segmentDurationSec)
  const totalSec = Math.max(0, beats) * duration
  return Math.ceil(totalSec / 60)
}

export interface ProductionBudgetPlanInput {
  scenes: number
  beats: number
  segmentDurationSec: number
  method: ProductionMethodId
  frameQuality: FrameQuality
  videoQuality: VideoQuality
  frameIterations: number
  videoIterations: number
  topazEnabled: boolean
  intelligenceEnabled: boolean
  byokExcludeMedia?: boolean
  creditsUsed?: number
  framesDone?: number
  videosDone?: number
  observedVideoTakesAvg?: number
  creditsBudget?: number
  hasByokKeys?: boolean
}

export interface CategoryLine {
  credits: number
  unitCost: number
  quantity: number
  excluded?: boolean
}

export interface ProductionBudgetEstimate {
  frames: CategoryLine
  videos: CategoryLine
  topaz: CategoryLine
  intelligence: CategoryLine
  plannedTotal: number
  /** Iterations used for remaining work after blending with observed takes. */
  effectiveFrameIterations: number
  effectiveVideoIterations: number
  remainingFrames: number
  remainingVideos: number
  costToComplete: number
  forecastTotal: number
  creditsUsed: number
  creditsBudget: number
  variance: number
  suggestions: SuggestionId[]
}

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function roundCredits(n: number): number {
  return Math.round(clampNonNeg(n))
}

export function estimateProductionBudget(
  input: ProductionBudgetPlanInput
): ProductionBudgetEstimate {
  const scenes = Math.max(0, Math.floor(input.scenes))
  const beats = Math.max(0, Math.floor(input.beats))
  const duration = Math.min(15, Math.max(3, Number(input.segmentDurationSec) || 10))
  const byok = Boolean(input.byokExcludeMedia)
  const frameIterations = clampNonNeg(input.frameIterations)
  const videoIterations =
    input.videoQuality === 'none' ? 0 : clampNonNeg(input.videoIterations)

  const frameUnit = getFrameUnitCost(input.frameQuality)
  const videoUnit = getVideoUnitCost(input.videoQuality, duration)
  const frameQty = beats * frameIterations
  const videoQty = beats * videoIterations

  const framesRaw = frameQty * frameUnit
  const videosRaw = videoQty * videoUnit
  const topazMins = input.topazEnabled ? topazMinutes(beats, duration) : 0
  const topazRaw = topazMins * TOPAZ_CREDITS_PER_MINUTE
  const intelligenceRaw = input.intelligenceEnabled
    ? intelligencePackageCredits(scenes)
    : 0

  const framesCredits = byok ? 0 : roundCredits(framesRaw)
  const videosCredits = byok ? 0 : roundCredits(videosRaw)
  const topazCredits = byok ? 0 : roundCredits(topazRaw)
  const intelligenceCredits = roundCredits(intelligenceRaw)

  const plannedTotal =
    framesCredits + videosCredits + topazCredits + intelligenceCredits

  const creditsUsed = roundCredits(input.creditsUsed ?? 0)
  const creditsBudget = roundCredits(input.creditsBudget ?? 0)
  const framesDone = Math.min(beats, Math.max(0, Math.floor(input.framesDone ?? 0)))
  const videosDone = Math.min(beats, Math.max(0, Math.floor(input.videosDone ?? 0)))
  const remainingFrames = Math.max(0, beats - framesDone)
  const remainingVideos =
    input.videoQuality === 'none' ? 0 : Math.max(0, beats - videosDone)

  const observed = input.observedVideoTakesAvg
  const effectiveFrameIterations = frameIterations
  const effectiveVideoIterations =
    input.videoQuality === 'none'
      ? 0
      : observed != null && Number.isFinite(observed) && observed > 0 && videosDone >= 3
        ? Math.max(videoIterations, observed)
        : videoIterations

  const remainingFrameCredits = byok
    ? 0
    : roundCredits(remainingFrames * effectiveFrameIterations * frameUnit)
  // For remaining videos: charge remaining beats × effective iterations × unit,
  // but subtract takes already paid if we only count incomplete beats.
  // Simpler: remaining beats still need effectiveVideoIterations takes each.
  const remainingVideoCredits = byok
    ? 0
    : roundCredits(remainingVideos * effectiveVideoIterations * videoUnit)
  const remainingTopaz = byok
    ? 0
    : input.topazEnabled && remainingVideos > 0
      ? roundCredits(topazMinutes(remainingVideos, duration) * TOPAZ_CREDITS_PER_MINUTE)
      : 0
  // Intelligence is front-loaded; if already spent some credits, don't re-add full package
  // when forecasting to complete — only unpaid media remaining + intelligence if unused project.
  const remainingIntelligence =
    creditsUsed <= 0 && input.intelligenceEnabled ? intelligenceCredits : 0

  const costToComplete =
    remainingFrameCredits +
    remainingVideoCredits +
    remainingTopaz +
    remainingIntelligence

  const forecastTotal =
    creditsUsed > 0 ? creditsUsed + costToComplete : plannedTotal

  const variance = creditsBudget > 0 ? forecastTotal - creditsBudget : 0

  const suggestions = buildSuggestions({
    method: input.method,
    frameQuality: input.frameQuality,
    videoQuality: input.videoQuality,
    frameIterations,
    videoIterations,
    topazEnabled: input.topazEnabled,
    videosDone,
    byok,
    hasByokKeys: Boolean(input.hasByokKeys),
  })

  return {
    frames: {
      credits: framesCredits,
      unitCost: frameUnit,
      quantity: frameQty,
      excluded: byok,
    },
    videos: {
      credits: videosCredits,
      unitCost: videoUnit,
      quantity: videoQty,
      excluded: byok || input.videoQuality === 'none',
    },
    topaz: {
      credits: topazCredits,
      unitCost: TOPAZ_CREDITS_PER_MINUTE,
      quantity: topazMins,
      excluded: byok || !input.topazEnabled,
    },
    intelligence: {
      credits: intelligenceCredits,
      unitCost: intelligenceCredits,
      quantity: input.intelligenceEnabled ? 1 : 0,
    },
    plannedTotal,
    effectiveFrameIterations,
    effectiveVideoIterations,
    remainingFrames,
    remainingVideos,
    costToComplete,
    forecastTotal,
    creditsUsed,
    creditsBudget,
    variance,
    suggestions,
  }
}

function buildSuggestions(args: {
  method: ProductionMethodId
  frameQuality: FrameQuality
  videoQuality: VideoQuality
  frameIterations: number
  videoIterations: number
  topazEnabled: boolean
  videosDone: number
  byok: boolean
  hasByokKeys: boolean
}): SuggestionId[] {
  const out: SuggestionId[] = []
  if (args.videosDone === 0 && args.videoQuality !== 'none' && args.method !== 'animatic_first') {
    out.push('use_animatic_first')
  }
  if (args.frameQuality === 'final' || args.videoQuality === 'final') {
    out.push('stay_on_draft')
  }
  if (args.frameIterations > DEFAULT_FRAME_ITERATIONS + 0.01) {
    out.push('lower_frame_iterations')
  }
  if (args.videoQuality !== 'none' && args.videoIterations > DEFAULT_VIDEO_ITERATIONS + 0.01) {
    out.push('lower_video_iterations')
  }
  if (args.topazEnabled && args.videoQuality !== 'final') {
    out.push('disable_topaz')
  }
  if (args.hasByokKeys && !args.byok) {
    out.push('enable_byok')
  }
  return out
}

export interface ProjectBudgetScope {
  scenes: number
  beats: number
  segmentDurationSec: number
  framesDone: number
  videosDone: number
  observedVideoTakesAvg: number | null
  creditsUsed: number
}

function resolveScenes(scriptOrVision: unknown): Array<Record<string, unknown>> {
  if (!scriptOrVision || typeof scriptOrVision !== 'object') return []
  const root = scriptOrVision as Record<string, unknown>
  const visionPhase = (root.visionPhase as Record<string, unknown> | undefined) ?? root
  const scriptBlock = visionPhase.script as Record<string, unknown> | undefined
  const nested = scriptBlock?.script as { scenes?: unknown } | undefined
  const scenes =
    (Array.isArray(nested?.scenes) && nested.scenes) ||
    (Array.isArray(scriptBlock?.scenes) && scriptBlock.scenes) ||
    (Array.isArray(visionPhase.scenes) && visionPhase.scenes) ||
    (Array.isArray(root.scenes) && root.scenes) ||
    []
  return scenes.filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
}

/**
 * Count fixed scope + actuals from Production Studio script / production metadata.
 */
export function readProjectBudgetScope(args: {
  script?: unknown
  metadata?: Record<string, unknown> | null
  segmentDurationFallback?: number
}): ProjectBudgetScope {
  const metadata = args.metadata ?? null
  const scenes = resolveScenes(args.script ?? metadata?.visionPhase ?? metadata)
  let beats = 0
  let framesDone = 0

  for (const scene of scenes) {
    const sceneBeats = getSceneBeats(scene).filter((b) => !isBeatExcluded(b))
    beats += sceneBeats.length
    for (const beat of sceneBeats) {
      if (beat.storyboardImageUrl || beat.storyboardEndImageUrl) {
        framesDone += 1
      }
    }
  }

  const production = getSceneProductionStateFromMetadata(metadata)
  let videosDone = 0
  let takeSum = 0
  let takeSegments = 0
  let targetDuration: number | undefined

  for (const sceneData of Object.values(production)) {
    if (!sceneData || typeof sceneData !== 'object') continue
    const prod = sceneData as Record<string, unknown>
    if (typeof prod.targetSegmentDuration === 'number' && prod.targetSegmentDuration > 0) {
      targetDuration = prod.targetSegmentDuration
    }
    const segments = Array.isArray(prod.segments) ? prod.segments : []
    for (const seg of segments) {
      if (!seg || typeof seg !== 'object') continue
      const segment = seg as Record<string, unknown>
      const takes = Array.isArray(segment.takes) ? segment.takes : []
      if (takes.length > 0) {
        takeSum += takes.length
        takeSegments += 1
      }
      const hasVideo =
        (typeof segment.activeAssetUrl === 'string' && segment.activeAssetUrl.length > 0) ||
        segment.assetType === 'video' ||
        takes.some(
          (t) =>
            t &&
            typeof t === 'object' &&
            typeof (t as { assetUrl?: unknown }).assetUrl === 'string' &&
            (t as { assetUrl: string }).assetUrl.length > 0
        )
      if (hasVideo) videosDone += 1
    }
  }

  const savedParams = metadata?.creditsBudgetParams as
    | { segmentDuration?: number }
    | undefined
  const segmentDurationSec =
    targetDuration ??
    savedParams?.segmentDuration ??
    args.segmentDurationFallback ??
    10

  return {
    scenes: scenes.length,
    beats,
    segmentDurationSec: Math.min(15, Math.max(3, Math.round(segmentDurationSec) || 10)),
    framesDone: Math.min(beats, framesDone),
    videosDone: Math.min(beats, videosDone),
    observedVideoTakesAvg: takeSegments > 0 ? takeSum / takeSegments : null,
    creditsUsed: getProjectCreditsUsed(metadata),
  }
}

export interface CreditsBudgetParamsV2 {
  version: 2
  method: ProductionMethodId
  frameQuality: FrameQuality
  videoQuality: VideoQuality
  frameIterations: number
  videoIterations: number
  topazEnabled: boolean
  intelligenceEnabled: boolean
  byokExcludeMedia?: boolean
  segmentDuration: number
  engine: VideoEngineId
  qualityTier?: SceneFlowQualityTierId
}

export function buildProductionBudgetParams(args: {
  method: ProductionMethodId
  frameQuality: FrameQuality
  videoQuality: VideoQuality
  frameIterations: number
  videoIterations: number
  topazEnabled: boolean
  intelligenceEnabled: boolean
  byokExcludeMedia?: boolean
  segmentDurationSec: number
}): CreditsBudgetParamsV2 {
  const qualityTier: SceneFlowQualityTierId | undefined =
    args.videoQuality === 'draft'
      ? 'standard'
      : args.videoQuality === 'final'
        ? 'cinematic'
        : undefined

  return {
    version: 2,
    method: args.method,
    frameQuality: args.frameQuality,
    videoQuality: args.videoQuality,
    frameIterations: args.frameIterations,
    videoIterations: args.videoIterations,
    topazEnabled: args.topazEnabled,
    intelligenceEnabled: args.intelligenceEnabled,
    ...(args.byokExcludeMedia !== undefined
      ? { byokExcludeMedia: Boolean(args.byokExcludeMedia) }
      : {}),
    segmentDuration: Math.min(15, Math.max(3, Math.round(args.segmentDurationSec) || 10)),
    engine: SCENEFLOW_ENGINE_ID,
    ...(qualityTier ? { qualityTier } : {}),
  }
}

export function parseCreditsBudgetParamsV2(
  raw: unknown
): Partial<CreditsBudgetParamsV2> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const method = o.method
  const frameQuality = o.frameQuality
  const videoQuality = o.videoQuality
  return {
    version: 2,
    ...(typeof method === 'string' && method in PRODUCTION_METHODS
      ? { method: method as ProductionMethodId }
      : {}),
    ...(frameQuality === 'draft' || frameQuality === 'final'
      ? { frameQuality }
      : {}),
    ...(videoQuality === 'draft' || videoQuality === 'final' || videoQuality === 'none'
      ? { videoQuality }
      : {}),
    ...(typeof o.frameIterations === 'number' ? { frameIterations: o.frameIterations } : {}),
    ...(typeof o.videoIterations === 'number' ? { videoIterations: o.videoIterations } : {}),
    ...(typeof o.topazEnabled === 'boolean' ? { topazEnabled: o.topazEnabled } : {}),
    ...(typeof o.intelligenceEnabled === 'boolean'
      ? { intelligenceEnabled: o.intelligenceEnabled }
      : {}),
    ...(typeof o.byokExcludeMedia === 'boolean'
      ? { byokExcludeMedia: o.byokExcludeMedia }
      : {}),
    ...(typeof o.segmentDuration === 'number' ? { segmentDuration: o.segmentDuration } : {}),
  }
}

export function applyMethodDefaults(method: ProductionMethodId): ProductionMethodDefaults {
  return { ...PRODUCTION_METHODS[method] }
}
