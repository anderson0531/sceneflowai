'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Music, Pause, Play, Volume2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { MUSIC_FADE_MAX_SEC, resolveMusicCueFadeSec, resolveMusicCueVolume } from '@/lib/audio/loopingAudioSync'
import { formatMusicCueRange } from '@/lib/script/sceneMusicCues'
import type { SceneMusicCue } from '@/lib/script/segmentTypes'

export interface ScoreShotRow {
  beatId: string
  number: number
  enabled: boolean
  covered: boolean
  cueLabel: string
  volume: number
}

/**
 * Per-cue and per-shot score controls under the Mixer Score row.
 * Cue mix is stored on the cue. Shot mute is stored on the shot. Shot volume is mixer state.
 */
export function ScoreMusicControls({
  cues,
  shots,
  disabled,
  onCueMixChange,
  onShotEnabledChange,
  onShotVolumeChange,
}: {
  cues: SceneMusicCue[]
  shots: ScoreShotRow[]
  disabled?: boolean
  onCueMixChange?: (
    cueId: string,
    mix: { volume?: number; fadeInSec?: number; fadeOutSec?: number }
  ) => void
  onShotEnabledChange?: (beatId: string, enabled: boolean) => void
  onShotVolumeChange?: (beatId: string, volume: number) => void
}) {
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([])
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => audio?.pause())
    }
  }, [])

  const togglePreview = (index: number) => {
    const audio = audioRefs.current[index]
    if (!audio) return
    if (playingIndex === index) {
      audio.pause()
      setPlayingIndex(null)
      return
    }
    if (playingIndex !== null) audioRefs.current[playingIndex]?.pause()
    audio.currentTime = 0
    audio.volume = resolveMusicCueVolume(cues[index]?.volume)
    audio.play().catch(() => {})
    setPlayingIndex(index)
  }

  if (cues.length === 0 && shots.length === 0) return null

  return (
    <div className="mt-1 space-y-4 border-t border-gray-700/50 pt-3">
      {cues.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Score tracks</span>
            <span className="text-[10px] text-gray-500">
              {cues.length} {cues.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>
          {cues.map((cue, index) => {
            const volume = resolveMusicCueVolume(cue.volume)
            const fadeIn = resolveMusicCueFadeSec(cue.fadeInSec)
            const fadeOut = resolveMusicCueFadeSec(cue.fadeOutSec)
            const isPlaying = playingIndex === index
            return (
              <div
                key={cue.cueId}
                className="space-y-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-2.5"
              >
                <div className="flex items-center gap-2">
                  {cue.url ? (
                    <button
                      type="button"
                      onClick={() => togglePreview(index)}
                      disabled={disabled}
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                        isPlaying
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      title={`Play ${formatMusicCueRange(cue)}`}
                    >
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                  ) : (
                    <Music className="h-3.5 w-3.5 flex-shrink-0 text-fuchsia-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">
                      {cue.intent?.trim() || 'Score'}
                    </p>
                    <p className="text-[10px] text-gray-400">{formatMusicCueRange(cue)}</p>
                  </div>
                </div>
                <MixSlider
                  label="Volume"
                  value={volume * 100}
                  max={100}
                  step={1}
                  display={`${Math.round(volume * 100)}%`}
                  disabled={disabled || !onCueMixChange}
                  onChange={(next) => onCueMixChange?.(cue.cueId, { volume: next / 100 })}
                />
                <MixSlider
                  label="Fade In"
                  value={Math.round(fadeIn * 10) / 10}
                  max={MUSIC_FADE_MAX_SEC}
                  step={0.5}
                  display={`${fadeIn.toFixed(1)}s`}
                  disabled={disabled || !onCueMixChange}
                  onChange={(next) =>
                    onCueMixChange?.(cue.cueId, {
                      fadeInSec: Math.max(0, Math.min(MUSIC_FADE_MAX_SEC, next)),
                    })
                  }
                />
                <MixSlider
                  label="Fade Out"
                  value={Math.round(fadeOut * 10) / 10}
                  max={MUSIC_FADE_MAX_SEC}
                  step={0.5}
                  display={`${fadeOut.toFixed(1)}s`}
                  disabled={disabled || !onCueMixChange}
                  onChange={(next) =>
                    onCueMixChange?.(cue.cueId, {
                      fadeOutSec: Math.max(0, Math.min(MUSIC_FADE_MAX_SEC, next)),
                    })
                  }
                />
                {cue.url && (
                  <audio
                    ref={(el) => {
                      audioRefs.current[index] = el
                    }}
                    src={cue.url}
                    preload="none"
                    onEnded={() => {
                      if (playingIndex === index) setPlayingIndex(null)
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {shots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Shots</span>
            <span className="text-[10px] text-gray-500">
              {shots.length} {shots.length === 1 ? 'shot' : 'shots'}
            </span>
          </div>
          {shots.map((shot) => (
            <div
              key={shot.beatId}
              className={`flex items-center gap-2 rounded border p-2 ${
                shot.enabled && shot.covered
                  ? 'border-fuchsia-500/30 bg-fuchsia-600/15'
                  : 'border-gray-600/30 bg-gray-700/30'
              }`}
            >
              <button
                type="button"
                disabled={disabled || !onShotEnabledChange}
                onClick={() => onShotEnabledChange?.(shot.beatId, !shot.enabled)}
                className={`h-8 w-10 flex-shrink-0 rounded text-xs font-medium transition-colors ${
                  shot.enabled
                    ? 'bg-fuchsia-600/40 text-fuchsia-200 hover:bg-fuchsia-600/60'
                    : 'bg-gray-700/50 text-gray-500 hover:bg-gray-600/50'
                }`}
                title={shot.enabled ? 'Mute score on this shot' : 'Enable score on this shot'}
              >
                #{shot.number}
              </button>
              {shot.enabled ? (
                <>
                  <Volume2 className="h-3 w-3 flex-shrink-0 text-gray-500" />
                  <Slider
                    value={[Math.round(shot.volume * 100)]}
                    onValueChange={([value]) => onShotVolumeChange?.(shot.beatId, value / 100)}
                    max={100}
                    step={1}
                    disabled={disabled || !onShotVolumeChange}
                    className="flex-1"
                  />
                  <span className="w-10 text-right font-mono text-xs text-gray-400">
                    {Math.round(shot.volume * 100)}%
                  </span>
                </>
              ) : (
                <span className="flex-1 text-xs italic text-gray-500">Muted</span>
              )}
              <span className="hidden max-w-[8rem] truncate text-[10px] text-gray-500 sm:inline">
                {shot.covered ? shot.cueLabel : 'No score'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MixSlider({
  label,
  value,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string
  value: number
  max: number
  step: number
  display: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] uppercase text-gray-500">{label}</span>
      <Slider
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1"
      />
      <span className="w-10 text-right font-mono text-xs tabular-nums text-gray-400">{display}</span>
    </div>
  )
}
