'use client'

import React from 'react'
import { Film } from 'lucide-react'
import { SceneBlock } from './SceneBlock'
import { TimelineRuler } from './TimelineRuler'
import { TimelinePlayhead } from './TimelinePlayhead'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'
import { TRACK_HEIGHT } from './timelineConstants'

export interface FinalCutTimelineTracksProps {
  timelineRef: React.RefObject<HTMLDivElement | null>
  totalDuration: number
  pixelsPerSecond: number
  timelineWidth: number
  currentTime: number
  scrollPosition: number
  selectedSceneId: string | null
  clips: FinalCutSceneClip[]
  onSeek: (time: number) => void
  onSceneSelect: (sceneId: string | null) => void
}

/**
 * Single read-only video lane. No overlay/master/dialogue/music placeholders;
 * Final Cut is a viewer over Production renders.
 */
export function FinalCutTimelineTracks({
  timelineRef,
  totalDuration,
  pixelsPerSecond,
  timelineWidth,
  currentTime,
  scrollPosition,
  selectedSceneId,
  clips,
  onSeek,
  onSceneSelect,
}: FinalCutTimelineTracksProps) {
  return (
    <div
      ref={timelineRef}
      className="flex-1 flex flex-col overflow-hidden min-w-0 shadow-[inset_0_1px_0_0_rgba(139,92,246,0.1)]"
    >
      <TimelineRuler
        duration={totalDuration}
        pixelsPerSecond={pixelsPerSecond}
        currentTime={currentTime}
        scrollPosition={scrollPosition}
        onSeek={onSeek}
      />

      <div className="flex-1 overflow-auto relative min-h-[120px]">
        <div className="relative" style={{ width: timelineWidth, minHeight: '100%' }}>
          <TimelinePlayhead
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            height="100%"
          />

          <div className="flex items-center border-b border-zinc-800/80">
            <div className="w-28 sm:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-zinc-900/80 border-r border-zinc-800 h-full flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide truncate">Scenes</span>
            </div>
            <div className="flex-1 relative" style={{ height: TRACK_HEIGHT }}>
              {clips.map((clip) => (
                <SceneBlock
                  key={clip.sceneId}
                  clip={clip}
                  pixelsPerSecond={pixelsPerSecond}
                  isSelected={selectedSceneId === clip.sceneId}
                  onSelect={() => {
                    onSceneSelect(clip.sceneId)
                    onSeek(clip.startTime)
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
