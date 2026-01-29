'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Settings,
  Layers,
  Type,
  Image as ImageIcon,
  Film,
  Music,
  Mic,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Magnet
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { StreamSelector } from './StreamSelector'
import { SceneBlock } from './SceneBlock'
import { TimelineRuler } from './TimelineRuler'
import { TimelinePlayhead } from './TimelinePlayhead'
import { TransitionPanel } from './TransitionPanel'
import { OverlayEditor } from './OverlayEditor'
import type {
  FinalCutStream,
  StreamScene,
  StreamSegment,
  Overlay,
  TransitionEffect,
  TimelineState,
  TimelineEditMode,
  ProductionLanguage,
  ProductionFormat
} from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface FinalCutTimelineProps {
  /** Project ID */
  projectId: string
  /** Available streams (language/format combinations) */
  streams: FinalCutStream[]
  /** Currently selected stream ID */
  selectedStreamId: string | null
  /** Callback when stream selection changes */
  onStreamSelect: (streamId: string) => void
  /** Callback to create a new stream */
  onCreateStream: (language: ProductionLanguage, format: ProductionFormat) => Promise<void>
  /** Callback when scene order changes */
  onSceneReorder: (sceneIds: string[]) => void
  /** Callback when a scene transition is updated */
  onTransitionUpdate: (sceneId: string, transition: TransitionEffect) => void
  /** Callback when an overlay is added/updated */
  onOverlayUpdate: (segmentId: string, overlays: Overlay[]) => void
  /** Callback to start export */
  onExport: (streamId: string, settings: any) => Promise<void>
  /** Total project duration in seconds */
  totalDuration: number
  /** Whether any operation is in progress */
  isProcessing?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const PIXELS_PER_SECOND_MIN = 20
const PIXELS_PER_SECOND_MAX = 200
const PIXELS_PER_SECOND_DEFAULT = 50

const TRACK_HEIGHT = 80
const RULER_HEIGHT = 32
const AUDIO_TRACK_HEIGHT = 48

// ============================================================================
// FinalCutTimeline Component
// ============================================================================

export function FinalCutTimeline({
  projectId,
  streams,
  selectedStreamId,
  onStreamSelect,
  onCreateStream,
  onSceneReorder,
  onTransitionUpdate,
  onOverlayUpdate,
  onExport,
  totalDuration,
  isProcessing = false
}: FinalCutTimelineProps) {
  // ============================================================================
  // State
  // ============================================================================
  
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
    redoStack: []
  })
  
  const [showTransitionPanel, setShowTransitionPanel] = useState(false)
  const [showOverlayEditor, setShowOverlayEditor] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const playbackRef = useRef<number | null>(null)
  
  // ============================================================================
  // Derived State
  // ============================================================================
  
  const selectedStream = useMemo(() => 
    streams.find(s => s.id === selectedStreamId) || null,
    [streams, selectedStreamId]
  )
  
  const pixelsPerSecond = useMemo(() => 
    PIXELS_PER_SECOND_DEFAULT * timelineState.zoomLevel,
    [timelineState.zoomLevel]
  )
  
  const timelineWidth = useMemo(() => 
    totalDuration * pixelsPerSecond,
    [totalDuration, pixelsPerSecond]
  )
  
  // ============================================================================
  // Playback Control
  // ============================================================================
  
  const handlePlayPause = useCallback(() => {
    setTimelineState(prev => {
      if (prev.isPlaying) {
        // Stop playback
        if (playbackRef.current) {
          cancelAnimationFrame(playbackRef.current)
          playbackRef.current = null
        }
        return { ...prev, isPlaying: false }
      } else {
        // Start playback
        return { ...prev, isPlaying: true }
      }
    })
  }, [])
  
  // Playback animation loop
  useEffect(() => {
    if (!timelineState.isPlaying) return
    
    let lastTime = performance.now()
    
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now
      
      setTimelineState(prev => {
        const newTime = prev.currentTime + delta * prev.playbackRate
        if (newTime >= totalDuration) {
          // Loop or stop at end
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
  
  const handleSeek = useCallback((time: number) => {
    setTimelineState(prev => ({
      ...prev,
      currentTime: Math.max(0, Math.min(time, totalDuration))
    }))
  }, [totalDuration])
  
  const handleSkipBack = useCallback(() => {
    setTimelineState(prev => ({
      ...prev,
      currentTime: Math.max(0, prev.currentTime - 10)
    }))
  }, [])
  
  const handleSkipForward = useCallback(() => {
    setTimelineState(prev => ({
      ...prev,
      currentTime: Math.min(totalDuration, prev.currentTime + 10)
    }))
  }, [totalDuration])
  
  // ============================================================================
  // Zoom Control
  // ============================================================================
  
  const handleZoomIn = useCallback(() => {
    setTimelineState(prev => ({
      ...prev,
      zoomLevel: Math.min(4, prev.zoomLevel * 1.25)
    }))
  }, [])
  
  const handleZoomOut = useCallback(() => {
    setTimelineState(prev => ({
      ...prev,
      zoomLevel: Math.max(0.25, prev.zoomLevel / 1.25)
    }))
  }, [])
  
  const handleZoomFit = useCallback(() => {
    if (!timelineRef.current) return
    const containerWidth = timelineRef.current.clientWidth - 200 // Account for sidebar
    const newZoom = containerWidth / (totalDuration * PIXELS_PER_SECOND_DEFAULT)
    setTimelineState(prev => ({
      ...prev,
      zoomLevel: Math.max(0.25, Math.min(4, newZoom))
    }))
  }, [totalDuration])
  
  // ============================================================================
  // Edit Mode
  // ============================================================================
  
  const handleEditModeChange = useCallback((mode: TimelineEditMode) => {
    setTimelineState(prev => ({ ...prev, editMode: mode }))
  }, [])
  
  // ============================================================================
  // Selection
  // ============================================================================
  
  const handleSceneSelect = useCallback((sceneId: string | null) => {
    setTimelineState(prev => ({
      ...prev,
      selectedSceneId: sceneId,
      selectedSegmentId: null,
      selectedOverlayId: null
    }))
  }, [])
  
  const handleSegmentSelect = useCallback((segmentId: string | null) => {
    setTimelineState(prev => ({
      ...prev,
      selectedSegmentId: segmentId,
      selectedOverlayId: null
    }))
  }, [])
  
  // ============================================================================
  // Format Time
  // ============================================================================
  
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
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-gray-950 text-white",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        {/* Left: Stream Selector */}
        <div className="flex items-center gap-4">
          <StreamSelector
            streams={streams}
            selectedStreamId={selectedStreamId}
            onStreamSelect={onStreamSelect}
            onCreateStream={onCreateStream}
          />
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Timecode Display */}
          <div className="font-mono text-lg text-green-400 bg-gray-900 px-3 py-1 rounded">
            {formatTime(timelineState.currentTime)}
          </div>
        </div>
        
        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipBack}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white"
          >
            {timelineState.isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipForward}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          
          <div className="h-6 w-px bg-gray-700 mx-2" />
          
          {/* Playback Speed */}
          <select
            value={timelineState.playbackRate}
            onChange={(e) => setTimelineState(prev => ({
              ...prev,
              playbackRate: parseFloat(e.target.value)
            }))}
            className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
        
        {/* Right: Tools & Zoom */}
        <div className="flex items-center gap-2">
          {/* Edit Mode Tools */}
          <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditModeChange('select')}
              className={cn(
                "text-gray-400 hover:text-white px-2",
                timelineState.editMode === 'select' && "bg-gray-700 text-white"
              )}
              title="Select (V)"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditModeChange('trim')}
              className={cn(
                "text-gray-400 hover:text-white px-2",
                timelineState.editMode === 'trim' && "bg-gray-700 text-white"
              )}
              title="Trim (T)"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditModeChange('razor')}
              className={cn(
                "text-gray-400 hover:text-white px-2",
                timelineState.editMode === 'razor' && "bg-gray-700 text-white"
              )}
              title="Razor (C)"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditModeChange('overlay')}
              className={cn(
                "text-gray-400 hover:text-white px-2",
                timelineState.editMode === 'overlay' && "bg-gray-700 text-white"
              )}
              title="Overlay (O)"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Snap Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimelineState(prev => ({
              ...prev,
              snapToGrid: !prev.snapToGrid
            }))}
            className={cn(
              "text-gray-400 hover:text-white px-2",
              timelineState.snapToGrid && "text-blue-400"
            )}
            title="Snap to Grid (S)"
          >
            <Magnet className="w-4 h-4" />
          </Button>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-gray-400 hover:text-white px-1"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-500 w-12 text-center">
              {Math.round(timelineState.zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-gray-400 hover:text-white px-1"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomFit}
              className="text-gray-400 hover:text-white px-1"
              title="Fit to Window"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-400 hover:text-white px-2"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline Tracks */}
        <div 
          ref={timelineRef}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Timeline Ruler */}
          <TimelineRuler
            duration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={timelineState.currentTime}
            scrollPosition={timelineState.scrollPosition}
            onSeek={handleSeek}
          />
          
          {/* Tracks Container */}
          <div className="flex-1 overflow-auto relative">
            <div 
              className="relative"
              style={{ width: timelineWidth, minHeight: '100%' }}
            >
              {/* Playhead */}
              <TimelinePlayhead
                currentTime={timelineState.currentTime}
                pixelsPerSecond={pixelsPerSecond}
                height="100%"
              />
              
              {/* Video Track */}
              <div className="flex items-center border-b border-gray-800">
                <div className="w-32 flex-shrink-0 px-3 py-2 bg-gray-900/50 border-r border-gray-800 h-full flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Video</span>
                </div>
                <div 
                  className="flex-1 relative"
                  style={{ height: TRACK_HEIGHT }}
                >
                  {selectedStream?.scenes.map((scene, index) => (
                    <SceneBlock
                      key={scene.id}
                      scene={scene}
                      index={index}
                      pixelsPerSecond={pixelsPerSecond}
                      isSelected={timelineState.selectedSceneId === scene.id}
                      onSelect={() => handleSceneSelect(scene.id)}
                      onTransitionClick={() => setShowTransitionPanel(true)}
                      editMode={timelineState.editMode}
                    />
                  ))}
                </div>
              </div>
              
              {/* Overlay Track */}
              <div className="flex items-center border-b border-gray-800">
                <div className="w-32 flex-shrink-0 px-3 py-2 bg-gray-900/50 border-r border-gray-800 h-full flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-300">Overlays</span>
                </div>
                <div 
                  className="flex-1 relative bg-gray-900/30"
                  style={{ height: TRACK_HEIGHT / 2 }}
                >
                  {/* Overlay blocks would render here */}
                </div>
              </div>
              
              {/* Audio Tracks */}
              <div className="flex items-center border-b border-gray-800">
                <div className="w-32 flex-shrink-0 px-3 py-2 bg-gray-900/50 border-r border-gray-800 h-full flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Master</span>
                </div>
                <div 
                  className="flex-1 relative bg-green-900/10"
                  style={{ height: AUDIO_TRACK_HEIGHT }}
                >
                  {/* Audio waveform would render here */}
                </div>
              </div>
              
              <div className="flex items-center border-b border-gray-800">
                <div className="w-32 flex-shrink-0 px-3 py-2 bg-gray-900/50 border-r border-gray-800 h-full flex items-center gap-2">
                  <Mic className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">Dialogue</span>
                </div>
                <div 
                  className="flex-1 relative bg-yellow-900/10"
                  style={{ height: AUDIO_TRACK_HEIGHT }}
                >
                  {/* Dialogue audio would render here */}
                </div>
              </div>
              
              <div className="flex items-center border-b border-gray-800">
                <div className="w-32 flex-shrink-0 px-3 py-2 bg-gray-900/50 border-r border-gray-800 h-full flex items-center gap-2">
                  <Music className="w-4 h-4 text-pink-400" />
                  <span className="text-sm text-gray-300">Music</span>
                </div>
                <div 
                  className="flex-1 relative bg-pink-900/10"
                  style={{ height: AUDIO_TRACK_HEIGHT }}
                >
                  {/* Music audio would render here */}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar: Inspector Panel */}
        <div className="w-80 border-l border-gray-800 bg-gray-900/50 overflow-y-auto">
          {timelineState.selectedSceneId && selectedStream ? (
            <div className="p-4">
              <h3 className="font-semibold text-white mb-4">Scene Inspector</h3>
              
              {/* Scene Info */}
              {(() => {
                const scene = selectedStream.scenes.find(
                  s => s.id === timelineState.selectedSceneId
                )
                if (!scene) return null
                
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Scene</label>
                      <p className="text-sm text-gray-200">Scene {scene.sceneNumber}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Duration</label>
                      <p className="text-sm text-gray-200">
                        {formatTime(scene.durationMs / 1000)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Heading</label>
                      <p className="text-sm text-gray-200">{scene.heading || 'No heading'}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTransitionPanel(true)}
                        className="w-full mb-2"
                      >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Edit Transition
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOverlayEditor(true)}
                        className="w-full"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Add Overlay
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Select a scene to inspect</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Transition Panel Drawer */}
      {showTransitionPanel && timelineState.selectedSceneId && selectedStream && (
        <TransitionPanel
          scene={selectedStream.scenes.find(s => s.id === timelineState.selectedSceneId)!}
          onClose={() => setShowTransitionPanel(false)}
          onUpdate={(transition) => {
            onTransitionUpdate(timelineState.selectedSceneId!, transition)
            setShowTransitionPanel(false)
          }}
        />
      )}
      
      {/* Overlay Editor Drawer */}
      {showOverlayEditor && timelineState.selectedSegmentId && (
        <OverlayEditor
          segmentId={timelineState.selectedSegmentId}
          overlays={[]}
          onClose={() => setShowOverlayEditor(false)}
          onUpdate={(overlays) => {
            onOverlayUpdate(timelineState.selectedSegmentId!, overlays)
            setShowOverlayEditor(false)
          }}
        />
      )}
    </div>
  )
}
