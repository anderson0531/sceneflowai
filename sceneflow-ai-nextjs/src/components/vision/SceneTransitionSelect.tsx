'use client'

import { Film } from 'lucide-react'
import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'

/**
 * How this scene hands over to the next one.
 *
 * Only the three joins that actually play are offered. `MATCH_CUT` and
 * `CONTINUE` exist on beats because they tell the image model how to shoot the
 * next frame, which is meaningless across a scene break.
 */
const SCENE_TRANSITION_OPTIONS: Array<{
  value: BeatDirectionTransition
  label: string
}> = [
  { value: 'FADE', label: 'Fade to black' },
  { value: 'DISSOLVE', label: 'Dissolve' },
  { value: 'CUT', label: 'Cut' },
]

export interface SceneTransitionSelectProps {
  sceneIdx: number
  scenes?: any[]
  script: any
  onScriptChange?: (script: any) => void
  className?: string
}

export function SceneTransitionSelect({
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  className,
}: SceneTransitionSelectProps) {
  const scene = scenes?.[sceneIdx]
  const nextScene = scenes?.[sceneIdx + 1]
  if (!scene || !nextScene) return null

  const current: BeatDirectionTransition = scene.transitionToNext ?? 'FADE'
  const readOnly = !onScriptChange

  const handleChange = (value: BeatDirectionTransition) => {
    if (!onScriptChange) return

    const updatedScenes = [...scenes]
    updatedScenes[sceneIdx] = { ...scene, transitionToNext: value }

    onScriptChange({
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes,
      },
    })
  }

  return (
    <label
      className={`flex items-center gap-2 text-[11px] text-gray-400 ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
      title="Plays in the Screening Room and in the exported animatic"
    >
      <Film className="w-3 h-3 text-gray-500" />
      <span className="whitespace-nowrap">
        To scene {sceneIdx + 2}
      </span>
      <select
        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 disabled:opacity-60"
        value={current}
        disabled={readOnly}
        onChange={(e) => handleChange(e.target.value as BeatDirectionTransition)}
        aria-label={`Transition from scene ${sceneIdx + 1} to scene ${sceneIdx + 2}`}
      >
        {SCENE_TRANSITION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
