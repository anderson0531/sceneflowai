'use client'

import { Download, Loader, Pause, Play, RefreshCw, Trash2, Upload } from 'lucide-react'
import { BeatAudioStatusBadge } from '@/components/vision/BeatAudioStatusBadge'
import { toast } from 'sonner'
import { saveAudioFile } from '@/lib/download/saveFile'
import { findDialogueAudioForLine } from '@/components/vision/scene-production/audioTrackBuilder'
import { coerceDialogueLineText } from '@/lib/script/segmentScript'
import { dialogueDirectionDisplay } from '@/lib/scene/dialogueDirectionDisplay'
import {
  audioSourceFingerprintForSpoken,
  isBeatAudioStale,
} from '@/lib/audio/beatAudioStale'
import type { DialogueLine } from '@/lib/script/segmentTypes'

/**
 * Renders one dialog or narrator line inside a segment.
 *
 * Narrator lines (`kind === 'narration'`) are visually distinct (italic body
 * text, amber "Narrator" badge) but share the same per-line action set as
 * character dialogue: Play, Regenerate, Download, Delete, Upload.
 *
 * For narrator lines we currently route generate / delete / upload through the
 * scene-narration storage path (`audioType: 'narration'`). Audio playback
 * resolves to a per-line entry in `dialogueAudio` when present (after
 * migration) or falls back to the whole-scene narration audio.
 */
export interface SegmentDialogueCardProps {
  scene: any
  sceneIdx: number
  line: DialogueLine
  /** Position of this line in the flattened (non-narrator) dialogue list. */
  dialogueIndex: number | null
  selectedLanguage: string
  playingAudio: string | null
  onPlayAudio?: (audioUrl: string, label: string) => void
  onGenerateSceneAudio?: (
    sceneIdx: number,
    audioType: 'narration' | 'dialogue' | 'description',
    character?: string,
    dialogueIndex?: number,
    language?: string
  ) => Promise<void> | void
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
  generatingDialogue?: { sceneIdx: number; character?: string; dialogueIndex?: number; lineId?: string } | null
  setGeneratingDialogue?: (val: any) => void
}

export function SegmentDialogueCard({
  scene,
  sceneIdx,
  line,
  dialogueIndex,
  selectedLanguage,
  playingAudio,
  onPlayAudio,
  onGenerateSceneAudio,
  onDeleteSceneAudio,
  uploadAudio,
  generatingDialogue,
  setGeneratingDialogue,
}: SegmentDialogueCardProps) {
  const isNarrator = line.kind === 'narration'

  // Resolve audio for this line. For narrator we also fall back to the
  // whole-scene narration track for legacy projects.
  const dialogueEntry = findDialogueAudioForLine(scene, {
    language: selectedLanguage,
    lineId: line.lineId,
    dialogueIndex: dialogueIndex ?? undefined,
    character: line.character,
  })
  const narrationFallbackUrl = isNarrator
    ? scene.narrationAudio?.[selectedLanguage]?.url ||
      (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
    : undefined
  const audioUrl: string | undefined = dialogueEntry?.audioUrl || narrationFallbackUrl
  const audioDuration: number | undefined =
    dialogueEntry?.duration ||
    (isNarrator ? scene.narrationAudio?.[selectedLanguage]?.duration : undefined)
  const audioStale = isBeatAudioStale({
    hasAudio: !!audioUrl,
    sourceFingerprint:
      dialogueEntry?.sourceFingerprint ||
      (isNarrator ? scene.narrationAudio?.[selectedLanguage]?.sourceFingerprint : undefined),
    audioStale:
      dialogueEntry?.audioStale ||
      (isNarrator ? scene.narrationAudio?.[selectedLanguage]?.audioStale : undefined),
    currentFingerprint: audioSourceFingerprintForSpoken({
      kind: isNarrator ? 'narration' : 'dialogue',
      character: line.character,
      line: line.line,
      voiceDirection: line.voiceDirection,
    }),
  })

  const isGenerating =
    !!generatingDialogue &&
    generatingDialogue.sceneIdx === sceneIdx &&
    (generatingDialogue.lineId === line.lineId ||
      (generatingDialogue.character === line.character &&
        (generatingDialogue.dialogueIndex ?? -1) === (dialogueIndex ?? -1)))

  const lineText = coerceDialogueLineText(line.line)
  const { chip, spokenDisplay, brief } = dialogueDirectionDisplay(
    lineText,
    line.voiceDirection
  )
  const lineWithoutParenthetical = spokenDisplay
  const voiceChip = chip

  const cardClasses = isNarrator
    ? 'p-3 bg-purple-900/20 rounded-lg border border-purple-700/30 hover:border-purple-600/50 transition-colors'
    : 'p-3 bg-green-900/30 rounded-lg border border-green-700/30 hover:border-green-600/50 transition-colors'
  const characterChipClasses = isNarrator
    ? 'text-sm font-semibold text-purple-200'
    : 'text-sm font-semibold text-green-200'
  const bodyClasses = isNarrator
    ? 'text-sm text-purple-100/90 leading-relaxed italic'
    : 'text-sm text-gray-200 leading-relaxed'

  const generateLabel = isNarrator
    ? `Generating narration for Scene ${sceneIdx + 1}...`
    : `Generating dialogue for ${line.character}...`
  const regenerateLabel = isNarrator
    ? `Regenerating narration for Scene ${sceneIdx + 1}...`
    : `Regenerating dialogue for ${line.character}...`

  const dispatchGenerate = async () => {
    if (!onGenerateSceneAudio) return
    setGeneratingDialogue?.({
      sceneIdx,
      character: line.character,
      dialogueIndex: dialogueIndex ?? undefined,
      lineId: line.lineId,
    })
    try {
      if (isNarrator) {
        await onGenerateSceneAudio(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
      } else if (dialogueIndex !== null) {
        await onGenerateSceneAudio(
          sceneIdx,
          'dialogue',
          line.character,
          dialogueIndex,
          selectedLanguage
        )
      } else {
        toast.error('This dialogue line has no positional index yet.')
      }
    } catch (error) {
      console.error('[SegmentDialogueCard] generation failed:', error)
      toast.error(isNarrator ? 'Failed to regenerate narration' : 'Failed to regenerate dialogue')
    } finally {
      setGeneratingDialogue?.(null)
    }
  }

  const dispatchDelete = () => {
    if (isNarrator) {
      if (!confirm('Delete narration audio? You can regenerate it later.')) return
      onDeleteSceneAudio?.(sceneIdx, 'narration')
    } else {
      if (!confirm(`Delete ${line.character}'s dialogue audio? You can regenerate it later.`)) return
      if (dialogueIndex !== null) onDeleteSceneAudio?.(sceneIdx, 'dialogue', dialogueIndex)
    }
  }

  const dispatchUpload = () => {
    if (isNarrator) uploadAudio?.(sceneIdx, 'narration')
    else if (dialogueIndex !== null)
      uploadAudio?.(sceneIdx, 'dialogue', undefined, dialogueIndex, line.character)
  }

  return (
    <div className={cardClasses}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={characterChipClasses}>{line.character}</div>
            {isNarrator && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-500/40 uppercase tracking-wide">
                Narrator
              </span>
            )}
            {voiceChip && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 italic"
                title={brief || voiceChip}
              >
                {voiceChip}
              </span>
            )}
            <BeatAudioStatusBadge
              hasAudio={!!audioUrl}
              stale={audioStale}
              readyLabel={audioDuration ? `${audioDuration.toFixed(1)}s` : 'Ready'}
            />
          </div>
          <div className={bodyClasses}>
            {isNarrator ? lineWithoutParenthetical : `"${lineWithoutParenthetical}"`}
          </div>
          {brief && (
            <div className="text-[11px] text-slate-400 mt-1 leading-snug" title={brief}>
              {brief}
            </div>
          )}
        </div>
        {audioUrl ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlayAudio?.(audioUrl, line.character)
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title={isNarrator ? 'Play Narration' : 'Play Dialogue'}
            >
              {playingAudio === audioUrl ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                void dispatchGenerate()
              }}
              disabled={isGenerating}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
              title={isNarrator ? 'Regenerate Narration' : 'Regenerate Dialogue'}
            >
              {isGenerating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
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
                  track: isNarrator ? 'narration' : 'dialogue',
                  character: line.character,
                  index: dialogueIndex ?? undefined,
                }).catch((error) => {
                  console.error('[SegmentDialogueCard] Audio download failed:', error)
                  toast.error('Failed to save audio file')
                })
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dispatchDelete()
              }}
              className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded text-red-500 dark:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dispatchUpload()
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Upload"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                void dispatchGenerate()
              }}
              disabled={isGenerating}
              className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center gap-1">
                  <Loader className="w-3 h-3 animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate'
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dispatchUpload()
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Upload"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
