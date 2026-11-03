'use client'

import { Music } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  formatMusicCueRange,
  isMusicCueScored,
  setBeatsMusicEnabled,
} from '@/lib/script/sceneMusicCues'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { isBeatMusicEnabled, isCuedBeatMusicEnabled } from '@/lib/storyboard/musicPlayback'

export interface BeatMusicToggleProps {
  beat: SceneBeat
  sceneIdx: number
  scenes: any[]
  script: any
  onScriptChange?: (script: any) => void
  /** The cue scoring this beat, when one covers it. */
  cue?: SceneMusicCue
  /** Fallback score cue that plays when music is enabled on an uncued beat. */
  fallbackCue?: SceneMusicCue
  className?: string
}

export function BeatMusicToggle({
  beat,
  sceneIdx,
  scenes,
  script,
  onScriptChange,
  cue,
  fallbackCue,
  className,
}: BeatMusicToggleProps) {
  const enabled = cue ? isCuedBeatMusicEnabled(beat) : isBeatMusicEnabled(beat)

  const handleChange = (checked: boolean) => {
    if (!onScriptChange) return

    const updatedScenes = [...scenes]
    const scene = { ...updatedScenes[sceneIdx] }
    scene.beats = setBeatsMusicEnabled(getSceneBeats(scene), [beat.beatId], checked)
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
  // it reads as the cue's name once one covers the beat. When a beat is outside
  // the cue's initial range, turning it on plays `fallbackCue`.
  const effectiveCue = cue ?? fallbackCue
  const scored = effectiveCue ? isMusicCueScored(effectiveCue) : false
  const label = cue
    ? formatMusicCueRange(cue)
    : fallbackCue
      ? enabled
        ? formatMusicCueRange(fallbackCue)
        : 'Score'
      : 'Music'
  const title = cue
    ? `${formatMusicCueRange(cue)}${cue.intent ? ` — ${cue.intent}` : ''}${
        scored ? '' : ' (not generated yet)'
      }`
    : fallbackCue
      ? `Score (${formatMusicCueRange(fallbackCue)}${
          fallbackCue.intent ? ` — ${fallbackCue.intent}` : ''
        })${scored ? '' : ' (not generated yet)'}`
      : 'Background music for this shot'

  return (
    <label
      className={`ml-auto flex items-center gap-1.5 shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
      title={title}
    >
      <Music
        className={`w-3 h-3 ${
          effectiveCue && !scored ? 'text-purple-300/50' : 'text-purple-300'
        }`}
      />
      <span
        className={`text-[10px] ${
          effectiveCue && !scored ? 'text-purple-200/60 italic' : 'text-purple-200'
        }`}
      >
        {label}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        className="scale-75 origin-right"
        aria-label={`Background music for shot ${beat.sequenceIndex + 1}`}
      />
    </label>
  )
}
