'use client'

import { EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface BeatExcludeToggleProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  className?: string
}

export function BeatExcludeToggle({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  className,
}: BeatExcludeToggleProps) {
  const excluded = beat.excluded === true

  const handleChange = (checked: boolean) => {
    if (!onScriptChange) return

    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    scene.beats = getSceneBeats(scene).map((entry) =>
      entry.beatId === beat.beatId ? { ...entry, excluded: checked } : entry
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

  return (
    <label
      className={`flex items-center gap-1.5 shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
      title={
        excluded
          ? 'Beat excluded from image and video generation'
          : 'Exclude beat from image and video generation'
      }
    >
      <EyeOff className={`w-3 h-3 ${excluded ? 'text-gray-400' : 'text-gray-500'}`} />
      <span className={`text-[10px] ${excluded ? 'text-gray-400' : 'text-gray-500'}`}>
        Ignore
      </span>
      <Switch
        checked={excluded}
        onCheckedChange={handleChange}
        className="scale-75 origin-right"
        aria-label={`Exclude beat ${beat.sequenceIndex + 1} from image and video generation`}
      />
    </label>
  )
}
