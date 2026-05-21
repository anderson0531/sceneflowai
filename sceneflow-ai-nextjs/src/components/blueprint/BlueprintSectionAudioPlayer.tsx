'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlueprintSectionAudioEntry } from '@/lib/blueprint/shareTypes'

type Props = {
  sectionId: string
  label?: string
  audio?: BlueprintSectionAudioEntry | null
  compact?: boolean
  className?: string
}

export function BlueprintSectionAudioPlayer({
  sectionId,
  label = 'Listen',
  audio,
  compact = false,
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  const stop = useCallback(() => {
    const el = audioRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    setPlaying(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop, audio?.url])

  const toggle = useCallback(async () => {
    if (!audio?.url) return
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
      return
    }
    setLoading(true)
    try {
      if (el.src !== audio.url) {
        el.src = audio.url
        el.load()
      }
      await el.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }, [audio?.url, playing])

  if (!audio?.url) return null

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <audio
        ref={audioRef}
        preload="metadata"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        className="hidden"
        data-section={sectionId}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void toggle()
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors',
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'
        )}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <span>{playing ? 'Pause' : label}</span>
      </button>
    </div>
  )
}
