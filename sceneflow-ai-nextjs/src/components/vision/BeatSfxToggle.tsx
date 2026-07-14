'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface BeatSfxToggleProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  className?: string
}

export function BeatSfxToggle({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  className,
}: BeatSfxToggleProps) {
  const enabled = beat.sfxMuted !== true

  const handleChange = (checked: boolean) => {
    if (!onScriptChange) return

    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    scene.beats = getSceneBeats(scene).map((entry) =>
      entry.beatId === beat.beatId ? { ...entry, sfxMuted: !checked } : entry
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
      title={enabled ? 'SFX plays in animatic' : 'SFX muted for this beat'}
    >
      {enabled ? (
        <Volume2 className="w-3 h-3 text-blue-300" />
      ) : (
        <VolumeX className="w-3 h-3 text-blue-400/60" />
      )}
      <span className={`text-[10px] ${enabled ? 'text-blue-200' : 'text-blue-300/60'}`}>
        SFX
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        className="scale-75 origin-right"
        aria-label={`SFX for beat ${beat.sequenceIndex + 1}`}
      />
    </label>
  )
}
