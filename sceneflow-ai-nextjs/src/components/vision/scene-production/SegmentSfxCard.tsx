'use client'

import { useState } from 'react'
import { Download, Loader2, Pause, Play, Sparkles, Trash2, Upload } from 'lucide-react'
import { Volume2 as VolumeIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { saveAudioFile } from '@/lib/download/saveFile'
import { uploadAssetViaAPI } from '@/lib/vision/uploads'
import { BeatAudioStatusBadge } from '@/components/vision/BeatAudioStatusBadge'
import { DialogueQualityToggle } from '@/components/vision/DialogueQualityToggle'
import {
  actionBeatSfxIsStale,
  audioSourceFingerprintForAction,
  audioSourceFingerprintForSfxBeat,
  isBeatAudioStale,
} from '@/lib/audio/beatAudioStale'
import { requestShotClipMp3Extraction } from '@/lib/audio/extractAndApplyShotClipAudio'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SegmentSFX } from '@/lib/script/segmentTypes'
import {
  resolveAutoSfxDuration,
  resolveSfxDuration,
  type SfxDurationOverride,
} from '@/lib/elevenlabs/sfxDuration'
/**
 * One SFX cue inside a segment. The cue's description is used to drive
 * ElevenLabs sound-generation; the resulting
 * GCS URL is persisted via the existing positional handlers (`scene.sfxAudio[idx]`,
 * `onDeleteSceneAudio(sceneIdx, 'sfx', undefined, idx)`) using
 * `sfx.legacyIndex` so legacy data keeps working.
 */
export interface SegmentSfxCardProps {
  scene: any
  sceneIdx: number
  sfx: SegmentSFX
  /** Position in the segment (0-based). Used for the "SFX 1" header label. */
  positionInSegment: number
  playingAudio: string | null
  projectId?: string
  clipUrl?: string
  /**
   * Parent segment duration in seconds (segment.endTime - segment.startTime).
   * Drives the "Auto" preset's resolved duration; falls back to 8s when not
   * provided.
   */
  segmentDurationSeconds?: number
  onPlayAudio?: (audioUrl: string, label: string) => void
  onDeleteSceneAudio?: (
    sceneIndex: number,
    audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx',
    dialogueIndex?: number,
    sfxIndex?: number
  ) => void
  /**
   * Persists a newly generated SFX URL via the parent's `saveSceneAudio` PATCH path.
   * Signature mirrors `ScriptPanel.saveSceneAudio` so we can pass it down directly.
   */
  onSaveSfxAudio?: (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null,
    beatContext?: { beatId?: string; beatDescription: string }
  ) => Promise<void> | void
}

export function SegmentSfxCard({
  scene,
  sceneIdx,
  sfx,
  positionInSegment,
  playingAudio,
  projectId,
  clipUrl,
  segmentDurationSeconds,
  onPlayAudio,
  onDeleteSceneAudio,
  onSaveSfxAudio,
}: SegmentSfxCardProps) {
  const [isGeneratingElevenLabs, setIsGeneratingElevenLabs] = useState(false)
  const [isExtractingClipAudio, setIsExtractingClipAudio] = useState(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [durationPreset, setDurationPreset] = useState<SfxDurationOverride>('auto')
  const autoSeconds = resolveAutoSfxDuration(segmentDurationSeconds)
  const isGenerating = isGeneratingElevenLabs || isExtractingClipAudio || isUploadingAudio

  const legacyIdx = sfx.legacyIndex
  const audioUrl: string | undefined =
    legacyIdx !== undefined && Array.isArray(scene?.sfxAudio)
      ? scene.sfxAudio[legacyIdx]
      : undefined
  const cueRaw =
    legacyIdx !== undefined && Array.isArray(scene?.sfx) ? scene.sfx[legacyIdx] : undefined
  const cue =
    cueRaw && typeof cueRaw === 'object' && !Array.isArray(cueRaw)
      ? (cueRaw as { sourceFingerprint?: string; audioStale?: boolean })
      : undefined
  const sourceBeat = sfx.sourceBeatId
    ? getSceneBeats(scene).find((beat) => beat.beatId === sfx.sourceBeatId)
    : undefined
  const sfxPrompt =
    (sourceBeat ? audioSourceFingerprintForSfxBeat(sourceBeat) : '').trim() ||
    (sfx.description || '').trim()
  const sfxStale =
    sourceBeat?.kind === 'action'
      ? actionBeatSfxIsStale(scene, sourceBeat, !!audioUrl)
      : isBeatAudioStale({
          hasAudio: !!audioUrl,
          sourceFingerprint: cue?.sourceFingerprint,
          audioStale: cue?.audioStale,
          currentFingerprint: audioSourceFingerprintForAction(sfx.description),
        })

  const dispatchDelete = () => {
    if (legacyIdx === undefined) return
    if (!confirm('Delete this sound effect? You can re-generate it from the cue description.')) return
    onDeleteSceneAudio?.(sceneIdx, 'sfx', undefined, legacyIdx)
  }

  const dispatchUploadMp3 = () => {
    if (legacyIdx === undefined) {
      toast.error('SFX cue is not linked to a legacy index yet.')
      return
    }
    if (!projectId) {
      toast.error('Project context is missing for audio upload.')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mp3,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setIsUploadingAudio(true)
      const toastId = toast.loading('Uploading shot MP3 audio...')
      try {
        const uploadedUrl = await uploadAssetViaAPI(file, projectId)
        await onSaveSfxAudio?.(sceneIdx, 'sfx', uploadedUrl, legacyIdx, null, {
          ...(sourceBeat?.beatId ? { beatId: sourceBeat.beatId } : {}),
          beatDescription: sfxPrompt || 'Uploaded shot audio',
        })
        toast.success('Shot MP3 audio uploaded.', { id: toastId })
      } catch (error: any) {
        console.error('[SegmentSfxCard] Audio upload failed:', error)
        toast.error(`Failed to upload audio: ${error?.message || 'Unknown error'}`, { id: toastId })
      } finally {
        setIsUploadingAudio(false)
      }
    }
    input.click()
  }

  const dispatchGenerateElevenLabs = async () => {
    if (legacyIdx === undefined) {
      toast.error('SFX cue is not linked to a legacy index yet.')
      return
    }
    if (!projectId) {
      toast.error('Project context is missing for SFX generation.')
      return
    }
    const description = sfxPrompt
    if (!description) {
      toast.info('Add a description for this SFX cue first.')
      return
    }

    setIsGeneratingElevenLabs(true)
    const toastId = toast.loading(audioUrl ? 'Re-generating SFX...' : 'Generating SFX...')
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
          sfxId: sfx.sfxId,
          sfxIndex: legacyIdx,
          text: description,
          durationSeconds,
        }),
      })

      if (!response.ok) {
        let payload: any = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }
        if (response.status === 402) {
          const need = payload?.creditsRequired
          const have = payload?.creditsAvailable
          toast.error(
            `Insufficient credits for SFX generation${
              typeof need === 'number' ? `. Need ${need} credits` : ''
            }${typeof have === 'number' ? ` (available: ${have})` : ''}.`,
            { id: toastId }
          )
          return
        }
        throw new Error(payload?.error || `SFX generation failed (HTTP ${response.status})`)
      }

      const data = await response.json()
      const url: string | undefined = data?.url
      if (!url) {
        throw new Error('SFX response missing audio URL')
      }

      await onSaveSfxAudio?.(sceneIdx, 'sfx', url, legacyIdx, null, {
        ...(sourceBeat?.beatId ? { beatId: sourceBeat.beatId } : {}),
        beatDescription: description,
      })
      toast.success(audioUrl ? 'SFX re-generated.' : 'SFX generated.', { id: toastId })
    } catch (error: any) {
      console.error('[SegmentSfxCard] SFX generation failed:', error)
      toast.error(`Failed to generate SFX: ${error?.message || 'Unknown error'}`, { id: toastId })
    } finally {
      setIsGeneratingElevenLabs(false)
    }
  }

  return (
    <div className="p-3 bg-amber-100/50 dark:bg-amber-950/30 rounded-lg border border-amber-300/50 dark:border-amber-700/50">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <VolumeIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            SFX {positionInSegment + 1}
          </span>
          <BeatAudioStatusBadge hasAudio={!!audioUrl} stale={sfxStale} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {audioUrl && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayAudio?.(audioUrl, `sfx-${legacyIdx ?? sfx.sfxId}`)
                }}
                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                title="Play SFX"
              >
                {playingAudio === audioUrl ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!audioUrl) return
                  void saveAudioFile({
                    url: audioUrl,
                    sceneNumber: sceneIdx + 1,
                    track: 'sfx',
                    index: legacyIdx ?? positionInSegment,
                  }).catch((error) => {
                    console.error('[SegmentSfxCard] Audio download failed:', error)
                    toast.error('Failed to save audio file')
                  })
                }}
                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                title="Download SFX"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatchDelete()
                }}
                className="p-1.5 hover:bg-red-200 dark:hover:bg-red-800/50 rounded text-red-500 dark:text-red-400"
                title="Delete SFX Audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              dispatchUploadMp3()
            }}
            disabled={isGenerating}
            className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded disabled:opacity-50"
            title="Upload MP3 for this shot"
          >
            <Upload className="w-4 h-4" />
          </button>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-amber-600 hover:bg-amber-700 text-white border-0"
            onClick={(e) => {
              e.stopPropagation()
              void dispatchGenerateElevenLabs()
            }}
            disabled={isGenerating}
            title="Short clip via ElevenLabs (~15 credits)"
          >
            {isGeneratingElevenLabs ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {audioUrl ? 'Re-generate' : 'Generate'}
              </>
            )}
          </Button>
        </div>
      </div>
      <DurationPresetChips
        value={durationPreset}
        autoSeconds={autoSeconds}
        onChange={setDurationPreset}
        disabled={isGenerating}
      />
      <div className="text-sm text-gray-700 dark:text-gray-300 italic">{sfx.description}</div>
      <DialogueQualityToggle
        lofiTitle="ElevenLabs sound effect"
        disabled={isGenerating}
        lofiDisabled={!sfxPrompt}
        hasClip={!!clipUrl}
        isExtractingClipAudio={isExtractingClipAudio}
        isUploadingAudio={isUploadingAudio}
        isClipAudioActive={Boolean(audioUrl && audioUrl.includes('shot-audio-'))}
        onLofi={() => {
          void dispatchGenerateElevenLabs()
        }}
        onUploadAudio={dispatchUploadMp3}
        onExtractClipAudio={() => {
          if (!projectId || !clipUrl || legacyIdx === undefined) return
          setIsExtractingClipAudio(true)
          const toastId = toast.loading('Extracting MP3 from shot video clip...')
          void requestShotClipMp3Extraction({
            projectId,
            videoUrl: clipUrl,
            beatId: sourceBeat?.beatId,
            sceneId: scene?.id || scene?.sceneId || `scene-${sceneIdx}`,
          })
            .then(async (extracted) => {
              await onSaveSfxAudio?.(sceneIdx, 'sfx', extracted.audioUrl, legacyIdx, null, {
                ...(sourceBeat?.beatId ? { beatId: sourceBeat.beatId } : {}),
                beatDescription: sfxPrompt || 'Shot clip audio',
              })
              toast.success('Shot audio updated with MP3 from video clip.', { id: toastId })
            })
            .catch((error: any) => {
              toast.error(
                `Failed to extract clip MP3: ${error?.message || 'Unknown error'}`,
                { id: toastId }
              )
            })
            .finally(() => {
              setIsExtractingClipAudio(false)
            })
        }}
        onGenerateClip={() => {
          window.dispatchEvent(
            new CustomEvent('production:open-action-tab', {
              detail: {
                sceneIndex: sceneIdx,
                ...(sourceBeat?.beatId ? { beatId: sourceBeat.beatId } : {}),
              },
            })
          )
          toast.message('Generate this shot’s clip, then extract its MP3 to update shot audio.')
        }}
      />
    </div>
  )
}

interface DurationPresetChipsProps {
  value: SfxDurationOverride
  autoSeconds: number
  onChange: (next: SfxDurationOverride) => void
  disabled?: boolean
}

function DurationPresetChips({
  value,
  autoSeconds,
  onChange,
  disabled,
}: DurationPresetChipsProps) {
  const chips: Array<{ id: SfxDurationOverride; label: string }> = [
    { id: 'auto', label: `Auto (${formatSeconds(autoSeconds)}s)` },
    { id: 'short', label: 'Short 3s' },
    { id: 'medium', label: 'Medium 8s' },
    { id: 'long', label: 'Long 15s' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2">
      <span className="text-[10px] uppercase tracking-wide text-amber-700/80 dark:text-amber-300/70 mr-1">
        Duration
      </span>
      {chips.map((chip) => {
        const active = value === chip.id
        return (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onChange(chip.id)
            }}
            className={`text-[11px] leading-none px-2 py-1 rounded border transition-colors ${
              active
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'bg-transparent border-amber-400/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-800/40'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) return '8'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
