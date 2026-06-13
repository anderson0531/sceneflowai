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

/** Default on — only explicit false disables music for a beat. */
export function isBeatMusicEnabled(beat: SceneBeat | undefined): boolean {
  return beat?.musicEnabled !== false
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

  for (const frame of enabledFrames) {
    const beat = beatById.get(frame.beatId!)
    clips.push({
      id: `music-${frame.beatId}`,
      url: musicUrl.trim(),
      startTime: frame.startTime,
      duration: frame.duration,
      trimStart: resolveMusicTrimStart(frame.startTime, musicFileDuration),
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
