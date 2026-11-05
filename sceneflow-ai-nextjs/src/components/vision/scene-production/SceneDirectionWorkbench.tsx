'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Clapperboard, Loader2 } from 'lucide-react'
import { BeatDirectionEditor } from '@/components/vision/BeatDirectionEditor'
import type { DirectionCharacter, DirectionLocation, DirectionObject } from '@/components/vision/BeatDirectionEditor'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { resolveLiveTake, segmentHasPlayableVideo } from '@/lib/storyboard/mediaVersions'
import {
  directionRailStatus,
  directionRailTooltip,
} from '@/lib/vision/directionRailStatus'
import type { SceneSegment } from './types'
import { BeatStillClipViewer } from './BeatStillClipViewer'
import { promoSourceShotKeys } from '@/lib/publish/buildPromoScene'
import { SceneBeatStage, shotKindMarker, type SceneBeatStageItem } from './SceneBeatStage'

interface SceneDirectionWorkbenchProps {
  scene: any
  sceneIdx: number
  scenes?: any[]
  script: any
  onScriptChange?: (script: any) => void
  beats: SceneBeat[]
  selectedBeatId: string | null
  onSelectBeat: (beatId: string) => void
  segments?: SceneSegment[]
  promptComposition?: {
    artStyleAnchor?: string
    lookbook?: ProjectLookbook
  }
  characters?: DirectionCharacter[]
  locationReferences?: DirectionLocation[]
  objectReferences?: DirectionObject[]
  projectId?: string
  onNavigateScene?: (sceneIdx: number) => void
  onRunShotDirector?: () => void
  shotDirectorProgress?: { done: number; total: number } | null
  shotDirectorRunning?: boolean
  disabledShotDirector?: boolean
}

function joinParts(parts: Array<string | undefined | null>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' • ')
}

function Property({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <div className="min-w-0 rounded-md border border-slate-700/40 bg-slate-900/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-200">{value}</p>
    </div>
  )
}

export function SceneDirectionWorkbench({
  scene,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  beats,
  selectedBeatId,
  onSelectBeat,
  segments = [],
  promptComposition,
  characters,
  locationReferences,
  objectReferences,
  projectId,
  onNavigateScene,
  onRunShotDirector,
  shotDirectorProgress,
  shotDirectorRunning,
  disabledShotDirector,
}: SceneDirectionWorkbenchProps) {
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const sceneDir = scene.sceneDirection as DetailedSceneDirection | undefined
  const prose = scene.visualDescription || scene.action || scene.summary || scene.heading
  const description = sceneDir?.sceneDescription || prose

  const selected = beats.find((beat) => beat.beatId === selectedBeatId) ?? beats[0]
  const selectedPromoSource = selected as
    | (SceneBeat & { sourceSceneIndex?: number; sourceBeatId?: string; sourceSceneId?: string })
    | undefined
  const hasSharedSourceShot =
    Boolean(selectedPromoSource?.sourceBeatId) &&
    typeof selectedPromoSource?.sourceSceneIndex === 'number' &&
    selectedPromoSource.sourceSceneIndex >= 0 &&
    selectedPromoSource.sourceSceneIndex !== sceneIdx
  const editorSceneIdx = hasSharedSourceShot
    ? (selectedPromoSource!.sourceSceneIndex as number)
    : sceneIdx
  const editorBeat = useMemo<SceneBeat | undefined>(() => {
    if (!selected) return undefined
    if (!hasSharedSourceShot || !selectedPromoSource?.sourceBeatId) return selected
    return {
      ...selected,
      beatId: selectedPromoSource.sourceBeatId,
    }
  }, [selected, hasSharedSourceShot, selectedPromoSource])
  const segment = selected
    ? segments.find((row) => row.beatId === selected.beatId && segmentHasPlayableVideo(row)) ??
      segments.find((row) => row.beatId === selected.beatId)
    : undefined
  const liveTake = segment
    ? resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)
    : undefined
  const clipUrl = liveTake?.url
  const stillUrl = selected?.storyboardImageUrl?.trim()

  const promoShots = useMemo(() => promoSourceShotKeys(scenes), [scenes])
  const items = useMemo<SceneBeatStageItem[]>(
    () =>
      beats.map((beat, index) => {
        const rail = directionRailStatus({
          direction: beat.beatDirection,
          stillPrompt: beat.storyboardImagePrompt,
          stillPromptDirectionKey: beat.storyboardImagePromptDirectionKey,
        })
        const kind = shotKindMarker(beat.kind)
        const markers: NonNullable<SceneBeatStageItem['markers']> = kind ? [kind] : []
        const isEstablishing =
          beat.beatRole === 'establishing' ||
          (index === 0 &&
            beat.kind === 'action' &&
            /\bestablishing\b/i.test(beat.beatDirection?.shotType || ''))
        if (isEstablishing) markers.push('Establishing')
        if (beat.excluded === true) markers.push('Excluded')
        if (promoShots.has(`${sceneIdx}:${beat.beatId}`)) markers.push('In promo')
        const promoSource = beat as SceneBeat & { sourceSceneIndex?: number; sourceBeatId?: string }
        const hasSourceScene =
          Boolean(promoSource.sourceBeatId) &&
          typeof promoSource.sourceSceneIndex === 'number' &&
          promoSource.sourceSceneIndex >= 0 &&
          promoSource.sourceSceneIndex !== sceneIdx
        return {
          id: beat.beatId,
          beatNumber: (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : index) + 1,
          markers: markers.length > 0 ? markers : undefined,
          sourceSceneLabel: hasSourceScene ? `S${promoSource.sourceSceneIndex! + 1}` : undefined,
          onJumpToSourceScene:
            hasSourceScene && onNavigateScene
              ? () => onNavigateScene(promoSource.sourceSceneIndex!)
              : undefined,
          status: rail.status,
          statusLabel: rail.label,
          statusDetail: directionRailTooltip(rail),
          ariaLabel: `Shot ${index + 1}`,
        }
      }),
    [beats, promoShots, sceneIdx, onNavigateScene]
  )

  const readyShotCount = useMemo(
    () => items.filter((item) => item.status === 'ready').length,
    [items]
  )
  const hasAttentionShots = useMemo(
    () => items.some((item) => item.status === 'attention'),
    [items]
  )

  const beatNumber =
    selected &&
    (typeof selected.sequenceIndex === 'number'
      ? selected.sequenceIndex
      : beats.findIndex((beat) => beat.beatId === selected.beatId)) + 1

  return (
    <div className="space-y-3">
      {(description || sceneDir || onRunShotDirector) && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            {(description || sceneDir) ? (
              <button
                type="button"
                className="flex items-center gap-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/80"
                onClick={() => setDescriptionOpen((open) => !open)}
                aria-expanded={descriptionOpen}
              >
                {descriptionOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                {descriptionOpen ? 'Scene description' : 'Show scene description'}
              </button>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Scene shot flow
              </span>
            )}
            {beats.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {readyShotCount}/{beats.length} shots directed
                </span>
              </div>
            )}
          </div>
          {descriptionOpen && (description || sceneDir) && (
          <div className="space-y-2 px-3 pb-3">
          {description && (
            <p className="text-sm leading-relaxed text-slate-200">{description}</p>
          )}
          {sceneDir && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Property label="Atmosphere" value={sceneDir.scene?.atmosphere} />
              <Property label="Location" value={sceneDir.scene?.location} />
              <Property
                label="Key objects"
                value={sceneDir.scene?.keyProps?.length ? sceneDir.scene.keyProps.join(', ') : undefined}
              />
              <Property
                label="Camera"
                value={joinParts([
                  sceneDir.camera?.shots?.join(', '),
                  sceneDir.camera?.angle,
                  sceneDir.camera?.movement,
                ])}
              />
              <Property
                label="Lighting"
                value={joinParts([
                  sceneDir.lighting?.overallMood,
                  sceneDir.lighting?.timeOfDay,
                  sceneDir.lighting?.colorTemperature,
                ])}
              />
              <Property
                label="Talent"
                value={sceneDir.talent?.emotionalBeat || sceneDir.talent?.blocking}
              />
              <Property
                label="Audio"
                value={sceneDir.audio?.priorities || sceneDir.audio?.considerations}
              />
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {beats.length === 0 ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-6 text-center text-sm text-slate-500">
          No shots in this scene yet.
        </p>
      ) : (
        <SceneBeatStage
          railLabel="Shot direction"
          items={items}
          selectedId={selected?.beatId ?? null}
          onSelect={onSelectBeat}
          stage={
            <BeatStillClipViewer
              stillUrl={stillUrl}
              clipUrl={clipUrl}
              beatNumber={beatNumber || undefined}
            />
          }
          detail={
            editorBeat ? (
              <div className="space-y-2">
                {hasSharedSourceShot && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-fuchsia-500/35 bg-fuchsia-950/30 px-2.5 py-1.5 text-[11px] text-fuchsia-200">
                    <span>
                      Shared Shot • Linked with Scene {editorSceneIdx + 1} (edits sync to both Promo and Scene {editorSceneIdx + 1})
                    </span>
                    {onNavigateScene && (
                      <button
                        type="button"
                        onClick={() => onNavigateScene(editorSceneIdx)}
                        className="inline-flex items-center gap-1 rounded border border-fuchsia-500/40 bg-fuchsia-900/40 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-100 hover:bg-fuchsia-800/50 transition-colors"
                      >
                        Jump to Scene {editorSceneIdx + 1} ↗
                      </button>
                    )}
                  </div>
                )}
                <BeatDirectionEditor
                  layout="board"
                  beat={editorBeat}
                  sceneIdx={editorSceneIdx}
                  scenes={scenes ?? []}
                  script={script}
                  onScriptChange={onScriptChange}
                  promptComposition={promptComposition}
                  characters={characters}
                  locationReferences={locationReferences}
                  objectReferences={objectReferences}
                  projectId={projectId}
                />
              </div>
            ) : null
          }
        />
      )}
    </div>
  )
}

