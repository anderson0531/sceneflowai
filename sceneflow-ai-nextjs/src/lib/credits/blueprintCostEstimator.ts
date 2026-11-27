/**
 * Universal Blueprint Room Cost & Margin Estimator
 *
 * Because Blueprint story beats map 1:1 to Production Stage Chapters via
 * `planSceneDecomposition` (`AVG_BEAT_SECONDS = 8`, `TARGET_BEATS_PER_SCENE = 20`),
 * we can deterministically forecast Production credits & USD right inside the
 * Blueprint Room—powering both:
 * 1. Cinematic Creators scoping chapters, visual fidelity, or Animatic-first workflows to a target budget
 * 2. Video Service Providers pricing client quotes, hybrid archival/AI mixes, and net profit margins
 */

import {
  AVG_BEAT_SECONDS,
  extractBlueprintBeats,
  planSceneDecomposition,
} from '@/lib/script/sceneDecomposition'
import {
  AUDIO_CREDITS,
  byokMediaCredits,
  creditsToUsd,
  IMAGE_CREDITS,
  TEXT_CREDITS,
  VIDEO_CREDITS,
} from './creditCosts'
import {
  GEMINI_PRO_STILL_MODEL_ID,
  GEMINI_STILL_MODEL_ID,
  quoteGenerationCredits,
  quoteOperationFromRateCard,
  type RateCardMap,
} from './quoteGenerationCredits'
import {
  buildCreditsBudgetParams,
  estimateVideoClipCredits,
  normalizeVideoParameters,
  SCENEFLOW_ENGINE_ID,
  type SceneFlowQualityTierId,
  type VideoEngineId,
} from './videoEnginePricing'
import {
  calculateClientQuoteMargin,
  type ClientQuoteMarginAnalysis,
} from './projectCalculator'

export type BlueprintProductionMode = 'animatic_only' | 'hybrid' | 'full_ai_video'

export interface BlueprintEstimatorOptions {
  productionMode: BlueprintProductionMode
  engine: VideoEngineId
  qualityTier: SceneFlowQualityTierId
  /** Share of shots rendered as AI video (0..1) when productionMode === 'hybrid' */
  hybridVideoShare: number
  /** Retake factor applied to generated frames & clips (1.0 = zero retakes, 1.2 = 20% buffer) */
  retakeMultiplier: number
  /** Include 16:9 storyboard illustrations per Blueprint beat (for rich client share links) */
  includeBeatStoryboardStills: boolean
  /** Include multi-section / per-beat TTS audio narration on shared Blueprint */
  includeShareAudio: boolean
  /** Producer / Creator uses BYOK credentials (20% platform fee on media) */
  byokExcludeMedia: boolean
  /** Optional Creator target credit budget for live variance tracking */
  targetBudgetCredits?: number
  /** Include per-scene Lyria background music (default true) */
  includeMusic?: boolean
  /** Include per-scene Veo Lite SFX (default true) */
  includeSfx?: boolean
  /** Optional SFX clips per scene when includeSfx is enabled (default 1) */
  sfxPerScene?: number
  /** Optional TTS provider ('gemini' | 'elevenlabs', default 'gemini') */
  ttsProvider?: 'gemini' | 'elevenlabs'
  /** Optional average continuity reference images per clip (auto-derived as 2 when refs exist) */
  avgReferenceImages?: number
  /** Optional live published Admin Rate Card map */
  rateCard?: RateCardMap
}

export interface BlueprintChapterCostBreakdown {
  chapterNumber: number
  title: string
  minutes: number
  deliveryFormat: 'archival_photo' | 'ai_reenactment'
  hasStoryboardStill: boolean
  targetScenes: number
  targetShots: number
  aiVideoShots: number
  archivalShots: number
  keyframeCredits: number
  videoCredits: number
  audioAndScriptCredits: number
  totalChapterCredits: number
  totalChapterUsd: number
}

export interface BlueprintCostEstimateResult {
  options: BlueprintEstimatorOptions
  chapters: BlueprintChapterCostBreakdown[]
  summary: {
    chapterCount: number
    totalMinutes: number
    totalScenes: number
    totalShots: number
    aiVideoShots: number
    archivalShots: number
    derivedHybridShareFromBeats: number
    ungeneratedReferences: {
      cast: number
      locations: number
      props: number
      total: number
    }
    clipLabel: string
    clipCreditsEach: number
  }
  categories: {
    sunkBlueprintCredits: number
    intelligenceAndScriptCredits: number
    continuityReferenceCredits: number
    keyframeStillCredits: number
    videoGenerationCredits: number
    audioAndRenderCredits: number
  }
  totalEstimatedCredits: number
  totalEstimatedUsd: number
  budgetVariance: {
    targetCredits: number
    deltaCredits: number
    withinBudget: boolean
    utilizationPercent: number
  } | null
  creditsBudgetParams: {
    engine: VideoEngineId
    qualityTier?: SceneFlowQualityTierId
    segmentDuration: number
    byokExcludeMedia?: boolean
    productionMode: BlueprintProductionMode
    hybridVideoShare: number
    retakeMultiplier: number
  }
}

export function deriveHybridVideoShareFromBeats(
  treatment: Record<string, unknown> | null | undefined
): { hasArchivalBeats: boolean; share: number } {
  if (!treatment) return { hasArchivalBeats: false, share: 1 }
  const rawBeats = extractBlueprintBeats(treatment) as Array<
    Record<string, unknown>
  >
  if (rawBeats.length === 0) return { hasArchivalBeats: false, share: 1 }

  let totalMins = 0
  let aiMins = 0
  let archivalCount = 0

  for (const beat of rawBeats) {
    const mins =
      typeof beat.minutes === 'number' && beat.minutes > 0 ? beat.minutes : 2
    totalMins += mins
    if (beat.deliveryFormat === 'archival_photo') {
      archivalCount++
    } else {
      aiMins += mins
    }
  }

  if (archivalCount === 0) {
    return { hasArchivalBeats: false, share: 1 }
  }

  const ratio = totalMins > 0 ? aiMins / totalMins : 0.35
  return {
    hasArchivalBeats: true,
    share: Math.min(1, Math.max(0, Number(ratio.toFixed(2)))),
  }
}

function countUngeneratedContinuityReferences(
  treatment: Record<string, unknown> | null | undefined,
  visionPhase?: Record<string, unknown> | null
): { cast: number; locations: number; props: number; total: number } {
  if (!treatment) return { cast: 0, locations: 0, props: 0, total: 0 }

  const visionChars = Array.isArray(visionPhase?.characters)
    ? (visionPhase!.characters as Array<Record<string, unknown>>)
    : []
  const refs = (visionPhase?.references || {}) as Record<string, unknown>
  const visionLocs = [
    ...(Array.isArray(refs.locationReferences)
      ? (refs.locationReferences as Array<Record<string, unknown>>)
      : []),
    ...(Array.isArray(refs.sceneReferences)
      ? (refs.sceneReferences as Array<Record<string, unknown>>)
      : []),
  ]
  const visionProps = Array.isArray(refs.objectReferences)
    ? (refs.objectReferences as Array<Record<string, unknown>>)
    : []

  const hasPortraitByName = (
    list: Array<Record<string, unknown>>,
    name: unknown
  ): boolean => {
    const clean = String(name || '').trim().toLowerCase()
    if (!clean) return false
    return list.some(
      (item) =>
        String(item?.name || '').trim().toLowerCase() === clean &&
        Boolean(item?.referenceImage || item?.imageUrl)
    )
  }

  const castArr = Array.isArray(treatment.character_descriptions)
    ? (treatment.character_descriptions as Array<Record<string, unknown>>)
    : []
  const locArr = Array.isArray(treatment.scene_descriptions)
    ? (treatment.scene_descriptions as Array<Record<string, unknown>>)
    : []
  const propArr = Array.isArray(treatment.prop_descriptions)
    ? (treatment.prop_descriptions as Array<Record<string, unknown>>)
    : []

  const ungenCast = castArr.filter(
    (c) => !c?.referenceImage && !hasPortraitByName(visionChars, c?.name)
  ).length
  const ungenLocs = locArr.filter(
    (l) => !l?.referenceImage && !hasPortraitByName(visionLocs, l?.name)
  ).length
  const ungenProps = propArr.filter(
    (p) => !p?.referenceImage && !hasPortraitByName(visionProps, p?.name)
  ).length

  return {
    cast: ungenCast,
    locations: ungenLocs,
    props: ungenProps,
    total: ungenCast + ungenLocs + ungenProps,
  }
}

export function estimateBlueprintProjectCost(input: {
  treatment: Record<string, unknown> | null | undefined
  visionPhase?: Record<string, unknown> | null
  sunkCreditsUsed?: number
  options?: Partial<BlueprintEstimatorOptions>
  rateCard?: RateCardMap
}): BlueprintCostEstimateResult {
  const treatment = input.treatment || {}
  const rateCard = input.rateCard ?? input.options?.rateCard
  const rawBeats = extractBlueprintBeats(treatment) as Array<
    Record<string, unknown>
  >
  const decomposition = planSceneDecomposition(rawBeats)
  const derivedHybrid = deriveHybridVideoShareFromBeats(treatment)

  const defaultMode: BlueprintProductionMode = derivedHybrid.hasArchivalBeats
    ? 'hybrid'
    : 'full_ai_video'

  const productionMode = input.options?.productionMode ?? defaultMode
  const engine = input.options?.engine ?? SCENEFLOW_ENGINE_ID
  const qualityTier = input.options?.qualityTier ?? 'cinematic'
  const hybridVideoShare =
    productionMode === 'animatic_only'
      ? 0
      : productionMode === 'full_ai_video'
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              input.options?.hybridVideoShare ?? derivedHybrid.share
            )
          )
  const retakeMultiplier = Math.min(
    3,
    Math.max(1, Number(input.options?.retakeMultiplier ?? 1.2))
  )
  const includeBeatStoryboardStills = Boolean(
    input.options?.includeBeatStoryboardStills ?? true
  )
  const includeShareAudio = Boolean(input.options?.includeShareAudio ?? true)
  const includeMusic = input.options?.includeMusic !== false
  const includeSfx = input.options?.includeSfx !== false
  const sfxPerScene = Math.max(0, Number(input.options?.sfxPerScene ?? 1) || 0)
  const ttsProvider = input.options?.ttsProvider ?? 'gemini'
  const byokExcludeMedia = Boolean(input.options?.byokExcludeMedia ?? false)

  const totalMinutes =
    decomposition.entries.reduce((sum, e) => sum + e.minutes, 0) ||
    Math.max(
      1,
      Number(treatment.estimatedDurationMinutes || treatment.durationMinutes || 3)
    )

  const hasContinuityRefs =
    (Array.isArray(treatment.character_descriptions) &&
      treatment.character_descriptions.length > 0) ||
    (Array.isArray(treatment.scene_descriptions) &&
      treatment.scene_descriptions.length > 0) ||
    (Array.isArray(input.visionPhase?.characters) &&
      (input.visionPhase!.characters as unknown[]).length > 0)
  const referenceImageCount =
    input.options?.avgReferenceImages !== undefined
      ? Math.max(0, Math.round(input.options.avgReferenceImages))
      : hasContinuityRefs
        ? 2
        : 0

  const normalizedVideo = normalizeVideoParameters({
    engine,
    qualityTier,
    segmentDuration: AVG_BEAT_SECONDS,
    totalMinutes,
    referenceImageCount,
  })
  const clipEstimate = estimateVideoClipCredits(normalizedVideo, {
    rateCard,
    referenceImageCount,
  })
  const effectiveClipCredits = byokExcludeMedia
    ? byokMediaCredits(clipEstimate.creditsEach)
    : clipEstimate.creditsEach

  const rawFrameUnitCredits = quoteGenerationCredits({
    kind: 'still',
    model: GEMINI_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.FRAME_GENERATION,
  }).credits
  const frameUnitCredits = byokExcludeMedia
    ? byokMediaCredits(rawFrameUnitCredits)
    : rawFrameUnitCredits

  // Role-specific continuity reference costing (cast 45 cr, location 30 cr, prop live Flash Image)
  const rawCastRefCredits = quoteGenerationCredits({
    kind: 'reference',
    model: GEMINI_PRO_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.CHARACTER_IDENTITY_WITH_ENHANCE,
  }).credits
  const rawLocationRefCredits = quoteGenerationCredits({
    kind: 'reference',
    model: GEMINI_PRO_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.SCENE_REFERENCE,
  }).credits
  const rawPropRefCredits = quoteGenerationCredits({
    kind: 'reference',
    model: GEMINI_STILL_MODEL_ID,
    rateCard,
    floorCredits: IMAGE_CREDITS.IMAGEN_4,
  }).credits

  const castRefUnitCredits = byokExcludeMedia
    ? byokMediaCredits(rawCastRefCredits)
    : rawCastRefCredits
  const locationRefUnitCredits = byokExcludeMedia
    ? byokMediaCredits(rawLocationRefCredits)
    : rawLocationRefCredits
  const propRefUnitCredits = byokExcludeMedia
    ? byokMediaCredits(rawPropRefCredits)
    : rawPropRefCredits

  const sunkBlueprintCredits = Math.max(
    0,
    Math.round(Number(input.sunkCreditsUsed) || 0)
  )

  const ungeneratedReferences = countUngeneratedContinuityReferences(
    treatment,
    input.visionPhase
  )
  const continuityReferenceCredits = Math.round(
    (ungeneratedReferences.cast * castRefUnitCredits +
      ungeneratedReferences.locations * locationRefUnitCredits +
      ungeneratedReferences.props * propRefUnitCredits) *
      Math.min(1.25, retakeMultiplier)
  )

  // Live rate-card audio unit quotes
  const ttsUnitCredits = quoteOperationFromRateCard({
    operation: ttsProvider === 'elevenlabs' ? 'elevenlabs_tts' : 'gemini_tts',
    units: 1,
    rateCard,
    floorCredits:
      ttsProvider === 'elevenlabs' ? AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS : 10,
  }).credits
  const musicUnitCredits = includeMusic
    ? quoteOperationFromRateCard({
        operation: 'lyria_music',
        units: 1,
        rateCard,
        floorCredits: AUDIO_CREDITS.MUSIC_TRACK,
      }).credits
    : 0
  const sfxUnitCredits =
    includeSfx && sfxPerScene > 0
      ? quoteOperationFromRateCard({
          operation: 'veo_lite_sfx',
          units: 1,
          rateCard,
          floorCredits: VIDEO_CREDITS.VEO_LITE,
        }).credits
      : 0

  // Chapter-by-Chapter breakdown (1 Blueprint Beat === 1 Production Stage Chapter)
  let unillustratedBeats = 0
  const chapters: BlueprintChapterCostBreakdown[] = decomposition.entries.map(
    (entry, idx) => {
      const rawBeat = rawBeats[idx] || {}
      const deliveryFormat: 'archival_photo' | 'ai_reenactment' =
        rawBeat.deliveryFormat === 'archival_photo'
          ? 'archival_photo'
          : 'ai_reenactment'
      const hasStoryboardStill = Boolean(
        rawBeat.imageUrl || rawBeat.storyboardStillUrl || rawBeat.stillUrl
      )
      if (!hasStoryboardStill) {
        unillustratedBeats++
      }

      const chapterVideoShare =
        productionMode === 'animatic_only'
          ? 0
          : productionMode === 'full_ai_video'
            ? 1
            : input.options?.hybridVideoShare !== undefined
              ? hybridVideoShare
              : deliveryFormat === 'archival_photo'
                ? 0.15
                : 0.85

      const aiVideoShots = Math.round(entry.targetBeats * chapterVideoShare)
      const archivalShots = Math.max(0, entry.targetBeats - aiVideoShots)

      // Every shot needs a start/animatic keyframe unless using uploaded archival photos directly (~50% client photos)
      const generatedKeyframes =
        aiVideoShots + Math.ceil(archivalShots * 0.5)
      const keyframeCredits = Math.round(
        generatedKeyframes * frameUnitCredits * retakeMultiplier
      )
      const videoCredits = Math.round(
        aiVideoShots * effectiveClipCredits * retakeMultiplier
      )

      // Script generation (~15 cr/chapter) + realistic per-scene audio (TTS + Lyria music + Veo Lite SFX) + MP4 render (~15 cr/min)
      const scriptCredits = TEXT_CREDITS.GEMINI_PRO || 10
      const chapterTtsMinutes = Math.max(1, Math.ceil(entry.minutes))
      const chapterTtsCredits = chapterTtsMinutes * ttsUnitCredits
      const chapterMusicCredits = entry.targetScenes * musicUnitCredits
      const chapterSfxCredits = Math.round(
        entry.targetScenes * sfxPerScene * sfxUnitCredits
      )
      const sceneAudioCredits =
        chapterTtsCredits + chapterMusicCredits + chapterSfxCredits
      const renderCredits = Math.ceil(entry.minutes * 15)
      const audioAndScriptCredits =
        scriptCredits + sceneAudioCredits + renderCredits

      const totalChapterCredits =
        keyframeCredits + videoCredits + audioAndScriptCredits

      return {
        chapterNumber: idx + 1,
        title: entry.title,
        minutes: entry.minutes,
        deliveryFormat,
        hasStoryboardStill,
        targetScenes: entry.targetScenes,
        targetShots: entry.targetBeats,
        aiVideoShots,
        archivalShots,
        keyframeCredits,
        videoCredits,
        audioAndScriptCredits,
        totalChapterCredits,
        totalChapterUsd: Number(creditsToUsd(totalChapterCredits).toFixed(2)),
      }
    }
  )

  const storyboardBeatStillCredits = includeBeatStoryboardStills
    ? unillustratedBeats * frameUnitCredits
    : 0
  const shareAudioCredits = includeShareAudio
    ? Math.max(4, chapters.length * 2)
    : 0
  const arCredits = 15 // Audience Resonance analysis + polish

  const chapterScriptCredits = chapters.length * (TEXT_CREDITS.GEMINI_PRO || 10)
  const intelligenceAndScriptCredits =
    arCredits +
    storyboardBeatStillCredits +
    shareAudioCredits +
    chapterScriptCredits

  const keyframeStillCredits = chapters.reduce(
    (sum, c) => sum + c.keyframeCredits,
    0
  )
  const videoGenerationCredits = chapters.reduce(
    (sum, c) => sum + c.videoCredits,
    0
  )
  const audioAndRenderCredits = chapters.reduce(
    (sum, c) => sum + (c.audioAndScriptCredits - (TEXT_CREDITS.GEMINI_PRO || 10)),
    0
  )

  const totalEstimatedCredits =
    sunkBlueprintCredits +
    intelligenceAndScriptCredits +
    continuityReferenceCredits +
    keyframeStillCredits +
    videoGenerationCredits +
    audioAndRenderCredits

  const totalEstimatedUsd = Number(
    creditsToUsd(totalEstimatedCredits).toFixed(2)
  )

  const totalScenes = chapters.reduce((s, c) => s + c.targetScenes, 0)
  const totalShots = chapters.reduce((s, c) => s + c.targetShots, 0)
  const aiVideoShots = chapters.reduce((s, c) => s + c.aiVideoShots, 0)
  const archivalShots = chapters.reduce((s, c) => s + c.archivalShots, 0)

  const rawTarget = Number(input.options?.targetBudgetCredits)
  const budgetVariance =
    Number.isFinite(rawTarget) && rawTarget > 0
      ? {
          targetCredits: Math.round(rawTarget),
          deltaCredits: Math.round(rawTarget) - totalEstimatedCredits,
          withinBudget: totalEstimatedCredits <= Math.round(rawTarget),
          utilizationPercent: Math.round(
            (totalEstimatedCredits / Math.round(rawTarget)) * 100
          ),
        }
      : null

  const resolvedOptions: BlueprintEstimatorOptions = {
    productionMode,
    engine,
    qualityTier,
    hybridVideoShare,
    retakeMultiplier,
    includeBeatStoryboardStills,
    includeShareAudio,
    byokExcludeMedia,
    ...(Number.isFinite(rawTarget) && rawTarget > 0
      ? { targetBudgetCredits: Math.round(rawTarget) }
      : {}),
  }

  return {
    options: resolvedOptions,
    chapters,
    summary: {
      chapterCount: chapters.length,
      totalMinutes: Number(totalMinutes.toFixed(1)),
      totalScenes,
      totalShots,
      aiVideoShots,
      archivalShots,
      derivedHybridShareFromBeats: derivedHybrid.share,
      ungeneratedReferences,
      clipLabel: clipEstimate.label,
      clipCreditsEach: effectiveClipCredits,
    },
    categories: {
      sunkBlueprintCredits,
      intelligenceAndScriptCredits,
      continuityReferenceCredits,
      keyframeStillCredits,
      videoGenerationCredits,
      audioAndRenderCredits,
    },
    totalEstimatedCredits,
    totalEstimatedUsd,
    budgetVariance,
    creditsBudgetParams: {
      ...buildCreditsBudgetParams(normalizedVideo, { byokExcludeMedia }),
      productionMode,
      hybridVideoShare,
      retakeMultiplier,
    },
  }
}

export function estimateBlueprintMarginSummary(input: {
  estimate: BlueprintCostEstimateResult
  clientPriceUsd: number
  includedRevisionRounds?: number
  rateCard?: RateCardMap
}): ClientQuoteMarginAnalysis {
  return calculateClientQuoteMargin({
    baseProjectCredits: input.estimate.totalEstimatedCredits,
    clientPriceUsd: input.clientPriceUsd,
    includedRevisionRounds: input.includedRevisionRounds ?? 2,
  })
}
