'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FinalCutPreviewMonitor } from './FinalCutPreviewMonitor'
import { FinalCutTransportBar } from './FinalCutTransportBar'
import { FinalCutTimelineTracks } from './FinalCutTimelineTracks'
import { FinalCutInspectorPanel } from './FinalCutInspectorPanel'
import { cn } from '@/lib/utils'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'
import { PIXELS_PER_SECOND_DEFAULT } from './timelineConstants'

/** Local-only preview state (no persistence, no edit history). */
interface PreviewTimelineState {
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  zoomLevel: number
  scrollPosition: number
  selectedSceneId: string | null
}

export interface FinalCutEditorWorkspaceProps {
  clips: FinalCutSceneClip[]
  totalDuration: number
  projectId: string | undefined
  /** Display label for current selection (e.g. "English · Video"). */
  streamLabel: string | null
  /** Whether something interactive is happening on the page (save, network). */
  isProcessing?: boolean
  productionVisionHref?: string
  lastRenderUrl?: string | null
  filenameLabel?: string
  onRendered?: (url: string) => Promise<void> | void
  /** Disabled (demo, no project). */
  disabled?: boolean
}

export function FinalCutEditorWorkspace({
  clips,
  totalDuration,
  projectId,
  streamLabel,
  isProcessing = false,
  productionVisionHref,
  lastRenderUrl,
  filenameLabel,
  onRendered,
  disabled = false,
}: FinalCutEditorWorkspaceProps) {
  const [timelineState, setTimelineState] = useState<PreviewTimelineState>({
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    zoomLevel: 1,
    scrollPosition: 0,
    selectedSceneId: null,
  })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const timelineRef = useRef<HTMLDivElement>(null)
  const playbackRef = useRef<number | null>(null)

  const pixelsPerSecond = useMemo(
    () => PIXELS_PER_SECOND_DEFAULT * timelineState.zoomLevel,
    [timelineState.zoomLevel]
  )

  const timelineWidth = useMemo(
    () => Math.max(0, totalDuration) * pixelsPerSecond,
    [totalDuration, pixelsPerSecond]
  )

  const handlePlayPause = useCallback(() => {
    setTimelineState((prev) => {
      if (prev.isPlaying) {
        if (playbackRef.current) {
          cancelAnimationFrame(playbackRef.current)
          playbackRef.current = null
        }
        return { ...prev, isPlaying: false }
      }
      // If at end, restart from 0
      if (prev.currentTime >= totalDuration && totalDuration > 0) {
        return { ...prev, isPlaying: true, currentTime: 0 }
      }
      return { ...prev, isPlaying: true }
    })
  }, [totalDuration])

  useEffect(() => {
    if (!timelineState.isPlaying) return

    let lastTime = performance.now()

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      setTimelineState((prev) => {
        const newTime = prev.currentTime + delta * prev.playbackRate
        if (newTime >= totalDuration) {
          return { ...prev, currentTime: totalDuration, isPlaying: false }
        }
        return { ...prev, currentTime: newTime }
      })

      playbackRef.current = requestAnimationFrame(tick)
    }

    playbackRef.current = requestAnimationFrame(tick)

    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current)
      }
    }
  }, [timelineState.isPlaying, timelineState.playbackRate, totalDuration])

  const handleSeek = useCallback(
    (time: number) => {
      setTimelineState((prev) => ({
        ...prev,
        currentTime: Math.max(0, Math.min(time, totalDuration)),
      }))
    },
    [totalDuration]
  )

  const handleSkipBack = useCallback(() => {
    setTimelineState((prev) => ({
      ...prev,
      currentTime: Math.max(0, prev.currentTime - 10),
    }))
  }, [])

  const handleSkipForward = useCallback(() => {
    setTimelineState((prev) => ({
      ...prev,
      currentTime: Math.min(totalDuration, prev.currentTime + 10),
    }))
  }, [totalDuration])

  const handleZoomIn = useCallback(() => {
    setTimelineState((prev) => ({
      ...prev,
      zoomLevel: Math.min(4, prev.zoomLevel * 1.25),
    }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setTimelineState((prev) => ({
      ...prev,
      zoomLevel: Math.max(0.25, prev.zoomLevel / 1.25),
    }))
  }, [])

  const handleZoomFit = useCallback(() => {
    if (!timelineRef.current) return
    const containerWidth = timelineRef.current.clientWidth
    if (containerWidth <= 0 || totalDuration <= 0) return
    const newZoom = containerWidth / (totalDuration * PIXELS_PER_SECOND_DEFAULT)
    setTimelineState((prev) => ({
      ...prev,
      zoomLevel: Math.max(0.25, Math.min(4, newZoom)),
    }))
  }, [totalDuration])

  const handleSceneSelect = useCallback((sceneId: string | null) => {
    setTimelineState((prev) => ({ ...prev, selectedSceneId: sceneId }))
  }, [])

  const formatTime = useCallback((seconds: number): string => {
    const safe = Math.max(0, seconds || 0)
    const hours = Math.floor(safe / 3600)
    const mins = Math.floor((safe % 3600) / 60)
    const secs = Math.floor(safe % 60)
    const frames = Math.floor((safe % 1) * 24)
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }, [])

  const hasSelection = clips.length > 0

  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 overflow-hidden bg-zinc-950/40',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-0 shadow-none bg-zinc-950'
      )}
    >
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col min-w-0 overflow-hidden">
          <FinalCutPreviewMonitor
            clips={clips}
            currentTime={timelineState.currentTime}
            isPlaying={timelineState.isPlaying}
            playbackRate={timelineState.playbackRate}
            hasSelection={hasSelection}
          />

          <FinalCutTransportBar
            streamLabel={streamLabel}
            currentTime={timelineState.currentTime}
            totalDuration={totalDuration}
            isPlaying={timelineState.isPlaying}
            playbackRate={timelineState.playbackRate}
            zoomLevel={timelineState.zoomLevel}
            isProcessing={isProcessing}
            isFullscreen={isFullscreen}
            onPlayPause={handlePlayPause}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onPlaybackRateChange={(rate) =>
              setTimelineState((prev) => ({ ...prev, playbackRate: rate }))
            }
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomFit={handleZoomFit}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
            formatTime={formatTime}
          />

          <div className="flex flex-1 min-h-0 overflow-hidden min-h-[160px] sm:min-h-[200px]">
            <FinalCutTimelineTracks
              timelineRef={timelineRef}
              totalDuration={totalDuration}
              pixelsPerSecond={pixelsPerSecond}
              timelineWidth={timelineWidth}
              currentTime={timelineState.currentTime}
              scrollPosition={timelineState.scrollPosition}
              selectedSceneId={timelineState.selectedSceneId}
              clips={clips}
              onSeek={handleSeek}
              onSceneSelect={handleSceneSelect}
            />
          </div>
        </div>

        <FinalCutInspectorPanel
          clips={clips}
          selectedSceneId={timelineState.selectedSceneId}
          projectId={projectId}
          productionVisionHref={productionVisionHref}
          lastRenderUrl={lastRenderUrl}
          isProcessing={isProcessing}
          onRendered={onRendered}
          filenameLabel={filenameLabel}
          formatTime={formatTime}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
