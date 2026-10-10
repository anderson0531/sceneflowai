'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  PROMO_AUDIO_MIX,
  PROMO_NARRATION_BASS_DB,
  PROMO_NARRATION_BASS_HZ,
  promoPreviewMusicVolume,
} from '@/lib/publish/promoAudioMix'
import { promoFrameClass } from '@/lib/publish/promoFrame'
import { promoStudioWatermarkPayload } from '@/lib/publish/promoTimeline'
import type { PromoPreviewShot } from '@/lib/publish/promoPreviewSequence'
import type { PromoFrameAspect } from '@/types/publishingAssets'
import { cn } from '@/lib/utils'

export interface PromoCutPreviewProps {
  playing: boolean
  shots: PromoPreviewShot[]
  narrationUrl?: string
  musicUrl?: string
  onEnded: () => void
  /** Source frame. 16:9 unless the blueprint is vertical. */
  aspect?: PromoFrameAspect
  /** SceneFlow Studio mark. On unless the promo watermark is turned off. */
  watermark?: boolean
}

/**
 * Plays the planned cut in the promo tab with clip sound over the looping
 * music, at the same mix the trailer stitch renders. This does not start a stitch.
 */
export function PromoCutPreview({
  playing,
  shots,
  narrationUrl,
  musicUrl,
  onEnded,
  aspect = '16:9',
  watermark = true,
}: PromoCutPreviewProps) {
  const [index, setIndex] = useState(0)
  const advanced = useRef(false)
  const narrationRef = useRef<HTMLAudioElement>(null)
  const musicRef = useRef<HTMLAudioElement>(null)
  const narrationGraphRef = useRef<AudioContext | null>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    const narration = narrationRef.current
    if (!narration || !narrationUrl) return
    const context = new AudioContext()
    const source = context.createMediaElementSource(narration)
    const shelf = context.createBiquadFilter()
    shelf.type = 'lowshelf'
    shelf.frequency.value = PROMO_NARRATION_BASS_HZ
    shelf.gain.value = PROMO_NARRATION_BASS_DB
    const gain = context.createGain()
    gain.gain.value = PROMO_AUDIO_MIX.narration
    source.connect(shelf)
    shelf.connect(gain)
    gain.connect(context.destination)
    narrationGraphRef.current = context
    return () => {
      narrationGraphRef.current = null
      source.disconnect()
      void context.close()
    }
  }, [narrationUrl])

  useEffect(() => {
    if (!playing) setIndex(0)
  }, [playing])

  useEffect(() => {
    advanced.current = false
  }, [index, playing])

  const musicKind = shots[index]?.beatKind

  useEffect(() => {
    if (!playing) return
    if (index >= shots.length) onEndedRef.current()
  }, [playing, index, shots.length])

  useEffect(() => {
    if (!playing) return
    const shot = shots[index]
    if (!shot || shot.kind === 'clip') return
    const timer = window.setTimeout(() => {
      setIndex((current) => current + 1)
    }, shot.durationSec * 1000)
    return () => window.clearTimeout(timer)
  }, [playing, index, shots])

  useEffect(() => {
    const narration = narrationRef.current
    const music = musicRef.current
    if (!playing) {
      narration?.pause()
      music?.pause()
      if (narration) narration.currentTime = 0
      if (music) music.currentTime = 0
      return
    }
    if (music) music.volume = PROMO_AUDIO_MIX.music
    void narrationGraphRef.current?.resume().catch(() => undefined)
    void narration?.play().catch(() => undefined)
    void music?.play().catch(() => undefined)
  }, [playing, narrationUrl, musicUrl])

  useEffect(() => {
    const music = musicRef.current
    if (!music) return
    music.volume = promoPreviewMusicVolume({ beatKind: musicKind })
  }, [musicKind, playing])

  const startClip = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return
    video.volume = PROMO_AUDIO_MIX.clip
    void video.play().catch(() => {
      // Autoplay with sound can be refused; keep the cut moving without it.
      video.muted = true
      void video.play().catch(() => undefined)
    })
  }, [])

  const shot = playing ? shots[index] : undefined

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    setIndex((current) => current + 1)
  }

  return (
    <>
    {shot ? (
    <div className="mb-4 flex items-start gap-3">
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border border-fuchsia-500/30 bg-black',
          promoFrameClass(aspect),
          aspect === '9:16' ? 'max-w-[220px]' : 'max-w-3xl'
        )}
      >
        {shot.kind === 'clip' && shot.videoUrl ? (
          <video
            key={shot.key}
            ref={startClip}
            src={shot.videoUrl}
            playsInline
            className="h-full w-full object-contain"
            onTimeUpdate={(event) => {
              if (event.currentTarget.currentTime >= shot.durationSec - 0.05) advance()
            }}
            onEnded={advance}
            onError={advance}
          />
        ) : shot.kind === 'still' && shot.imageUrl ? (
          <img src={shot.imageUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-fuchsia-100">
            {shot.label || 'Shot'}
          </div>
        )}
        {watermark ? (
          <span className="pointer-events-none absolute bottom-2 right-2 text-[10px] font-medium text-white/60 drop-shadow">
            {promoStudioWatermarkPayload().text}
          </span>
        ) : null}
      </div>
    </div>
    ) : null}
      {narrationUrl ? (
        <audio key={narrationUrl} ref={narrationRef} src={narrationUrl} preload="auto" />
      ) : null}
      {musicUrl ? <audio ref={musicRef} src={musicUrl} loop preload="auto" /> : null}
    </>
  )
}
