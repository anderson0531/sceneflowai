'use client'

import { Copy, Download, Library, Pause, Play, Trash2, Upload, Volume2 } from 'lucide-react'
import { Volume2 as VolumeIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { SegmentSFX } from '@/lib/script/segmentTypes'

/**
 * One SFX cue inside a segment. Wraps the existing positional handlers
 * (`scene.sfxAudio[idx]`, `uploadAudio(sceneIdx, 'sfx', idx)`,
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
  onPlayAudio?: (audioUrl: string, label: string) => void
  onDeleteSceneAudio?: (
    sceneIndex: number,
    audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx',
    dialogueIndex?: number,
    sfxIndex?: number
  ) => void
  uploadAudio?: (
    sceneIdx: number,
    type: 'description' | 'narration' | 'dialogue' | 'sfx' | 'music',
    sfxIdx?: number,
    dialogueIdx?: number,
    characterName?: string
  ) => void | Promise<void>
  onOpenSfxLibrary?: (sfxIdx: number, query?: string) => void
}

export function SegmentSfxCard({
  scene,
  sceneIdx,
  sfx,
  positionInSegment,
  playingAudio,
  onPlayAudio,
  onDeleteSceneAudio,
  uploadAudio,
  onOpenSfxLibrary,
}: SegmentSfxCardProps) {
  const legacyIdx = sfx.legacyIndex
  const audioUrl: string | undefined =
    legacyIdx !== undefined && Array.isArray(scene?.sfxAudio)
      ? scene.sfxAudio[legacyIdx]
      : undefined
  const credit =
    legacyIdx !== undefined && Array.isArray(scene?.sfxSourceMeta)
      ? scene.sfxSourceMeta[legacyIdx]?.creditLine
      : undefined

  const dispatchUpload = () => {
    if (legacyIdx !== undefined) uploadAudio?.(sceneIdx, 'sfx', legacyIdx)
    else toast.error('SFX cue is not linked to a legacy index yet.')
  }
  const dispatchBrowse = () => {
    if (legacyIdx !== undefined) onOpenSfxLibrary?.(legacyIdx, sfx.description)
  }
  const dispatchDelete = () => {
    if (legacyIdx === undefined) return
    if (!confirm('Delete this sound effect? You can add a new file or pick from Browse sounds.')) return
    onDeleteSceneAudio?.(sceneIdx, 'sfx', undefined, legacyIdx)
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
          {audioUrl ? (
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
              <Button
                type="button"
                size="sm"
                className="h-8 bg-amber-600 hover:bg-amber-700 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatchBrowse()
                }}
              >
                <Library className="w-3.5 h-3.5 mr-1" />
                Browse sounds
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-amber-600/50 text-amber-800 dark:text-amber-200"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatchUpload()
                }}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Replace file
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-amber-600 hover:bg-amber-700 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatchBrowse()
                }}
              >
                <Library className="w-3.5 h-3.5 mr-1" />
                Browse sounds
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-amber-600/50 text-amber-800 dark:text-amber-200"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatchUpload()
                }}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!sfx.description) {
                    toast.info('Nothing to copy for this slot.')
                    return
                  }
                  try {
                    await navigator.clipboard.writeText(sfx.description)
                    toast.success('Search text copied')
                  } catch {
                    toast.error('Could not copy')
                  }
                }}
                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                title="Copy search text"
              >
                <Copy className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 italic">{sfx.description}</div>
      {credit ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-snug whitespace-pre-wrap">
          {credit}
        </p>
      ) : null}
    </div>
  )
}
