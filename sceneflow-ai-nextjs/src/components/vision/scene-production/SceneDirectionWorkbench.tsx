'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { BeatDirectionEditor } from '@/components/vision/BeatDirectionEditor'
import type { DirectionCharacter, DirectionLocation, DirectionObject } from '@/components/vision/BeatDirectionEditor'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { resolveLiveTake, segmentHasPlayableVideo } from '@/lib/storyboard/mediaVersions'
import type { SceneSegment } from './types'
import { BeatStillClipViewer } from './BeatStillClipViewer'
import { SceneBeatStage, type SceneBeatStageItem } from './SceneBeatStage'

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
}: SceneDirectionWorkbenchProps) {
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const sceneDir = scene.sceneDirection as DetailedSceneDirection | undefined
  const prose = scene.visualDescription || scene.action || scene.summary || scene.heading
  const description = sceneDir?.sceneDescription || prose

  const selected = beats.find((beat) => beat.beatId === selectedBeatId) ?? beats[0]
  const segment = selected
    ? segments.find((row) => row.beatId === selected.beatId && segmentHasPlayableVideo(row)) ??
      segments.find((row) => row.beatId === selected.beatId)
    : undefined
  const liveTake = segment
    ? resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)
    : undefined
  const clipUrl = liveTake?.url
  const stillUrl = selected?.storyboardImageUrl?.trim()

  const items = useMemo<SceneBeatStageItem[]>(
    () =>
      beats.map((beat, index) => ({
        id: beat.beatId,
        beatNumber: (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : index) + 1,
        imageUrl: beat.storyboardImageUrl?.trim() || undefined,
        status: beat.beatDirection ? 'ready' : 'idle',
        ariaLabel: `Beat ${index + 1}`,
      })),
    [beats]
  )

  const beatNumber =
    selected &&
    (typeof selected.sequenceIndex === 'number'
      ? selected.sequenceIndex
      : beats.findIndex((beat) => beat.beatId === selected.beatId)) + 1

  return (
    <div className="space-y-3">
      {(description || sceneDir) && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-950/40">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/80"
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
          {descriptionOpen && (
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
          No beats in this scene yet.
        </p>
      ) : (
        <SceneBeatStage
          railLabel="Beat direction"
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
            selected ? (
              <BeatDirectionEditor
                layout="board"
                beat={selected}
                sceneIdx={sceneIdx}
                scenes={scenes ?? []}
                script={script}
                onScriptChange={onScriptChange}
                promptComposition={promptComposition}
                characters={characters}
                locationReferences={locationReferences}
                objectReferences={objectReferences}
              />
            ) : null
          }
        />
      )}
    </div>
  )
}

