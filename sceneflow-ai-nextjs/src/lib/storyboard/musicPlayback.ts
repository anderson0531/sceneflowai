/**
 * Beat-aligned background music scheduling for storyboard gallery playback.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

export interface BeatAlignedMusicClip {
  id: string
  url: string
  startTime: number
  duration: number
  trimStart?: number
  trackType: 'music'
  label?: string
  loop?: boolean
}

export interface BuildBeatAlignedMusicClipsOptions {
  musicUrl: string
  sceneDuration: number
}

/** Default on — only explicit false disables music for a beat. */
export function isBeatMusicEnabled(beat: SceneBeat | undefined): boolean {
  return beat?.musicEnabled !== false
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

  for (const frame of visualFrames) {
    if (!frame.beatId) continue
    const beat = beatById.get(frame.beatId)
    if (!isBeatMusicEnabled(beat)) continue
    if (frame.duration <= 0) continue

    clips.push({
      id: `music-${frame.beatId}`,
      url: musicUrl.trim(),
      startTime: frame.startTime,
      duration: frame.duration,
      trimStart: frame.startTime,
      trackType: 'music',
      label: 'Background Music',
      loop: false,
    })
  }

  return clips
}

/** Resolve music URL from scene and build beat-aligned clips (convenience wrapper). */
export function buildStoryboardMusicClips(
  scene: Record<string, unknown>,
  visualFrames: StoryboardVisualFrame[],
  sceneDuration: number
): BeatAlignedMusicClip[] {
  const musicUrl = resolveSceneMusicUrl(scene)
  if (!musicUrl) return []
  return buildBeatAlignedMusicClips(scene, visualFrames, { musicUrl, sceneDuration })
}
