'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import type {
  BeatDirection,
  BeatDirectionTransition,
  BeatReferenceSelection,
  SceneBeat,
} from '@/lib/script/segmentTypes'
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
  /** `board` is the open Direction-tab layout. `accordion` stays collapsed until opened. */
  layout?: 'accordion' | 'board'
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
}

export interface DirectionObject {
  id: string
  name: string
  imageUrl?: string
}

const SHOT_TYPE_OPTIONS = [
  '',
  'Extreme Close-Up',
  'Close-Up',
  'Medium Close-Up',
  'Medium Shot',
  'Medium Wide',
  'Wide Shot',
  'Extreme Wide Shot',
  'Two-Shot',
  'Over-the-Shoulder',
  'Insert Shot',
  'Point of View',
  'Center Composition',
]

const CAMERA_ANGLE_OPTIONS = [
  '',
  'eye-level',
  'low angle',
  'high angle',
  'Dutch angle',
  "bird's eye",
  "worm's eye",
]

const TRANSITION_OPTIONS: Array<{ value: '' | BeatDirectionTransition; label: string }> = [
  { value: '', label: 'Default (CUT)' },
  { value: 'CUT', label: 'CUT' },
  { value: 'CONTINUE', label: 'CONTINUE' },
  { value: 'DISSOLVE', label: 'DISSOLVE' },
  { value: 'FADE', label: 'FADE' },
  { value: 'MATCH_CUT', label: 'MATCH_CUT' },
]

function characterKey(character: DirectionCharacter): string {
  return character.id?.trim() || character.name
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

function trimOrUndef(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function parseChipInput(value: string): string[] | undefined {
  const parts = value
    .split(/[,\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : undefined
}

/** Names the scene lists, for suggesting valid cast. NARRATOR is never on camera. */
function readSceneCharacterNames(scene: any): string[] {
  const raw = Array.isArray(scene?.characters) ? scene.characters : []
  const names: string[] = []
  for (const entry of raw) {
    const name = typeof entry === 'string' ? entry : typeof entry?.name === 'string' ? entry.name : ''
    const trimmed = name.trim()
    if (trimmed && !/^narrator$/i.test(trimmed)) names.push(trimmed)
  }
  return names
}

function summarizeDirection(direction: BeatDirection | undefined): string {
  if (!direction) return 'No beat direction yet — click to add'
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
}: BeatDirectionEditorProps) {
  const [expanded, setExpanded] = useState(layout === 'board')
  const open = layout === 'board' || expanded
  const direction = beat.beatDirection
  const summary = useMemo(() => summarizeDirection(direction), [direction])
  const sceneCharacterNames = useMemo(
    () => readSceneCharacterNames(scenes[sceneIdx]),
    [scenes, sceneIdx]
  )
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

  const [frameDraft, setFrameDraft] = useState(framePreview)
  const [videoDraft, setVideoDraft] = useState(videoPreview)
  const [frameSource, setFrameSource] = useState(framePreview)
  const [videoSource, setVideoSource] = useState(videoPreview)
  if (frameSource !== framePreview && frameDraft === frameSource) {
    setFrameSource(framePreview)
    setFrameDraft(framePreview)
  }
  if (videoSource !== videoPreview && videoDraft === videoSource) {
    setVideoSource(videoPreview)
    setVideoDraft(videoPreview)
  }

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

  const updateField = <K extends keyof BeatDirection>(
    field: K,
    value: BeatDirection[K] | undefined
  ) => {
    const next: BeatDirection = { ...(direction ?? {}) }
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete next[field]
    } else {
      next[field] = value
    }
    persist(Object.keys(next).length > 0 ? next : undefined, { refreshPrompts: 'recompute' })
  }

  /**
   * Cast needs its own setter: an empty list is "nobody on camera", which
   * `updateField` would drop as an absence. Absent means the beat predates the
   * field and its cast is still guessed from prose.
   */
  const setCastInFrame = (value: string[] | undefined) => {
    const next: BeatDirection = { ...(direction ?? {}) }
    if (value === undefined) {
      delete next.castInFrame
    } else {
      next.castInFrame = value
    }
    persist(Object.keys(next).length > 0 ? next : undefined, { refreshPrompts: 'recompute' })
  }

  const commitPrompt = (field: 'framePrompt' | 'videoPrompt', draft: string, preview: string) => {
    const nextText = draft.trim()
    if (!nextText) return
    const stored = direction?.[field]?.trim() ?? ''
    if (nextText === stored || (!stored && nextText === preview.trim())) return
    const next: BeatDirection = { ...(direction ?? {}) }
    next[field] = nextText
    persist(next, { refreshPrompts: 'keep' })
  }

  const saveReferences = (next: BeatReferenceSelection) => {
    persist(direction, {
      refreshPrompts: 'keep',
      referenceSelection: {
        ...next,
        source: 'user',
        resolvedAt: new Date().toISOString(),
      },
    })
  }

  const castInFrame = direction?.castInFrame
  const castListId = `cast-in-frame-${beat.beatId}`

  const sectionTitle = (label: string) =>
    layout === 'board' ? (
      <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    ) : null

  return (
    <div
      className={
        layout === 'board'
          ? `rounded-lg border border-slate-700/50 bg-slate-950/40 ${className ?? ''}`
          : `rounded-md border border-gray-700/60 bg-black/20 ${className ?? ''}`
      }
    >
      {layout === 'accordion' && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
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
      )}

      {open && (
        <div className={layout === 'board' ? 'space-y-3 p-3 text-xs' : 'space-y-2 px-3 pb-3 pt-1 text-xs'}>
          {sectionTitle('Camera')}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Shot</span>
              <select
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.shotType ?? ''}
                onChange={(e) => updateField('shotType', trimOrUndef(e.target.value))}
                disabled={readOnly}
              >
                {SHOT_TYPE_OPTIONS.map((option) => (
                  <option key={option || 'default'} value={option}>
                    {option || '—'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Camera angle</span>
              <select
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.cameraAngle ?? ''}
                onChange={(e) => updateField('cameraAngle', trimOrUndef(e.target.value))}
                disabled={readOnly}
              >
                {CAMERA_ANGLE_OPTIONS.map((option) => (
                  <option key={option || 'default'} value={option}>
                    {option || '—'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Camera movement</span>
              <input
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.cameraMovement ?? ''}
                onChange={(e) => updateField('cameraMovement', trimOrUndef(e.target.value))}
                disabled={readOnly}
                placeholder="e.g., static, slow push-in"
              />
            </label>
          </div>

          {sectionTitle('Performance')}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-gray-500">
              Cast in frame (comma-separated; decides who the image model draws)
            </span>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 disabled:opacity-50"
              list={castListId}
              value={(castInFrame ?? []).join(', ')}
              onChange={(e) => setCastInFrame(parseChipInput(e.target.value) ?? [])}
              disabled={readOnly || castInFrame?.length === 0}
              placeholder={
                sceneCharacterNames.length > 0
                  ? sceneCharacterNames.join(', ')
                  : 'Character names as spelled in the scene'
              }
            />
            <datalist id={castListId}>
              {sceneCharacterNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={castInFrame?.length === 0}
                onChange={(e) => setCastInFrame(e.target.checked ? [] : undefined)}
                disabled={readOnly}
              />
              <span>No one on camera</span>
            </label>
            {castInFrame === undefined && (
              <span>Not stated — cast is guessed from the beat text</span>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-gray-500">Blocking</span>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
              value={direction?.blocking ?? ''}
              onChange={(e) => updateField('blocking', trimOrUndef(e.target.value))}
              disabled={readOnly}
              placeholder="One clause naming positions / body posture"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Emotion</span>
              <input
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.emotion ?? ''}
                onChange={(e) => updateField('emotion', trimOrUndef(e.target.value))}
                disabled={readOnly}
                placeholder="e.g., hypnotic awe"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Gaze</span>
              <input
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.gaze ?? ''}
                onChange={(e) => updateField('gaze', trimOrUndef(e.target.value))}
                disabled={readOnly}
                placeholder="e.g., toward the glowing core"
              />
            </label>
          </div>

          {sectionTitle('World')}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-gray-500">
              Key props (comma-separated; must exist in scene Key Props)
            </span>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
              value={(direction?.keyProps ?? []).join(', ')}
              onChange={(e) => updateField('keyProps', parseChipInput(e.target.value))}
              disabled={readOnly}
              placeholder="Water-damaged leather journal, Brass energy core"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-gray-500">Object interaction</span>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
              value={direction?.propInteraction ?? ''}
              onChange={(e) => updateField('propInteraction', trimOrUndef(e.target.value))}
              disabled={readOnly}
              placeholder="e.g., grips journal one-handed at Gideon's sternum"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-gray-500">Lighting accent</span>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
              value={direction?.lightingAccent ?? ''}
              onChange={(e) => updateField('lightingAccent', trimOrUndef(e.target.value))}
              disabled={readOnly}
              placeholder="e.g., teal accent underlighting Gideon's face"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-gray-500">Frozen moment</span>
            <textarea
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 min-h-[52px]"
              value={direction?.frozenMoment ?? ''}
              onChange={(e) => updateField('frozenMoment', trimOrUndef(e.target.value))}
              disabled={readOnly}
              placeholder="One sentence describing the still"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Audio cue</span>
              <input
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.audioCue ?? ''}
                onChange={(e) => updateField('audioCue', trimOrUndef(e.target.value))}
                disabled={readOnly}
                placeholder="e.g., glitching proximity timer chirps twice"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Transition into next beat</span>
              <select
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                value={direction?.transition ?? ''}
                onChange={(e) =>
                  updateField(
                    'transition',
                    (e.target.value || undefined) as BeatDirectionTransition | undefined
                  )
                }
                disabled={readOnly}
              >
                {TRANSITION_OPTIONS.map((option) => (
                  <option key={option.value || 'default'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2 border-t border-gray-800 pt-2">
            {sectionTitle('Prompts')}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase text-gray-500">Frame prompt</span>
              {!readOnly && (
                <button
                  type="button"
                  className="text-[10px] underline text-gray-400 hover:text-gray-200"
                  onClick={() => persist(direction, { refreshPrompts: 'rebuild' })}
                >
                  Rebuild from fields
                </button>
              )}
            </div>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 min-h-[72px]"
              value={frameDraft}
              onChange={(e) => setFrameDraft(e.target.value)}
              onBlur={() => {
                if (!frameDraft.trim()) {
                  setFrameDraft(framePreview)
                  return
                }
                commitPrompt('framePrompt', frameDraft, framePreview)
              }}
              disabled={readOnly}
              placeholder="Still prompt sent for this beat"
            />
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-500">Video prompt</span>
              <textarea
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 min-h-[72px]"
                value={videoDraft}
                onChange={(e) => setVideoDraft(e.target.value)}
                onBlur={() => {
                  if (!videoDraft.trim()) {
                    setVideoDraft(videoPreview)
                    return
                  }
                  commitPrompt('videoPrompt', videoDraft, videoPreview)
                }}
                disabled={readOnly}
                placeholder="Clip prompt sent for this beat"
              />
            </label>
          </div>

          {(characters.length > 0 || locationReferences.length > 0 || objectReferences.length > 0) && (
            <div className="space-y-2 border-t border-gray-800 pt-2">
              <span className="text-[10px] uppercase text-gray-500">References</span>
              {characters
                .filter((character) => character.type !== 'narrator' && character.name.trim())
                .filter((character) => {
                  const key = characterKey(character)
                  const selected =
                    referenceSelection.characterIds.includes(key) ||
                    referenceSelection.characterIds.includes(character.name)
                  if (selected) return true
                  return sceneCharacterNames.some(
                    (name) => name.toLowerCase() === character.name.toLowerCase()
                  )
                })
                .map((character) => {
                  const key = characterKey(character)
                  const checked =
                    referenceSelection.characterIds.includes(key) ||
                    referenceSelection.characterIds.includes(character.name)
                  const wardrobeId =
                    referenceSelection.characterWardrobes?.find(
                      (row) => row.characterId === key || row.characterId === character.name
                    )?.wardrobeId ?? ''
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={readOnly}
                          onChange={(e) => {
                            const characterIds = e.target.checked
                              ? [...new Set([...referenceSelection.characterIds, key])]
                              : referenceSelection.characterIds.filter(
                                  (id) => id !== key && id !== character.name
                                )
                            const characterWardrobes = (
                              referenceSelection.characterWardrobes ?? []
                            ).filter(
                              (row) =>
                                row.characterId !== key &&
                                row.characterId !== character.name &&
                                characterIds.includes(row.characterId)
                            )
                            saveReferences({
                              ...referenceSelection,
                              characterIds,
                              characterWardrobes,
                            })
                          }}
                        />
                        <span>{character.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {character.referenceImage ? 'identity' : 'no identity image'}
                        </span>
                      </label>
                      {checked && (character.wardrobes?.length ?? 0) > 0 && (
                        <select
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                          value={wardrobeId}
                          disabled={readOnly}
                          onChange={(e) => {
                            const others = (referenceSelection.characterWardrobes ?? []).filter(
                              (row) => row.characterId !== key && row.characterId !== character.name
                            )
                            saveReferences({
                              ...referenceSelection,
                              characterIds: referenceSelection.characterIds.includes(key)
                                ? referenceSelection.characterIds
                                : [...referenceSelection.characterIds, key],
                              characterWardrobes: e.target.value
                                ? [...others, { characterId: key, wardrobeId: e.target.value }]
                                : others,
                            })
                          }}
                        >
                          <option value="">Wardrobe</option>
                          {character.wardrobes?.map((wardrobe) => (
                            <option key={wardrobe.id} value={wardrobe.id}>
                              {wardrobe.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })}
              {locationReferences.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-gray-500">Location</span>
                  <select
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                    value={referenceSelection.locationRefId ?? ''}
                    disabled={readOnly}
                    onChange={(e) =>
                      saveReferences({
                        ...referenceSelection,
                        locationRefId: e.target.value || null,
                        locationVersionId: null,
                      })
                    }
                  >
                    <option value="">None</option>
                    {locationReferences.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.location || location.name || location.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {objectReferences.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-gray-500">Props</span>
                  {objectReferences
                    .filter(
                      (object) =>
                        referenceSelection.objectRefIds.includes(object.id) ||
                        (direction?.keyProps ?? []).some(
                          (name) => name.toLowerCase() === object.name.toLowerCase()
                        )
                    )
                    .map((object) => {
                      const checked = referenceSelection.objectRefIds.includes(object.id)
                      return (
                        <label key={object.id} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={readOnly}
                            onChange={(e) => {
                              const objectRefIds = e.target.checked
                                ? [...new Set([...referenceSelection.objectRefIds, object.id])]
                                : referenceSelection.objectRefIds.filter((id) => id !== object.id)
                              saveReferences({ ...referenceSelection, objectRefIds })
                            }}
                          />
                          <span>{object.name}</span>
                        </label>
                      )
                    })}
                  {objectReferences.some(
                    (object) => !referenceSelection.objectRefIds.includes(object.id)
                  ) && (
                    <select
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                      value=""
                      disabled={readOnly}
                      onChange={(e) => {
                        if (!e.target.value) return
                        saveReferences({
                          ...referenceSelection,
                          objectRefIds: [
                            ...new Set([...referenceSelection.objectRefIds, e.target.value]),
                          ],
                        })
                      }}
                    >
                      <option value="">Add prop</option>
                      {objectReferences
                        .filter((object) => !referenceSelection.objectRefIds.includes(object.id))
                        .map((object) => (
                          <option key={object.id} value={object.id}>
                            {object.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {direction?.generatedBy && (
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Source: {direction.generatedBy}</span>
              {!readOnly && (
                <button
                  type="button"
                  className="underline hover:text-red-300"
                  onClick={() => persist(undefined)}
                >
                  Clear direction
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
