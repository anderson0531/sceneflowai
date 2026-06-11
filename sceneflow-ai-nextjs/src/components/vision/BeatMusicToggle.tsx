'use client'

import { Music } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface BeatMusicToggleProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  className?: string
}

export function BeatMusicToggle({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  className,
}: BeatMusicToggleProps) {
  const enabled = beat.musicEnabled !== false

  const handleChange = (checked: boolean) => {
    if (!onScriptChange) return

    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    scene.beats = getSceneBeats(scene).map((entry) =>
      entry.beatId === beat.beatId ? { ...entry, musicEnabled: checked } : entry
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
      className={`ml-auto flex items-center gap-1.5 shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Music className="w-3 h-3 text-purple-300" />
      <span className="text-[10px] text-purple-200">Music</span>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        className="scale-75 origin-right"
        aria-label={`Background music for beat ${beat.sequenceIndex + 1}`}
      />
    </label>
  )
}
