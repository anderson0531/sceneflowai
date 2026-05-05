'use client'

import { useState } from 'react'
import { Download, Loader2, Pause, Play, Sparkles, Trash2, Volume2 } from 'lucide-react'
import { Volume2 as VolumeIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { SegmentSFX } from '@/lib/script/segmentTypes'

/**
 * One SFX cue inside a segment. The cue's description is used to drive
 * ElevenLabs `sound-generation`; the resulting GCS URL is persisted via the
 * existing positional handlers (`scene.sfxAudio[idx]`,
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
    sfxAttribution?: Record<string, unknown> | null
  ) => Promise<void> | void
}

export function SegmentSfxCard({
  scene,
  sceneIdx,
  sfx,
  positionInSegment,
  playingAudio,
  projectId,
  onPlayAudio,
  onDeleteSceneAudio,
  onSaveSfxAudio,
}: SegmentSfxCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const legacyIdx = sfx.legacyIndex
  const audioUrl: string | undefined =
    legacyIdx !== undefined && Array.isArray(scene?.sfxAudio)
      ? scene.sfxAudio[legacyIdx]
      : undefined

  const dispatchDelete = () => {
    if (legacyIdx === undefined) return
    if (!confirm('Delete this sound effect? You can re-generate it from the cue description.')) return
    onDeleteSceneAudio?.(sceneIdx, 'sfx', undefined, legacyIdx)
  }

  const dispatchGenerate = async () => {
    if (legacyIdx === undefined) {
      toast.error('SFX cue is not linked to a legacy index yet.')
      return
    }
    if (!projectId) {
      toast.error('Project context is missing for SFX generation.')
      return
    }
    const description = (sfx.description || '').trim()
    if (!description) {
      toast.info('Add a description for this SFX cue first.')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading(audioUrl ? 'Re-generating SFX...' : 'Generating SFX...')
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sfxId: sfx.sfxId,
          sfxIndex: legacyIdx,
          text: description,
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

      await onSaveSfxAudio?.(sceneIdx, 'sfx', url, legacyIdx, null)
      toast.success(audioUrl ? 'SFX re-generated.' : 'SFX generated.', { id: toastId })
    } catch (error: any) {
      console.error('[SegmentSfxCard] SFX generation failed:', error)
      toast.error(`Failed to generate SFX: ${error?.message || 'Unknown error'}`, { id: toastId })
    } finally {
      setIsGenerating(false)
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
          {audioUrl && (
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              Audio Ready
            </span>
          )}
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
              <a
                href={audioUrl}
                download
                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded inline-flex"
                title="Download SFX"
              >
                <Download className="w-4 h-4" />
              </a>
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
          <Button
            type="button"
            size="sm"
            className="h-8 bg-amber-600 hover:bg-amber-700 text-white border-0"
            onClick={(e) => {
              e.stopPropagation()
              void dispatchGenerate()
            }}
            disabled={isGenerating}
          >
            {isGenerating ? (
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
      <div className="text-sm text-gray-700 dark:text-gray-300 italic">{sfx.description}</div>
    </div>
  )
}
