/**
 * 3-Fidelity Longform Video Production Planner ("Animatic-First -> Hybrid Indie -> Cinema")
 *
 * Solves longform video cost accessibility: rendering 60 minutes (3,600s) of full-motion
 * premium video costs $360–$1,440/hour. By classifying each segment's Motion Complexity
 * Score (`hero_action` vs `dialogue_closeup` vs `establishing_atmospheric`), SceneFlow
 * enables creators to validate an entire feature as an Animatic ($3–$10/hr) or render a
 * Hybrid Indie Cut ($30–$90/hr) that saves 70–85% while keeping premium video on hero beats.
 */

export type ProductionFidelityTier = 'animatic_first' | 'hybrid_indie' | 'cinema_cut'

export type SegmentMotionClass =
  | 'hero_action'
  | 'dialogue_closeup'
  | 'establishing_atmospheric'

export interface SegmentForFidelityPlanning {
  id: string
  durationSec: number
  actionText?: string
  dialogueText?: string
  shotType?: string
  cameraMovement?: string
}

export interface PlannedSegmentRoute {
  segmentId: string
  durationSec: number
  motionClass: SegmentMotionClass
  engine: 'animated_still' | 'lite_video' | 'omni_standard' | 'veo_premium'
  estimatedCostUsd: number
}

export interface FidelityTierPlan {
  tier: ProductionFidelityTier
  label: string
  totalDurationSec: number
  totalCostUsd: number
  savingsVsCinemaPercent: number
  breakdown: {
    animatedStillSec: number
    liteVideoSec: number
    omniStandardSec: number
    veoPremiumSec: number
  }
  segments: PlannedSegmentRoute[]
}

const ENGINE_RATES_USD = {
  /** Keyframe still (~$0.025) + procedural Ken Burns / parallax motion */
  animated_still_per_segment: 0.025,
  /** Low-cost lite / lip-sync video per second */
  lite_video_per_sec: 0.03,
  /** Standard Omni / Fast video per second */
  omni_standard_per_sec: 0.10,
  /** Premium Veo / Kling cinema video per second */
  veo_premium_per_sec: 0.25,
} as const

const HERO_ACTION_REGEX =
  /\b(chase|fight|explosion|crash|leap|sprint|combat|battle|stunt|storm|collapse|shoot|duel|dance|tracking shot|whip pan|crane|drone)\b/i

const ESTABLISHING_REGEX =
  /\b(establishing|wide shot|aerial|exterior|landscape|skyline|sunrise|sunset|montage|room tone|static wide|pan across)\b/i

/**
 * Classify a segment's motion complexity to route expensive video tokens only where motion matters.
 */
export function classifySegmentMotion(seg: SegmentForFidelityPlanning): SegmentMotionClass {
  const combined = `${seg.actionText || ''} ${seg.shotType || ''} ${seg.cameraMovement || ''}`
  if (HERO_ACTION_REGEX.test(combined)) return 'hero_action'
  if (
    ESTABLISHING_REGEX.test(combined) &&
    (!seg.dialogueText || seg.dialogueText.trim().length < 20)
  ) {
    return 'establishing_atmospheric'
  }
  if (seg.dialogueText && seg.dialogueText.trim().length > 0) {
    return 'dialogue_closeup'
  }
  return 'establishing_atmospheric'
}

function planSingleTier(
  segments: SegmentForFidelityPlanning[],
  tier: ProductionFidelityTier
): Omit<FidelityTierPlan, 'savingsVsCinemaPercent'> {
  let totalDurationSec = 0
  let totalCostUsd = 0
  let animatedStillSec = 0
  let liteVideoSec = 0
  let omniStandardSec = 0
  let veoPremiumSec = 0

  const planned: PlannedSegmentRoute[] = segments.map((seg) => {
    const duration = Math.max(1, Number(seg.durationSec) || 6)
    totalDurationSec += duration
    const motionClass = classifySegmentMotion(seg)

    let engine: PlannedSegmentRoute['engine']
    if (tier === 'animatic_first') {
      engine = 'animated_still'
    } else if (tier === 'cinema_cut') {
      engine = motionClass === 'hero_action' ? 'veo_premium' : 'omni_standard'
    } else {
      // hybrid_indie: reserve Omni/Veo for hero action, Lite for dialogue, Animated Still for atmospheric establishing
      if (motionClass === 'hero_action') {
        engine = 'omni_standard'
      } else if (motionClass === 'dialogue_closeup') {
        engine = 'lite_video'
      } else {
        engine = 'animated_still'
      }
    }

    let cost = 0
    if (engine === 'animated_still') {
      cost = ENGINE_RATES_USD.animated_still_per_segment
      animatedStillSec += duration
    } else if (engine === 'lite_video') {
      cost = duration * ENGINE_RATES_USD.lite_video_per_sec
      liteVideoSec += duration
    } else if (engine === 'omni_standard') {
      cost = duration * ENGINE_RATES_USD.omni_standard_per_sec
      omniStandardSec += duration
    } else {
      cost = duration * ENGINE_RATES_USD.veo_premium_per_sec
      veoPremiumSec += duration
    }

    totalCostUsd += cost
    return {
      segmentId: seg.id,
      durationSec: duration,
      motionClass,
      engine,
      estimatedCostUsd: Number(cost.toFixed(4)),
    }
  })

  const labels: Record<ProductionFidelityTier, string> = {
    animatic_first: 'Studio Animatic (Keyframes + Motion + Audio)',
    hybrid_indie: 'Hybrid Indie Cut (Hero Video + Lite Dialogue + Animated Stills)',
    cinema_cut: 'Full Cinema Cut (All-Video Omni/Veo)',
  }

  return {
    tier,
    label: labels[tier],
    totalDurationSec,
    totalCostUsd: Number(totalCostUsd.toFixed(2)),
    breakdown: {
      animatedStillSec,
      liteVideoSec,
      omniStandardSec,
      veoPremiumSec,
    },
    segments: planned,
  }
}

/**
 * Compare all 3 production fidelity tiers for a storyboard / feature segment list.
 */
export function compareProductionFidelityTiers(
  segments: SegmentForFidelityPlanning[]
): Record<ProductionFidelityTier, FidelityTierPlan> {
  const cinema = planSingleTier(segments, 'cinema_cut')
  const hybrid = planSingleTier(segments, 'hybrid_indie')
  const animatic = planSingleTier(segments, 'animatic_first')

  const savings = (cost: number) =>
    cinema.totalCostUsd > 0
      ? Math.max(0, Math.round(((cinema.totalCostUsd - cost) / cinema.totalCostUsd) * 100))
      : 0

  return {
    animatic_first: { ...animatic, savingsVsCinemaPercent: savings(animatic.totalCostUsd) },
    hybrid_indie: { ...hybrid, savingsVsCinemaPercent: savings(hybrid.totalCostUsd) },
    cinema_cut: { ...cinema, savingsVsCinemaPercent: 0 },
  }
}
