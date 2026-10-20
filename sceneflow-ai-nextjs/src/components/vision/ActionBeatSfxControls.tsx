'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2, Pause, Play, RefreshCw, Trash2, Upload, Volume2 } from 'lucide-react'
import { BeatAudioStatusBadge } from '@/components/vision/BeatAudioStatusBadge'
import { DialogueQualityToggle } from '@/components/vision/DialogueQualityToggle'
import { toast } from 'sonner'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveAutoSfxDuration, resolveSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { saveAudioFile } from '@/lib/download/saveFile'
import { distinctSfxCue } from '@/lib/audio/shotSfxTag'
import { resolveBeatSfxSlot, readBeatSfxAudio } from '@/lib/script/deriveSfxFromSceneContent'
import { actionBeatSfxIsStale, audioSourceFingerprintForSfxBeat } from '@/lib/audio/beatAudioStale'
import { extractAndSaveActionBeatClipAudio } from '@/lib/audio/extractAndApplyShotClipAudio'
import { uploadAssetViaAPI } from '@/lib/vision/uploads'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type ExpressBeatSfxStatus = 'pending' | 'running' | 'done' | 'error'

export interface ActionBeatSfxControlsProps {
  beat: SceneBeat
  scene: Record<string, unknown>
  sceneIdx: number
  sceneId?: string
  projectId?: string
  clipUrl?: string
  segmentDurationSeconds?: number
  playingAudio: string | null
  expressStatus?: ExpressBeatSfxStatus
  isExpressRunning?: boolean
  onPlayAudio?: (audioUrl: string, label: string, sceneId?: string) => void
  onDeleteSfxAudio?: (sceneIndex: number, sfxIndex: number) => void
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
  sceneId,
  projectId,
  clipUrl,
  segmentDurationSeconds,
  playingAudio,
  expressStatus,
  isExpressRunning = false,
  onPlayAudio,
  onDeleteSfxAudio,
  onSaveSfxAudio,
}: ActionBeatSfxControlsProps) {
  const [isGeneratingElevenLabs, setIsGeneratingElevenLabs] = useState(false)
  const [isExtractingClipAudio, setIsExtractingClipAudio] = useState(false)
  const [isUploadingSfx, setIsUploadingSfx] = useState(false)
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')

  const slot = useMemo(
    () => resolveBeatSfxSlot(scene, beat),
    [scene, beat.beatId, beat.actionDescription]
  )

  const sfxAudio = readBeatSfxAudio(scene, slot)
  const sfxStale = actionBeatSfxIsStale(scene, beat, !!sfxAudio)
  const sfxText = distinctSfxCue(beat)
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)

  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    {
      id: 'auto',
      label: `Auto (${Number.isInteger(autoSeconds) ? autoSeconds : autoSeconds.toFixed(1)}s)`,
    },
    { id: 'short', label: 'Short 3s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s' },
  ]

  const isBusy =
    isGeneratingElevenLabs ||
    isExtractingClipAudio ||
    isUploadingSfx ||
    isExpressRunning ||
    expressStatus === 'running'

  const handleUploadSfxAudio = () => {
    if (!projectId) {
      toast.error('Project context is missing for audio upload.')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mp3,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      setIsUploadingSfx(true)
      const toastId = toast.loading('Uploading MP3 audio...')
      try {
        const audioUrl = await uploadAssetViaAPI(file, projectId)
        const beatDescription =
          audioSourceFingerprintForSfxBeat(beat) ||
          beat.actionDescription?.trim() ||
          file.name ||
          'Uploaded shot audio'
        await onSaveSfxAudio?.(sceneIdx, 'sfx', audioUrl, slot.sfxIndex, null, {
          beatId: beat.beatId,
          beatDescription,
        })
        toast.success('Shot audio uploaded.', { id: toastId })
      } catch (error) {
        toast.error(
          `Failed to upload audio: ${(error as Error)?.message || 'Unknown error'}`,
          { id: toastId }
        )
      } finally {
        setIsUploadingSfx(false)
      }
    }
    input.click()
  }

  const handleExtractClipAudio = async () => {
    if (!projectId) {
      toast.error('Project context is missing for clip audio extraction.')
      return
    }
    if (!clipUrl) {
      toast.info('Generate a video clip for this shot first.')
      return
    }
    setIsExtractingClipAudio(true)
    const toastId = toast.loading('Extracting MP3 from shot video clip...')
    try {
      await extractAndSaveActionBeatClipAudio({
        projectId,
        sceneIndex: sceneIdx,
        sceneId,
        beat,
        sfxIndex: slot.sfxIndex,
        videoUrl: clipUrl,
        onSaveSfxAudio,
      })
      toast.success('Shot audio updated with MP3 from video clip.', { id: toastId })
    } catch (error) {
      toast.error(
        `Failed to extract clip MP3: ${(error as Error)?.message || 'Unknown error'}`,
        { id: toastId }
      )
    } finally {
      setIsExtractingClipAudio(false)
    }
  }

  const handleElevenLabs = async () => {
    if (!projectId) {
      toast.error('Project context is missing for SFX generation.')
      return
    }
    if (!sfxText) {
      toast.info('This shot is carried by the score.')
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
          text: sfxText,
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
        beatDescription: audioSourceFingerprintForSfxBeat(beat),
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
                  void handleElevenLabs()
                }}
                disabled={isBusy || !sfxText}
                className="p-1 hover:bg-amber-900/40 rounded text-amber-100 disabled:opacity-50"
                title="Regenerate SFX"
              >
                {isGeneratingElevenLabs ? (
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
              {onDeleteSfxAudio && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this shot’s audio? You can regenerate or upload a new MP3 later.')) {
                      onDeleteSfxAudio(sceneIdx, slot.sfxIndex)
                    }
                  }}
                  className="p-1 hover:bg-red-900/40 rounded text-red-400"
                  title="Delete Shot Audio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUploadSfxAudio()
                }}
                disabled={isBusy}
                className="p-1 hover:bg-amber-900/40 rounded text-amber-100 disabled:opacity-50"
                title="Upload Shot MP3 Audio"
              >
                {isUploadingSfx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
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
                disabled={isBusy || !sfxText}
                title="ElevenLabs · about 15 credits"
                className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50"
              >
                {isGeneratingElevenLabs ? 'ElevenLabs...' : 'ElevenLabs'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUploadSfxAudio()
                }}
                disabled={isBusy}
                className="p-1 hover:bg-amber-900/40 rounded text-amber-100 disabled:opacity-50"
                title="Upload Shot MP3 Audio"
              >
                {isUploadingSfx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
            </span>
          )}
        </div>
      </div>
      {sfxText ? (
        <>
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
          <p className="text-[10px] text-amber-300/50">ElevenLabs · about 15 credits</p>
        </>
      ) : (
        <p className="text-[10px] text-amber-300/60">
          {sfxAudio ? 'Custom shot audio ready.' : 'Score carries this shot unless you upload or extract audio.'}
        </p>
      )}
      <DialogueQualityToggle
        lofiTitle="ElevenLabs sound effect"
        disabled={isBusy}
        lofiDisabled={!sfxText}
        hasClip={!!clipUrl}
        isExtractingClipAudio={isExtractingClipAudio}
        isUploadingAudio={isUploadingSfx}
        isClipAudioActive={Boolean(sfxAudio && sfxAudio.includes('shot-audio-'))}
        onLofi={() => {
          void handleElevenLabs()
        }}
        onUploadAudio={() => {
          handleUploadSfxAudio()
        }}
        onExtractClipAudio={() => {
          void handleExtractClipAudio()
        }}
        onGenerateClip={() => {
          window.dispatchEvent(
            new CustomEvent('production:open-action-tab', {
              detail: { sceneIndex: sceneIdx, beatId: beat.beatId },
            })
          )
          toast.message('Generate this shot’s clip, then extract its MP3 to update shot audio.')
        }}
      />
    </div>
  )
}
