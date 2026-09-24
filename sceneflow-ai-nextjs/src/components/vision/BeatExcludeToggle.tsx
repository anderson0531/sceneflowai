'use client'

import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface BeatExcludeToggleProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  readOnly?: boolean
  className?: string
}

export function BeatExcludeToggle({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  readOnly = false,
  className,
}: BeatExcludeToggleProps) {
  const included = beat.excluded !== true

  const setIncluded = (nextIncluded: boolean) => {
    if (readOnly || !onScriptChange || nextIncluded === included) return

    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    scene.beats = getSceneBeats(scene).map((entry) =>
      entry.beatId === beat.beatId ? { ...entry, excluded: !nextIncluded } : entry
    )
    updatedScenes[sceneIdx] = scene

    onScriptChange({
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes,
      },
    })
  }

  const optionClass = (active: boolean) =>
    `px-2 py-0.5 text-[10px] font-medium transition-colors ${
      active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
    } disabled:cursor-not-allowed disabled:opacity-50`

  return (
    <div
      className={`inline-flex shrink-0 overflow-hidden rounded border border-slate-600/70 ${className ?? ''}`}
      role="group"
      aria-label={`Beat ${beat.sequenceIndex + 1} include or exclude`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={readOnly}
        aria-pressed={included}
        className={`${optionClass(included)} border-r border-slate-600/70`}
        title="Include this beat in image, video, and the Mixer"
        onClick={() => setIncluded(true)}
      >
        Include
      </button>
      <button
        type="button"
        disabled={readOnly}
        aria-pressed={!included}
        className={optionClass(!included)}
        title="Exclude this beat from image, video, and the Mixer"
        onClick={() => setIncluded(false)}
      >
        Exclude
      </button>
    </div>
  )
}
