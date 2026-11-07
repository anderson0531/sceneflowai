import type { LanguageClipVersions } from '@/components/vision/scene-production/types'
import {
  resolveLanguageClipPlayback,
  isLanguageClipTarget,
  mergeLanguageClipVersions,
} from '@/lib/scene/languageClipVersions'
import {
  isVideoLikeUrl,
  resolveLiveTake,
  segmentHasPlayableVideo,
  type TakeRow,
} from '@/lib/storyboard/mediaVersions'
import { segmentWasPolicyBlocked } from '@/lib/vision/directShotTarget'
import { promoShotLocalizes } from '@/lib/publish/promoLanguage'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export interface PromoBeatMedia {
  videoUrl?: string
  thumbnailUrl?: string
  segmentId?: string
  hasClip: boolean
  /** Last generate of this shot failed on content policy. */
  policyBlocked?: boolean
}

interface PromoBeatSegment {
  segmentId?: string
  beatId?: string
  activeAssetUrl?: string | null
  assetType?: string | null
  status?: string
  errorMessage?: string | null
  lastContentPolicyFailure?: unknown
  currentTakeId?: string
  startFrameUrl?: string | null
  visualFrame?: string
  references?: { startFrameUrl?: string | null }
  takes?: TakeRow[]
  languageVersions?: LanguageClipVersions
}

export interface PromoBeatPlayback extends PromoBeatMedia {
  hasMasterClip: boolean
  hasLanguageClip: boolean
}

function productionForBeat(
  beat: PromoTrailerBeatPlan,
  sceneProductionState: Record<string, unknown> | undefined
): { segments?: PromoBeatSegment[] } | undefined {
  if (!sceneProductionState) return undefined
  const byId = sceneProductionState[beat.sceneId]
  if (byId && typeof byId === 'object') return byId as { segments?: PromoBeatSegment[] }
  const byIndex = sceneProductionState[`scene-${beat.sceneIndex}`]
  if (byIndex && typeof byIndex === 'object') {
    return byIndex as { segments?: PromoBeatSegment[] }
  }
  return undefined
}

function stillUrl(beat: PromoTrailerBeatPlan, segment?: PromoBeatSegment): string | undefined {
  const candidates = [
    beat.frameUrl,
    segment?.startFrameUrl,
    segment?.references?.startFrameUrl,
    segment?.visualFrame,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function matchingSegment(segments: PromoBeatSegment[] | undefined, beatId: string): PromoBeatSegment | undefined {
  if (!Array.isArray(segments)) return undefined
  const matches = segments.filter((segment) => segment.beatId === beatId)
  return matches.find((segment) => segmentHasPlayableVideo(segment)) ?? matches[0]
}

function findPromoFallbackSegment(
  beat: PromoTrailerBeatPlan,
  sceneProductionState: Record<string, unknown> | undefined,
  excludeSegment?: PromoBeatSegment
): PromoBeatSegment | undefined {
  if (!sceneProductionState || !beat.beatId) return undefined
  const sharedPrefix = `bt_promo_${beat.sceneIndex}_${beat.beatId}_`
  for (const value of Object.values(sceneProductionState)) {
    if (!value || typeof value !== 'object') continue
    const segments = (value as { segments?: PromoBeatSegment[] }).segments
    if (!Array.isArray(segments)) continue
    const match = segments.find(
      (seg) =>
        seg !== excludeSegment &&
        (seg.beatId === beat.beatId ||
          (typeof seg.beatId === 'string' && seg.beatId.startsWith(sharedPrefix)))
    )
    if (match) return match
  }
  return undefined
}

/** Prefer the live production clip over a URL frozen into the plan. */
export function promoPlanWithLiveMedia(
  plan: PromoTrailerBeatPlan[],
  sceneProductionState?: Record<string, unknown>
): PromoTrailerBeatPlan[] {
  return plan.map((beat) => {
    const media = resolvePromoBeatMedia(beat, sceneProductionState)
    return {
      ...beat,
      videoUrl: media.hasClip ? media.videoUrl : undefined,
      frameUrl: beat.frameUrl || media.thumbnailUrl,
    }
  })
}

/**
 * Live production wins over a snapshotted plan videoUrl.
 * A stored segment with no playable take means the beat is missing, even if the plan still says clip.
 */
export function resolvePromoBeatMedia(
  beat: PromoTrailerBeatPlan,
  sceneProductionState?: Record<string, unknown>
): PromoBeatMedia {
  const segment = matchingSegment(
    productionForBeat(beat, sceneProductionState)?.segments,
    beat.beatId
  )

  if (segment) {
    const live = segmentHasPlayableVideo(segment)
      ? resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)
      : undefined
    const videoUrl = live?.url
    return {
      segmentId: segment.segmentId,
      hasClip: Boolean(videoUrl),
      videoUrl,
      thumbnailUrl: live?.thumbnailUrl || (!videoUrl ? stillUrl(beat, segment) : undefined),
      ...(!videoUrl && segmentWasPolicyBlocked(segment) ? { policyBlocked: true } : {}),
    }
  }

  const snapshot = typeof beat.videoUrl === 'string' ? beat.videoUrl.trim() : ''
  const hasClip = isVideoLikeUrl(snapshot)
  return {
    hasClip,
    videoUrl: hasClip ? snapshot : undefined,
    thumbnailUrl: hasClip ? undefined : stillUrl(beat),
  }
}

function languageClipUrl(segment: PromoBeatSegment | undefined, language: string): string | undefined {
  if (!segment || !isLanguageClipTarget(language)) return undefined
  const playback = resolveLanguageClipPlayback(segment, language)
  if (playback.usingMaster || !playback.url) return undefined
  return playback.url
}

/**
 * Picture for the active promo language.
 * Dialogue, titles, and credits play that language's clip, or a still until it exists.
 * Action shots with no on-screen text keep the source clip.
 */
export function resolvePromoPlayback(
  beat: PromoTrailerBeatPlan,
  sceneProductionState: Record<string, unknown> | undefined,
  language?: string
): PromoBeatPlayback {
  const master = resolvePromoBeatMedia(beat, sceneProductionState)
  const primarySegment = matchingSegment(
    productionForBeat(beat, sceneProductionState)?.segments,
    beat.beatId
  )
  const fallbackSegment = findPromoFallbackSegment(beat, sceneProductionState, primarySegment)
  const segment =
    primarySegment && fallbackSegment
      ? {
          ...primarySegment,
          languageVersions: mergeLanguageClipVersions(
            primarySegment.languageVersions,
            fallbackSegment.languageVersions
          ),
        }
      : primarySegment || fallbackSegment
  const localized = languageClipUrl(segment, language || 'en')
  const needsLanguageClip = promoShotLocalizes(beat) !== null && isLanguageClipTarget(language)
  if (needsLanguageClip) {
    return {
      segmentId: master.segmentId,
      hasMasterClip: master.hasClip,
      hasLanguageClip: Boolean(localized),
      hasClip: Boolean(localized),
      videoUrl: localized,
      thumbnailUrl: master.thumbnailUrl || stillUrl(beat, segment),
      ...(master.policyBlocked ? { policyBlocked: true } : {}),
    }
  }
  return {
    ...master,
    hasMasterClip: master.hasClip,
    hasLanguageClip: false,
  }
}

/** Live media for one language, written back onto the plan for preview and render. */
export function promoPlanForLanguage(
  plan: PromoTrailerBeatPlan[],
  sceneProductionState: Record<string, unknown> | undefined,
  language?: string
): PromoTrailerBeatPlan[] {
  return plan.map((beat) => {
    const playback = resolvePromoPlayback(beat, sceneProductionState, language)
    return {
      ...beat,
      videoUrl: playback.videoUrl,
      frameUrl: beat.frameUrl || playback.thumbnailUrl,
    }
  })
}
