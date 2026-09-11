/**
 * Music cue clips for the production Screening Room timeline.
 *
 * The animatic player schedules cues against beat visual frames. The
 * production player's visual row is production segments instead, so a cue's
 * beat range has to be resolved through the segments that carry those beats.
 * Segments are matched on `beatId` rather than position so the mapping still
 * holds after beats are reordered.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  isMusicCueScored,
  parsePersistedMusicCues,
} from '@/lib/script/sceneMusicCues'
import {
  DEFAULT_MUSIC_FILE_DURATION_SEC,
  isCuedBeatMusicEnabled,
} from '@/lib/storyboard/musicPlayback'
import type { SceneMusicCue } from '@/lib/script/segmentTypes'

/** The subset of a production segment this mapping needs. */
export interface MusicCueSegment {
  beatId?: string
  sequenceIndex?: number
  startTime?: number
  endTime?: number
  duration?: number
}

export interface ProductionMusicCueClip {
  id: string
  url: string
  startTime: number
  duration: number
  label: string
  loop: boolean
  /** Real length of the generated file, for loop math downstream. */
  actualDuration: number
}

function segmentStart(segment: MusicCueSegment): number {
  return typeof segment.startTime === 'number' && Number.isFinite(segment.startTime)
    ? segment.startTime
    : 0
}

function segmentEnd(segment: MusicCueSegment): number {
  const start = segmentStart(segment)
  if (typeof segment.endTime === 'number' && Number.isFinite(segment.endTime)) {
    if (segment.endTime > start) return segment.endTime
  }
  const duration =
    typeof segment.duration === 'number' && Number.isFinite(segment.duration)
      ? segment.duration
      : 0
  return start + Math.max(0, duration)
}

function cueFileDuration(cue: SceneMusicCue): number {
  if (cue.fileDuration && cue.fileDuration > 0) return cue.fileDuration
  return DEFAULT_MUSIC_FILE_DURATION_SEC
}

/**
 * One clip per scored cue, spanning the segments whose beats the cue covers.
 *
 * Returns an empty list when the scene has no scored cues, which is the signal
 * to fall back to the legacy scene-wide `musicAudio` track.
 */
export function buildProductionMusicCueClips(
  scene: Record<string, unknown> | null | undefined,
  segments: MusicCueSegment[] | null | undefined
): ProductionMusicCueClip[] {
  if (!scene || !segments?.length) return []

  const beats = getSceneBeats(scene)
  if (beats.length === 0) return []

  const cues = parsePersistedMusicCues(
    (scene as Record<string, unknown>).sceneMusicCues,
    beats
  ).filter(isMusicCueScored)
  if (cues.length === 0) return []

  const beatIndexById = new Map(beats.map((beat, index) => [beat.beatId, index]))
  const beatById = new Map(beats.map((beat) => [beat.beatId, beat]))

  const clips: ProductionMusicCueClip[] = []

  for (const cue of cues) {
    const covered = segments.filter((segment) => {
      if (!segment.beatId) return false
      const index = beatIndexById.get(segment.beatId)
      if (index === undefined || index < cue.beatStart || index > cue.beatEnd) return false
      return isCuedBeatMusicEnabled(beatById.get(segment.beatId))
    })
    if (covered.length === 0) continue

    const startTime = Math.min(...covered.map(segmentStart))
    const duration = Math.max(...covered.map(segmentEnd)) - startTime
    if (!(duration > 0)) continue

    const fileDuration = cueFileDuration(cue)
    clips.push({
      id: `music-${cue.cueId}`,
      url: (cue.url as string).trim(),
      startTime,
      duration,
      label: cue.intent?.trim() || 'Background Music',
      loop: duration > fileDuration,
      actualDuration: fileDuration,
    })
  }

  return clips.sort((a, b) => a.startTime - b.startTime)
}
