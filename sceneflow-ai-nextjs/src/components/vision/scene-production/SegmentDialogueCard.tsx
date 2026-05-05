'use client'

import { Download, Loader, Pause, Play, RefreshCw, Trash2, Upload, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { findDialogueAudioForLine } from '@/components/vision/scene-production/audioTrackBuilder'
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
  overlayStore?: { show: (msg: string, n?: number) => void; hide: () => void }
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
  overlayStore,
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

  const isGenerating =
    !!generatingDialogue &&
    generatingDialogue.sceneIdx === sceneIdx &&
    (generatingDialogue.lineId === line.lineId ||
      (generatingDialogue.character === line.character &&
        (generatingDialogue.dialogueIndex ?? -1) === (dialogueIndex ?? -1)))

  // Pull leading parenthetical voice direction off the body for chip display.
  const parentheticalMatch = line.line?.match(/^\(([^)]+)\)\s*/)
  const parenthetical = parentheticalMatch?.[1]
  const lineWithoutParenthetical = parenthetical
    ? line.line.replace(/^\([^)]+\)\s*/, '')
    : line.line
  const voiceChip = parenthetical || line.voiceDirection

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
    overlayStore?.show(audioUrl ? regenerateLabel : generateLabel, 15)
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
      overlayStore?.hide()
    } catch (error) {
      console.error('[SegmentDialogueCard] generation failed:', error)
      overlayStore?.hide()
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 italic">
                {voiceChip}
              </span>
            )}
            {audioUrl && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                {audioDuration ? `${audioDuration.toFixed(1)}s` : 'Ready'}
              </span>
            )}
          </div>
          <div className={bodyClasses}>
            {isNarrator ? lineWithoutParenthetical : `"${lineWithoutParenthetical}"`}
          </div>
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
            <a
              href={audioUrl}
              download
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
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
