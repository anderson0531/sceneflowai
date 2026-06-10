'use client'

/**
 * Storyboard gallery playback — builds beat-first timeline and delegates to useTimelinePlayback.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  buildBeatFirstPlaybackTimeline,
  buildStoryboardAudioRevision,
  buildStoryboardVoiceClips,
  buildStoryboardVisualTimeline,
  getCurrentStoryboardVisualFrame,
  type StoryboardVisualFrame,
} from '@/lib/storyboard/types'
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
  }, [sceneAudioRevision, language, dynamicDurationKey])

  const voiceClips = useMemo(() => {
    const activeScene = sceneRef.current
    return (
      beatPlayback?.voiceClips ??
      (activeScene ? buildStoryboardVoiceClips(activeScene, language, dynamicDurations) : [])
    )
  }, [beatPlayback, sceneAudioRevision, language, dynamicDurationKey])

  const visualFrames = useMemo(() => {
    const activeScene = sceneRef.current
    if (beatPlayback?.visualFrames.length) return beatPlayback.visualFrames
    if (!activeScene) return []
    return buildStoryboardVisualTimeline(activeScene, voiceClips, {
      language,
      dynamicDurations,
    })
  }, [beatPlayback, voiceClips, language, dynamicDurationKey])

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
      const musicUrl = activeScene.musicAudio || (activeScene.music as { url?: string } | undefined)?.url
      if (typeof musicUrl === 'string' && musicUrl.trim()) {
        clips.push({
          id: 'music',
          url: musicUrl.trim(),
          startTime: 0,
          duration: (activeScene.musicDuration as number | undefined) || sceneDuration,
          trackType: 'music',
          label: 'Background Music',
          loop: true,
        })
      }

      const sfxArray = activeScene.sfxAudio
      if (Array.isArray(sfxArray) && sfxArray.length > 0) {
        const baseDuration =
          voiceClips.length > 0
            ? voiceClips[voiceClips.length - 1].startTime + voiceClips[voiceClips.length - 1].duration
            : 5
        sfxArray.forEach((sfx, idx) => {
          const sfxUrl = typeof sfx === 'string' ? sfx : sfx?.url
          if (!sfxUrl) return
          const startTime =
            typeof sfx === 'object' && sfx?.startTime != null
              ? sfx.startTime
              : idx * (baseDuration / Math.max(sfxArray.length, 1))
          clips.push({
            id: `sfx-${idx}`,
            url: sfxUrl,
            startTime,
            duration: (typeof sfx === 'object' && sfx?.duration) || 3,
            trackType: 'sfx',
            label: (typeof sfx === 'object' && sfx?.description) || `Sound Effect ${idx + 1}`,
          })
        })
      }
    }

    return clips
  }, [voiceClips, sceneDuration, sceneAudioRevision])

  const visualClips = useMemo(
    () => storyboardFramesToVisualClips(visualFrames),
    [visualFrames]
  )

  const dialogueVolume = isMuted ? 0 : Math.min(1, volume * DIALOGUE_VOLUME_BOOST)
  const effectiveMusicVolume = isMuted ? 0 : volume * musicVolume
  const sfxVolume = isMuted ? 0 : volume * 0.5

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
  }, [sceneAudioRevision, reset])

  useEffect(() => {
    const prev = prevClipTimelineKeyRef.current
    prevClipTimelineKeyRef.current = clipTimelineKey
    if (!prev || prev === clipTimelineKey) return
    seekTo(currentTimeRef.current)
  }, [clipTimelineKey, seekTo])

  useEffect(() => {
    setTrackVolume('voiceover', dialogueVolume)
    setTrackVolume('dialogue', dialogueVolume)
    setTrackVolume('music', effectiveMusicVolume)
    setTrackVolume('sfx', sfxVolume)
  }, [dialogueVolume, effectiveMusicVolume, sfxVolume, setTrackVolume])

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
