/**
 * Music cue clips for the production Screening Room timeline.
 *
 * The animatic player schedules cues against shot visual frames. The
 * production player's visual row is production segments instead, so a cue's
 * shot range has to be resolved through the segments that carry those shots.
 * Segments are matched on `beatId` rather than position so the mapping still
 * holds after shots are reordered. Each covered shot is its own clip.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  isMusicCueScored,
  parsePersistedMusicCues,
} from '@/lib/script/sceneMusicCues'
import { musicCueMixFields, resolveMusicCueFadeSec } from '@/lib/audio/loopingAudioSync'
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
  /** Offset into the file so the next shot continues the same cue. */
  trimStart?: number
  /** Shot this slice scores. Absent on the legacy single-bed clip. */
  beatId?: string
  /** Cue mix 0–1. Absent means unity. */
  volume?: number
  fadeInSec?: number
  fadeOutSec?: number
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
 * Portion of the cue fade that overlaps one shot. A muted shot in the middle
 * stays silent; the fade still belongs to the cue's audible edges.
 */
function cueEdgeFades(
  clipStart: number,
  clipDuration: number,
  spanStart: number,
  spanEnd: number,
  fadeInSec: number,
  fadeOutSec: number
): { fadeInSec?: number; fadeOutSec?: number } {
  let fadeIn = 0
  let fadeOut = 0
  const clipEnd = clipStart + clipDuration
  if (fadeInSec > 0 && clipStart < spanStart + fadeInSec && clipEnd > spanStart) {
    const remaining = fadeInSec - Math.max(0, clipStart - spanStart)
    if (remaining > 0) fadeIn = Math.min(remaining, clipDuration)
  }
  if (fadeOutSec > 0 && clipEnd > spanEnd - fadeOutSec && clipStart < spanEnd) {
    const overlap = Math.min(clipEnd, spanEnd) - Math.max(clipStart, spanEnd - fadeOutSec)
    if (overlap > 0) fadeOut = Math.min(overlap, clipDuration)
  }
  return {
    ...(fadeIn > 0 ? { fadeInSec: fadeIn } : {}),
    ...(fadeOut > 0 ? { fadeOutSec: fadeOut } : {}),
  }
}

/**
 * One clip per shot a scored cue covers.
 *
 * A muted shot is omitted, so the score is silent there instead of playing
 * through the gap. `trimStart` keeps the file continuous across the cue.
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
    const inRange = segments.filter((segment) => {
      if (!segment.beatId) return false
      const index = beatIndexById.get(segment.beatId)
      return index !== undefined && index >= cue.beatStart && index <= cue.beatEnd
    })
    if (inRange.length === 0) continue

    const cueOrigin = Math.min(...inRange.map(segmentStart))
    const enabled = inRange.filter((segment) =>
      isCuedBeatMusicEnabled(beatById.get(segment.beatId))
    )
    const fileDuration = cueFileDuration(cue)
    const url = (cue.url as string).trim()
    const label = cue.intent?.trim() || 'Background Music'
    const volumeFields = musicCueMixFields({ volume: cue.volume })
    const fadeInSec = resolveMusicCueFadeSec(cue.fadeInSec)
    const fadeOutSec = resolveMusicCueFadeSec(cue.fadeOutSec)

    const shotClips: ProductionMusicCueClip[] = []
    for (const segment of enabled) {
      const startTime = segmentStart(segment)
      const duration = segmentEnd(segment) - startTime
      if (!(duration > 0) || !segment.beatId) continue
      const trimStart = Math.max(0, startTime - cueOrigin)
      shotClips.push({
        id: `music-${cue.cueId}-${segment.beatId}`,
        beatId: segment.beatId,
        url,
        startTime,
        duration,
        trimStart,
        label,
        loop: trimStart + duration > fileDuration,
        actualDuration: fileDuration,
        ...volumeFields,
      })
    }
    if (shotClips.length === 0) continue

    const spanStart = Math.min(...shotClips.map((clip) => clip.startTime))
    const spanEnd = Math.max(...shotClips.map((clip) => clip.startTime + clip.duration))
    for (const clip of shotClips) {
      clips.push({
        ...clip,
        ...cueEdgeFades(clip.startTime, clip.duration, spanStart, spanEnd, fadeInSec, fadeOutSec),
      })
    }
  }

  return clips.sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))
}
