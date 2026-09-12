'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import type {
  BeatDirection,
  BeatDirectionTransition,
  SceneBeat,
} from '@/lib/script/segmentTypes'
import { restampPreVisHashIfScriptCurrent } from '@/lib/storyboard/preVisSync'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'

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
}: BeatDirectionEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const direction = beat.beatDirection
  const summary = useMemo(() => summarizeDirection(direction), [direction])
  const sceneCharacterNames = useMemo(
    () => readSceneCharacterNames(scenes[sceneIdx]),
    [scenes, sceneIdx]
  )

  const persist = (next: BeatDirection | undefined) => {
    if (!onScriptChange) return
    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    const beats = getSceneBeats(scene).map((entry) => {
      if (entry.beatId !== beat.beatId) return entry
      const patched = { ...entry }
      if (next && Object.keys(next).length > 0) {
        patched.beatDirection = {
          ...next,
          generatedBy: 'user',
          updatedAt: new Date().toISOString(),
        }
      } else {
        delete patched.beatDirection
      }
      return syncBeatStillPromptToDirection(patched, {
        sceneIndex: sceneIdx,
        artStyleAnchor: promptComposition?.artStyleAnchor,
        lookbook: promptComposition?.lookbook,
      })
    })
    updatedScenes[sceneIdx] = restampPreVisHashIfScriptCurrent(
      scene,
      applyBeatsToScene(scene, beats)
    )

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
    persist(Object.keys(next).length > 0 ? next : undefined)
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
    persist(Object.keys(next).length > 0 ? next : undefined)
  }

  const castInFrame = direction?.castInFrame
  const castListId = `cast-in-frame-${beat.beatId}`

  return (
    <div className={`rounded-md border border-gray-700/60 bg-black/20 ${className ?? ''}`}>
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

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 text-xs">
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
