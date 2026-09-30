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
import { BEAT_START_STILL_SLOT, stillVersionCount } from '@/lib/storyboard/mediaVersions'
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

/** Planning average clip length — not inherited from per-segment production targets. */
export const DEFAULT_PLAN_SEGMENT_DURATION_SEC = 10

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

export interface BudgetShotActual {
  id: string
  label: string
  stillAttempts: number
  clipAttempts: number
}

export interface BudgetSceneActual {
  sceneId: string
  title: string
  chapterIndex: number | null
  chapterTitle: string
  shots: BudgetShotActual[]
}

export interface ProjectBudgetScope {
  scenes: number
  beats: number
  segmentDurationSec: number
  framesDone: number
  videosDone: number
  observedVideoTakesAvg: number | null
  creditsUsed: number
  sceneActuals: BudgetSceneActual[]
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

function nonEmptyUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function dialogueStoryboardUrl(scene: Record<string, unknown>, beat: {
  lineId?: string
  kind?: string
}): string | undefined {
  const kind = beat.kind
  if (kind !== 'dialogue' && kind !== 'narration') return undefined

  const scan = (list: unknown): string | undefined => {
    if (!Array.isArray(list)) return undefined
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      if (beat.lineId && row.lineId !== beat.lineId && row.id !== beat.lineId) continue
      if (nonEmptyUrl(row.storyboardImageUrl)) return row.storyboardImageUrl
    }
    // Positional / any spoken line with a storyboard when lineId missing
    if (!beat.lineId) {
      for (const item of list) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        if (nonEmptyUrl(row.storyboardImageUrl)) return row.storyboardImageUrl
      }
    }
    return undefined
  }

  const fromScene = scan(scene.dialogue)
  if (fromScene) return fromScene

  const segments = Array.isArray(scene.segments) ? scene.segments : []
  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') continue
    const found = scan((seg as Record<string, unknown>).dialogue)
    if (found) return found
  }
  return undefined
}

function segmentHasFrame(segment: Record<string, unknown> | null | undefined): boolean {
  if (!segment) return false
  const refs = (segment.references as Record<string, unknown> | undefined) ?? {}
  return (
    nonEmptyUrl(segment.startFrameUrl) ||
    nonEmptyUrl(segment.endFrameUrl) ||
    nonEmptyUrl(segment.visualFrame) ||
    nonEmptyUrl(refs.startFrameUrl) ||
    nonEmptyUrl(refs.endFrameUrl)
  )
}

function segmentHasVideo(segment: Record<string, unknown> | null | undefined): boolean {
  if (!segment) return false
  if (nonEmptyUrl(segment.activeAssetUrl)) return true
  if (segment.assetType === 'video' && nonEmptyUrl(segment.activeAssetUrl)) return true
  const takes = Array.isArray(segment.takes) ? segment.takes : []
  return takes.some((t) => {
    if (!t || typeof t !== 'object') return false
    const take = t as Record<string, unknown>
    return nonEmptyUrl(take.assetUrl) || nonEmptyUrl(take.videoUrl)
  })
}

function findSegmentForBeat(
  segments: Array<Record<string, unknown>>,
  beat: { beatId?: string },
  index: number
): Record<string, unknown> | null {
  if (beat.beatId) {
    const byId = segments.find((s) => s.beatId === beat.beatId)
    if (byId) return byId
  }
  return segments[index] ?? null
}

function sceneHasFallbackVideo(prod: Record<string, unknown>): boolean {
  if (nonEmptyUrl(prod.renderedSceneUrl)) return true
  const streams = Array.isArray(prod.productionStreams) ? prod.productionStreams : []
  return streams.some(
    (s) => s && typeof s === 'object' && nonEmptyUrl((s as Record<string, unknown>).mp4Url)
  )
}

function stillAttemptsForShot(
  beat: Record<string, unknown>,
  segment: Record<string, unknown> | null
): number {
  const versions = stillVersionCount(beat, BEAT_START_STILL_SLOT)
  if (versions > 0) return versions
  if (
    nonEmptyUrl(beat.storyboardImageUrl) ||
    nonEmptyUrl(beat.storyboardEndImageUrl) ||
    segmentHasFrame(segment)
  ) {
    return 1
  }
  return 0
}

function clipAttemptsForShot(segment: Record<string, unknown> | null): number {
  const takes = Array.isArray(segment?.takes) ? segment!.takes : []
  const recorded = takes.filter((take) => take && typeof take === 'object').length
  if (recorded > 0) return recorded
  return segmentHasVideo(segment) ? 1 : 0
}

function sceneBudgetTitle(scene: Record<string, unknown>, index: number): string {
  const heading = scene.heading ?? scene.title ?? scene.sceneHeading
  if (typeof heading === 'string' && heading.trim()) return heading.trim()
  return `Scene ${index + 1}`
}

function sceneChapter(scene: Record<string, unknown>): {
  chapterIndex: number | null
  chapterTitle: string
} {
  const index =
    typeof scene.blueprintBeatIndex === 'number' && Number.isFinite(scene.blueprintBeatIndex)
      ? scene.blueprintBeatIndex
      : null
  const titled =
    typeof scene.blueprintBeatTitle === 'string' ? scene.blueprintBeatTitle.trim() : ''
  if (titled) return { chapterIndex: index, chapterTitle: titled }
  if (index != null) return { chapterIndex: index, chapterTitle: `Chapter ${index + 1}` }
  return { chapterIndex: null, chapterTitle: 'Production' }
}

/**
 * Count fixed scope + actuals from Production Studio script / production metadata.
 * Planning clip duration: saved budget params → DEFAULT_PLAN_SEGMENT_DURATION_SEC (10).
 * Does not inherit production targetSegmentDuration (often 5–8s per beat).
 */
export function readProjectBudgetScope(args: {
  script?: unknown
  metadata?: Record<string, unknown> | null
  /** Live in-memory production map from Studio (preferred over metadata alone). */
  productionScenes?: Record<string, unknown> | null
  segmentDurationFallback?: number
}): ProjectBudgetScope {
  const metadata = args.metadata ?? null
  const scenes = resolveScenes(args.script ?? metadata?.visionPhase ?? metadata)
  const fromMetadata = getSceneProductionStateFromMetadata(metadata)
  const production: Record<string, unknown> = {
    ...fromMetadata,
    ...(args.productionScenes && typeof args.productionScenes === 'object'
      ? args.productionScenes
      : {}),
  }

  let beats = 0
  let framesDone = 0
  let videosDone = 0
  let takeSum = 0
  let takeSegments = 0
  const sceneActuals: BudgetSceneActual[] = []

  for (const scene of scenes) {
    const sceneId =
      (typeof scene.sceneId === 'string' && scene.sceneId) ||
      (typeof scene.id === 'string' && scene.id) ||
      ''
    const sceneBeats = getSceneBeats(scene).filter((b) => !isBeatExcluded(b))
    beats += sceneBeats.length

    const prodRaw = (sceneId && production[sceneId]) || null
    const prod =
      prodRaw && typeof prodRaw === 'object' ? (prodRaw as Record<string, unknown>) : null
    const segments = (
      Array.isArray(prod?.segments) ? prod!.segments : []
    ).filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')

    let sceneFrames = 0
    let sceneVideos = 0
    const shots: BudgetShotActual[] = []

    sceneBeats.forEach((beat, index) => {
      const segment = findSegmentForBeat(segments, beat, index)
      const beatRecord = beat as unknown as Record<string, unknown>
      const hasBeatFrame =
        nonEmptyUrl(beat.storyboardImageUrl) ||
        nonEmptyUrl(beat.storyboardEndImageUrl) ||
        nonEmptyUrl(dialogueStoryboardUrl(scene, beat)) ||
        segmentHasFrame(segment)

      if (hasBeatFrame) {
        sceneFrames += 1
      }

      if (segmentHasVideo(segment)) {
        sceneVideos += 1
        const takes = Array.isArray(segment?.takes) ? segment!.takes : []
        if (takes.length > 0) {
          takeSum += takes.length
          takeSegments += 1
        }
      }

      const clipAttempts = clipAttemptsForShot(segment)
      shots.push({
        id:
          (typeof beat.beatId === 'string' && beat.beatId) ||
          `${sceneId || 'scene'}-shot-${index + 1}`,
        label: `Shot ${index + 1}`,
        stillAttempts: Math.max(stillAttemptsForShot(beatRecord, segment), hasBeatFrame ? 1 : 0),
        clipAttempts,
      })
    })

    // Legacy establishing image: count toward first non-excluded beat if that beat is otherwise empty
    if (nonEmptyUrl(scene.imageUrl) && sceneBeats.length > 0) {
      const first = sceneBeats[0]
      const firstSeg = findSegmentForBeat(segments, first, 0)
      const firstHas =
        nonEmptyUrl(first.storyboardImageUrl) ||
        nonEmptyUrl(first.storyboardEndImageUrl) ||
        nonEmptyUrl(dialogueStoryboardUrl(scene, first)) ||
        segmentHasFrame(firstSeg)
      if (!firstHas) {
        sceneFrames = Math.min(sceneBeats.length, sceneFrames + 1)
      }
    }

    // Scene-level video fallback only when there are beats but no per-beat videos
    if (sceneVideos === 0 && prod && sceneHasFallbackVideo(prod) && sceneBeats.length > 0) {
      sceneVideos = 1
    }

    // Also count production segments not matched to beats (orphan videos/frames)
    if (segments.length > sceneBeats.length) {
      for (let i = sceneBeats.length; i < segments.length; i++) {
        if (segmentHasFrame(segments[i])) sceneFrames += 1
        if (segmentHasVideo(segments[i])) {
          sceneVideos += 1
          const takes = Array.isArray(segments[i].takes) ? segments[i].takes : []
          if (takes.length > 0) {
            takeSum += takes.length
            takeSegments += 1
          }
        }
      }
    }

    framesDone += Math.min(sceneBeats.length, sceneFrames)
    videosDone += Math.min(sceneBeats.length || segments.length, sceneVideos)

    const chapter = sceneChapter(scene)
    sceneActuals.push({
      sceneId: sceneId || `scene-${sceneActuals.length + 1}`,
      title: sceneBudgetTitle(scene, sceneActuals.length),
      chapterIndex: chapter.chapterIndex,
      chapterTitle: chapter.chapterTitle,
      shots,
    })
  }

  // Production-only scenes (metadata keys without matching script scenes yet)
  if (scenes.length === 0 && Object.keys(production).length > 0) {
    for (const sceneData of Object.values(production)) {
      if (!sceneData || typeof sceneData !== 'object') continue
      const prod = sceneData as Record<string, unknown>
      const segments = (
        Array.isArray(prod.segments) ? prod.segments : []
      ).filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
      for (const segment of segments) {
        beats += 1
        if (segmentHasFrame(segment)) framesDone += 1
        if (segmentHasVideo(segment)) {
          videosDone += 1
          const takes = Array.isArray(segment.takes) ? segment.takes : []
          if (takes.length > 0) {
            takeSum += takes.length
            takeSegments += 1
          }
        }
      }
    }
  }

  const savedParams = metadata?.creditsBudgetParams as
    | { segmentDuration?: number }
    | undefined
  const segmentDurationSec =
    (typeof savedParams?.segmentDuration === 'number' && savedParams.segmentDuration > 0
      ? savedParams.segmentDuration
      : null) ??
    (typeof args.segmentDurationFallback === 'number' && args.segmentDurationFallback > 0
      ? args.segmentDurationFallback
      : null) ??
    DEFAULT_PLAN_SEGMENT_DURATION_SEC

  return {
    scenes: scenes.length,
    beats,
    segmentDurationSec: Math.min(
      15,
      Math.max(3, Math.round(segmentDurationSec) || DEFAULT_PLAN_SEGMENT_DURATION_SEC)
    ),
    framesDone: Math.min(beats, framesDone),
    videosDone: Math.min(beats, videosDone),
    observedVideoTakesAvg: takeSegments > 0 ? takeSum / takeSegments : null,
    creditsUsed: getProjectCreditsUsed(metadata),
    sceneActuals,
  }
}

export interface BudgetShotLine {
  id: string
  label: string
  stillIterations: number
  clipIterations: number
  credits: number
  stillAttempts: number
  clipAttempts: number
}

export interface BudgetSceneLine {
  sceneId: string
  title: string
  shotCount: number
  stillIterations: number
  clipIterations: number
  credits: number
  stillActual: number | null
  clipActual: number | null
  finished: boolean
  shots: BudgetShotLine[]
}

export interface BudgetChapterLine {
  key: string
  title: string
  credits: number
  scenes: BudgetSceneLine[]
}

export interface BudgetRollup {
  chapters: BudgetChapterLine[]
  mediaCredits: number
  topazCredits: number
  intelligenceCredits: number
  masterCredits: number
  completedStillActual: number | null
  completedClipActual: number | null
  completedSceneCount: number
}

export function sceneIsFinished(scene: BudgetSceneActual): boolean {
  return scene.shots.length > 0 && scene.shots.every((shot) => shot.stillAttempts >= 1)
}

export function completedIterationAverages(
  scenes: BudgetSceneActual[],
  videoOn: boolean
): { still: number | null; clip: number | null; sceneCount: number } {
  const done = scenes.filter(sceneIsFinished)
  const shotCount = done.reduce((sum, scene) => sum + scene.shots.length, 0)
  if (shotCount === 0) return { still: null, clip: null, sceneCount: 0 }
  const stillAttempts = done.reduce(
    (sum, scene) => sum + scene.shots.reduce((shots, shot) => shots + shot.stillAttempts, 0),
    0
  )
  const clipAttempts = done.reduce(
    (sum, scene) => sum + scene.shots.reduce((shots, shot) => shots + shot.clipAttempts, 0),
    0
  )
  return {
    still: stillAttempts / shotCount,
    clip: videoOn ? clipAttempts / shotCount : null,
    sceneCount: done.length,
  }
}

function roundIteration(n: number): number {
  return Math.round(n * 100) / 100
}

/** Copy completed-scene averages into the planning targets. Spend is unchanged. */
export function actualPlanningTargets(
  scenes: BudgetSceneActual[],
  videoOn: boolean
): { frameIterations: number; videoIterations: number | null } | null {
  const averages = completedIterationAverages(scenes, videoOn)
  if (averages.still == null) return null
  return {
    frameIterations: roundIteration(averages.still),
    videoIterations: averages.clip == null ? null : roundIteration(averages.clip),
  }
}

export function rollupProductionBudget(args: {
  scenes: BudgetSceneActual[]
  frameIterations: number
  videoIterations: number
  frameUnit: number
  videoUnit: number
  topazCredits: number
  intelligenceCredits: number
  videoOn: boolean
}): BudgetRollup {
  const frameIterations = clampNonNeg(args.frameIterations)
  const videoIterations = args.videoOn ? clampNonNeg(args.videoIterations) : 0
  const shotCredits = frameIterations * args.frameUnit + videoIterations * args.videoUnit
  const averages = completedIterationAverages(args.scenes, args.videoOn)

  const chapters: BudgetChapterLine[] = []
  const byKey = new Map<string, BudgetChapterLine>()

  for (const scene of args.scenes) {
    const key = scene.chapterIndex == null ? 'production' : `chapter-${scene.chapterIndex}`
    let chapter = byKey.get(key)
    if (!chapter) {
      chapter = { key, title: scene.chapterTitle, credits: 0, scenes: [] }
      byKey.set(key, chapter)
      chapters.push(chapter)
    }
    const finished = sceneIsFinished(scene)
    const stillSum = scene.shots.reduce((sum, shot) => sum + shot.stillAttempts, 0)
    const clipSum = scene.shots.reduce((sum, shot) => sum + shot.clipAttempts, 0)
    const shotCount = scene.shots.length
    const shots: BudgetShotLine[] = scene.shots.map((shot) => ({
      id: shot.id,
      label: shot.label,
      stillIterations: frameIterations,
      clipIterations: videoIterations,
      credits: roundCredits(shotCredits),
      stillAttempts: shot.stillAttempts,
      clipAttempts: shot.clipAttempts,
    }))
    const credits = roundCredits(shotCount * shotCredits)
    chapter.scenes.push({
      sceneId: scene.sceneId,
      title: scene.title,
      shotCount,
      stillIterations: frameIterations,
      clipIterations: videoIterations,
      credits,
      stillActual: finished && shotCount > 0 ? stillSum / shotCount : null,
      clipActual: finished && args.videoOn && shotCount > 0 ? clipSum / shotCount : null,
      finished,
      shots,
    })
    chapter.credits += credits
  }

  const mediaCredits = chapters.reduce((sum, chapter) => sum + chapter.credits, 0)
  const topazCredits = roundCredits(args.topazCredits)
  const intelligenceCredits = roundCredits(args.intelligenceCredits)
  return {
    chapters,
    mediaCredits,
    topazCredits,
    intelligenceCredits,
    masterCredits: mediaCredits + topazCredits + intelligenceCredits,
    completedStillActual: averages.still,
    completedClipActual: averages.clip,
    completedSceneCount: averages.sceneCount,
  }
}

export interface SceneScheduleEntry {
  sceneId: string
  day: number
  /** ISO date (YYYY-MM-DD) when the schedule has a start date. */
  date?: string
  pinned: boolean
}

/** Index 0 is Sunday, matching Date UTC weekday. Default is Monday–Friday. */
export const DEFAULT_SCHEDULE_WEEKDAYS: boolean[] = [
  false,
  true,
  true,
  true,
  true,
  true,
  false,
]

export interface ScheduleDateTotal {
  date: string
  sceneIds: string[]
  credits: number
  cumulativeCredits: number
}

export interface ScheduleChapterEnd {
  key: string
  title: string
  date: string
}

export interface ProductionSchedule {
  workDays: number
  scenesPerDay: number
  startDate?: string
  weekdays?: boolean[]
  entries: SceneScheduleEntry[]
}

export interface SceneScheduleResult {
  entries: SceneScheduleEntry[]
  daysUsed: number
  extended: boolean
  endDate: string | null
  byDate: ScheduleDateTotal[]
  chapterEnds: ScheduleChapterEnd[]
  masterEndDate: string | null
}

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function normalizeWeekdays(weekdays: boolean[] | undefined): boolean[] {
  if (!weekdays || weekdays.length !== 7 || !weekdays.some(Boolean)) {
    return DEFAULT_SCHEDULE_WEEKDAYS
  }
  return weekdays
}

/** 1-based workday on or after startDate. Day 1 is the first selected weekday. */
export function nthWorkDate(
  startDate: string,
  weekdays: boolean[] | undefined,
  workday: number
): string | null {
  const start = parseIsoDate(startDate)
  if (!start || workday < 1) return null
  const active = normalizeWeekdays(weekdays)
  let cursor = start
  let seen = 0
  for (let step = 0; step < 4000; step += 1) {
    if (active[cursor.getUTCDay()]) {
      seen += 1
      if (seen === workday) return formatIsoDate(cursor)
    }
    cursor = addUtcDays(cursor, 1)
  }
  return null
}

function datedSchedule(
  args: {
    sceneIds: string[]
    scenesPerDay: number
    startDate: string
    weekdays?: boolean[]
    pinned?: Array<{ sceneId: string; day?: number; date?: string }>
    sceneCredits?: Record<string, number>
    chapters?: Array<{ key: string; title: string; sceneIds: string[] }>
  }
): SceneScheduleResult {
  const perDay = Math.max(1, Math.floor(args.scenesPerDay) || 1)
  const weekdays = normalizeWeekdays(args.weekdays)
  const known = new Set(args.sceneIds)
  const pinnedDate = new Map<string, string>()
  for (const entry of args.pinned ?? []) {
    if (!known.has(entry.sceneId)) continue
    if (entry.date && parseIsoDate(entry.date)) {
      pinnedDate.set(entry.sceneId, entry.date)
      continue
    }
    if (entry.day != null && entry.day >= 1) {
      const mapped = nthWorkDate(args.startDate, weekdays, entry.day)
      if (mapped) pinnedDate.set(entry.sceneId, mapped)
    }
  }

  const occupancy = new Map<string, number>()
  for (const date of pinnedDate.values()) {
    occupancy.set(date, (occupancy.get(date) ?? 0) + 1)
  }

  const firstOpenWorkDate = (): string => {
    let index = 1
    for (;;) {
      const date = nthWorkDate(args.startDate, weekdays, index)
      if (!date) return args.startDate
      if ((occupancy.get(date) ?? 0) < perDay) return date
      index += 1
      if (index > 4000) return date
    }
  }

  const workdayIndex = (date: string): number => {
    let index = 1
    for (;;) {
      const cursor = nthWorkDate(args.startDate, weekdays, index)
      if (!cursor || cursor > date) return index
      if (cursor === date) return index
      index += 1
      if (index > 4000) return index
    }
  }

  const entries: SceneScheduleEntry[] = []
  for (const sceneId of args.sceneIds) {
    const pinned = pinnedDate.get(sceneId)
    if (pinned) {
      entries.push({
        sceneId,
        day: workdayIndex(pinned),
        date: pinned,
        pinned: true,
      })
      continue
    }
    const date = firstOpenWorkDate()
    occupancy.set(date, (occupancy.get(date) ?? 0) + 1)
    entries.push({ sceneId, day: workdayIndex(date), date, pinned: false })
  }

  const creditsOf = (sceneId: string) => {
    const credits = args.sceneCredits?.[sceneId]
    return typeof credits === 'number' && Number.isFinite(credits) ? Math.max(0, credits) : 0
  }
  const dates = [...new Set(entries.map((entry) => entry.date).filter((date): date is string => Boolean(date)))]
  dates.sort()
  let running = 0
  const byDate: ScheduleDateTotal[] = dates.map((date) => {
    const sceneIds = entries.filter((entry) => entry.date === date).map((entry) => entry.sceneId)
    const credits = sceneIds.reduce((sum, sceneId) => sum + creditsOf(sceneId), 0)
    running += credits
    return { date, sceneIds, credits, cumulativeCredits: running }
  })

  const dateOf = new Map(entries.map((entry) => [entry.sceneId, entry.date]))
  const chapterEnds: ScheduleChapterEnd[] = []
  for (const chapter of args.chapters ?? []) {
    const chapterDates = chapter.sceneIds
      .map((sceneId) => dateOf.get(sceneId))
      .filter((date): date is string => Boolean(date))
      .sort()
    const date = chapterDates[chapterDates.length - 1]
    if (date) chapterEnds.push({ key: chapter.key, title: chapter.title, date })
  }

  const daysUsed = new Set(entries.map((entry) => entry.date)).size
  const endDate = dates[dates.length - 1] ?? null
  return {
    entries,
    daysUsed,
    extended: false,
    endDate,
    byDate,
    chapterEnds,
    masterEndDate: endDate,
  }
}

export function buildSceneSchedule(args: {
  sceneIds: string[]
  workDays?: number
  scenesPerDay: number
  startDate?: string
  weekdays?: boolean[]
  pinned?: Array<{ sceneId: string; day?: number; date?: string }>
  sceneCredits?: Record<string, number>
  chapters?: Array<{ key: string; title: string; sceneIds: string[] }>
}): SceneScheduleResult {
  if (args.startDate && parseIsoDate(args.startDate)) {
    return datedSchedule({
      sceneIds: args.sceneIds,
      scenesPerDay: args.scenesPerDay,
      startDate: args.startDate,
      weekdays: args.weekdays,
      pinned: args.pinned,
      sceneCredits: args.sceneCredits,
      chapters: args.chapters,
    })
  }

  const perDay = Math.max(1, Math.floor(args.scenesPerDay) || 1)
  const requestedDays = Math.max(1, Math.floor(args.workDays ?? 1) || 1)
  const known = new Set(args.sceneIds)
  const pinned = new Map<string, number>()
  for (const entry of args.pinned ?? []) {
    if (!known.has(entry.sceneId)) continue
    if (entry.day == null || !Number.isFinite(entry.day) || entry.day < 1) continue
    pinned.set(entry.sceneId, Math.floor(entry.day))
  }

  const occupancy = new Map<number, number>()
  for (const day of pinned.values()) {
    occupancy.set(day, (occupancy.get(day) ?? 0) + 1)
  }

  const entries: SceneScheduleEntry[] = []
  for (const sceneId of args.sceneIds) {
    const pinnedDay = pinned.get(sceneId)
    if (pinnedDay != null) {
      entries.push({ sceneId, day: pinnedDay, pinned: true })
      continue
    }
    let day = 1
    while ((occupancy.get(day) ?? 0) >= perDay) day += 1
    occupancy.set(day, (occupancy.get(day) ?? 0) + 1)
    entries.push({ sceneId, day, pinned: false })
  }

  const daysUsed = entries.reduce((max, entry) => Math.max(max, entry.day), 0)
  return {
    entries,
    daysUsed,
    extended: daysUsed > requestedDays,
    endDate: null,
    byDate: [],
    chapterEnds: [],
    masterEndDate: null,
  }
}

export type SchedulePace = 'ahead' | 'on_pace' | 'behind'
export type SpendPace = 'under' | 'on_budget' | 'over'

export interface ProductionScheduleStatus {
  scenesPlanned: number
  scenesFinished: number
  schedulePace: SchedulePace
  plannedCredits: number
  creditsUsed: number
  spendPace: SpendPace
}

/** Compare finished scenes and charged credits with the plan through `today`. */
export function productionScheduleStatus(args: {
  entries: Array<{ sceneId: string; date?: string }>
  byDate: ScheduleDateTotal[]
  finishedSceneIds: string[]
  creditsUsed: number
  today: string
}): ProductionScheduleStatus | null {
  if (!args.entries.some((entry) => entry.date)) return null
  const scheduled = new Set(args.entries.map((entry) => entry.sceneId))
  const scenesPlanned = args.entries.filter((entry) => entry.date && entry.date <= args.today).length
  const scenesFinished = args.finishedSceneIds.filter((sceneId) => scheduled.has(sceneId)).length
  const throughToday = args.byDate.filter((row) => row.date <= args.today)
  const plannedCredits = throughToday.length
    ? throughToday[throughToday.length - 1].cumulativeCredits
    : 0
  const creditsUsed = Math.max(0, Math.round(args.creditsUsed))
  const schedulePace: SchedulePace =
    scenesFinished > scenesPlanned ? 'ahead' : scenesFinished < scenesPlanned ? 'behind' : 'on_pace'
  const spendPace: SpendPace =
    creditsUsed > plannedCredits ? 'over' : creditsUsed < plannedCredits ? 'under' : 'on_budget'
  return {
    scenesPlanned,
    scenesFinished,
    schedulePace,
    plannedCredits,
    creditsUsed,
    spendPace,
  }
}

export interface CreditsBudgetParamsV2 {
  version: 2 | 3
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
  schedule?: ProductionSchedule
}

function parseWeekdays(raw: unknown): boolean[] | undefined {
  if (!Array.isArray(raw) || raw.length !== 7) return undefined
  if (!raw.every((day) => typeof day === 'boolean')) return undefined
  return raw.some(Boolean) ? raw : undefined
}

function parseSchedule(raw: unknown): ProductionSchedule | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const schedule = raw as Record<string, unknown>
  const scenesPerDay = schedule.scenesPerDay
  if (typeof scenesPerDay !== 'number') return undefined
  const workDays = typeof schedule.workDays === 'number' ? schedule.workDays : 0
  const startDate =
    typeof schedule.startDate === 'string' && parseIsoDate(schedule.startDate)
      ? schedule.startDate
      : undefined
  const weekdays = parseWeekdays(schedule.weekdays)
  const entries = Array.isArray(schedule.entries)
    ? schedule.entries.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const row = entry as Record<string, unknown>
        if (typeof row.sceneId !== 'string') return []
        const day = typeof row.day === 'number' ? row.day : 0
        const date =
          typeof row.date === 'string' && parseIsoDate(row.date) ? row.date : undefined
        if (day < 1 && !date) return []
        return [
          {
            sceneId: row.sceneId,
            day,
            ...(date ? { date } : {}),
            pinned: Boolean(row.pinned),
          },
        ]
      })
    : []
  return {
    workDays,
    scenesPerDay,
    ...(startDate ? { startDate } : {}),
    ...(weekdays ? { weekdays } : {}),
    entries,
  }
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
  schedule?: ProductionSchedule
}): CreditsBudgetParamsV2 {
  const qualityTier: SceneFlowQualityTierId | undefined =
    args.videoQuality === 'draft'
      ? 'standard'
      : args.videoQuality === 'final'
        ? 'cinematic'
        : undefined

  return {
    version: 3,
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
    ...(args.schedule ? { schedule: args.schedule } : {}),
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
  const schedule = parseSchedule(o.schedule)
  return {
    version: o.version === 3 ? 3 : 2,
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
    ...(schedule ? { schedule } : {}),
  }
}

export function applyMethodDefaults(method: ProductionMethodId): ProductionMethodDefaults {
  return { ...PRODUCTION_METHODS[method] }
}
