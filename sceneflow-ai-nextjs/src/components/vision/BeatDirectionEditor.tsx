'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Clapperboard } from 'lucide-react'
import { BeatDirectorDialog } from '@/components/vision/BeatDirectorDialog'
import { BeatExcludeToggle } from '@/components/vision/BeatExcludeToggle'
import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import type {
  BeatDirection,
  BeatDirectionTransition,
  BeatReferenceSelection,
  SceneBeat,
} from '@/lib/script/segmentTypes'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { refreshSceneSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { parsePersistedMusicCues, resolveBeatMusicCue } from '@/lib/script/sceneMusicCues'
import {
  beatStillDirectionFingerprint,
} from '@/lib/script/beatDirectionFingerprint'
import { restampPreVisHashIfScriptCurrent } from '@/lib/storyboard/preVisSync'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import {
  composeBeatActionFraming,
  composePersistedBeatStillPrompt,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  resolveBeatElementSelection,
} from '@/lib/vision/resolveBeatVideoReferences'
import { shouldUseExplicitBeatReferences } from '@/lib/vision/beatFrameGenerationContext'
import {
  alignDirectionToConnectedObjects,
  connectLocationReference,
  connectObjectReference,
  disconnectObjectReference,
} from '@/lib/vision/beatReferenceConnections'
import { applyBeatDirectionSelections } from '@/lib/vision/applyBeatDirectionSelection'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import type { DetailedSceneDirection } from '@/types/scene-direction'

export interface BeatDirectionEditorProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  readOnly?: boolean
  className?: string
  /**
   * The project's locked art style and lookbook.
   *
   * Saving direction recomposes the beat's still prompt, and composing it here
   * without what the Frame Agent composes with left the same beat holding a
   * different prompt depending on which path wrote it last.
   */
  promptComposition?: {
    artStyleAnchor?: string
    lookbook?: ProjectLookbook
  }
  /** Library rows the beat can attach. Identity is `referenceImage`. */
  characters?: DirectionCharacter[]
  locationReferences?: DirectionLocation[]
  objectReferences?: DirectionObject[]
  /** `board` is the open Direction-tab layout. `accordion` stays collapsed until opened. `dialog` mounts only Direct Beat. */
  layout?: 'accordion' | 'board' | 'dialog'
  projectId?: string
  /** Controlled Direct Beat dialog. Used by the Clips tab, where this editor is dialog-only. */
  directorOpen?: boolean
  onDirectorOpenChange?: (open: boolean) => void
  /** Open Direct Shot with Safety already checked. */
  initialSafety?: boolean
}

export interface DirectionCharacter {
  id?: string
  name: string
  referenceImage?: string
  type?: string
  wardrobes?: Array<{
    id: string
    name: string
    fullBodyUrl?: string
    headshotUrl?: string
    combinedCharacterRefUrl?: string
    isDefault?: boolean
  }>
}

export interface DirectionLocation {
  id: string
  location?: string
  name?: string
  imageUrl?: string
  sceneNumbers?: number[]
  versions?: Array<{ id: string; name: string; imageUrl?: string }>
}

export interface DirectionObject {
  id: string
  name: string
  imageUrl?: string
  sceneNumbers?: number[]
}

const TRANSITION_LABEL: Record<BeatDirectionTransition, string> = {
  CUT: 'Cut',
  CONTINUE: 'Continue',
  DISSOLVE: 'Dissolve',
  FADE: 'Fade',
  MATCH_CUT: 'Match cut',
}

function DirectionTile({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <div className="min-w-0 rounded-md border border-amber-900/40 bg-slate-900/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/70">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-200">{value}</p>
    </div>
  )
}

function ReferenceChip({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/50 px-2 py-1 text-xs text-slate-200">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover bg-slate-800" />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded bg-slate-800" />
      )}
      <span className="truncate">{name}</span>
    </span>
  )
}

function stripPromptOverrides(direction: BeatDirection | undefined): BeatDirection | undefined {
  if (!direction) return undefined
  const next = { ...direction }
  delete next.framePrompt
  delete next.videoPrompt
  return next
}

function selectionFromBeat(
  beat: SceneBeat,
  resolved: ReturnType<typeof resolveBeatElementSelection>
): BeatReferenceSelection {
  if (shouldUseExplicitBeatReferences(beat)) return beat.referenceSelection
  return {
    characterIds: resolved.characterIds,
    objectRefIds: resolved.objectRefIds,
    locationRefId: resolved.locationRefId ?? null,
    locationVersionId: resolved.locationVersionId ?? null,
    characterWardrobes: resolved.characterWardrobes,
    source: 'auto',
  }
}

function summarizeDirection(direction: BeatDirection | undefined): string {
  if (!direction) return 'No shot direction yet — click to add'
  const parts = [direction.shotType, direction.cameraAngle, direction.cameraMovement].filter(Boolean)
  return parts.join(' • ') || 'Direction saved (expand to view)'
}

export function BeatDirectionEditor({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  readOnly,
  className,
  promptComposition,
  characters = [],
  locationReferences = [],
  objectReferences = [],
  layout = 'accordion',
  projectId,
  directorOpen: directorOpenProp,
  onDirectorOpenChange,
  initialSafety = false,
}: BeatDirectionEditorProps) {
  const [expanded, setExpanded] = useState(layout === 'board')
  const [directorOpenInternal, setDirectorOpenInternal] = useState(false)
  const directorOpen = directorOpenProp ?? directorOpenInternal
  const setDirectorOpen = (open: boolean) => {
    onDirectorOpenChange?.(open)
    if (directorOpenProp === undefined) setDirectorOpenInternal(open)
  }
  const open = layout === 'board' || expanded
  const direction = beat.beatDirection
  const summary = useMemo(() => summarizeDirection(direction), [direction])
  const [promptsOpen, setPromptsOpen] = useState(false)
  const sceneRecord = scenes[sceneIdx] as Record<string, unknown> | undefined
  const sceneDirection = (sceneRecord?.sceneDirection ??
    sceneRecord?.detailedDirection ??
    null) as DetailedSceneDirection | null

  const framePreview = useMemo(() => {
    if (direction?.framePrompt?.trim()) return direction.framePrompt.trim()
    const stripped: SceneBeat = { ...beat, beatDirection: stripPromptOverrides(beat.beatDirection) }
    return (
      composePersistedBeatStillPrompt({
        beat: stripped,
        sceneIndex: sceneIdx,
        artStyleAnchor: promptComposition?.artStyleAnchor,
        lookbook: promptComposition?.lookbook,
      }) ||
      beat.storyboardImagePrompt?.trim() ||
      composeBeatActionFraming(stripped)
    )
  }, [beat, direction?.framePrompt, sceneIdx, promptComposition])

  const videoPreview = useMemo(() => {
    if (direction?.videoPrompt?.trim()) return direction.videoPrompt.trim()
    const beats = getSceneBeats(sceneRecord ?? {})
    const index = beats.findIndex((entry) => entry.beatId === beat.beatId)
    const cue = resolveBeatMusicCue(
      parsePersistedMusicCues(sceneRecord?.sceneMusicCues, beats),
      index
    )
    const stripped: SceneBeat = { ...beat, beatDirection: stripPromptOverrides(beat.beatDirection) }
    return compileBeatVideoPromptFromDirection(stripped, sceneDirection, {
      artStyleId: promptComposition?.artStyleAnchor,
      ...(cue ? { musicCue: cue } : {}),
    }).prompt
  }, [beat, direction?.videoPrompt, sceneRecord, sceneDirection, promptComposition?.artStyleAnchor])

  const resolvedSelection = useMemo(
    () =>
      resolveBeatElementSelection({
        scene: sceneRecord ?? {},
        beat,
        sceneIndex: sceneIdx,
        projectCharacters: characters,
        locationReferences: locationReferences as LocationReference[],
        objectReferences: objectReferences as VisualReference[],
      }),
    [sceneRecord, beat, sceneIdx, characters, locationReferences, objectReferences]
  )
  const referenceSelection = useMemo(
    () => selectionFromBeat(beat, resolvedSelection),
    [beat, resolvedSelection]
  )

  const persist = (
    next: BeatDirection | undefined,
    options?: {
      refreshPrompts?: 'recompute' | 'keep' | 'rebuild'
      referenceSelection?: BeatReferenceSelection | null
      actionDescription?: string
    }
  ) => {
    if (!onScriptChange) return
    const refreshPrompts = options?.refreshPrompts ?? 'keep'
    const keptFrame = refreshPrompts === 'keep' ? next?.framePrompt?.trim() : ''
    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    const beats = getSceneBeats(scene).map((entry) => {
      if (entry.beatId !== beat.beatId) return entry
      const patched: SceneBeat = { ...entry }
      const actionDescription = options?.actionDescription?.trim()
      if (actionDescription) patched.actionDescription = actionDescription
      const directionForSave =
        refreshPrompts === 'keep' ? next : stripPromptOverrides(next)
      if (directionForSave && Object.keys(directionForSave).length > 0) {
        patched.beatDirection = {
          ...directionForSave,
          generatedBy: 'user',
          updatedAt: new Date().toISOString(),
        }
      } else {
        delete patched.beatDirection
      }
      if (options?.referenceSelection !== undefined) {
        if (options.referenceSelection) patched.referenceSelection = options.referenceSelection
        else delete patched.referenceSelection
      }
      return syncBeatStillPromptToDirection(patched, {
        sceneIndex: sceneIdx,
        artStyleAnchor: promptComposition?.artStyleAnchor,
        lookbook: promptComposition?.lookbook,
        force: refreshPrompts === 'recompute' || refreshPrompts === 'rebuild',
      })
    })
    const edited = beats.find((entry) => entry.beatId === beat.beatId)
    let withBeats = applyBeatsToScene(scene, beats)
    if (edited) {
      withBeats = refreshSceneSegmentVideoPrompts(withBeats, edited, {
        artStyleId: promptComposition?.artStyleAnchor,
      })
    }
    if (keptFrame) {
      const restored = getSceneBeats(withBeats).map((entry) => {
        if (entry.beatId !== beat.beatId) return entry
        const beatDirection = entry.beatDirection
          ? { ...entry.beatDirection, framePrompt: keptFrame }
          : entry.beatDirection
        return {
          ...entry,
          beatDirection,
          storyboardImagePrompt: keptFrame,
          storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(beatDirection),
        }
      })
      withBeats = applyBeatsToScene(withBeats, restored)
    }
    if (refreshPrompts === 'recompute' && edited?.beatDirection) {
      const segments = Array.isArray(withBeats.segments)
        ? (withBeats.segments as Array<{
            beatId?: string
            videoPrompt?: string | null
            userEditedPrompt?: string | null
          }>)
        : []
      const segment = segments.find(
        (row) =>
          row.beatId === beat.beatId &&
          !(typeof row.userEditedPrompt === 'string' && row.userEditedPrompt.trim())
      )
      const framePrompt = edited.storyboardImagePrompt?.trim()
      const videoPrompt = segment?.videoPrompt?.trim()
      if (framePrompt || videoPrompt) {
        const storedBeats = getSceneBeats(withBeats).map((entry) => {
          if (entry.beatId !== beat.beatId || !entry.beatDirection) return entry
          return {
            ...entry,
            beatDirection: {
              ...entry.beatDirection,
              ...(framePrompt ? { framePrompt } : {}),
              ...(videoPrompt ? { videoPrompt } : {}),
            },
          }
        })
        withBeats = applyBeatsToScene(withBeats, storedBeats)
      }
    }
    updatedScenes[sceneIdx] = restampPreVisHashIfScriptCurrent(scene, withBeats)

    onScriptChange({
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes,
      },
    })
  }

  const sceneNumber =
    (typeof sceneRecord?.scene_number === 'number' ? sceneRecord.scene_number : undefined) ??
    (typeof sceneRecord?.sceneNumber === 'number' ? sceneRecord.sceneNumber : undefined) ??
    sceneIdx + 1

  const writeConnection = (
    updates: Array<{
      sceneIndex: number
      beatId: string
      direction: BeatDirection | undefined
      referenceSelection: BeatReferenceSelection
    }>,
    options?: { rebuildPrompts?: boolean }
  ) => {
    if (!onScriptChange || readOnly) return
    const nextScenes = applyBeatDirectionSelections(scenes, updates, {
      artStyleAnchor: promptComposition?.artStyleAnchor,
      lookbook: promptComposition?.lookbook,
      rebuildPrompts: options?.rebuildPrompts,
    })
    onScriptChange({
      ...script,
      script: {
        ...script.script,
        scenes: nextScenes,
      },
    })
  }

  const namesForSelection = (selection: BeatReferenceSelection): string[] =>
    selection.objectRefIds
      .map((id) => objectReferences.find((object) => object.id === id)?.name?.trim())
      .filter((name): name is string => !!name)

  const directionAlignedToSelection = (
    nextDirection: BeatDirection | undefined,
    selection: BeatReferenceSelection
  ): BeatDirection | undefined =>
    alignDirectionToConnectedObjects(nextDirection, namesForSelection(selection)) ?? nextDirection

  const saveDirectionPreview = (patch: StillDirectorPatch) => {
    const next: BeatDirection = { ...(direction ?? {}) }
    const textKeys = [
      'shotType',
      'cameraAngle',
      'frozenMoment',
      'blocking',
      'gaze',
      'emotion',
      'propInteraction',
      'lightingAccent',
      'cameraMovement',
      'audioCue',
    ] as const
    for (const key of textKeys) {
      const value = patch[key]?.trim()
      if (value) next[key] = value
    }
    if (!next.frozenMoment?.trim() && patch.actionFraming?.trim()) {
      next.frozenMoment = patch.actionFraming.trim()
    }
    if (Array.isArray(patch.castInFrame)) next.castInFrame = patch.castInFrame
    if (patch.keyProps && patch.keyProps.length > 0) next.keyProps = patch.keyProps
    if (patch.transition) next.transition = patch.transition
    persist(directionAlignedToSelection(next, referenceSelection), {
      refreshPrompts: 'recompute',
      actionDescription: patch.actionDescription,
    })
  }

  const toggleObject = (object: DirectionObject, connect: boolean) => {
    const resolvedAt = new Date().toISOString()
    const next = connect
      ? connectObjectReference({
          direction,
          selection: referenceSelection,
          objectId: object.id,
          objectName: object.name,
          resolvedAt,
        })
      : disconnectObjectReference({
          direction,
          selection: referenceSelection,
          objectId: object.id,
          objectName: object.name,
          resolvedAt,
        })
    writeConnection(
      [
        {
          sceneIndex: sceneIdx,
          beatId: beat.beatId,
          direction: directionAlignedToSelection(next.direction, next.selection),
          referenceSelection: next.selection,
        },
      ],
      { rebuildPrompts: true }
    )
  }

  const selectLocation = (locationRefId: string | null, locationVersionId: string | null) => {
    writeConnection([
      {
        sceneIndex: sceneIdx,
        beatId: beat.beatId,
        direction,
        referenceSelection: connectLocationReference(
          referenceSelection,
          locationRefId,
          locationVersionId,
          new Date().toISOString()
        ),
      },
    ])
  }

  const castInFrame = direction?.castInFrame
  const beatProse =
    beat.kind === 'action'
      ? beat.actionDescription?.trim()
      : beat.line?.trim() || beat.actionDescription?.trim()
  const cameraChips = [
    direction?.shotType,
    direction?.cameraAngle,
    direction?.cameraMovement,
    direction?.transition ? TRANSITION_LABEL[direction.transition] : undefined,
  ].filter((value): value is string => !!value?.trim())
  const connectedCast = characters.filter(
    (character) =>
      character.type !== 'narrator' &&
      (referenceSelection.characterIds.includes(character.id || '') ||
        referenceSelection.characterIds.includes(character.name))
  )
  const connectedLocation = locationReferences.find(
    (location) => location.id === referenceSelection.locationRefId
  )
  const connectedObjects = objectReferences.filter((object) =>
    referenceSelection.objectRefIds.includes(object.id)
  )
  const hasReferences =
    connectedCast.length > 0 || !!connectedLocation || connectedObjects.length > 0
  const hasStructuredDirection =
    cameraChips.length > 0 ||
    !!direction?.frozenMoment?.trim() ||
    !!direction?.blocking?.trim() ||
    !!direction?.emotion?.trim() ||
    !!direction?.gaze?.trim() ||
    !!direction?.lightingAccent?.trim() ||
    !!direction?.propInteraction?.trim() ||
    !!direction?.audioCue?.trim() ||
    (direction?.keyProps?.length ?? 0) > 0 ||
    castInFrame !== undefined

  const directButton = (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-teal-800/80 px-2 py-1 text-[11px] text-teal-200 hover:bg-teal-950/40"
      onClick={() => setDirectorOpen(true)}
    >
      <Clapperboard className="w-3.5 h-3.5" />
      Direct Shot
    </button>
  )

  const directorDialog = (
    <BeatDirectorDialog
      open={directorOpen}
      onOpenChange={setDirectorOpen}
      beat={beat}
      sceneNumber={sceneNumber}
      sceneIndex={sceneIdx}
      scenes={scenes}
      projectId={projectId}
      readOnly={readOnly}
      characters={characters}
      locationReferences={locationReferences}
      objectReferences={objectReferences}
      referenceSelection={referenceSelection}
      onSaveDirection={saveDirectionPreview}
      onToggleObject={toggleObject}
      onSelectLocation={selectLocation}
      initialSafety={initialSafety}
    />
  )

  if (layout === 'dialog') return directorDialog

  return (
    <div
      className={
        layout === 'board'
          ? `rounded-lg border border-slate-700/50 bg-slate-950/40 ${className ?? ''}`
          : `rounded-md border border-gray-700/60 bg-black/20 ${className ?? ''}`
      }
    >
      {layout === 'accordion' ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left"
            aria-expanded={expanded}
          >
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              Direction
            </span>
            <span className="text-xs text-gray-300 truncate">{summary}</span>
          </button>
          <BeatExcludeToggle
            beat={beat}
            sceneIdx={sceneIdx}
            scenes={scenes}
            script={script}
            onScriptChange={onScriptChange}
            readOnly={readOnly}
          />
          {directButton}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/80">
            Shot description
          </p>
          <div className="flex items-center gap-2">
            <BeatExcludeToggle
              beat={beat}
              sceneIdx={sceneIdx}
              scenes={scenes}
              script={script}
              onScriptChange={onScriptChange}
              readOnly={readOnly}
            />
            {directButton}
          </div>
        </div>
      )}
      {directorDialog}

      {open && (
        <div className={layout === 'board' ? 'space-y-3 px-3 pb-3' : 'space-y-3 px-3 pb-3 pt-1'}>
          {beatProse ? (
            <p className="text-sm leading-relaxed text-slate-200">{beatProse}</p>
          ) : !hasStructuredDirection ? (
            <p className="text-sm leading-relaxed text-slate-400">
              No direction yet. Use Direct Shot to describe the shot.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <DirectionTile label="Still" value={direction?.frozenMoment} />
            <DirectionTile label="Camera" value={cameraChips.join(' • ')} />
            <DirectionTile
              label="Cast"
              value={
                castInFrame === undefined
                  ? hasStructuredDirection
                    ? 'Cast follows the shot text.'
                    : undefined
                  : castInFrame.length === 0
                    ? 'No one on camera.'
                    : castInFrame.join(', ')
              }
            />
            <DirectionTile label="Blocking" value={direction?.blocking} />
            <DirectionTile label="Emotion" value={direction?.emotion} />
            <DirectionTile label="Gaze" value={direction?.gaze} />
            <DirectionTile label="Lighting" value={direction?.lightingAccent} />
            <DirectionTile label="Interaction" value={direction?.propInteraction} />
            <DirectionTile label="Audio" value={direction?.audioCue} />
            <DirectionTile label="Props" value={direction?.keyProps?.filter(Boolean).join(', ')} />
          </div>

          {hasReferences && (
            <div className="space-y-1.5 border-t border-slate-800 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">References</p>
              <div className="flex flex-wrap gap-2">
                {connectedCast.map((character) => (
                  <ReferenceChip
                    key={character.id || character.name}
                    name={character.name}
                    imageUrl={character.referenceImage}
                  />
                ))}
                {connectedLocation && (
                  <ReferenceChip
                    name={connectedLocation.location || connectedLocation.name || 'Location'}
                    imageUrl={connectedLocation.imageUrl}
                  />
                )}
                {connectedObjects.map((object) => (
                  <ReferenceChip key={object.id} name={object.name} imageUrl={object.imageUrl} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-800 pt-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 hover:text-slate-200"
              onClick={() => setPromptsOpen((prev) => !prev)}
              aria-expanded={promptsOpen}
            >
              {promptsOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Frame and clip prompts
            </button>
            {promptsOpen && (
              <div className="mt-2 space-y-3">
                <DirectionTile label="Frame prompt" value={framePreview} />
                <DirectionTile label="Clip prompt" value={videoPreview} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
