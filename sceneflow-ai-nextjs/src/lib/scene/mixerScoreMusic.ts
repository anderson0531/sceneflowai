/**
 * Score-aware music clips for the Production Mixer.
 *
 * Screening Room places cues on stored segment start/end. The Mixer timeline
 * can trim beats and exclude them, so cues have to be placed on the playback
 * durations the Mixer actually plays.
 */

import {
  clampAudioPlaybackRate,
  resolveMusicCueVolume,
} from '@/lib/audio/loopingAudioSync'
import type { AudioTrackConfig } from '@/components/vision/scene-production/types'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import { getMusicTrackTiming } from '@/lib/scene/mixerMusicTiming'
import {
  buildProductionMusicCueClips,
  type MusicCueSegment,
  type ProductionMusicCueClip,
} from '@/lib/scene/productionMusicCues'
import { DEFAULT_MUSIC_FILE_DURATION_SEC } from '@/lib/storyboard/musicPlayback'

export type MixerMusicClip = ProductionMusicCueClip

export function mapMixerPlaybackSegments(
  segments: Array<{ beatId?: string }>,
  getPlaybackSegmentDuration: (segment: { beatId?: string }) => number
): MusicCueSegment[] {
  let startTime = 0
  return segments.map((segment) => {
    const duration = Math.max(0, getPlaybackSegmentDuration(segment))
    const mapped: MusicCueSegment = {
      beatId: segment.beatId,
      startTime,
      endTime: startTime + duration,
      duration,
    }
    startTime += duration
    return mapped
  })
}

export function resolveMixerMusicClips(options: {
  scene?: Record<string, unknown> | null
  segments: SceneSegment[]
  getPlaybackSegmentDuration: (segment: SceneSegment) => number
  musicConfig: AudioTrackConfig
  legacyMusicUrl?: string
  musicFileDuration?: number
}): { clips: MixerMusicClip[]; usingScore: boolean } {
  const mapped = mapMixerPlaybackSegments(
    options.segments,
    options.getPlaybackSegmentDuration
  )
  const scored = buildProductionMusicCueClips(options.scene, mapped)
  if (scored.length > 0) {
    return { clips: scored, usingScore: true }
  }

  const url = options.legacyMusicUrl?.trim()
  if (!url || options.segments.length === 0) {
    return { clips: [], usingScore: false }
  }

  const timing = getMusicTrackTiming(
    options.musicConfig,
    options.segments,
    options.getPlaybackSegmentDuration
  )
  const duration = timing.duration
  if (!(duration > 0)) return { clips: [], usingScore: false }

  const fileDuration =
    options.musicFileDuration && options.musicFileDuration > 0
      ? options.musicFileDuration
      : DEFAULT_MUSIC_FILE_DURATION_SEC

  return {
    clips: [
      {
        id: 'music-legacy',
        url,
        startTime: timing.startTime,
        duration,
        label: 'Background Music',
        loop: options.musicConfig.loop !== false,
        actualDuration: fileDuration,
        fadeInSec: options.musicConfig.fadeInSec,
        fadeOutSec: options.musicConfig.fadeOutSec,
      },
    ],
    usingScore: false,
  }
}

/** Earliest start and latest end of the score (or legacy bed) on the mixer timeline. */
export function scoreSpan(
  clips: Array<{ startTime: number; duration: number }>
): { start: number; end: number } | null {
  if (clips.length === 0) return null
  let start = Infinity
  let end = -Infinity
  for (const clip of clips) {
    if (!Number.isFinite(clip.startTime) || !Number.isFinite(clip.duration)) continue
    start = Math.min(start, clip.startTime)
    end = Math.max(end, clip.startTime + Math.max(0, clip.duration))
  }
  if (!Number.isFinite(start) || !(end > start)) return null
  return { start, end }
}

/**
 * Linear fade across the whole score. 1 outside the ramps.
 * Multiplies with each cue's own fade.
 */
export function scoreStemEnvelopeGain(
  timeSec: number,
  scoreStart: number,
  scoreEnd: number,
  fadeInSec: number,
  fadeOutSec: number
): number {
  const fadeIn = Math.max(0, fadeInSec)
  const fadeOut = Math.max(0, fadeOutSec)
  let gain = 1
  if (fadeIn > 0) {
    const into = timeSec - scoreStart
    if (into < fadeIn) gain *= Math.max(0, into / fadeIn)
  }
  if (fadeOut > 0) {
    const left = scoreEnd - timeSec
    if (left < fadeOut) gain *= Math.max(0, left / fadeOut)
  }
  return gain
}

/**
 * Bake the stem fade into each clip's edge fades so one afade per edge matches
 * the longer of the cue fade and the stem ramp that overlaps that edge.
 */
export function foldScoreStemFades<
  T extends { startTime: number; duration: number; fadeInSec?: number; fadeOutSec?: number }
>(clips: T[], stemFadeInSec: number, stemFadeOutSec: number): T[] {
  const span = scoreSpan(clips)
  const stemIn = Math.max(0, stemFadeInSec)
  const stemOut = Math.max(0, stemFadeOutSec)
  if (!span || (stemIn <= 0 && stemOut <= 0)) {
    return clips.map((clip) => ({
      ...clip,
      fadeInSec: clip.fadeInSec ?? 0,
      fadeOutSec: clip.fadeOutSec ?? 0,
    }))
  }

  const fadeInEnd = span.start + stemIn
  const fadeOutStart = span.end - stemOut
  return clips.map((clip) => {
    let fadeIn = clip.fadeInSec ?? 0
    let fadeOut = clip.fadeOutSec ?? 0
    const clipEnd = clip.startTime + clip.duration
    if (stemIn > 0 && clip.startTime < fadeInEnd && clipEnd > span.start) {
      const remaining = stemIn - Math.max(0, clip.startTime - span.start)
      if (remaining > 0) fadeIn = Math.max(fadeIn, Math.min(remaining, clip.duration))
    }
    if (stemOut > 0 && clipEnd > fadeOutStart && clip.startTime < span.end) {
      const overlap = Math.min(clipEnd, span.end) - Math.max(clip.startTime, fadeOutStart)
      if (overlap > 0) fadeOut = Math.max(fadeOut, Math.min(overlap, clip.duration))
    }
    return { ...clip, fadeInSec: fadeIn, fadeOutSec: fadeOut }
  })
}

export function mixerMusicClipsToRenderPayload(
  clips: MixerMusicClip[],
  musicConfig: AudioTrackConfig
): Array<{
  url: string
  startTime: number
  duration: number
  volume: number
  loop?: boolean
  fadeInSec?: number
  fadeOutSec?: number
  playbackRate?: number
}> {
  const playbackRate = clampAudioPlaybackRate(musicConfig.playbackRate)
  const faded = foldScoreStemFades(
    clips,
    musicConfig.fadeInSec ?? 0,
    musicConfig.fadeOutSec ?? 0
  )
  return faded.map((clip) => ({
    url: clip.url,
    startTime: clip.startTime,
    duration: clip.duration,
    volume: Math.max(
      0,
      Math.min(1, musicConfig.volume * resolveMusicCueVolume(clip.volume))
    ),
    loop: clip.loop,
    fadeInSec: clip.fadeInSec ?? 0,
    fadeOutSec: clip.fadeOutSec ?? 0,
    playbackRate,
  }))
}
