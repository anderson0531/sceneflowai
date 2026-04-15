'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { TransitionPanel } from './TransitionPanel'
import { OverlayEditor } from './OverlayEditor'
import { FinalCutPreviewMonitor } from './FinalCutPreviewMonitor'
import { FinalCutTransportBar } from './FinalCutTransportBar'
import { FinalCutTimelineTracks } from './FinalCutTimelineTracks'
import { FinalCutInspectorPanel } from './FinalCutInspectorPanel'
import { cn } from '@/lib/utils'
import type {
  FinalCutStream,
  Overlay,
  TransitionEffect,
  TimelineState,
  TimelineEditMode,
  StreamSettings,
} from '@/lib/types/finalCut'
import { PIXELS_PER_SECOND_DEFAULT } from './timelineConstants'

export interface FinalCutEditorWorkspaceProps {
  projectId: string
  streams: FinalCutStream[]
  selectedStreamId: string | null
  onSceneReorder: (sceneIds: string[]) => void
  onTransitionUpdate: (sceneId: string, transition: TransitionEffect) => void
  onOverlayUpdate: (segmentId: string, overlays: Overlay[]) => void
  onExport: (streamId: string, settings: unknown) => Promise<void>
  totalDuration: number
  isProcessing?: boolean
  sceneProductionState?: Record<string, unknown>
  productionVisionHref?: string
  onStreamSettingsChange?: (updates: Partial<StreamSettings>) => void
}

export function FinalCutEditorWorkspace({
  projectId: _projectId,
  streams,
  selectedStreamId,
  onSceneReorder: _onSceneReorder,
  onTransitionUpdate,
  onOverlayUpdate,
  onExport: _onExport,
  totalDuration,
  isProcessing = false,
  sceneProductionState = {},
  productionVisionHref,
  onStreamSettingsChange,
}: FinalCutEditorWorkspaceProps) {
  const [timelineState, setTimelineState] = useState<TimelineState>({
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    selectedSceneId: null,
    selectedSegmentId: null,
    selectedOverlayId: null,
    zoomLevel: 1,
    scrollPosition: 0,
    editMode: 'select',
    snapToGrid: true,
    snapToMarkers: true,
    gridSize: 1,
    markers: [],
    undoStack: [],
    redoStack: [],
  })

  const [showTransitionPanel, setShowTransitionPanel] = useState(false)
  const [showOverlayEditor, setShowOverlayEditor] = useState(false)
  const [inspectorAdvancedOpen, setInspectorAdvancedOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const timelineRef = useRef<HTMLDivElement>(null)
  const playbackRef = useRef<number | null>(null)

  const selectedStream = useMemo(
    () => streams.find((s) => s.id === selectedStreamId) || null,
    [streams, selectedStreamId]
  )

  const masterVolume = selectedStream?.settings?.masterVolume ?? 100

  const pixelsPerSecond = useMemo(
    () => PIXELS_PER_SECOND_DEFAULT * timelineState.zoomLevel,
    [timelineState.zoomLevel]
  )

  const timelineWidth = useMemo(() => totalDuration * pixelsPerSecond, [totalDuration, pixelsPerSecond])

  const handlePlayPause = useCallback(() => {
    setTimelineState((prev) => {
      if (prev.isPlaying) {
        if (playbackRef.current) {
          cancelAnimationFrame(playbackRef.current)
          playbackRef.current = null
        }
        return { ...prev, isPlaying: false }
      }
      return { ...prev, isPlaying: true }
    })
  }, [])

  useEffect(() => {
    if (!timelineState.isPlaying) return

    let lastTime = performance.now()

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      setTimelineState((prev) => {
        const newTime = prev.currentTime + delta * prev.playbackRate
        if (newTime >= totalDuration) {
          return { ...prev, currentTime: 0, isPlaying: false }
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

  const handleEditModeChange = useCallback((mode: TimelineEditMode) => {
    setTimelineState((prev) => ({ ...prev, editMode: mode }))
  }, [])

  const handleSceneSelect = useCallback((sceneId: string | null) => {
    setTimelineState((prev) => ({
      ...prev,
      selectedSceneId: sceneId,
      selectedSegmentId: null,
      selectedOverlayId: null,
    }))
  }, [])

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 24)

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }, [])

  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 overflow-hidden bg-zinc-950/40',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-0 shadow-none bg-zinc-950'
      )}
    >
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        <div className="flex flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
          <FinalCutPreviewMonitor
            selectedStream={selectedStream}
            currentTime={timelineState.currentTime}
            isPlaying={timelineState.isPlaying}
            playbackRate={timelineState.playbackRate}
            sceneProductionState={sceneProductionState}
            masterVolume={masterVolume}
          />

          <FinalCutTransportBar
            selectedStream={selectedStream}
            timelineState={timelineState}
            totalDuration={totalDuration}
            isProcessing={isProcessing}
            isFullscreen={isFullscreen}
            onPlayPause={handlePlayPause}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onPlaybackRateChange={(rate) =>
              setTimelineState((prev) => ({ ...prev, playbackRate: rate }))
            }
            onEditModeChange={handleEditModeChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomFit={handleZoomFit}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
            formatTime={formatTime}
            variant="underViewer"
          />

          <div className="flex flex-1 min-h-0 overflow-hidden min-h-[160px] sm:min-h-[200px]">
            <FinalCutTimelineTracks
              timelineRef={timelineRef}
              totalDuration={totalDuration}
              pixelsPerSecond={pixelsPerSecond}
              timelineWidth={timelineWidth}
              timelineState={timelineState}
              selectedStream={selectedStream}
              onSeek={handleSeek}
              onSceneSelect={handleSceneSelect}
              onTransitionPanelOpen={() => setShowTransitionPanel(true)}
            />
          </div>
        </div>

        <FinalCutInspectorPanel
          selectedStream={selectedStream}
          selectedSceneId={timelineState.selectedSceneId}
          masterVolume={masterVolume}
          isProcessing={isProcessing}
          productionVisionHref={productionVisionHref}
          onStreamSettingsChange={onStreamSettingsChange}
          formatTime={formatTime}
          inspectorAdvancedOpen={inspectorAdvancedOpen}
          onInspectorAdvancedOpenChange={setInspectorAdvancedOpen}
          onOpenTransitionPanel={() => setShowTransitionPanel(true)}
          onOpenOverlayEditor={() => setShowOverlayEditor(true)}
        />
      </div>

      {showTransitionPanel && timelineState.selectedSceneId && selectedStream ? (
        <TransitionPanel
          scene={selectedStream.scenes.find((s) => s.id === timelineState.selectedSceneId)!}
          onClose={() => setShowTransitionPanel(false)}
          onUpdate={(transition) => {
            onTransitionUpdate(timelineState.selectedSceneId!, transition)
            setShowTransitionPanel(false)
          }}
        />
      ) : null}

      {showOverlayEditor && timelineState.selectedSegmentId ? (
        <OverlayEditor
          segmentId={timelineState.selectedSegmentId}
          overlays={[]}
          onClose={() => setShowOverlayEditor(false)}
          onUpdate={(overlays) => {
            onOverlayUpdate(timelineState.selectedSegmentId!, overlays)
            setShowOverlayEditor(false)
          }}
        />
      ) : null}
    </div>
  )
}
