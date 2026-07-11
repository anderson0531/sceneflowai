'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2, Pause, Play, Volume2, Waves } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { saveAudioFile } from '@/lib/download/saveFile'
import { resolveBeatSfxSlot, readBeatSfxAudio } from '@/lib/script/deriveSfxFromSceneContent'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  dispatchGenerateVeoSfx,
  VEO_SFX_CREDIT_HINT,
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
  expressSelectable?: boolean
  expressSelected?: boolean
  onExpressSelectedChange?: (beatId: string, selected: boolean) => void
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
  expressSelectable = false,
  expressSelected = false,
  onExpressSelectedChange,
  expressStatus,
  isExpressRunning = false,
  onPlayAudio,
  onSaveSfxAudio,
}: ActionBeatSfxControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')

  const slot = useMemo(
    () => resolveBeatSfxSlot(scene, beat),
    [scene, beat.beatId, beat.actionDescription]
  )

  const sfxSourceMetaList = Array.isArray(scene.sfxSourceMeta) ? scene.sfxSourceMeta : []
  const sfxAudio = readBeatSfxAudio(scene, slot)
  const sfxSourceMeta = sfxSourceMetaList[slot.sfxIndex] as Record<string, unknown> | null | undefined
  const isVeoAction =
    sfxSourceMeta?.source === 'veo' && sfxSourceMeta?.promptMode === 'actionBeat'

  const actionText = beat.actionDescription?.trim() ?? ''
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const veoAutoSeconds = resolveAutoVeoSfxDuration(segmentDurationSeconds)
  const showPartialVeoHint = !veoSfxCoversFullBeat(segmentDurationSeconds, durationPreset)

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: `Auto (${Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)}s · Veo ${veoAutoSeconds}s)`,
    },
    { id: 'short', label: 'Short 3s / Veo 4s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s / Veo 8s max' },
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
        console.error('[ActionBeatSfxControls] Veo SFX generation failed:', error)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const isBusy = isGenerating || isExpressRunning || expressStatus === 'running'

  return (
    <div className="mt-3 pt-3 border-t border-slate-600/40">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {expressSelectable && (
            <Checkbox
              checked={expressSelected}
              onCheckedChange={(checked) =>
                onExpressSelectedChange?.(beat.beatId, checked === true)
              }
              disabled={isBusy || !actionText}
              onClick={(e) => e.stopPropagation()}
              className="border-violet-400/60 data-[state=checked]:bg-violet-600"
            />
          )}
          <Volume2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-300/90">
            Action SFX
          </span>
          {sfxAudio && (
            <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              Audio Ready
            </span>
          )}
          {isVeoAction && (
            <span className="text-[10px] px-2 py-0.5 bg-violet-500/15 text-violet-300 rounded">
              Veo action
            </span>
          )}
          {expressStatus === 'running' && (
            <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-200 rounded flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Express
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
          {sfxAudio && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayAudio?.(sfxAudio, `action-sfx-${beat.beatId}`)
                }}
                className="p-1.5 hover:bg-slate-700/40 rounded text-blue-200"
                title="Play SFX"
              >
                {playingAudio === sfxAudio ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
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
                className="p-1.5 hover:bg-slate-700/40 rounded text-blue-200"
                title="Download SFX"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs border-violet-400/60 text-violet-200 hover:bg-violet-900/30"
            onClick={(e) => {
              e.stopPropagation()
              void handleGenerate()
            }}
            disabled={isBusy || !actionText}
            title={VEO_SFX_CREDIT_HINT}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Veo...
              </>
            ) : (
              <>
                <Waves className="w-3 h-3 mr-1" />
                {sfxAudio ? 'Re-generate SFX' : 'Generate SFX'}
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="text-[10px] uppercase tracking-wide text-blue-300/60 mr-1">Duration</span>
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
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-transparent border-blue-600/40 text-blue-200/80 hover:bg-slate-700/40'
              } disabled:opacity-50`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
      {showPartialVeoHint && (
        <p className="text-[10px] text-blue-200/60 mb-1">
          Veo covers up to 8s (Auto target{' '}
          {resolveVeoSfxTargetSeconds({ segmentDurationSeconds, override: durationPreset })}s →{' '}
          {veoAutoSeconds}s clip).
        </p>
      )}
      <p className="text-[10px] text-violet-300/50">{VEO_SFX_CREDIT_HINT}</p>
    </div>
  )
}
