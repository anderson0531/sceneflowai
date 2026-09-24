import {
  isVideoLikeUrl,
  resolveLiveTake,
  segmentHasPlayableVideo,
  type TakeRow,
} from '@/lib/storyboard/mediaVersions'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export interface PromoBeatMedia {
  videoUrl?: string
  thumbnailUrl?: string
  segmentId?: string
  hasClip: boolean
}

interface PromoBeatSegment {
  segmentId?: string
  beatId?: string
  activeAssetUrl?: string | null
  assetType?: string | null
  status?: string
  currentTakeId?: string
  startFrameUrl?: string | null
  visualFrame?: string
  references?: { startFrameUrl?: string | null }
  takes?: TakeRow[]
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
