'use client'

import React, { useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  Download,
  Loader,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ActionBeatSfxControls, type ExpressBeatSfxStatus } from '@/components/vision/ActionBeatSfxControls'
import { BeatAudioStatusBadge } from '@/components/vision/BeatAudioStatusBadge'
import { BeatCaptionControl } from '@/components/vision/BeatCaptionControl'
import { BeatMusicToggle } from '@/components/vision/BeatMusicToggle'
import { BeatPerformanceDirectorControl } from '@/components/vision/BeatPerformanceDirectorDialog'
import { BeatSfxToggle } from '@/components/vision/BeatSfxToggle'
import { SceneScoreToggle } from '@/components/vision/SceneScoreToggle'
import { SceneTransitionSelect } from '@/components/vision/SceneTransitionSelect'
import { StatusFilterBar } from '@/components/vision/StatusFilterBar'
import { saveAudioFile } from '@/lib/download/saveFile'
import {
  actionBeatSfxIsStale,
  audioSourceFingerprintForSpoken,
  isBeatAudioStale,
} from '@/lib/audio/beatAudioStale'
import {
  dialogueSpeakerNeedsAssignment,
  isNarratorDialogueSpeaker,
} from '@/lib/character/dialogueTtsVoice'
import { toCanonicalName } from '@/lib/character/canonical'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  assignDialogueSpeakerToScene,
  type AssignableSpeaker,
} from '@/lib/script/assignDialogueSpeaker'
import {
  readBeatSfxAudio,
  resolveBeatSfxSlot,
  stripInlineSfxLinesFromActionText,
} from '@/lib/script/deriveSfxFromSceneContent'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { dialogueDirectionDisplay } from '@/lib/scene/dialogueDirectionDisplay'
import { coerceDialogueLineText } from '@/lib/script/segmentScript'
import {
  beatFilterCharacters,
  beatListFiltersActive,
  beatMatchesFilters,
  beatRailStatus,
  DEFAULT_BEAT_LIST_FILTERS,
  type BeatAttentionFilter,
  type BeatListFacts,
  type BeatListFilterState,
  type BeatTypeFilter,
} from '@/lib/vision/beatListFilters'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import { resolveLiveTake, segmentHasPlayableVideo } from '@/lib/storyboard/mediaVersions'
import { findDialogueAudioForLine } from './audioTrackBuilder'
import { BeatStillClipViewer } from './BeatStillClipViewer'
import { SceneBeatStage, type SceneBeatStageItem } from './SceneBeatStage'
import type { SceneSegment } from './types'

type CaptionTranslations = React.ComponentProps<typeof BeatCaptionControl>['storedTranslations']
type SaveCaptionTranslations = React.ComponentProps<typeof BeatCaptionControl>['onSaveTranslations']

async function downloadSceneAudioFile(
  e: React.MouseEvent,
  url: string,
  options: Omit<Parameters<typeof saveAudioFile>[0], 'url'>
) {
  e.stopPropagation()
  try {
    await saveAudioFile({ url, ...options })
  } catch (error) {
    console.error('[SceneAudioWorkbench] Audio download failed:', error)
    toast.error('Failed to save audio file')
  }
}

function BeatContinuityWarning() {
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200"
      title="This shot continues from the shot above it, but that is now a different shot. Re-check or re-shoot its frames."
    >
      <AlertTriangle className="h-3 w-3" />
      Continuity
    </span>
  )
}

function resolveSpokenIndex(beats: SceneBeat[], beat: SceneBeat, dialogueLines: any[]): number {
  let spoken = 0
  for (const entry of beats) {
    if (entry.kind === 'action') continue
    let dialogueIndex = spoken
    if (entry.lineId?.trim()) {
      const byLineId = dialogueLines.findIndex(
        (line: { lineId?: string }) => line?.lineId === entry.lineId
      )
      if (byLineId >= 0) dialogueIndex = byLineId
    }
    if (entry.beatId === beat.beatId) return dialogueIndex
    spoken = Math.max(spoken + 1, dialogueIndex + 1)
  }
  return spoken
}

export interface SceneAudioWorkbenchProps {
  scene: any
  sceneIdx: number
  sceneNumber: number
  beats: SceneBeat[]
  segments?: SceneSegment[]
  selectedBeatId: string | null
  onSelectBeat: (beatId: string) => void
  onReorder?: (fromBeatId: string, toBeatId: string) => void
  selectedLanguage: string
  playingAudio?: string | null
  onPlayAudio?: (audioUrl: string, label: string, sceneId?: string) => void
  onGenerateSceneAudio?: (
    sceneIdx: number,
    audioType: 'dialogue' | 'narration',
    characterName?: string,
    dialogueIndex?: number,
    language?: string
  ) => void | Promise<void>
  generatingDialogue?: { sceneIdx: number; character: string; dialogueIndex?: number } | null
  setGeneratingDialogue?: (
    state: { sceneIdx: number; character: string; dialogueIndex?: number } | null
  ) => void
  uploadAudio?: (
    sceneIdx: number,
    type: 'dialogue' | 'narration' | 'music' | 'sfx' | 'description',
    sfxIdx?: number,
    dialogueIdx?: number,
    characterName?: string
  ) => void
  onDeleteSceneAudio?: (
    sceneIndex: number,
    audioType: 'dialogue' | 'narration' | 'music' | 'sfx' | 'description',
    dialogueIndex?: number,
    sfxIndex?: number,
    silent?: boolean
  ) => void
  onSaveSfxAudio?: (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null,
    beatContext?: { beatId: string; beatDescription: string }
  ) => Promise<void> | void
  characters?: any[]
  narrationVoice?: unknown
  script?: any
  scenes?: any[]
  onScriptChange?: (script: any) => void
  promptComposition?: { artStyleAnchor?: string; lookbook?: ProjectLookbook }
  projectId?: string
  onGenerateBeatFrame?: (sceneIdx: number, beatId: string) => void
  projectStreams?: ProjectStream[]
  storedTranslations?: CaptionTranslations
  onSaveTranslations?: SaveCaptionTranslations
  expressBeatStatus?: Record<string, ExpressBeatSfxStatus>
  isExpressAudioRunning?: boolean
  beatListFilters: BeatListFilterState
  setBeatListFilters: React.Dispatch<React.SetStateAction<BeatListFilterState>>
  beatFacts: BeatListFacts[]
  productionReadiness?: {
    isAudioReady?: boolean
    hasNarrationVoice?: boolean
    charactersMissingVoices?: string[]
  }
  onOpenAudioAgent?: () => void
  hasSelectableActionBeats?: boolean
  sceneMusicCues: SceneMusicCue[]
  musicCueByBeatId: Map<string, SceneMusicCue>
  sceneScoreOn: boolean
  onSceneScoreChange: (checked: boolean) => void
  onResyncAudioTiming?: (sceneIdx: number, language: string) => void
  resyncingAudioSceneIndex?: number | null
  brokenContinuityBeatIds: Set<string>
  pendingSpeakerAssign?: { sceneIdx: number; dialogueIndex: number } | null
}

type SaveSfx = React.ComponentProps<typeof ActionBeatSfxControls>['onSaveSfxAudio']

export function SceneNarrationAudioCard({
  scene,
  sceneIdx,
  selectedLanguage,
  playingAudio,
  onPlayAudio,
  onGenerateSceneAudio,
  generatingDialogue,
  setGeneratingDialogue,
  uploadAudio,
  onDeleteSceneAudio,
}: Pick<
  SceneAudioWorkbenchProps,
  | 'scene'
  | 'sceneIdx'
  | 'selectedLanguage'
  | 'playingAudio'
  | 'onPlayAudio'
  | 'onGenerateSceneAudio'
  | 'generatingDialogue'
  | 'setGeneratingDialogue'
  | 'uploadAudio'
  | 'onDeleteSceneAudio'
>) {
  const narrationUrl =
    scene.narrationAudio?.[selectedLanguage]?.url ||
    (selectedLanguage === 'en' ? scene.narrationAudioUrl : undefined)
  const generating =
    generatingDialogue?.sceneIdx === sceneIdx && generatingDialogue?.character === '__narration__'

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
      <div className="mb-2 flex items-center justify-end gap-2">
        {narrationUrl && (
          <span className="mr-auto flex items-center gap-1 rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
            <Volume2 className="h-3 w-3" />
            {scene.narrationAudio?.[selectedLanguage]?.duration
              ? `${scene.narrationAudio[selectedLanguage].duration.toFixed(1)}s`
              : 'Ready'}
          </span>
        )}
        {narrationUrl ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlayAudio?.(narrationUrl, 'narration', scene.id || scene.sceneId || `scene-${sceneIdx}`)
              }}
              className="rounded p-1 hover:bg-purple-200 dark:hover:bg-purple-800"
              title="Play Narration"
            >
              {playingAudio === narrationUrl ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                try {
                  await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                } catch (error) {
                  console.error('[SceneAudioWorkbench] Narration regeneration failed:', error)
                  toast.error('Failed to regenerate narration')
                } finally {
                  setGeneratingDialogue?.(null)
                }
              }}
              disabled={generating}
              className="rounded p-1 hover:bg-purple-200 disabled:opacity-50 dark:hover:bg-purple-800"
              title="Regenerate Narration Audio"
            >
              {generating ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                void downloadSceneAudioFile(e, narrationUrl, {
                  sceneNumber: sceneIdx + 1,
                  track: 'narration',
                })
              }}
              className="rounded p-1 hover:bg-purple-200 dark:hover:bg-purple-800"
              title="Download Narration"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete narration audio? You can regenerate it later.')) {
                  onDeleteSceneAudio?.(sceneIdx, 'narration')
                }
              }}
              className="rounded p-1 text-red-500 hover:bg-red-200 dark:text-red-400 dark:hover:bg-red-800/50"
              title="Delete Narration Audio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                uploadAudio?.(sceneIdx, 'narration')
              }}
              className="rounded p-1 hover:bg-purple-200 dark:hover:bg-purple-800"
              title="Upload Narration Audio"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation()
                setGeneratingDialogue?.({ sceneIdx, character: '__narration__' })
                try {
                  await onGenerateSceneAudio?.(sceneIdx, 'narration', undefined, undefined, selectedLanguage)
                } catch (error) {
                  console.error('[SceneAudioWorkbench] Narration generation failed:', error)
                  toast.error('Failed to generate narration')
                } finally {
                  setGeneratingDialogue?.(null)
                }
              }}
              disabled={generating}
              className="flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Generate Audio
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                uploadAudio?.(sceneIdx, 'narration')
              }}
              className="rounded p-1 hover:bg-purple-200 dark:hover:bg-purple-800"
              title="Upload Narration Audio"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="text-sm italic leading-relaxed text-gray-700 dark:text-gray-300">"{scene.narration}"</div>
    </div>
  )
}

export function SceneAudioWorkbench(props: SceneAudioWorkbenchProps & { onSaveSfxAudio?: SaveSfx }) {
  const {
    scene,
    sceneIdx,
    beats,
    selectedBeatId,
    onSelectBeat,
    onReorder,
    selectedLanguage,
    beatListFilters,
    setBeatListFilters,
    beatFacts,
    brokenContinuityBeatIds,
  } = props

  const beatFactsById = useMemo(() => new Map(beatFacts.map((facts) => [facts.beatId, facts])), [beatFacts])
  const filtersActive = beatListFiltersActive(beatListFilters)
  const visibleBeats = beats.filter((beat) => {
    const facts = beatFactsById.get(beat.beatId)
    return !facts || beatMatchesFilters(facts, beatListFilters)
  })

  useEffect(() => {
    if (visibleBeats.length === 0) return
    if (!visibleBeats.some((beat) => beat.beatId === selectedBeatId)) {
      onSelectBeat(visibleBeats[0].beatId)
    }
  }, [visibleBeats, selectedBeatId, onSelectBeat])

  const selected = visibleBeats.find((beat) => beat.beatId === selectedBeatId) ?? visibleBeats[0]

  const sceneSfxList = Array.isArray(scene.sfx) ? scene.sfx : []
  const sfxByBeatId = useMemo(() => {
    const map = new Map<string, Array<{ description: string; idx: number }>>()
    sceneSfxList.forEach((raw: unknown, idx: number) => {
      const entry =
        typeof raw === 'string'
          ? { description: raw.trim() }
          : (raw as { description?: string; sourceBeatId?: string })
      const description = String(entry?.description ?? (typeof raw === 'string' ? raw : '')).trim()
      const beatId = entry?.sourceBeatId
      if (!description || !beatId) return
      const list = map.get(beatId) ?? []
      list.push({ description, idx })
      map.set(beatId, list)
    })
    return map
  }, [scene.sfx])

  const items = useMemo<SceneBeatStageItem[]>(
    () =>
      visibleBeats.map((beat, index) => {
        const facts = beatFactsById.get(beat.beatId)
        const rail = facts ? beatRailStatus(facts) : undefined
        const beatNumber = (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : beats.indexOf(beat)) + 1
        return {
          id: beat.beatId,
          beatNumber: Number.isFinite(beatNumber) ? beatNumber : index + 1,
          imageUrl: beat.storyboardImageUrl?.trim() || undefined,
          status: rail?.status,
          statusLabel: rail?.label || undefined,
          ariaLabel: `Shot ${beatNumber}`,
        }
      }),
    [visibleBeats, beatFactsById, beats]
  )

  const hasSceneMusic = !!(scene.musicAudio || scene.music?.url) || props.sceneMusicCues.length > 0

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
      <AudioToolbar {...props} hasSceneMusic={hasSceneMusic} />
      <BeatFilters
        beatFacts={beatFacts}
        beatListFilters={beatListFilters}
        setBeatListFilters={setBeatListFilters}
      />
      <SceneBeatStage
        railLabel="Audio shots"
        items={items}
        selectedId={selected?.beatId ?? null}
        onSelect={onSelectBeat}
        onReorder={onReorder}
        reorderDisabled={filtersActive || !onReorder}
        empty={
          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-700/50 px-3 py-2">
            <p className="text-xs text-slate-400">No shots match these filters.</p>
            <button
              type="button"
              className="text-[10px] text-slate-200 underline"
              onClick={(event) => {
                event.stopPropagation()
                setBeatListFilters(DEFAULT_BEAT_LIST_FILTERS)
              }}
            >
              Clear filters
            </button>
          </div>
        }
        stage={
          selected ? (
            <AudioStage
              beat={selected}
              beats={beats}
              scene={scene}
              sceneIdx={sceneIdx}
              segments={props.segments}
              selectedLanguage={selectedLanguage}
              playingAudio={props.playingAudio}
              onPlayAudio={props.onPlayAudio}
            />
          ) : (
            <div />
          )
        }
        detail={
          selected ? (
            <SelectedBeatAudio
              {...props}
              beat={selected}
              beats={beats}
              hasSceneMusic={hasSceneMusic}
              sfxByBeatId={sfxByBeatId}
              continuityBroken={brokenContinuityBeatIds.has(selected.beatId)}
            />
          ) : null
        }
      />
      <SceneTransitionSelect
        sceneIdx={sceneIdx}
        scenes={props.scenes ?? []}
        script={props.script}
        onScriptChange={props.onScriptChange}
        className="mt-4 border-t border-slate-700/50 pt-3"
      />
    </div>
  )
}

function AudioToolbar(
  props: SceneAudioWorkbenchProps & { hasSceneMusic: boolean }
) {
  const {
    scene,
    sceneIdx,
    selectedLanguage,
    hasSceneMusic,
    sceneScoreOn,
    onSceneScoreChange,
    isExpressAudioRunning,
    productionReadiness,
    hasSelectableActionBeats,
    onOpenAudioAgent,
    onResyncAudioTiming,
    resyncingAudioSceneIndex,
  } = props
  const voicesReady = productionReadiness?.isAudioReady ?? true
  const hasNarrationVoice = productionReadiness?.hasNarrationVoice ?? true
  const missingVoices = productionReadiness?.charactersMissingVoices || []
  const hasAudioContent =
    (Array.isArray(scene.dialogue) && scene.dialogue.length > 0) ||
    !!String(scene.narration || '').trim() ||
    !!scene.music ||
    !!hasSelectableActionBeats
  const isDisabled = !!isExpressAudioRunning || !voicesReady || !hasNarrationVoice

  const button = hasAudioContent ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-7 border-violet-400/60 text-xs text-violet-200 hover:bg-violet-900/30"
      disabled={isDisabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!isExpressAudioRunning && voicesReady && hasNarrationVoice) onOpenAudioAgent?.()
      }}
    >
      {isExpressAudioRunning ? (
        <>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Audio Agent...
        </>
      ) : (
        <>
          <Sparkles className="mr-1 h-3 w-3" />
          Audio Agent
          {(!voicesReady || !hasNarrationVoice) && <span className="ml-1 text-amber-400">⚠</span>}
        </>
      )}
    </Button>
  ) : null

  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      {hasSceneMusic && (
        <SceneScoreToggle className="mr-auto" checked={sceneScoreOn} onCheckedChange={onSceneScoreChange} />
      )}
      {button && (!voicesReady || !hasNarrationVoice) ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs border border-gray-700 bg-gray-900 text-white dark:bg-gray-800">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Voice Setup Required
                </p>
                {!hasNarrationVoice && <p className="text-xs text-gray-300">• Assign a narrator voice</p>}
                {missingVoices.length > 0 && (
                  <p className="text-xs text-gray-300">
                    • Assign voices to: {missingVoices.slice(0, 3).join(', ')}
                    {missingVoices.length > 3 && ` +${missingVoices.length - 3} more`}
                  </p>
                )}
                <p className="pt-1 text-[10px] text-gray-500">Set up voices in the Reference Library</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
      {scene.dialogue && scene.dialogue.length > 0 && (
        <VoiceChips
          scene={scene}
          sceneIdx={sceneIdx}
          selectedLanguage={selectedLanguage}
          onResyncAudioTiming={onResyncAudioTiming}
          resyncingAudioSceneIndex={resyncingAudioSceneIndex}
        />
      )}
    </div>
  )
}

function VoiceChips({
  scene,
  sceneIdx,
  selectedLanguage,
  onResyncAudioTiming,
  resyncingAudioSceneIndex,
}: Pick<
  SceneAudioWorkbenchProps,
  'scene' | 'sceneIdx' | 'selectedLanguage' | 'onResyncAudioTiming' | 'resyncingAudioSceneIndex'
>) {
  let castingDialogueAudioArray: any[] = []
  if (Array.isArray(scene.dialogueAudio)) {
    castingDialogueAudioArray = scene.dialogueAudio
  } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
    castingDialogueAudioArray = scene.dialogueAudio[selectedLanguage] || []
  }
  const names = Array.from(new Set(scene.dialogue.map((d: any) => d.character))) as string[]
  return (
    <div className="flex items-center gap-1">
      {names.slice(0, 4).map((character) => {
        const charDialogues = scene.dialogue.filter((d: any) => d.character === character)
        const charAudioReady = charDialogues.filter((d: any, idx: number) => {
          const dialogueIndex = scene.dialogue.findIndex((dd: any, i: number) => dd === d && i <= idx)
          const audioEntry = castingDialogueAudioArray.find(
            (a: any) => a.character === character && a.dialogueIndex === dialogueIndex
          )
          return audioEntry?.audioUrl
        }).length
        const allReady = charAudioReady === charDialogues.length
        return (
          <TooltipProvider key={character}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] ${
                    allReady
                      ? 'border-blue-500/40 bg-blue-600/30 text-blue-200'
                      : charAudioReady > 0
                        ? 'border-yellow-600/30 bg-yellow-800/50 text-yellow-300'
                        : 'border-slate-600/40 bg-slate-700/40 text-slate-300'
                  }`}
                >
                  {character?.slice(0, 2)?.toUpperCase() || '??'}
                  <span className="text-[8px] opacity-70">({charDialogues.length})</span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="border border-gray-700 bg-gray-900 text-white">
                <p className="text-xs font-medium">{character}</p>
                <p className="text-[10px] text-gray-400">
                  {charDialogues.length} {charDialogues.length === 1 ? 'line' : 'lines'} • {charAudioReady} audio ready
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
      {names.length > 4 && <span className="text-[10px] text-gray-500">+{names.length - 4}</span>}
      {onResyncAudioTiming && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onResyncAudioTiming(sceneIdx, selectedLanguage)
                }}
                disabled={resyncingAudioSceneIndex === sceneIdx}
                className="ml-2 rounded p-1 text-blue-400 transition-colors hover:bg-blue-900/30 hover:text-blue-300 disabled:opacity-50"
              >
                {resyncingAudioSceneIndex === sceneIdx ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="border border-gray-700 bg-gray-900 text-white">
              <p className="text-xs">Resync audio timing</p>
              <p className="text-[10px] text-gray-400">Recalculate start times after edits</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

function BeatFilters({
  beatFacts,
  beatListFilters,
  setBeatListFilters,
}: Pick<SceneAudioWorkbenchProps, 'beatFacts' | 'beatListFilters' | 'setBeatListFilters'>) {
  const showTooltips: Record<BeatAttentionFilter, string> = {
    all: 'Every shot in this scene.',
    needs_action: 'Shots still missing audio, a speaker, or another required step.',
    ready: 'Shots whose audio is in sync and ready to move on.',
    prompt_changed: 'Shots whose prompt changed after the last render.',
    no_audio: 'Spoken shots, or action shots that carry sound, with no audio yet.',
    needs_speaker: 'Dialogue or narration that has no voice assigned.',
  }
  const typeTooltips: Record<BeatTypeFilter, string> = {
    all: 'Action, dialogue, and narration.',
    action: 'Shots with no spoken line.',
    dialogue: 'Shots spoken by a character.',
    narration: 'Voiceover shots.',
  }
  const attentionChips: Array<{ id: BeatAttentionFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'needs_action', label: 'Needs action' },
    { id: 'ready', label: 'Ready' },
    { id: 'prompt_changed', label: 'Prompt changed' },
    { id: 'no_audio', label: 'No audio' },
    { id: 'needs_speaker', label: 'Needs speaker' },
  ]
  const typeChips: Array<{ id: BeatTypeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'action', label: 'Action' },
    { id: 'dialogue', label: 'Dialogue' },
  ]
  if (beatFacts.some((facts) => facts.kind === 'narration')) {
    typeChips.push({ id: 'narration', label: 'Narration' })
  }
  const characters = beatFilterCharacters(beatFacts)
  const activeSummary = [
    beatListFilters.attention === 'all'
      ? ''
      : attentionChips.find((chip) => chip.id === beatListFilters.attention)?.label,
    beatListFilters.type === 'all' ? '' : typeChips.find((chip) => chip.id === beatListFilters.type)?.label,
    beatListFilters.character === 'all' ? '' : beatListFilters.character,
  ]
    .filter(Boolean)
    .join(' · ')
  const countFor = (attention: BeatAttentionFilter, type: BeatTypeFilter) =>
    beatFacts.filter((facts) => beatMatchesFilters(facts, { ...beatListFilters, attention, type })).length

  return (
    <div className="mb-3">
      <StatusFilterBar
        activeSummary={activeSummary}
        onClear={() => setBeatListFilters(DEFAULT_BEAT_LIST_FILTERS)}
        groups={[
          {
            label: 'Show',
            onSelect: (id) =>
              setBeatListFilters((current) => ({ ...current, attention: id as BeatAttentionFilter })),
            chips: attentionChips.map((chip) => ({
              id: chip.id,
              label: chip.label,
              tooltip: showTooltips[chip.id],
              active: beatListFilters.attention === chip.id,
              count: chip.id === 'all' ? beatFacts.length : countFor(chip.id, beatListFilters.type),
            })),
          },
          {
            label: 'Type',
            onSelect: (id) =>
              setBeatListFilters((current) => ({ ...current, type: id as BeatTypeFilter })),
            chips: typeChips.map((chip) => ({
              id: chip.id,
              label: chip.label,
              tooltip: typeTooltips[chip.id],
              active: beatListFilters.type === chip.id,
              count: chip.id === 'all' ? beatFacts.length : countFor(beatListFilters.attention, chip.id),
            })),
          },
        ]}
      >
        {characters.length > 1 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Character</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  value={beatListFilters.character}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    setBeatListFilters((current) => ({ ...current, character: event.target.value }))
                  }
                  className="h-7 w-full truncate rounded-full border border-slate-600/50 bg-slate-800/60 px-3 text-xs text-slate-200"
                  aria-label="Filter shots by character"
                >
                  <option value="all">All</option>
                  {characters.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[16rem] text-left">
                Lines spoken by this character.
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </StatusFilterBar>
    </div>
  )
}

function AudioStage({
  beat,
  beats,
  scene,
  sceneIdx,
  segments,
  selectedLanguage,
  playingAudio,
  onPlayAudio,
}: {
  beat: SceneBeat
  beats: SceneBeat[]
  scene: any
  sceneIdx: number
  segments?: SceneSegment[]
  selectedLanguage: string
  playingAudio?: string | null
  onPlayAudio?: SceneAudioWorkbenchProps['onPlayAudio']
}) {
  const still = beat.storyboardImageUrl?.trim()
  let audioUrl: string | undefined
  let label = beat.kind === 'action' ? 'SFX' : beat.character || 'Line'
  if (beat.kind === 'action') {
    try {
      audioUrl = readBeatSfxAudio(scene, resolveBeatSfxSlot(scene, beat))
    } catch {
      audioUrl = undefined
    }
  } else {
    const dialogueLines = Array.isArray(scene.dialogue) ? scene.dialogue : []
    const dialogueIndex = resolveSpokenIndex(beats, beat, dialogueLines)
    const line = dialogueLines[dialogueIndex]
    const audioEntry = findDialogueAudioForLine(scene, {
      language: selectedLanguage,
      lineId: line?.lineId ?? beat.lineId,
      dialogueIndex,
      character: line?.character ?? beat.character,
    })
    audioUrl = audioEntry?.audioUrl || audioEntry?.url
    label = line?.character || beat.character || label
  }
  const sceneKey = scene.id || scene.sceneId || `scene-${sceneIdx}`
  const beatNumber = (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : beats.indexOf(beat)) + 1
  const segment =
    segments?.find((row) => row.beatId === beat.beatId && segmentHasPlayableVideo(row)) ??
    segments?.find((row) => row.beatId === beat.beatId)
  const clipUrl = segment
    ? resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)?.url
    : undefined

  return (
    <BeatStillClipViewer
      stillUrl={still}
      clipUrl={clipUrl}
      beatNumber={beatNumber > 0 ? beatNumber : undefined}
      stillOverlay={
        audioUrl ? (
          <button
            type="button"
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-sm text-white"
            onClick={() => onPlayAudio?.(audioUrl, label, sceneKey)}
          >
            {playingAudio === audioUrl ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playingAudio === audioUrl ? 'Pause' : `Play ${label}`}
          </button>
        ) : null
      }
    />
  )
}

function SelectedBeatAudio(
  props: SceneAudioWorkbenchProps & {
    onSaveSfxAudio?: SaveSfx
    beat: SceneBeat
    hasSceneMusic: boolean
    sfxByBeatId: Map<string, Array<{ description: string; idx: number }>>
    continuityBroken: boolean
  }
) {
  const { beat, scene, beats, sfxByBeatId, continuityBroken } = props
  const beatIndex = beats.findIndex((entry) => entry.beatId === beat.beatId)
  const beatNumber = (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : beatIndex) + 1

  if (beat.kind === 'action') {
    return <ActionBeatAudio {...props} beatNumber={beatNumber} continuityBroken={continuityBroken} sfxByBeatId={sfxByBeatId} />
  }
  return (
    <SpokenBeatAudio
      {...props}
      beatNumber={beatNumber}
      continuityBroken={continuityBroken}
      sfxByBeatId={sfxByBeatId}
    />
  )
}

function ActionBeatAudio(
  props: SceneAudioWorkbenchProps & {
    onSaveSfxAudio?: SaveSfx
    beat: SceneBeat
    beatNumber: number
    hasSceneMusic: boolean
    sfxByBeatId: Map<string, Array<{ description: string; idx: number }>>
    continuityBroken: boolean
  }
) {
  const { beat, beatNumber, scene, sceneIdx, sfxByBeatId, continuityBroken, hasSceneMusic } = props
  const parseInlineBeatSfx = (actionText?: string) => {
    if (!actionText?.trim()) return [] as string[]
    return actionText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^SFX:/i.test(line))
      .map((line) => line.replace(/^SFX:\s*/i, '').trim())
      .filter(Boolean)
  }
  const beatSfx = sfxByBeatId.get(beat.beatId) ?? []
  const sceneSfxList = Array.isArray(scene.sfx) ? scene.sfx : []
  const inlineSfx = beatSfx.length === 0 && sceneSfxList.length === 0 ? parseInlineBeatSfx(beat.actionDescription) : []
  let sfxAudioUrl: string | undefined
  try {
    sfxAudioUrl = readBeatSfxAudio(scene, resolveBeatSfxSlot(scene, beat))
  } catch {
    sfxAudioUrl = undefined
  }
  const hasBeatSfx = beatSfx.length > 0 || inlineSfx.length > 0 || !!sfxAudioUrl
  const sfxStale = actionBeatSfxIsStale(scene, beat, !!sfxAudioUrl)

  return (
    <div className={`rounded-lg border border-amber-500/45 bg-amber-950/35 p-3 transition-colors hover:border-amber-400/55 ${beat.excluded ? 'opacity-50' : ''}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full border border-amber-700/40 bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-amber-100">
            Shot {beatNumber}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Action</span>
          {beat.excluded && (
            <span className="rounded-full border border-gray-500/30 bg-gray-500/20 px-2 py-0.5 text-[10px] text-gray-300">
              Excluded
            </span>
          )}
          {beat.beatRole === 'title_reveal' && (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
              Title
            </span>
          )}
          <BeatAudioStatusBadge hasAudio={!!sfxAudioUrl} stale={sfxStale} />
          {continuityBroken && <BeatContinuityWarning />}
        </div>
        {hasSceneMusic && (
          <BeatMusicToggle
            beat={beat}
            sceneIdx={sceneIdx}
            scenes={props.scenes ?? []}
            script={props.script}
            onScriptChange={props.onScriptChange}
            cue={props.musicCueByBeatId.get(beat.beatId)}
          />
        )}
        {hasBeatSfx && (
          <BeatSfxToggle beat={beat} sceneIdx={sceneIdx} scenes={props.scenes ?? []} script={props.script} onScriptChange={props.onScriptChange} />
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
        {stripInlineSfxLinesFromActionText(beat.actionDescription) || 'No action description'}
      </p>
      <ActionBeatSfxControls
        beat={beat}
        scene={scene}
        sceneIdx={sceneIdx}
        projectId={props.projectId}
        segmentDurationSeconds={scene.duration}
        playingAudio={props.playingAudio ?? null}
        expressStatus={props.expressBeatStatus?.[beat.beatId]}
        isExpressRunning={props.isExpressAudioRunning}
        onPlayAudio={props.onPlayAudio}
        onSaveSfxAudio={props.onSaveSfxAudio}
      />
      <div className="mt-3 flex items-center">
        <BeatPerformanceDirectorControl
          beat={beat}
          label={`Shot ${beatNumber}`}
          sceneIdx={sceneIdx}
          scenes={props.scenes ?? []}
          script={props.script}
          projectId={props.projectId}
          onScriptChange={props.onScriptChange}
          onGenerateStill={
            props.onGenerateBeatFrame ? (beatId) => props.onGenerateBeatFrame?.(sceneIdx, beatId) : undefined
          }
          promptComposition={props.promptComposition}
        />
      </div>
      <BeatCaptionControl
        beat={beat}
        sceneIdx={sceneIdx}
        selectedLanguage={props.selectedLanguage}
        scenes={props.scenes ?? []}
        script={props.script}
        projectStreams={props.projectStreams}
        storedTranslations={props.storedTranslations}
        onScriptChange={props.onScriptChange}
        onSaveTranslations={props.onSaveTranslations}
      />
    </div>
  )
}

function SpokenBeatAudio(
  props: SceneAudioWorkbenchProps & {
    beat: SceneBeat
    beatNumber: number
    hasSceneMusic: boolean
    continuityBroken: boolean
    sfxByBeatId: Map<string, Array<{ description: string; idx: number }>>
  }
) {
  const {
    beat,
    beatNumber,
    scene,
    sceneIdx,
    beats,
    continuityBroken,
    hasSceneMusic,
    characters = [],
    sfxByBeatId,
  } = props
  const dialogueLines = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const dialogueIndex = resolveSpokenIndex(beats, beat, dialogueLines)
  const d = dialogueLines[dialogueIndex] ?? {
    character: beat.character,
    line: beat.line,
    lineId: beat.lineId,
    kind: beat.kind,
    characterId: beat.characterId,
  }
  const i = dialogueIndex
  const audioEntry = findDialogueAudioForLine(scene, {
    language: props.selectedLanguage,
    lineId: d.lineId,
    dialogueIndex: i,
    character: d.character,
  })
  const dialogueAudioUrl = audioEntry?.audioUrl || audioEntry?.url
  const sceneKey = scene.id || scene.sceneId || `scene-${sceneIdx}`
  const dialogueLineText = coerceDialogueLineText(d.line ?? d.text)
  const { chip, spokenDisplay, brief } = dialogueDirectionDisplay(
    dialogueLineText,
    d.voiceDirection ?? beat.voiceDirection
  )
  const isNarrationBeat = beat.kind === 'narration'
  const showSfx = (sfxByBeatId.get(beat.beatId)?.length ?? 0) > 0
  const speakerNeedsAssign = dialogueSpeakerNeedsAssignment({
    characters: characters as any[],
    characterId: d.characterId ?? beat.characterId,
    characterName: d.character ?? beat.character,
    kind: d.kind ?? beat.kind,
    narrationVoice: props.narrationVoice,
  })
  const speakerSelectValue = (() => {
    if (
      isNarratorDialogueSpeaker({
        kind: d.kind ?? beat.kind,
        characterId: d.characterId ?? beat.characterId,
        characterName: d.character ?? beat.character,
      })
    ) {
      return '__narrator__'
    }
    const id = d.characterId || beat.characterId
    if (id && (characters as any[]).some((c) => c.id === id)) return String(id)
    const name = d.character || beat.character
    const byName = (characters as any[]).find(
      (c) => typeof c?.name === 'string' && toCanonicalName(c.name) === toCanonicalName(String(name || ''))
    )
    return byName?.id ? String(byName.id) : ''
  })()
  const focusSpeakerSelect =
    props.pendingSpeakerAssign?.sceneIdx === sceneIdx && props.pendingSpeakerAssign?.dialogueIndex === i
  const generating =
    props.generatingDialogue?.sceneIdx === sceneIdx &&
    props.generatingDialogue?.character === d.character &&
    props.generatingDialogue?.dialogueIndex === i

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isNarrationBeat
          ? 'border-indigo-700/30 bg-indigo-900/20 hover:border-indigo-600/40'
          : 'border-blue-500/45 bg-blue-900/30 hover:border-blue-400/55'
      } ${beat.excluded ? 'opacity-50' : ''} ${focusSpeakerSelect ? 'ring-2 ring-amber-400/70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 rounded-full border border-slate-600/40 bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-300">
                Shot {beatNumber}
              </span>
              <label className="sr-only" htmlFor={`speaker-assign-${sceneIdx}-${beat.beatId}`}>
                Assign speaker
              </label>
              <select
                id={`speaker-assign-${sceneIdx}-${beat.beatId}`}
                data-speaker-assign={`${sceneIdx}:${i}`}
                value={speakerSelectValue}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation()
                  if (!props.onScriptChange || !props.script || !Array.isArray(props.scenes)) return
                  const raw = e.target.value
                  if (!raw) return
                  let speaker: AssignableSpeaker
                  if (raw === '__narrator__') {
                    speaker = { kind: 'narrator' }
                  } else {
                    const match = (characters as any[]).find((c) => c.id === raw)
                    if (!match?.id || !match?.name) {
                      toast.error('Could not find that character in the cast')
                      return
                    }
                    speaker = { kind: 'character', id: String(match.id), name: String(match.name) }
                  }
                  const updatedScenes = props.scenes.map((s: any, idx: number) => {
                    if (idx !== sceneIdx) return s
                    return assignDialogueSpeakerToScene(s, {
                      beatId: beat.beatId,
                      dialogueIndex: i,
                      lineId: d.lineId || beat.lineId,
                      speaker,
                    })
                  })
                  props.onScriptChange({
                    ...props.script,
                    script: { ...props.script.script, scenes: updatedScenes },
                  })
                  toast.success(
                    speaker.kind === 'narrator' ? 'Line assigned to Narrator' : `Line assigned to ${speaker.name}`
                  )
                }}
                className={`max-w-[14rem] truncate rounded-md border bg-slate-900/60 px-2 py-0.5 text-sm font-semibold ${
                  isNarrationBeat ? 'border-indigo-600/40 text-indigo-200' : 'border-blue-600/40 text-blue-200'
                } ${speakerNeedsAssign ? 'border-amber-500/70 text-amber-200' : ''}`}
                title={
                  speakerNeedsAssign
                    ? 'Speaker isn’t linked to a cast voice — pick a character'
                    : 'Assign character to this line'
                }
              >
                {speakerNeedsAssign && !speakerSelectValue && <option value="">Assign speaker…</option>}
                <option value="__narrator__">Narration (Narrator)</option>
                {(characters as any[])
                  .filter((c) => c?.type !== 'narrator')
                  .map((c) => (
                    <option key={c.id || c.name} value={c.id || ''}>
                      {c.name}
                      {c.voiceConfig ? '' : ' (no voice)'}
                    </option>
                  ))}
              </select>
              {speakerNeedsAssign && (
                <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                  Needs speaker
                </span>
              )}
              {beat.excluded && (
                <span className="rounded-full border border-gray-500/30 bg-gray-500/20 px-2 py-0.5 text-[10px] text-gray-300">
                  Excluded
                </span>
              )}
              {chip && (
                <span
                  className="rounded-full border border-slate-600/40 bg-slate-700/40 px-2 py-0.5 text-[10px] italic text-slate-300"
                  title={brief || chip}
                >
                  {chip}
                </span>
              )}
              <BeatAudioStatusBadge
                hasAudio={!!dialogueAudioUrl}
                stale={
                  !!dialogueAudioUrl &&
                  isBeatAudioStale({
                    hasAudio: true,
                    sourceFingerprint: audioEntry?.sourceFingerprint,
                    audioStale: audioEntry?.audioStale,
                    currentFingerprint: audioSourceFingerprintForSpoken({
                      kind: isNarrationBeat ? 'narration' : 'dialogue',
                      character: d.character ?? beat.character,
                      line: d.line ?? beat.line,
                      voiceDirection: d.voiceDirection ?? beat.voiceDirection,
                    }),
                  })
                }
              />
              {continuityBroken && <BeatContinuityWarning />}
            </div>
            {hasSceneMusic && (
              <BeatMusicToggle
                beat={beat}
                sceneIdx={sceneIdx}
                scenes={props.scenes ?? []}
                script={props.script}
                onScriptChange={props.onScriptChange}
                cue={props.musicCueByBeatId.get(beat.beatId)}
              />
            )}
            {showSfx && (
              <BeatSfxToggle beat={beat} sceneIdx={sceneIdx} scenes={props.scenes ?? []} script={props.script} onScriptChange={props.onScriptChange} />
            )}
          </div>
          <div className="text-sm leading-relaxed text-gray-200">"{spokenDisplay}"</div>
          {brief && (
            <div className="mt-1 text-[11px] leading-snug text-slate-400" title={brief}>
              {brief}
            </div>
          )}
          {audioEntry?.duration && (
            <span className="mt-1 text-[10px] text-gray-500">Duration: {audioEntry.duration.toFixed(1)}s</span>
          )}
        </div>
        {dialogueAudioUrl ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                props.onPlayAudio?.(dialogueAudioUrl, d.character, sceneKey)
              }}
              className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Play Dialogue"
            >
              {props.playingAudio === dialogueAudioUrl ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (!props.onGenerateSceneAudio) return
                props.setGeneratingDialogue?.({ sceneIdx, character: d.character, dialogueIndex: i })
                try {
                  await props.onGenerateSceneAudio(sceneIdx, 'dialogue', d.character, i, props.selectedLanguage)
                } catch (error) {
                  console.error('[SceneAudioWorkbench] Dialogue regeneration failed:', error)
                  toast.error('Failed to regenerate dialogue')
                } finally {
                  props.setGeneratingDialogue?.(null)
                }
              }}
              disabled={generating}
              className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
              title="Regenerate Dialogue Audio"
            >
              {generating ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                void downloadSceneAudioFile(e, audioEntry.audioUrl, {
                  sceneNumber: sceneIdx + 1,
                  track: 'dialogue',
                  character: d.character,
                  index: i,
                })
              }}
              className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Download Dialogue"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete ${d.character}'s dialogue audio? You can regenerate it later.`)) {
                  props.onDeleteSceneAudio?.(sceneIdx, 'dialogue', i)
                }
              }}
              className="rounded p-1 text-red-500 hover:bg-red-200 dark:text-red-400 dark:hover:bg-red-800/50"
              title="Delete Dialogue Audio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                props.uploadAudio?.(sceneIdx, 'dialogue', undefined, i, d.character)
              }}
              className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Upload Dialogue Audio"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (!props.onGenerateSceneAudio) {
                  console.error('[SceneAudioWorkbench] onGenerateSceneAudio is not defined!')
                  return
                }
                props.setGeneratingDialogue?.({ sceneIdx, character: d.character, dialogueIndex: i })
                try {
                  await props.onGenerateSceneAudio(sceneIdx, 'dialogue', d.character, i, props.selectedLanguage)
                } catch (error) {
                  console.error('[SceneAudioWorkbench] Dialogue generation failed:', error)
                  toast.error(`Failed to generate dialogue for ${d.character}`)
                } finally {
                  props.setGeneratingDialogue?.(null)
                }
              }}
              disabled={generating}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <div className="flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" />
                  Generating...
                </div>
              ) : (
                'Generate'
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                props.uploadAudio?.(sceneIdx, 'dialogue', undefined, i, d.character)
              }}
              className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Upload Dialogue Audio"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center">
        <BeatPerformanceDirectorControl
          beat={beat}
          label={`Shot ${beatNumber}`}
          sceneIdx={sceneIdx}
          scenes={props.scenes ?? []}
          script={props.script}
          projectId={props.projectId}
          onScriptChange={props.onScriptChange}
          onGenerateStill={
            props.onGenerateBeatFrame ? (beatId) => props.onGenerateBeatFrame?.(sceneIdx, beatId) : undefined
          }
          promptComposition={props.promptComposition}
        />
      </div>
      <BeatCaptionControl
        beat={beat}
        sceneIdx={sceneIdx}
        selectedLanguage={props.selectedLanguage}
        scenes={props.scenes ?? []}
        script={props.script}
        projectStreams={props.projectStreams}
        storedTranslations={props.storedTranslations}
        onScriptChange={props.onScriptChange}
        onSaveTranslations={props.onSaveTranslations}
      />
    </div>
  )
}
