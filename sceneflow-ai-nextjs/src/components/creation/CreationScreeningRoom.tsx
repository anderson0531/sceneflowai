'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X, Play, Pause, SkipForward, SkipBack } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WebAudioMixer, SceneAudioConfig } from '@/lib/audio/webAudioMixer'
import type { CreationSceneData } from './types'

interface CreationScreeningRoomProps {
  scenes: CreationSceneData[]
  onClose: () => void
  projectTitle?: string
}

interface PlaybackSegment {
  sceneIndex: number
  clipIndex: number
  type: 'video' | 'image'
  sourceUrl: string
  start: number
  end: number
  duration: number
  label?: string
}

const DEFAULT_STORYBOARD_DURATION = 6

export function CreationScreeningRoom({ scenes, onClose, projectTitle }: CreationScreeningRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioMixerRef = useRef<WebAudioMixer | null>(null)
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null)

  const playbackPlan = useMemo(() => {
    return scenes.map((scene, sceneIndex) => {
      const segments: PlaybackSegment[] = []
      const clips = scene.timeline?.videoTrack ?? []

      if (clips.length === 0) {
        if (scene.storyboardUrl) {
          segments.push({
            sceneIndex,
            clipIndex: 0,
            type: 'image',
            sourceUrl: scene.storyboardUrl,
            start: 0,
            end: DEFAULT_STORYBOARD_DURATION,
            duration: DEFAULT_STORYBOARD_DURATION,
            label: scene.heading,
          })
        }
        return segments
      }

      clips.forEach((clip, clipIndex) => {
        if (!clip.sourceUrl) return
        const start = clip.sourceInPoint ?? 0
        const end = clip.sourceOutPoint ?? (clip.timelineDuration + start)
        const duration = Math.max(0.5, clip.timelineDuration ?? end - start)
        segments.push({
          sceneIndex,
          clipIndex,
          type: 'video',
          sourceUrl: clip.sourceUrl,
          start,
          end,
          duration,
          label: clip.label,
        })
      })

      return segments
    })
  }, [scenes])

  const [sceneIndex, setSceneIndex] = useState(0)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const currentSegments = playbackPlan[sceneIndex] ?? []
  const currentSegment = currentSegments[segmentIndex] ?? null
  const currentScene = scenes[sceneIndex]

  useEffect(() => {
    audioMixerRef.current = new WebAudioMixer()
    return () => {
      audioMixerRef.current?.dispose()
      audioMixerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current)
        imageTimerRef.current = null
      }
    }
  }, [])

  const playSceneAudio = (scene: CreationSceneData) => {
    const mixer = audioMixerRef.current
    if (!mixer) return

    const config: SceneAudioConfig = {
      music: scene.musicUrl || scene.timeline?.musicTrackUrl,
      narration: scene.narrationUrl || scene.timeline?.narrationTrackUrl,
      dialogue: (scene.timeline?.userAudioTrack ?? [])
        .filter((clip) => clip.sourceUrl)
        .map((clip) => ({ url: clip.sourceUrl as string, startTime: clip.startTime ?? 0 })),
    }

    if (!config.music && !config.narration && !(config.dialogue && config.dialogue.length > 0)) {
      return
    }

    mixer.playScene(config).catch((error) => {
      console.warn('[CreationScreeningRoom] Failed to play audio mix', error)
    })
  }

  useEffect(() => {
    if (!currentScene) return
    if (!isPlaying) {
      audioMixerRef.current?.stop()
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current)
        imageTimerRef.current = null
      }
      if (currentSegment?.type === 'video' && videoRef.current) {
        videoRef.current.pause()
      }
      return
    }

    playSceneAudio(currentScene)

    if (!currentSegment) return

    if (currentSegment.type === 'video' && videoRef.current) {
      const video = videoRef.current
      video.src = currentSegment.sourceUrl
      const handleLoaded = () => {
        video.currentTime = currentSegment.start
        video.play().catch(() => setIsPlaying(false))
      }
      const handleTimeUpdate = () => {
        if (video.currentTime >= currentSegment.end) {
          advanceSegment()
        }
      }
      const handleEnded = () => advanceSegment()

      video.addEventListener('loadedmetadata', handleLoaded, { once: true })
      video.addEventListener('timeupdate', handleTimeUpdate)
      video.addEventListener('ended', handleEnded)

      return () => {
        video.pause()
        video.removeEventListener('timeupdate', handleTimeUpdate)
        video.removeEventListener('ended', handleEnded)
      }
    } else if (currentSegment.type === 'image') {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current)
      }
      imageTimerRef.current = setTimeout(() => {
        advanceSegment()
      }, currentSegment.duration * 1000)
    }
  }, [currentSegment, currentScene, isPlaying])

  const advanceSegment = () => {
    if (!currentSegments || currentSegments.length === 0) {
      advanceScene(1)
      return
    }

    const nextIndex = segmentIndex + 1
    if (nextIndex < currentSegments.length) {
      setSegmentIndex(nextIndex)
    } else {
      advanceScene(1)
    }
  }

  const advanceScene = (delta: number) => {
    const nextSceneIndex = sceneIndex + delta
    if (nextSceneIndex < 0) {
      setSceneIndex(0)
      setSegmentIndex(0)
      return
    }
    if (nextSceneIndex >= scenes.length) {
      setSceneIndex(scenes.length - 1)
      setSegmentIndex((playbackPlan[scenes.length - 1]?.length || 1) - 1)
      setIsPlaying(false)
      return
    }
    setSceneIndex(nextSceneIndex)
    setSegmentIndex(0)
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const currentLabel = currentScene?.heading || `Scene ${sceneIndex + 1}`
  const currentClipLabel = currentSegment?.label || (currentSegment?.type === 'image' ? 'Storyboard' : `Clip ${segmentIndex + 1}`)

  return (
    <div className="fixed inset-0 z-50 bg-black/90 text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">{projectTitle || 'Creation Hub'}</p>
          <h2 className="text-xl font-semibold">Screening Room</h2>
        </div>
        <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8">
        <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
          {currentSegment?.type === 'video' ? (
            <video ref={videoRef} className="w-full h-full" controls={false} muted={false} playsInline />
          ) : currentSegment?.type === 'image' ? (
            <img src={currentSegment.sourceUrl} alt={currentLabel} className="w-full h-full object-contain" />
          ) : (
            <div className="text-sm text-white/70">No media available for this scene.</div>
          )}
        </div>

        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-between text-sm text-white/80 mb-3">
            <div>
              <div className="font-semibold">{currentLabel}</div>
              <div className="text-xs text-white/60">{currentClipLabel}</div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => advanceScene(-1)} className="text-white hover:bg-white/10">
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/10">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" onClick={() => advanceScene(1)} className="text-white hover:bg-white/10">
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: `${((sceneIndex + 1) / Math.max(scenes.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default CreationScreeningRoom
