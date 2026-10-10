'use client'

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  PROMO_AUDIO_MIX,
  PROMO_NARRATION_BASS_DB,
  PROMO_NARRATION_BASS_HZ,
  promoPreviewMusicVolume,
} from '@/lib/publish/promoAudioMix'
import { promoFrameClass } from '@/lib/publish/promoFrame'
import { promoStudioWatermarkPayload } from '@/lib/publish/promoTimeline'
import {
  promoNarrationCue,
  promoPreviewNarrationOn,
  type PromoPreviewShot,
} from '@/lib/publish/promoPreviewSequence'
import type { PromoFrameAspect } from '@/types/publishingAssets'
import { cn } from '@/lib/utils'

export interface PromoCutPreviewProps {
  playing: boolean
  shots: PromoPreviewShot[]
  narrationUrl?: string
  /** Seconds of picture before the voice begins. */
  narrationStartSec?: number
  musicUrl?: string
  onEnded: () => void
  /** Source frame. 16:9 unless the blueprint is vertical. */
  aspect?: PromoFrameAspect
  /** SceneFlow Studio mark. On unless the promo watermark is turned off. */
  watermark?: boolean
}

export interface PromoCutPreviewHandle {
  /** Start the voice and music inside the Preview click, then attach the bass graph. */
  start: () => void
}

/**
 * Plays the planned cut in the promo tab with clip sound over the looping
 * music, at the same mix the trailer stitch renders. This does not start a stitch.
 *
 * Narration stays on the speakers until Preview is pressed. It then starts
 * once, on the assigned shot, and keeps that playhead across later shots.
 * The lowshelf is attached only after the audio context is running, so a
 * suspended graph cannot silence the voice.
 */
export const PromoCutPreview = forwardRef<PromoCutPreviewHandle, PromoCutPreviewProps>(
  function PromoCutPreview(
    {
      playing,
      shots,
      narrationUrl,
      narrationStartSec = 0,
      musicUrl,
      onEnded,
      aspect = '16:9',
      watermark = true,
    },
    ref
  ) {
    const [index, setIndex] = useState(0)
    const advanced = useRef(false)
    const narrationRef = useRef<HTMLAudioElement>(null)
    const musicRef = useRef<HTMLAudioElement>(null)
    const narrationGraphRef = useRef<AudioContext | null>(null)
    const narrationSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
    const narrationConnectingRef = useRef(false)
    const narrationCueStartedRef = useRef(false)
    const onEndedRef = useRef(onEnded)
    onEndedRef.current = onEnded

    const applyNarrationCue = useCallback((narration: HTMLAudioElement, voiceOn: boolean) => {
      const cue = promoNarrationCue({
        started: narrationCueStartedRef.current,
        voiceOn,
        ended: narration.ended,
      })
      if (cue === 'wait') {
        narration.pause()
        narration.currentTime = 0
        return
      }
      if (cue === 'start') {
        narrationCueStartedRef.current = true
        narration.currentTime = 0
        void narration.play().catch(() => undefined)
        return
      }
      // Hold the playhead. Resume a browser pause, and leave a finished read finished.
      if (narration.paused && !narration.ended) {
        void narration.play().catch(() => undefined)
      }
    }, [])

    const connectNarrationGraph = useCallback(() => {
      const narration = narrationRef.current
      if (!narration || narrationSourceRef.current || narrationConnectingRef.current) return
      let context: AudioContext
      try {
        context = new AudioContext()
      } catch {
        narration.volume = 1
        return
      }
      narrationConnectingRef.current = true
      narrationGraphRef.current = context
      void context.resume()
        .then(() => {
          if (context.state !== 'running') {
            throw new Error('Audio context stayed suspended')
          }
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
          narrationSourceRef.current = source
        })
        .catch(() => {
          narration.volume = 1
          if (!narrationSourceRef.current) {
            narrationGraphRef.current = null
            void context.close()
          }
        })
        .finally(() => {
          narrationConnectingRef.current = false
        })
    }, [])

    const startPreviewAudio = useCallback(() => {
      const narration = narrationRef.current
      const music = musicRef.current
      narrationCueStartedRef.current = false
      if (narration) {
        narration.currentTime = 0
        const unlock = narration.play()
        if (narrationStartSec > 0.05) {
          narration.pause()
          narration.currentTime = 0
        } else {
          narrationCueStartedRef.current = true
        }
        void unlock?.catch(() => undefined)
      }
      if (music) {
        music.currentTime = 0
        music.volume = PROMO_AUDIO_MIX.music
        void music.play().catch(() => undefined)
      }
      const context = narrationGraphRef.current
      if (context && narrationSourceRef.current) {
        void context.resume().catch(() => {
          if (narration) narration.volume = 1
        })
        return
      }
      if (narrationConnectingRef.current) return
      connectNarrationGraph()
    }, [connectNarrationGraph, narrationStartSec])

    useEffect(() => {
      narrationCueStartedRef.current = false
    }, [narrationUrl])

    useImperativeHandle(ref, () => ({ start: startPreviewAudio }), [startPreviewAudio])

    useEffect(() => {
      return () => {
        narrationSourceRef.current = null
        narrationConnectingRef.current = false
        const context = narrationGraphRef.current
        narrationGraphRef.current = null
        void context?.close()
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
        narrationCueStartedRef.current = false
        narration?.pause()
        music?.pause()
        if (narration) narration.currentTime = 0
        if (music) music.currentTime = 0
        return
      }
      if (music) music.volume = PROMO_AUDIO_MIX.music
      if (narration) {
        applyNarrationCue(narration, promoPreviewNarrationOn(shots, index, narrationStartSec))
      }
      void music?.play().catch(() => undefined)
    }, [playing, narrationUrl, musicUrl, shots, index, narrationStartSec, applyNarrationCue])

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
          <audio
            key={narrationUrl}
            ref={narrationRef}
            src={narrationUrl}
            crossOrigin="anonymous"
            preload="auto"
          />
        ) : null}
        {musicUrl ? <audio ref={musicRef} src={musicUrl} loop preload="auto" /> : null}
      </>
    )
  }
)
