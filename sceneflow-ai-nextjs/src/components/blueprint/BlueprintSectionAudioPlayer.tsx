'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { BlueprintSectionAudioEntry } from '@/lib/blueprint/shareTypes'

export type BlueprintSectionAudioPlayerStatus =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'unavailable'

type Props = {
  sectionId: string
  label?: string
  audio?: BlueprintSectionAudioEntry | null
  status?: BlueprintSectionAudioPlayerStatus
  compact?: boolean
  className?: string
}

export function BlueprintSectionAudioPlayer({
  sectionId,
  label = 'Listen',
  audio,
  status: statusProp,
  compact = false,
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  const status: BlueprintSectionAudioPlayerStatus =
    statusProp ?? (audio?.url ? 'ready' : 'unavailable')

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
    if (!audio?.url || status !== 'ready') return
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
      toast.error('Audio file missing or unavailable. Ask the owner to regenerate section audio.')
    } finally {
      setLoading(false)
    }
  }, [audio?.url, playing, status])

  if (status === 'unavailable' || status === 'idle') return null

  const isPreparing = status === 'preparing'
  const buttonLabel = isPreparing ? 'Preparing…' : playing ? 'Pause' : label

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {status === 'ready' && audio?.url ? (
        <audio
          ref={audioRef}
          preload="metadata"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          className="hidden"
          data-section={sectionId}
        />
      ) : null}
      <button
        type="button"
        disabled={isPreparing}
        onClick={(e) => {
          e.stopPropagation()
          if (!isPreparing) void toggle()
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border transition-colors',
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
          isPreparing
            ? 'border-purple-500/25 bg-purple-500/5 text-purple-400/70 cursor-wait'
            : 'border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
        )}
        aria-label={isPreparing ? `Preparing ${label}` : playing ? `Pause ${label}` : `Play ${label}`}
        aria-busy={isPreparing || loading}
      >
        {isPreparing || loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <span>{buttonLabel}</span>
      </button>
    </div>
  )
}
