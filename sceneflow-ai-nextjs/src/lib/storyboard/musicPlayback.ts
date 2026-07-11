/**
 * Beat-aligned background music scheduling for storyboard gallery playback.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

export const DEFAULT_MUSIC_FILE_DURATION_SEC = 30

export interface BeatAlignedMusicClip {
  id: string
  url: string
  startTime: number
  duration: number
  trimStart?: number
  /** Scene timeline time when intro fade begins (earliest music-enabled beat). */
  fadeAnchorTime?: number
  trackType: 'music'
  label?: string
  loop?: boolean
}

export interface BuildBeatAlignedMusicClipsOptions {
  musicUrl: string
  sceneDuration: number
  /** Known music file length — used to wrap scene timeline offsets. Defaults to 30s. */
  musicFileDuration?: number
}

/** Default off — only explicit true enables music for a beat. */
export function isBeatMusicEnabled(beat: SceneBeat | undefined): boolean {
  return beat?.musicEnabled === true
}

/** Wrap a scene timeline offset into the music file duration. */
export function resolveMusicTrimStart(
  sceneTimelineOffset: number,
  musicFileDuration: number = DEFAULT_MUSIC_FILE_DURATION_SEC
): number {
  if (musicFileDuration <= 0) return Math.max(0, sceneTimelineOffset)
  return sceneTimelineOffset % musicFileDuration
}

function resolveSceneMusicUrl(scene: Record<string, unknown>): string | undefined {
  const url =
    (typeof scene.musicAudio === 'string' && scene.musicAudio.trim()) ||
    (scene.music as { url?: string } | undefined)?.url?.trim()
  return url || undefined
}

const CONTIGUOUS_FRAME_TOLERANCE_SEC = 0.05

/** Group music-enabled frames into contiguous timeline runs (gaps = disabled beats). */
export function groupContiguousMusicFrames(
  frames: StoryboardVisualFrame[]
): StoryboardVisualFrame[][] {
  if (frames.length === 0) return []

  const sorted = [...frames].sort((a, b) => a.startTime - b.startTime)
  const groups: StoryboardVisualFrame[][] = []
  let current = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]
    const next = sorted[i]
    const prevEnd = prev.startTime + prev.duration
    if (next.startTime <= prevEnd + CONTIGUOUS_FRAME_TOLERANCE_SEC) {
      current.push(next)
    } else {
      groups.push(current)
      current = [next]
    }
  }
  groups.push(current)
  return groups
}

/**
 * Schedule background music aligned to beat visual frames when the scene has beats.
 * Legacy scenes without beats use one full-scene looping clip.
 */
export function buildBeatAlignedMusicClips(
  scene: Record<string, unknown>,
  visualFrames: StoryboardVisualFrame[],
  options: BuildBeatAlignedMusicClipsOptions
): BeatAlignedMusicClip[] {
  const { musicUrl, sceneDuration } = options
  const musicFileDuration = options.musicFileDuration ?? DEFAULT_MUSIC_FILE_DURATION_SEC
  if (!musicUrl.trim()) return []

  const beats = getSceneBeats(scene)
  if (beats.length === 0) {
    return [
      {
        id: 'music',
        url: musicUrl.trim(),
        startTime: 0,
        duration: sceneDuration,
        trackType: 'music',
        label: 'Background Music',
        loop: true,
      },
    ]
  }

  const beatById = new Map(beats.map((beat) => [beat.beatId, beat]))
  const clips: BeatAlignedMusicClip[] = []

  const enabledFrames = visualFrames.filter((frame) => {
    if (!frame.beatId || frame.duration <= 0) return false
    const beat = beatById.get(frame.beatId)
    return isBeatMusicEnabled(beat)
  })

  const fadeAnchorTime =
    enabledFrames.length > 0
      ? Math.min(...enabledFrames.map((frame) => frame.startTime))
      : 0

  const runs = groupContiguousMusicFrames(enabledFrames)

  for (const run of runs) {
    const first = run[0]
    const last = run[run.length - 1]
    const startTime = first.startTime
    const duration = last.startTime + last.duration - startTime
    const id =
      runs.length === 1 && run.length > 1 ? 'music-scene' : `music-${first.beatId}`

    clips.push({
      id,
      url: musicUrl.trim(),
      startTime,
      duration,
      trimStart: resolveMusicTrimStart(startTime, musicFileDuration),
      fadeAnchorTime,
      trackType: 'music',
      label: 'Background Music',
      loop: true,
    })
  }

  return clips
}

/** Resolve music URL from scene and build beat-aligned clips (convenience wrapper). */
export function buildStoryboardMusicClips(
  scene: Record<string, unknown>,
  visualFrames: StoryboardVisualFrame[],
  sceneDuration: number,
  musicFileDuration?: number
): BeatAlignedMusicClip[] {
  const musicUrl = resolveSceneMusicUrl(scene)
  if (!musicUrl) return []
  return buildBeatAlignedMusicClips(scene, visualFrames, {
    musicUrl,
    sceneDuration,
    musicFileDuration,
  })
}

export function resolveSceneMusicFileDuration(
  scene: Record<string, unknown>,
  dynamicDurations: Record<string, number> = {}
): number {
  const musicUrl = resolveSceneMusicUrl(scene)
  if (!musicUrl) return DEFAULT_MUSIC_FILE_DURATION_SEC

  const probed = dynamicDurations[musicUrl]
  if (typeof probed === 'number' && probed > 0) return probed

  const sceneDuration = scene.musicDuration
  if (typeof sceneDuration === 'number' && sceneDuration > 0) return sceneDuration

  const musicObj = scene.music as { duration?: number } | undefined
  if (typeof musicObj?.duration === 'number' && musicObj.duration > 0) {
    return musicObj.duration
  }

  return DEFAULT_MUSIC_FILE_DURATION_SEC
}
