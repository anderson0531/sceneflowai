'use client'

import { Music } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { formatMusicCueRange, isMusicCueScored } from '@/lib/script/sceneMusicCues'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'

export interface BeatMusicToggleProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  /** The cue scoring this beat, when one covers it. */
  cue?: SceneMusicCue
  className?: string
}

export function BeatMusicToggle({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  cue,
  className,
}: BeatMusicToggleProps) {
  const enabled = beat.musicEnabled === true

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

  // The cue is what actually scores the beat; the switch stays an override, so
  // it reads as the cue's name once one covers the beat.
  const scored = cue ? isMusicCueScored(cue) : false
  const label = cue ? formatMusicCueRange(cue) : 'Music'
  const title = cue
    ? `${formatMusicCueRange(cue)}${cue.intent ? ` — ${cue.intent}` : ''}${
        scored ? '' : ' (not generated yet)'
      }`
    : 'Background music for this beat'

  return (
    <label
      className={`ml-auto flex items-center gap-1.5 shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
      title={title}
    >
      <Music
        className={`w-3 h-3 ${cue && !scored ? 'text-purple-300/50' : 'text-purple-300'}`}
      />
      <span
        className={`text-[10px] ${cue && !scored ? 'text-purple-200/60 italic' : 'text-purple-200'}`}
      >
        {label}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        className="scale-75 origin-right"
        aria-label={`Background music for beat ${beat.sequenceIndex + 1}`}
      />
    </label>
  )
}
