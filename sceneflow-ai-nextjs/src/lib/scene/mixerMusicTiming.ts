import type { AudioTrackConfig } from '@/components/vision/scene-production/types'
import type { SceneSegment } from '@/components/vision/scene-production/types'

/** Wall-clock span for music over selected beat range. */
export function getMusicTrackTiming(
  musicConfig: AudioTrackConfig,
  segments: SceneSegment[],
  getPlaybackSegmentDuration: (segment: SceneSegment) => number
): { startTime: number; duration: number; endTime: number } {
  if (segments.length === 0) {
    return { startTime: musicConfig.startOffset, duration: 0, endTime: musicConfig.startOffset }
  }
  let startTime = 0
  for (let i = 0; i < musicConfig.startSegment && i < segments.length; i++) {
    startTime += getPlaybackSegmentDuration(segments[i])
  }
  const effectiveEnd =
    musicConfig.endSegment === -1
      ? segments.length - 1
      : Math.min(musicConfig.endSegment, segments.length - 1)
  let endTime = startTime
  for (let i = musicConfig.startSegment; i <= effectiveEnd; i++) {
    endTime += getPlaybackSegmentDuration(segments[i])
  }
  const duration = Math.max(0, endTime - startTime)
  return { startTime, duration, endTime }
}

/** True when preview timeline is inside the music beat window (inclusive start, exclusive end). */
export function isMusicActiveInBeatWindow(
  currentTime: number,
  musicStartTime: number,
  musicEndTime: number,
  isPlaying: boolean
): boolean {
  return isPlaying && currentTime >= musicStartTime && currentTime < musicEndTime
}
