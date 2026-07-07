import type { SceneSegment } from '@/components/vision/scene-production/types'

/** Included when undefined or true; excluded only when explicitly false. */
export function isMixerBeatIncluded(
  segment: Pick<SceneSegment, 'mixerBeatIncluded'>
): boolean {
  return segment.mixerBeatIncluded !== false
}

export function filterMixerIncludedSegments<T extends Pick<SceneSegment, 'mixerBeatIncluded'>>(
  segments: T[]
): T[] {
  return segments.filter(isMixerBeatIncluded)
}
