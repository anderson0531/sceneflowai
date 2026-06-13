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
  SCENE_FADE_TO_BLACK_SEC,
} from '@/lib/storyboard/types'
import { buildBeatAlignedStoryboardSfxClips } from '@/lib/storyboard/sfxPlayback'
import { buildStoryboardMusicClips, resolveSceneMusicFileDuration } from '@/lib/storyboard/musicPlayback'
import type { MusicIntroFadeConfig } from '@/lib/storyboard/musicIntroFade'
import {
  useTimelinePlayback,
  type AudioClip as TimelineAudioClip,
  type VisualClip,
} from '@/hooks/useTimelinePlayback'

const DIALOGUE_VOLUME_BOOST = 1.5

export interface UseStoryboardPlaybackOptions {
  scene: Record<string, unknown> | null | undefined
  language: string
  volume?: number
  musicVolume?: number
  isMuted?: boolean
  musicIntroFade?: MusicIntroFadeConfig
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

  const musicUrl = scene.musicAudio || (scene.music as { url?: string } | undefined)?.url
  if (typeof musicUrl === 'string' && musicUrl.trim()) urls.push(musicUrl.trim())

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
  musicVolume = 0.15,
  isMuted = false,
  musicIntroFade,
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
    return buildBeatFirstPlaybackTimeline(activeScene, language, dynamicDurations)
  }, [sceneAudioRevision, sceneVisualRevision, language, dynamicDurationKey])

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
          musicFileDuration
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

  const dialogueVolume = isMuted ? 0 : Math.min(1, volume * DIALOGUE_VOLUME_BOOST)
  const effectiveMusicVolume = isMuted ? 0 : volume * musicVolume
  const sfxVolume = isMuted ? 0 : volume

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
      voiceover: dialogueVolume,
      dialogue: dialogueVolume,
      music: effectiveMusicVolume,
      sfx: sfxVolume,
    },
    initialEnabled: {
      voiceover: true,
      dialogue: true,
      music: !!scene?.musicAudio || !!(scene?.music as { url?: string } | undefined)?.url,
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
    let duck = 1
    if (frame?.isSceneEnd) {
      const fadeStart = Math.max(0, frame.duration - SCENE_FADE_TO_BLACK_SEC)
      const t = currentTime - frame.startTime
      if (t >= fadeStart) {
        duck = 1 - Math.min(1, (t - fadeStart) / SCENE_FADE_TO_BLACK_SEC) * 0.75
      }
    }
    setTrackVolume('voiceover', dialogueVolume)
    setTrackVolume('dialogue', dialogueVolume)
    setTrackVolume('music', effectiveMusicVolume * duck)
    setTrackVolume('sfx', sfxVolume * duck)
  }, [dialogueVolume, effectiveMusicVolume, sfxVolume, setTrackVolume, visualFrames, currentTime])

  useEffect(() => {
    setTrackEnabled('music', !!scene?.musicAudio || !!(scene?.music as { url?: string } | undefined)?.url)
    setTrackEnabled('sfx', Array.isArray(scene?.sfxAudio) && (scene?.sfxAudio?.length ?? 0) > 0)
  }, [scene, setTrackEnabled])

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
