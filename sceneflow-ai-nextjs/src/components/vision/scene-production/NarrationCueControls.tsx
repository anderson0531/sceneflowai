'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Clock, Mic, Pause, Play, Sparkles, User } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { MixerNarrationCueConfig } from '@/components/vision/scene-production/types'
import type { MixerNarrationClip } from '@/lib/scene/mixerNarrationCues'
import { formatNarrationCueRange } from '@/lib/script/sceneNarrationCues'
import type { NarrationAlignmentMode, SceneNarrationCue } from '@/lib/script/segmentTypes'

const ALIGNMENT_MODES: Array<{
  id: NarrationAlignmentMode
  label: string
  hint: string
}> = [
  {
    id: 'flow',
    label: 'Flow',
    hint: 'Natural pacing: subtle motion stretch + gentle close push when VO exceeds shot span',
  },
  {
    id: 'intro-freeze',
    label: 'Intro Freeze',
    hint: 'Hold opening frame while VO introduces the shot, then start video motion',
  },
  {
    id: 'outro-freeze',
    label: 'Close Freeze',
    hint: 'Play video at 1.0x and hold the closing frame while trailing VO finishes',
  },
  {
    id: 'slow-mo-fit',
    label: 'Slow-Mo Fit',
    hint: 'Stretch video motion smoothly (down to 0.5x) across covered shots to fit VO',
  },
  {
    id: 'manual',
    label: 'Manual',
    hint: 'Use only manual per-shot Intro/Speed/Close settings from Shot Pacing',
  },
]

function formatShortClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function NarrationCueControls({
  cues,
  clips,
  language,
  cueConfigs,
  warmBroadcastEq = true,
  disabled,
  onWarmBroadcastEqChange,
  onCueConfigChange,
  onSeekToTime,
}: {
  cues: SceneNarrationCue[]
  clips: MixerNarrationClip[]
  language: string
  cueConfigs: Record<string, Partial<MixerNarrationCueConfig>>
  warmBroadcastEq?: boolean
  disabled?: boolean
  onWarmBroadcastEqChange?: (enabled: boolean) => void
  onCueConfigChange?: (cueId: string, patch: Partial<MixerNarrationCueConfig>) => void
  onSeekToTime?: (timeSec: number) => void
}) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [playingCueId, setPlayingCueId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((el) => el?.pause())
    }
  }, [])

  const clipByCueId = new Map(clips.map((c) => [c.cueId, c]))
  const langKey = language.trim().toLowerCase() || 'en'

  const togglePreview = (cueId: string, volume: number) => {
    const audio = audioRefs.current[cueId]
    if (!audio) return
    if (playingCueId === cueId) {
      audio.pause()
      setPlayingCueId(null)
      return
    }
    if (playingCueId && audioRefs.current[playingCueId]) {
      audioRefs.current[playingCueId]?.pause()
    }
    audio.currentTime = 0
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.play().catch(() => {})
    setPlayingCueId(cueId)
  }

  if (cues.length === 0 && clips.length === 0) return null

  return (
    <div className="mt-1 space-y-3 border-t border-gray-700/50 pt-3">
      {/* Broadcast Warmth EQ Toggle */}
      {onWarmBroadcastEqChange && (
        <div
          className="flex items-center justify-between gap-2 rounded-md border border-purple-500/25 bg-zinc-950/75 px-2.5 py-1.5"
          title="Applies a broadcast +4 dB @ 120 Hz low-shelf presence curve to voiceover stems during render"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-300 shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-200">
                Warm Broadcast Presence (+4 dB @ 120 Hz)
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 truncate">
              Adds studio low-end warmth & clarity above background score
            </p>
          </div>
          <Switch
            checked={warmBroadcastEq}
            onCheckedChange={onWarmBroadcastEqChange}
            disabled={disabled}
            className="scale-90"
          />
        </div>
      )}

      {/* Shot-Aligned Cue Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">
            Shot-Aligned Narration Cues ({langKey.toUpperCase()})
          </span>
          <span className="text-[10px] text-gray-500">
            {cues.length > 0 ? `${cues.length} ${cues.length === 1 ? 'cue' : 'cues'}` : `${clips.length} track`}
          </span>
        </div>

        {cues.map((cue) => {
          const override = cueConfigs[cue.cueId]
          const isEnabled = override?.enabled !== false
          const clip = clipByCueId.get(cue.cueId)
          const langEntry = cue.byLanguage?.[langKey]
          const audioUrl = clip?.url || langEntry?.audioUrl
          const text = clip?.text || langEntry?.text || cue.byLanguage?.en?.text || ''
          const volume = Math.max(0, Math.min(1.5, override?.volume ?? cue.volume ?? 1))
          const startOffsetSec = override?.startOffsetSec ?? cue.startOffsetSec ?? 0
          const alignmentMode: NarrationAlignmentMode =
            override?.alignmentMode ?? cue.alignmentMode ?? 'flow'
          const isPlaying = playingCueId === cue.cueId
          const speakerLabel =
            cue.speakerType === 'character' && cue.characterName?.trim()
              ? `${cue.characterName.trim()} (V.O.)`
              : 'NARRATOR'

          return (
            <div
              key={cue.cueId}
              className={`space-y-2.5 rounded-lg border p-2.5 transition-colors ${
                isEnabled && audioUrl
                  ? 'border-purple-500/35 bg-purple-500/10'
                  : 'border-zinc-700/50 bg-zinc-900/50 opacity-75'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {audioUrl ? (
                    <button
                      type="button"
                      onClick={() => togglePreview(cue.cueId, volume)}
                      disabled={disabled}
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isPlaying
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 text-purple-200 hover:bg-zinc-700'
                      }`}
                      title={`Preview ${speakerLabel} (${formatNarrationCueRange(cue)})`}
                    >
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                  ) : (
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-500"
                      title={`No ${langKey.toUpperCase()} audio synthesized yet — generate in Narration tab`}
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                        {cue.speakerType === 'character' ? (
                          <User className="h-3 w-3 text-cyan-300" />
                        ) : (
                          <Mic className="h-3 w-3 text-purple-300" />
                        )}
                        {speakerLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (clip && onSeekToTime) onSeekToTime(clip.startTime)
                        }}
                        className="rounded border border-purple-400/40 bg-purple-950/60 px-1.5 py-0.5 font-mono text-[10px] text-purple-200 hover:bg-purple-900/60"
                        title="Jump playhead to cue start on timeline"
                      >
                        {formatNarrationCueRange(cue)}
                      </button>
                      {clip && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-zinc-400">
                          <Clock className="h-2.5 w-2.5" />
                          {formatShortClock(clip.startTime)}–{formatShortClock(clip.startTime + clip.duration)} (
                          {clip.duration.toFixed(1)}s)
                        </span>
                      )}
                      {!audioUrl && (
                        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300">
                          Needs {langKey.toUpperCase()} TTS
                        </span>
                      )}
                    </div>
                    {text && (
                      <p
                        className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-300/90 italic"
                        title={text}
                      >
                        &ldquo;{text}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <Switch
                  checked={isEnabled}
                  onCheckedChange={(enabled) => onCueConfigChange?.(cue.cueId, { enabled })}
                  disabled={disabled || !onCueConfigChange}
                  className="scale-90 shrink-0"
                />
              </div>

              {isEnabled && (
                <div className="space-y-2 border-t border-purple-500/20 pt-2">
                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[10px] uppercase text-gray-500">Cue Vol</span>
                    <Slider
                      value={[Math.round(volume * 100)]}
                      onValueChange={([next]) =>
                        onCueConfigChange?.(cue.cueId, { volume: next / 100 })
                      }
                      min={0}
                      max={150}
                      step={5}
                      disabled={disabled || !onCueConfigChange}
                      className="flex-1"
                    />
                    <span className="w-11 text-right font-mono text-xs tabular-nums text-gray-400">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  {/* Entry Offset */}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-16 shrink-0 text-[10px] uppercase text-gray-500"
                      title="Shift voiceover entry relative to its starting shot boundary"
                    >
                      Entry
                    </span>
                    <Slider
                      value={[Math.round(startOffsetSec * 10) / 10]}
                      onValueChange={([next]) =>
                        onCueConfigChange?.(cue.cueId, {
                          startOffsetSec: Math.round(next * 10) / 10,
                        })
                      }
                      min={-0.5}
                      max={3.0}
                      step={0.1}
                      disabled={disabled || !onCueConfigChange}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      disabled={disabled || Math.abs(startOffsetSec) < 0.05}
                      onClick={() => onCueConfigChange?.(cue.cueId, { startOffsetSec: 0 })}
                      className="w-11 text-right font-mono text-xs tabular-nums text-gray-400 hover:text-white disabled:hover:text-gray-400"
                      title="Click to reset entry offset to 0.0s"
                    >
                      {startOffsetSec >= 0 ? `+${startOffsetSec.toFixed(1)}s` : `${startOffsetSec.toFixed(1)}s`}
                    </button>
                  </div>

                  {/* Pacing & Alignment Mode */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase text-gray-500">Shot Sync Mode</span>
                      <span className="text-[9px] text-purple-300/80">
                        {ALIGNMENT_MODES.find((m) => m.id === alignmentMode)?.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {ALIGNMENT_MODES.map((mode) => {
                        const active = alignmentMode === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            disabled={disabled || !onCueConfigChange}
                            onClick={() =>
                              onCueConfigChange?.(cue.cueId, { alignmentMode: mode.id })
                            }
                            title={mode.hint}
                            className={`rounded border px-1.5 py-1 text-[9px] font-medium transition-colors ${
                              active
                                ? 'border-purple-400/70 bg-purple-600/35 text-purple-100'
                                : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            {mode.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {audioUrl && (
                <audio
                  ref={(el) => {
                    audioRefs.current[cue.cueId] = el
                  }}
                  src={audioUrl}
                  preload="none"
                  onEnded={() => {
                    if (playingCueId === cue.cueId) setPlayingCueId(null)
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
