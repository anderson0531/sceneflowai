'use client'

import React from 'react'
import { Film, Volume2, Layers, Mic, Music } from 'lucide-react'
import { SceneBlock } from './SceneBlock'
import { TimelineRuler } from './TimelineRuler'
import { TimelinePlayhead } from './TimelinePlayhead'
import type { FinalCutStream, TimelineState } from '@/lib/types/finalCut'
import { AUDIO_TRACK_HEIGHT, TRACK_HEIGHT } from './timelineConstants'

export interface FinalCutTimelineTracksProps {
  timelineRef: React.RefObject<HTMLDivElement | null>
  totalDuration: number
  pixelsPerSecond: number
  timelineWidth: number
  timelineState: Pick<
    TimelineState,
    'currentTime' | 'scrollPosition' | 'selectedSceneId' | 'editMode'
  >
  selectedStream: FinalCutStream | null
  onSeek: (time: number) => void
  onSceneSelect: (sceneId: string | null) => void
  onTransitionPanelOpen: () => void
}

export function FinalCutTimelineTracks({
  timelineRef,
  totalDuration,
  pixelsPerSecond,
  timelineWidth,
  timelineState,
  selectedStream,
  onSeek,
  onSceneSelect,
  onTransitionPanelOpen,
}: FinalCutTimelineTracksProps) {
  return (
    <div ref={timelineRef} className="flex-1 flex flex-col overflow-hidden min-w-0">
      <TimelineRuler
        duration={totalDuration}
        pixelsPerSecond={pixelsPerSecond}
        currentTime={timelineState.currentTime}
        scrollPosition={timelineState.scrollPosition}
        onSeek={onSeek}
      />

      <div className="flex-1 overflow-auto relative min-h-[120px]">
        <div className="relative" style={{ width: timelineWidth, minHeight: '100%' }}>
          <TimelinePlayhead
            currentTime={timelineState.currentTime}
            pixelsPerSecond={pixelsPerSecond}
            height="100%"
          />

          <div className="flex items-center border-b border-zinc-800/80">
            <div className="w-28 sm:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-zinc-900/80 border-r border-zinc-800 h-full flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide truncate">Video</span>
            </div>
            <div className="flex-1 relative" style={{ height: TRACK_HEIGHT }}>
              {selectedStream?.scenes.map((scene, index) => (
                <SceneBlock
                  key={scene.id}
                  scene={scene}
                  index={index}
                  pixelsPerSecond={pixelsPerSecond}
                  isSelected={timelineState.selectedSceneId === scene.id}
                  onSelect={() => onSceneSelect(scene.id)}
                  onTransitionClick={() => onTransitionPanelOpen()}
                  editMode={timelineState.editMode}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center border-b border-zinc-800/80">
            <div className="w-28 sm:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-zinc-900/80 border-r border-zinc-800 h-full flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide truncate">Overlays</span>
            </div>
            <div className="flex-1 relative bg-zinc-950/50" style={{ height: TRACK_HEIGHT / 2 }} />
          </div>

          <div className="flex items-center border-b border-zinc-800/80">
            <div className="w-28 sm:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-zinc-900/80 border-r border-zinc-800 h-full flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide truncate">Master</span>
            </div>
            <div className="flex-1 relative bg-green-900/10" style={{ height: AUDIO_TRACK_HEIGHT }} />
          </div>

          <div className="flex items-center border-b border-zinc-800/80">
            <div className="w-28 sm:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-zinc-900/80 border-r border-zinc-800 h-full flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide truncate">Dialogue</span>
            </div>
            <div className="flex-1 relative bg-yellow-900/10" style={{ height: AUDIO_TRACK_HEIGHT }} />
          </div>

          <div className="flex items-center border-b border-zinc-800/80">
            <div className="w-28 sm:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-zinc-900/80 border-r border-zinc-800 h-full flex items-center gap-2">
              <Music className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide truncate">Music</span>
            </div>
            <div className="flex-1 relative bg-pink-900/10" style={{ height: AUDIO_TRACK_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  )
}
