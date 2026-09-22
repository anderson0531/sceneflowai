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
  return clips.map((clip) => ({
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
