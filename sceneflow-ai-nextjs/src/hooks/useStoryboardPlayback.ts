'use client'

/**
 * Storyboard gallery playback — builds beat-first timeline and delegates to useTimelinePlayback.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  buildBeatFirstPlaybackTimeline,
  buildStoryboardAudioRevision,
  buildStoryboardVisualRevision,
  buildStoryboardVoiceClips,
  buildStoryboardVisualTimeline,
  getCurrentStoryboardVisualFrame,
  type StoryboardVisualFrame,
} from '@/lib/storyboard/types'
import { computeFrameFadeOut } from '@/lib/storyboard/animaticSceneFade'
import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'
import { buildBeatAlignedStoryboardSfxClips } from '@/lib/storyboard/sfxPlayback'
import {
  buildStoryboardMusicClips,
  collectSceneMusicUrls,
  resolveSceneMusicFileDuration,
} from '@/lib/storyboard/musicPlayback'
import type { MusicIntroFadeConfig } from '@/lib/storyboard/musicIntroFade'
import {
  useTimelinePlayback,
  type AudioClip as TimelineAudioClip,
  type VisualClip,
} from '@/hooks/useTimelinePlayback'
import { DEFAULT_MIXER_AUDIO_TRACKS } from '@/lib/scene/mixerSettings'
import { effectiveScreeningTrackVolume } from '@/lib/scene/screeningTrackVolume'

export interface UseStoryboardPlaybackOptions {
  scene: Record<string, unknown> | null | undefined
  language: string
  /** Viewer master overlay (0–1). Multiplies every scene track. */
  volume?: number
  /** Per-scene dialogue/narration track volume from mixer settings (0–1). */
  dialogueVolume?: number
  /** Per-scene music track volume from mixer settings (0–1). */
  musicVolume?: number
  /** Per-scene SFX track volume from mixer settings (0–1). */
  sfxVolume?: number
  isMuted?: boolean
  musicIntroFade?: MusicIntroFadeConfig
  /**
   * The previous scene's `transitionToNext`. A scene only knows its own
   * timeline, so whoever is stepping through a run of them has to say whether
   * this one fades up from black or is cut straight into.
   */
  sceneTransitionIn?: BeatDirectionTransition
  onPlaybackEnd?: () => void
}

export interface UseStoryboardPlaybackReturn {
  isPlaying: boolean
  currentTime: number
  sceneDuration: number
  visualFrames: StoryboardVisualFrame[]
  currentVisualFrame: StoryboardVisualFrame | undefined
  hasVoiceAudio: boolean
  play: () => void
  pause: () => void
  togglePlayback: () => void
  seekTo: (time: number) => void
  reset: () => void
}

function storyboardFramesToVisualClips(frames: StoryboardVisualFrame[]): VisualClip[] {
  return frames.map((frame) => ({
    id: frame.clipId,
    segmentId: frame.beatId ?? frame.clipId,
    startTime: frame.startTime,
    duration: frame.duration,
    thumbnailUrl: frame.imageUrl,
  }))
}

function collectSceneAudioUrls(
  scene: Record<string, unknown>,
  language: string
): string[] {
  const urls: string[] = []

  const narrationUrl =
    (scene.narrationAudio as Record<string, { url?: string }> | undefined)?.[language]?.url ??
    (scene.narrationAudio as Record<string, { url?: string }> | undefined)?.en?.url ??
    (typeof scene.narrationAudioUrl === 'string' ? scene.narrationAudioUrl : undefined)
  if (narrationUrl) urls.push(narrationUrl)

  const dialogueAudio =
    (scene.dialogueAudio as Record<string, Array<{ audioUrl?: string; url?: string }>> | undefined)?.[
      language
    ] ??
    (scene.dialogueAudio as Record<string, Array<{ audioUrl?: string; url?: string }>> | undefined)?.en ??
    (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : [])
  if (Array.isArray(dialogueAudio)) {
    dialogueAudio.forEach((entry) => {
      const url = entry?.audioUrl || entry?.url
      if (url) urls.push(url)
    })
  }

  for (const beat of getSceneBeats(scene)) {
    if (beat.audioUrl?.trim()) urls.push(beat.audioUrl.trim())
  }

  urls.push(...collectSceneMusicUrls(scene))

  const sfxArray = scene.sfxAudio
  if (Array.isArray(sfxArray)) {
    sfxArray.forEach((sfx) => {
      const url = typeof sfx === 'string' ? sfx : sfx?.url
      if (url) urls.push(url)
    })
  }

  return [...new Set(urls)]
}

function buildClipTimelineKey(clips: TimelineAudioClip[]): string {
  return clips.map((clip) => `${clip.id}|${clip.startTime}|${clip.duration}|${clip.url}`).join(';')
}

export function useStoryboardPlayback({
  scene,
  language,
  volume = 0.8,
  dialogueVolume = DEFAULT_MIXER_AUDIO_TRACKS.dialogue.volume,
  musicVolume = DEFAULT_MIXER_AUDIO_TRACKS.music.volume,
  sfxVolume = DEFAULT_MIXER_AUDIO_TRACKS.sfx.volume,
  isMuted = false,
  musicIntroFade,
  sceneTransitionIn,
  onPlaybackEnd,
}: UseStoryboardPlaybackOptions): UseStoryboardPlaybackReturn {
  const [dynamicDurations, setDynamicDurations] = useState<Record<string, number>>({})
  const fetchingUrls = useRef<Set<string>>(new Set())
  const sceneRef = useRef(scene)
  sceneRef.current = scene

  const sceneAudioRevision = useMemo(
    () => buildStoryboardAudioRevision(scene, language),
    [scene, language]
  )

  const sceneVisualRevision = useMemo(
    () => buildStoryboardVisualRevision(scene),
    [scene]
  )

  const dynamicDurationKey = useMemo(
    () =>
      Object.entries(dynamicDurations)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([url, duration]) => `${url}:${duration}`)
        .join('|'),
    [dynamicDurations]
  )

  useEffect(() => {
    setDynamicDurations({})
    fetchingUrls.current.clear()
  }, [sceneAudioRevision])

  useEffect(() => {
    const activeScene = sceneRef.current
    if (!activeScene) return

    collectSceneAudioUrls(activeScene, language).forEach((url) => {
      if (fetchingUrls.current.has(url)) return
      fetchingUrls.current.add(url)

      try {
        const audio = new Audio(url)
        audio.addEventListener('loadedmetadata', () => {
          if (!audio.duration || audio.duration === Infinity || Number.isNaN(audio.duration)) {
            return
          }
          setDynamicDurations((curr) => {
            const prev = curr[url]
            if (prev != null && prev >= audio.duration) return curr
            return { ...curr, [url]: audio.duration }
          })
        })
        audio.addEventListener('error', () => {
          console.warn(`[useStoryboardPlayback] Failed to load audio metadata for URL: ${url}`)
        })
      } catch (err) {
        console.warn(`[useStoryboardPlayback] Failed to create Audio for URL: ${url}`, err)
      }
    })
  }, [sceneAudioRevision, language])

  const beatPlayback = useMemo(() => {
    const activeScene = sceneRef.current
    if (!activeScene?.beats?.length) return null
    return buildBeatFirstPlaybackTimeline(activeScene, language, dynamicDurations, {
      preVisAnimatic: true,
      sceneTransitionIn,
    })
  }, [sceneAudioRevision, sceneVisualRevision, language, dynamicDurationKey, sceneTransitionIn])

  const voiceClips = useMemo(() => {
    const activeScene = sceneRef.current
    return (
      beatPlayback?.voiceClips ??
      (activeScene ? buildStoryboardVoiceClips(activeScene, language, dynamicDurations) : [])
    )
  }, [beatPlayback, sceneAudioRevision, sceneVisualRevision, language, dynamicDurationKey])

  const visualFrames = useMemo(() => {
    const activeScene = sceneRef.current
    if (beatPlayback?.visualFrames.length) return beatPlayback.visualFrames
    if (!activeScene) return []
    return buildStoryboardVisualTimeline(activeScene, voiceClips, {
      language,
      dynamicDurations,
      preVisAnimatic: true,
    })
  }, [beatPlayback, voiceClips, sceneVisualRevision, language, dynamicDurationKey])

  const sceneDuration = useMemo(() => {
    if (visualFrames.length > 0) {
      const lastFrame = visualFrames[visualFrames.length - 1]
      return lastFrame.startTime + lastFrame.duration + 1.5
    }
    if (voiceClips.length === 0) return 5
    const lastClip = voiceClips[voiceClips.length - 1]
    return lastClip.startTime + lastClip.duration + 1.5
  }, [visualFrames, voiceClips])

  const timelineAudioClips = useMemo((): TimelineAudioClip[] => {
    const activeScene = sceneRef.current
    const clips: TimelineAudioClip[] = voiceClips
      .filter((clip) => !!clip.url)
      .map((clip) => ({
        id: clip.id,
        url: clip.url!,
        startTime: clip.startTime,
        duration: clip.duration,
        trackType: 'dialogue' as const,
        label: clip.label,
      }))

    if (activeScene) {
      const musicFileDuration = resolveSceneMusicFileDuration(activeScene, dynamicDurations)
      clips.push(
        ...buildStoryboardMusicClips(
          activeScene,
          visualFrames,
          sceneDuration,
          musicFileDuration,
          dynamicDurations
        ).map((clip) => ({
          id: clip.id,
          url: clip.url,
          startTime: clip.startTime,
          duration: clip.duration,
          trimStart: clip.trimStart,
          fadeAnchorTime: clip.fadeAnchorTime,
          trackType: 'music' as const,
          label: clip.label,
          loop: clip.loop,
        }))
      )

      const voiceEndTime =
        voiceClips.length > 0
          ? voiceClips[voiceClips.length - 1].startTime + voiceClips[voiceClips.length - 1].duration
          : undefined

      clips.push(
        ...buildBeatAlignedStoryboardSfxClips(activeScene, visualFrames, {
          voiceEndTime,
          sceneDuration,
          dynamicDurations,
        })
      )
    }

    return clips
  }, [voiceClips, visualFrames, sceneDuration, sceneAudioRevision, dynamicDurationKey])

  const visualClips = useMemo(
    () => storyboardFramesToVisualClips(visualFrames),
    [visualFrames]
  )

  // Cue-scored scenes carry their tracks on `sceneMusicCues[].url` and never
  // write `musicAudio`, so testing the legacy fields alone muted every scene
  // scored after music cues landed.
  const hasPlayableMusic = useMemo(() => collectSceneMusicUrls(scene).length > 0, [scene])

  const effectiveDialogueVolume = effectiveScreeningTrackVolume({
    muted: isMuted,
    master: volume,
    trackVolume: dialogueVolume,
  })
  const effectiveMusicVolume = effectiveScreeningTrackVolume({
    muted: isMuted,
    master: volume,
    trackVolume: musicVolume,
  })
  const effectiveSfxVolume = effectiveScreeningTrackVolume({
    muted: isMuted,
    master: volume,
    trackVolume: sfxVolume,
  })

  const {
    isPlaying,
    currentTime,
    play,
    pause,
    togglePlayback,
    seekTo,
    reset,
    setTrackVolume,
    setTrackEnabled,
  } = useTimelinePlayback({
    sceneDuration,
    audioClips: timelineAudioClips,
    visualClips,
    initialVolumes: {
      voiceover: effectiveDialogueVolume,
      dialogue: effectiveDialogueVolume,
      music: effectiveMusicVolume,
      sfx: effectiveSfxVolume,
    },
    initialEnabled: {
      voiceover: true,
      dialogue: true,
      music: hasPlayableMusic,
      sfx: Array.isArray(scene?.sfxAudio) && scene!.sfxAudio.length > 0,
    },
    musicIntroFade,
    onPlaybackEnd,
  })

  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime

  const clipTimelineKey = useMemo(
    () => buildClipTimelineKey(timelineAudioClips),
    [timelineAudioClips]
  )
  const prevClipTimelineKeyRef = useRef('')

  useEffect(() => {
    reset()
    prevClipTimelineKeyRef.current = ''
  }, [sceneAudioRevision, sceneVisualRevision, reset])

  useEffect(() => {
    const prev = prevClipTimelineKeyRef.current
    prevClipTimelineKeyRef.current = clipTimelineKey
    if (!prev || prev === clipTimelineKey) return
    seekTo(currentTimeRef.current)
  }, [clipTimelineKey, seekTo])

  useEffect(() => {
    const frame = getCurrentStoryboardVisualFrame(visualFrames, currentTime)
    // Music and SFX duck under a fade to black so the picture and the score
    // reach the boundary together. A scene that cuts away has no black to duck
    // under, so it stays at level right to the last sample.
    const fadeOutSec = frame?.transitionOut === 'fade' ? (frame.transitionOutSec ?? 0) : 0
    const duck =
      frame && fadeOutSec > 0
        ? 1 -
          computeFrameFadeOut(currentTime - frame.startTime, frame.duration, fadeOutSec) * 0.75
        : 1
    setTrackVolume('voiceover', effectiveDialogueVolume)
    setTrackVolume('dialogue', effectiveDialogueVolume)
    setTrackVolume('music', effectiveMusicVolume * duck)
    setTrackVolume('sfx', effectiveSfxVolume * duck)
  }, [
    effectiveDialogueVolume,
    effectiveMusicVolume,
    effectiveSfxVolume,
    setTrackVolume,
    visualFrames,
    currentTime,
  ])

  useEffect(() => {
    setTrackEnabled('music', hasPlayableMusic)
    setTrackEnabled('sfx', Array.isArray(scene?.sfxAudio) && (scene?.sfxAudio?.length ?? 0) > 0)
  }, [scene, hasPlayableMusic, setTrackEnabled])

  const currentVisualFrame = useMemo(
    () => getCurrentStoryboardVisualFrame(visualFrames, currentTime),
    [visualFrames, currentTime]
  )

  const hasVoiceAudio = voiceClips.some((clip) => !!clip.url)

  return {
    isPlaying,
    currentTime,
    sceneDuration,
    visualFrames,
    currentVisualFrame,
    hasVoiceAudio,
    play,
    pause,
    togglePlayback,
    seekTo,
    reset,
  }
}
