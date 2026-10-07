'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2, Pause, Play, RefreshCw, Volume2 } from 'lucide-react'
import { BeatAudioStatusBadge } from '@/components/vision/BeatAudioStatusBadge'
import { toast } from 'sonner'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration, resolveSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { saveAudioFile } from '@/lib/download/saveFile'
import { resolveBeatSfxSlot, readBeatSfxAudio } from '@/lib/script/deriveSfxFromSceneContent'
import { actionBeatSfxIsStale } from '@/lib/audio/beatAudioStale'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  dispatchGenerateVeoSfx,
  HIFI_CREDIT_HINT,
} from '@/lib/sfx/clientGenerateVeoSfx'
import {
  resolveAutoVeoSfxDuration,
  resolveVeoSfxTargetSeconds,
  veoSfxCoversFullBeat,
} from '@/lib/sfx/veoSfxDuration'

export type ExpressBeatSfxStatus = 'pending' | 'running' | 'done' | 'error'

export interface ActionBeatSfxControlsProps {
  beat: SceneBeat
  scene: Record<string, unknown>
  sceneIdx: number
  projectId?: string
  segmentDurationSeconds?: number
  playingAudio: string | null
  expressStatus?: ExpressBeatSfxStatus
  isExpressRunning?: boolean
  onPlayAudio?: (audioUrl: string, label: string, sceneId?: string) => void
  onSaveSfxAudio?: (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null,
    beatContext?: { beatId: string; beatDescription: string }
  ) => Promise<void> | void
}

export function ActionBeatSfxControls({
  beat,
  scene,
  sceneIdx,
  projectId,
  segmentDurationSeconds,
  playingAudio,
  expressStatus,
  isExpressRunning = false,
  onPlayAudio,
  onSaveSfxAudio,
}: ActionBeatSfxControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingElevenLabs, setIsGeneratingElevenLabs] = useState(false)
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')

  const slot = useMemo(
    () => resolveBeatSfxSlot(scene, beat),
    [scene, beat.beatId, beat.actionDescription]
  )

  const sfxSourceMetaList = Array.isArray(scene.sfxSourceMeta) ? scene.sfxSourceMeta : []
  const sfxAudio = readBeatSfxAudio(scene, slot)
  const sfxStale = actionBeatSfxIsStale(scene, beat, !!sfxAudio)
  const sfxSourceMeta = sfxSourceMetaList[slot.sfxIndex] as Record<string, unknown> | null | undefined
  const isHifi =
    sfxSourceMeta?.source === 'veo'

  const actionText = beat.actionDescription?.trim() ?? ''
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const veoAutoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)
  const showPartialVeoHint = !veoSfxCoversFullBeat(segmentDurationSeconds, durationPreset)

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: `Auto (${Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)}s)`,
    },
    { id: 'short', label: 'Short 3s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s' },
  ]

  const handleGenerate = async () => {
    if (!projectId) {
      toast.error('Project context is missing for SFX generation.')
      return
    }
    if (!actionText) {
      toast.info('Add an action description before generating SFX.')
      return
    }

    setIsGenerating(true)
    try {
      const result = await dispatchGenerateVeoSfx({
        projectId,
        text: actionText,
        sfxId: slot.sfxId,
        sfxIndex: slot.sfxIndex,
        segmentDurationSeconds,
        durationOverride: durationPreset,
        hasExistingAudio: !!sfxAudio,
        promptMode: 'actionBeat',
      })
      await onSaveSfxAudio?.(
        sceneIdx,
        'sfx',
        result.url,
        slot.sfxIndex,
        result.attribution,
        { beatId: beat.beatId, beatDescription: actionText }
      )
    } catch (error) {
      if ((error as Error)?.message !== 'Insufficient credits') {
        console.error('[ActionShotSfxControls] Veo SFX generation failed:', error)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const isBusy = isGenerating || isGeneratingElevenLabs || isExpressRunning || expressStatus === 'running'

  const handleElevenLabs = async () => {
    if (!projectId) {
      toast.error('Project context is missing for SFX generation.')
      return
    }
    if (!actionText) {
      toast.info('Add an action description before generating SFX.')
      return
    }
    setIsGeneratingElevenLabs(true)
    const toastId = toast.loading(sfxAudio ? 'Re-generating ElevenLabs sound...' : 'Generating ElevenLabs sound...')
    try {
      const durationSeconds = resolveSfxDuration({
        segmentDurationSeconds,
        override: durationPreset,
      })
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sfxId: slot.sfxId,
          sfxIndex: slot.sfxIndex,
          text: actionText,
          durationSeconds,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Sound effect failed (HTTP ${response.status})`)
      }
      const data = await response.json()
      if (!data?.url) throw new Error('Sound effect response missing audio URL')
      await onSaveSfxAudio?.(sceneIdx, 'sfx', data.url, slot.sfxIndex, null, {
        beatId: beat.beatId,
        beatDescription: actionText,
      })
      toast.success(sfxAudio ? 'ElevenLabs sound re-generated.' : 'ElevenLabs sound generated.', {
        id: toastId,
      })
    } catch (error) {
      toast.error(`Failed to generate sound effect: ${(error as Error)?.message || 'Unknown error'}`, {
        id: toastId,
      })
    } finally {
      setIsGeneratingElevenLabs(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-amber-700/40">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">
            Action SFX
          </span>
          <BeatAudioStatusBadge hasAudio={!!sfxAudio} stale={sfxStale} />
          {isHifi && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-200 rounded">
              HiFi
            </span>
          )}
          {expressStatus === 'running' && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-200 rounded flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Agent
            </span>
          )}
          {expressStatus === 'done' && (
            <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
              Done
            </span>
          )}
          {expressStatus === 'error' && (
            <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-300 rounded">
              Failed
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sfxAudio ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayAudio?.(sfxAudio, `action-sfx-${beat.beatId}`)
                }}
                className="p-1 hover:bg-amber-900/40 rounded text-amber-100"
                title="Play SFX"
              >
                {playingAudio === sfxAudio ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleGenerate()
                }}
                disabled={isBusy || !actionText}
                className="p-1 hover:bg-amber-900/40 rounded text-amber-100 disabled:opacity-50"
                title="Regenerate SFX"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void saveAudioFile({
                    url: sfxAudio,
                    sceneNumber: sceneIdx + 1,
                    track: 'sfx',
                    index: slot.sfxIndex,
                  }).catch(() => toast.error('Failed to save audio file'))
                }}
                className="p-1 hover:bg-amber-900/40 rounded text-amber-100"
                title="Download SFX"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleElevenLabs()
                }}
                disabled={isBusy || !actionText}
                title="ElevenLabs · about 15 credits"
                className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50"
              >
                {isGeneratingElevenLabs ? 'ElevenLabs...' : 'ElevenLabs'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleGenerate()
                }}
                disabled={isBusy || !actionText}
                title={HIFI_CREDIT_HINT}
                className="text-xs px-2 py-1 border border-amber-500/60 text-amber-100 rounded disabled:opacity-50"
              >
                {isGenerating ? 'HiFi...' : 'HiFi'}
              </button>
            </span>
          )}
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="text-[10px] uppercase tracking-wide text-amber-300/60 mr-1">Duration</span>
        {chips.map((chip) => {
          const active = durationPreset === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation()
                setDurationPreset(chip.id)
              }}
              className={`text-[10px] leading-none px-2 py-0.5 rounded border transition-colors ${
                active
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'bg-transparent border-amber-600/40 text-amber-100/80 hover:bg-amber-900/40'
              } disabled:opacity-50`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
      {showPartialVeoHint && (
        <p className="text-[10px] text-amber-200/60 mb-1">
          HiFi covers up to 8s (Auto target{' '}
          {resolveVeoSfxTargetSeconds({ segmentDurationSeconds, override: durationPreset })}s →{' '}
          {veoAutoSeconds}s clip).
        </p>
      )}
      <p className="text-[10px] text-amber-300/50">{HIFI_CREDIT_HINT}</p>
    </div>
  )
}
