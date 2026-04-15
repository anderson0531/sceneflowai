'use client'

import React from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  SlidersHorizontal,
  MousePointer2,
  Film,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { FinalCutStream, TimelineEditMode, TimelineState } from '@/lib/types/finalCut'

export interface FinalCutTransportBarProps {
  selectedStream: FinalCutStream | null
  timelineState: Pick<
    TimelineState,
    'currentTime' | 'isPlaying' | 'playbackRate' | 'editMode' | 'zoomLevel'
  >
  totalDuration: number
  isProcessing?: boolean
  isFullscreen: boolean
  onPlayPause: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onPlaybackRateChange: (rate: number) => void
  onEditModeChange: (mode: TimelineEditMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onToggleFullscreen: () => void
  formatTime: (seconds: number) => string
  /** Compact layout under the viewer (iMovie-style) */
  variant?: 'toolbar' | 'underViewer'
}

export function FinalCutTransportBar({
  selectedStream,
  timelineState,
  totalDuration,
  isProcessing = false,
  isFullscreen,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onPlaybackRateChange,
  onEditModeChange,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onToggleFullscreen,
  formatTime,
  variant = 'toolbar',
}: FinalCutTransportBarProps) {
  const under = variant === 'underViewer'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-y-2 gap-x-3 border-b border-white/[0.06] bg-zinc-950/50 backdrop-blur-sm',
        under ? 'px-3 py-2 sm:px-4' : 'px-4 py-2.5'
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'flex items-center gap-2 min-w-0 max-w-[min(100%,280px)] rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-2.5 py-1.5 sm:px-3 sm:py-2',
            under && 'max-w-[min(100%,240px)]'
          )}
          title={selectedStream?.name ?? 'Choose a stream in the library'}
        >
          <Film className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 leading-none">Stream</p>
            <p className="text-xs sm:text-sm font-medium text-zinc-100 truncate mt-0.5">
              {selectedStream?.name ?? 'None selected'}
            </p>
          </div>
        </div>

        <div className="h-7 w-px bg-zinc-800 hidden sm:block shrink-0" />

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="font-mono text-xs sm:text-sm text-emerald-400 tabular-nums bg-black/35 px-2 py-1 rounded-md ring-1 ring-emerald-500/20">
            {formatTime(timelineState.currentTime)}
            <span className="text-zinc-500 mx-1">/</span>
            <span className="text-emerald-500/90">{formatTime(totalDuration)}</span>
          </div>
          {under ? (
            <span className="text-[11px] text-zinc-500 tabular-nums hidden sm:block">Position / duration</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-0.5 rounded-xl bg-zinc-800/50 p-1 ring-1 ring-zinc-700/50 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkipBack}
          disabled={isProcessing}
          className="text-zinc-400 hover:text-white hover:bg-zinc-700/80 h-8 w-8 p-0"
        >
          <SkipBack className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          disabled={isProcessing}
          className="text-white hover:bg-violet-600/30 h-9 w-9 p-0 rounded-lg"
        >
          {timelineState.isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSkipForward}
          disabled={isProcessing}
          className="text-zinc-400 hover:text-white hover:bg-zinc-700/80 h-8 w-8 p-0"
        >
          <SkipForward className="w-4 h-4" />
        </Button>

        <div className="h-6 w-px bg-zinc-700 mx-1" />

        <select
          value={timelineState.playbackRate}
          onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
          className="bg-zinc-900/80 text-zinc-300 text-xs rounded-md px-2 py-1.5 border border-zinc-700/80 mr-1 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto sm:flex-nowrap">
        <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 ring-1 ring-zinc-700/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditModeChange('select')}
            className={cn(
              'text-zinc-400 hover:text-white px-2 h-8 gap-1.5',
              timelineState.editMode === 'select' && 'bg-zinc-700 text-white shadow-sm'
            )}
            title="Select scenes"
          >
            <MousePointer2 className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px] font-medium">Select</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditModeChange('trim')}
            className={cn(
              'text-zinc-400 hover:text-white px-2 h-8 gap-1.5',
              timelineState.editMode === 'trim' && 'bg-zinc-700 text-white shadow-sm'
            )}
            title="Trim scene edges"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px] font-medium">Trim</span>
          </Button>
        </div>

        <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

        <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/40 px-1 py-0.5 ring-1 ring-zinc-700/40">
          <Button variant="ghost" size="sm" onClick={onZoomOut} className="text-zinc-400 hover:text-white px-1.5 h-7">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-[11px] text-zinc-500 w-10 text-center tabular-nums">
            {Math.round(timelineState.zoomLevel * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={onZoomIn} className="text-zinc-400 hover:text-white px-1.5 h-7">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomFit}
            className="text-zinc-400 hover:text-white px-1.5 h-7"
            title="Fit to window"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          className="text-zinc-400 hover:text-white px-2 h-8"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen viewer and timeline'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
