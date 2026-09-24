import type { SceneSegment } from '@/components/vision/scene-production/types'

/** Included when undefined or true; excluded only when explicitly false. */
export function isMixerBeatIncluded(
  segment: Pick<SceneSegment, 'mixerBeatIncluded'>
): boolean {
  return segment.mixerBeatIncluded !== false
}

/**
 * Direction Include is the source of truth. A stored `mixerBeatIncluded: false`
 * left over from an earlier exclude must not hide the beat in the Mixer.
 */
export function restoreIncludedMixerBeats<T extends Pick<SceneSegment, 'beatId' | 'mixerBeatIncluded'>>(
  segments: T[],
  includedBeatIds: Iterable<string>
): { segments: T[]; changed: boolean } {
  const included = new Set(includedBeatIds)
  let changed = false
  const next = segments.map((segment) => {
    if (!segment.beatId || !included.has(segment.beatId)) return segment
    if (segment.mixerBeatIncluded !== false) return segment
    changed = true
    return { ...segment, mixerBeatIncluded: true }
  })
  return { segments: changed ? next : segments, changed }
}

export function filterMixerIncludedSegments<T extends Pick<SceneSegment, 'mixerBeatIncluded'>>(
  segments: T[]
): T[] {
  return segments.filter(isMixerBeatIncluded)
}

const BEAT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v']

/** True when the beat's active asset is a video file, including uploads without assetType. */
export function isMixerVideoAsset(
  segment: Pick<SceneSegment, 'assetType' | 'activeAssetUrl'>
): boolean {
  if (segment.assetType === 'video') return true
  const url = segment.activeAssetUrl?.toLowerCase() ?? ''
  if (!url) return false
  if (BEAT_VIDEO_EXTENSIONS.some((ext) => url.includes(ext))) return true
  if (url.includes('video/') || url.includes('/videos/')) return true
  return false
}

/** Included beats that already have a completed video, in mixer order. */
export function listIncludedBeatVideos(segments: SceneSegment[] | null | undefined): SceneSegment[] {
  const complete = (segments ?? []).filter(
    (segment) => segment.status === 'COMPLETE' && !!segment.activeAssetUrl
  )
  return filterMixerIncludedSegments(complete.filter(isMixerVideoAsset))
}
