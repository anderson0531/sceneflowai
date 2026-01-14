/**
 * DirectorConsole - Call Action Dashboard
 * 
 * The main view for the Director's Console "Pre-Flight" workflow.
 * Lists segments with "Ready" status and allows:
 * - Clicking a segment to open DirectorDialog for granular control
 * - Batch rendering with "Render Approved Only" or "Render All" modes
 * 
 * Status Indicators:
 * - auto-ready: Configured by system, not yet reviewed
 * - user-approved: User opened dialog and clicked "Approve"
 * - rendering: Currently generating video
 * - rendered: Video exists
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Play, 
  CheckCircle,
  Clock,
  AlertCircle,
  Film,
  Loader2,
  Settings2,
  Sparkles,
  Clapperboard,
  Mic2,
  Volume2,
  MessageSquare,
  Music,
  Upload,
  RefreshCw,
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationConfig,
  VideoGenerationMethod,
  SceneProductionData,
  SelectedAudioTracks,
} from './types'
import { DirectorDialog } from './DirectorDialog'
import { SceneVideoPlayer } from './SceneVideoPlayer'
import { useVideoQueue } from '@/hooks/useVideoQueue'
import type { SceneAudioData } from './GuidePromptEditor'

// Default audio track selection state
const DEFAULT_AUDIO_TRACKS: SelectedAudioTracks = {
  narration: true,
  dialogue: true,
  music: false,
  sfx: false,
}

interface DirectorConsoleProps {
  sceneId: string
  sceneNumber: number
  productionData: SceneProductionData | null
  sceneImageUrl?: string
  scene?: SceneAudioData
  onGenerate: (
    sceneId: string,
    segmentId: string,
    mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD',
    options?: {
      startFrameUrl?: string
      endFrameUrl?: string
      sourceVideoUrl?: string
      prompt?: string
      negativePrompt?: string
      duration?: number
      aspectRatio?: '16:9' | '9:16'
      resolution?: '720p' | '1080p'
      generationMethod?: VideoGenerationMethod
    }
  ) => Promise<void>
  onSegmentUpload?: (segmentId: string, file: File) => void
}

// Method badge colors and labels
const methodBadgeConfig: Record<VideoGenerationMethod, { label: string; className: string }> = {
  FTV: { label: 'INTERP', className: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  I2V: { label: 'I2V', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  T2V: { label: 'T2V', className: 'bg-green-500/20 text-green-300 border-green-500/50' },
  EXT: { label: 'EXT', className: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  REF: { label: 'REF', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },
}

// Status badge colors - Using film terminology
const statusBadgeConfig = {
  'auto-ready': { label: 'Ready', className: 'bg-slate-500/20 text-slate-300 border-slate-500/50', icon: Clock },
  'user-approved': { label: 'Lock', className: 'bg-green-500/20 text-green-300 border-green-500/50', icon: CheckCircle },
  'rendering': { label: 'Rolling', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: Loader2 },
  'rendered': { label: 'In the Can', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', icon: Film },
  'error': { label: 'Error', className: 'bg-red-500/20 text-red-300 border-red-500/50', icon: AlertCircle },
}

export const DirectorConsole: React.FC<DirectorConsoleProps> = ({
  sceneId,
  sceneNumber,
  productionData,
  sceneImageUrl,
  scene,
  onGenerate,
  onSegmentUpload,
}) => {
  const segments = productionData?.segments || []
  
  // Video queue state and actions
  const {
    queue,
    isRendering,
    progress,
    currentSegmentId,
    completedCount,
    failedCount,
    updateConfig,
    processQueue,
    cancelRendering,
  } = useVideoQueue(segments, sceneId, sceneImageUrl, onGenerate)
  
  // Selected segment for DirectorDialog
  const [selectedSegment, setSelectedSegment] = useState<SceneSegment | null>(null)
  
  // Segment selection for batch operations (checkboxes)
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set())
  
  // Toggle segment selection
  const toggleSegmentSelection = useCallback((segmentId: string, checked: boolean) => {
    setSelectedSegmentIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(segmentId)
      } else {
        next.delete(segmentId)
      }
      return next
    })
  }, [])
  
  // Select/deselect all segments
  const selectAllSegments = useCallback(() => {
    setSelectedSegmentIds(new Set(queue.map(q => q.segmentId)))
  }, [queue])
  
  const deselectAllSegments = useCallback(() => {
    setSelectedSegmentIds(new Set())
  }, [])
  
  // Scene video player modal state
  const [isScenePlayerOpen, setIsScenePlayerOpen] = useState(false)
  
  // Audio track selection for video playback overlay
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<SelectedAudioTracks>(DEFAULT_AUDIO_TRACKS)
  
  // Toggle individual audio track
  const toggleAudioTrack = useCallback((track: keyof SelectedAudioTracks) => {
    setSelectedAudioTracks(prev => ({
      ...prev,
      [track]: !prev[track]
    }))
  }, [])
  
  // Handle saving config from dialog
  const handleSaveConfig = useCallback((config: VideoGenerationConfig) => {
    if (selectedSegment) {
      updateConfig(selectedSegment.segmentId, config)
      setSelectedSegment(null)
    }
  }, [selectedSegment, updateConfig])
  
  // Handle batch render - approved only
  const handleRenderApproved = useCallback(() => {
    processQueue({
      mode: 'approved_only',
      priority: 'sequence',
      delayBetween: 500,
    })
  }, [processQueue])
  
  // Handle batch render - all segments
  const handleRenderAll = useCallback(() => {
    processQueue({
      mode: 'all',
      priority: 'approved_first',
      delayBetween: 500,
    })
  }, [processQueue])
  
  // Handle batch render - selected segments only
  const handleRenderSelected = useCallback(() => {
    if (selectedSegmentIds.size === 0) return
    processQueue({
      mode: 'selected',
      priority: 'sequence',
      delayBetween: 500,
      selectedIds: Array.from(selectedSegmentIds),
    })
    // Clear selection after starting render
    setSelectedSegmentIds(new Set())
  }, [processQueue, selectedSegmentIds])
  
  // Mark segment as "Print" (keep this take - user approved)
  const handleMarkPrint = useCallback((segmentId: string) => {
    const item = queue.find(q => q.segmentId === segmentId)
    if (item) {
      updateConfig(segmentId, { ...item.config, approvalStatus: 'user-approved' })
    }
  }, [queue, updateConfig])
  
  // Mark segment for "Retake" (needs re-render - reset to auto-ready)
  const handleMarkRetake = useCallback((segmentId: string) => {
    const item = queue.find(q => q.segmentId === segmentId)
    if (item) {
      updateConfig(segmentId, { ...item.config, approvalStatus: 'auto-ready' })
      // Auto-select for next render batch
      setSelectedSegmentIds(prev => new Set(prev).add(segmentId))
    }
  }, [queue, updateConfig])
  
  // Count segments by status
  const statusCounts = {
    approved: queue.filter(q => q.config.approvalStatus === 'user-approved').length,
    autoReady: queue.filter(q => q.config.approvalStatus === 'auto-ready').length,
    rendered: queue.filter(q => q.status === 'complete').length,
    retakes: queue.filter(q => q.status === 'complete' && q.config.approvalStatus === 'auto-ready').length,
    total: queue.length,
  }
  
  // No segments state
  if (segments.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clapperboard className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-30" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">No Segments Available</h3>
        <p className="text-sm text-slate-500">
          Initialize scene production in the Frame step first to create video segments.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header / Control Bar */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-indigo-400" />
            Director's Console
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Review prompts or auto-generate the scene. {statusCounts.approved} approved, {statusCounts.rendered} rendered of {statusCounts.total} segments.
          </p>
        </div>
        
        <div className="flex gap-3 items-center">
          {isRendering ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering {completedCount + 1} of {queue.length}...</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={cancelRendering}
                className="bg-slate-800 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {/* Render Selected - only show when segments are selected */}
              {selectedSegmentIds.size > 0 && (
                <Button 
                  size="sm"
                  onClick={handleRenderSelected}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Render Selected ({selectedSegmentIds.size})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRenderApproved}
                disabled={statusCounts.approved === 0}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Regenerate ({statusCounts.approved})
              </Button>
              <Button 
                size="sm"
                onClick={handleRenderAll}
                disabled={queue.every(q => q.status === 'complete')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Generate All
              </Button>
              {statusCounts.rendered > 0 && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setIsScenePlayerOpen(true)}
                  className="bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30"
                >
                  <Film className="w-4 h-4 mr-2" />
                  Play Scene ({statusCounts.rendered})
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Progress Bar (visible during rendering) */}
      {isRendering && (
        <div className="space-y-2">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{completedCount} completed</span>
            {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Segment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {queue.map((item) => {
          const segment = segments.find(s => s.segmentId === item.segmentId)
          if (!segment) return null
          
          const methodConfig = methodBadgeConfig[item.config.mode]
          const statusConfig = statusBadgeConfig[item.config.approvalStatus]
          const StatusIcon = statusConfig.icon
          const isCurrentlyRendering = currentSegmentId === item.segmentId
          
          return (
            <div 
              key={item.segmentId}
              className={`
                border rounded-lg p-4 cursor-pointer transition-all 
                hover:border-indigo-500/70 hover:bg-slate-800/50
                ${item.config.approvalStatus === 'user-approved' 
                  ? 'bg-indigo-900/10 border-indigo-500/30' 
                  : 'bg-slate-800/30 border-slate-700/50'
                }
                ${selectedSegmentIds.has(item.segmentId) ? 'ring-4 ring-amber-500 bg-amber-500/10' : ''}
                ${isCurrentlyRendering ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''}
              `}
              onClick={() => setSelectedSegment(segment)}
            >
              <div className="flex gap-4">
                {/* Selection Checkbox */}
                <div className="flex-shrink-0 flex items-start pt-1">
                  <Checkbox
                    checked={selectedSegmentIds.has(item.segmentId)}
                    onCheckedChange={(checked) => toggleSegmentSelection(item.segmentId, checked === true)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-slate-500"
                  />
                </div>
                
                {/* Thumbnail Preview */}
                <div className="w-32 aspect-video bg-black rounded overflow-hidden relative flex-shrink-0">
                  {item.thumbnailUrl ? (
                    <img 
                      src={item.thumbnailUrl} 
                      alt={`Segment ${item.sequenceIndex + 1}`}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Film className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  
                  {/* Method Badge */}
                  <Badge 
                    variant="outline"
                    className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0 ${methodConfig.className}`}
                  >
                    {methodConfig.label}
                  </Badge>
                  
                  {/* Rendering Overlay */}
                  {isCurrentlyRendering && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                  )}
                  
                  {/* Complete Overlay */}
                  {item.status === 'complete' && (
                    <div className="absolute top-1 left-1">
                      <Badge className="bg-emerald-500/80 text-white text-[10px] px-1.5 py-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-200">
                      Segment {item.sequenceIndex + 1}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`flex items-center gap-1 text-[10px] ${statusConfig.className}`}
                    >
                      <StatusIcon className={`w-3 h-3 ${item.config.approvalStatus === 'rendering' ? 'animate-spin' : ''}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {item.config.prompt || 'No prompt configured'}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{item.config.duration}s</span>
                    <span>•</span>
                    <span>{item.config.aspectRatio}</span>
                    <span>•</span>
                    <span>{item.config.confidence}% confidence</span>
                  </div>
                </div>
                
                {/* Action Icons */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {/* Upload Video Button */}
                  {onSegmentUpload && (
                    <>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id={`upload-video-${item.segmentId}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            onSegmentUpload(item.segmentId, file)
                          }
                          e.target.value = '' // Reset for re-upload
                        }}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-slate-500 hover:text-slate-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              document.getElementById(`upload-video-${item.segmentId}`)?.click()
                            }}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upload Video</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  
                  {/* Settings Icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-500 hover:text-slate-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSegment(segment)
                        }}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configure</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {/* Print / Retake Actions for completed segments */}
              {item.status === 'complete' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={item.config.approvalStatus === 'user-approved' ? 'default' : 'outline'}
                        size="sm"
                        className={item.config.approvalStatus === 'user-approved' 
                          ? 'flex-1 bg-green-600 hover:bg-green-700 text-white' 
                          : 'flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkPrint(item.segmentId)
                        }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Lock
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Lock this take as final</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={item.config.approvalStatus === 'auto-ready' ? 'default' : 'outline'}
                        size="sm"
                        className={item.config.approvalStatus === 'auto-ready' 
                          ? 'flex-1 bg-amber-600 hover:bg-amber-700 text-white' 
                          : 'flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkRetake(item.segmentId)
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Regenerate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Queue for regeneration</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Audio Tracks Section */}
      {(scene?.narration || scene?.dialogueLines?.length) && (
        <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              Audio Tracks
            </h3>
            <span className="text-xs text-slate-500">Select tracks for Play Scene overlay</span>
          </div>
          
          <div className="space-y-3">
            {/* Narration Track */}
            {scene?.narration && (
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAudioTracks.narration 
                    ? 'bg-purple-500/10 border border-purple-500/30' 
                    : 'bg-slate-700/30 border border-slate-600/30 opacity-60'
                }`}
                onClick={() => toggleAudioTrack('narration')}
              >
                <Checkbox
                  checked={selectedAudioTracks.narration}
                  onCheckedChange={() => toggleAudioTrack('narration')}
                  disabled={!scene?.narrationAudioUrl}
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-300">Narration</span>
                    {scene?.narrationAudioUrl && (
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 border-purple-500/30 text-purple-400">
                        Audio Ready
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">
                    "{scene.narration}"
                  </p>
                </div>
                {scene?.narrationAudioUrl && (
                  <audio
                    controls
                    className="h-8 w-40"
                    src={scene.narrationAudioUrl}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )}
            
            {/* Dialogue Track */}
            {scene?.dialogueLines && scene.dialogueLines.length > 0 && (
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAudioTracks.dialogue 
                    ? 'bg-blue-500/10 border border-blue-500/30' 
                    : 'bg-slate-700/30 border border-slate-600/30 opacity-60'
                }`}
                onClick={() => toggleAudioTrack('dialogue')}
              >
                <Checkbox
                  checked={selectedAudioTracks.dialogue}
                  onCheckedChange={() => toggleAudioTrack('dialogue')}
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-300">Dialogue</span>
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-400">
                      {scene.dialogueLines.length} Lines
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {scene.dialogueLines[0]?.character}: "{scene.dialogueLines[0]?.line}"
                  </p>
                </div>
              </div>
            )}
            
            {/* SFX Track */}
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedAudioTracks.sfx 
                  ? 'bg-amber-500/10 border border-amber-500/30' 
                  : 'bg-slate-700/30 border border-slate-600/30 opacity-60'
              }`}
              onClick={() => toggleAudioTrack('sfx')}
            >
              <Checkbox
                checked={selectedAudioTracks.sfx}
                onCheckedChange={() => toggleAudioTrack('sfx')}
                disabled={!scene?.sfx?.some(s => s.audioUrl)}
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-amber-300">Sound Effects</span>
                {scene?.sfx && scene.sfx.length > 0 ? (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {scene.sfx.map(s => s.description).join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">No SFX audio available</p>
                )}
              </div>
            </div>
            
            {/* Music Track */}
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedAudioTracks.music 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-slate-700/30 border border-slate-600/30 opacity-60'
              }`}
              onClick={() => toggleAudioTrack('music')}
            >
              <Checkbox
                checked={selectedAudioTracks.music}
                onCheckedChange={() => toggleAudioTrack('music')}
                disabled={!scene?.musicAudio}
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Music className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-green-300">Background Music</span>
                {scene?.musicAudio ? (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {typeof scene.music === 'string' ? scene.music : scene.music?.description || 'Music track'}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">No music audio available</p>
                )}
              </div>
              {scene?.musicAudio && (
                <audio
                  controls
                  className="h-8 w-40"
                  src={scene.musicAudio}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
          
          <p className="text-xs text-slate-500 text-center">
            💡 Selected tracks will overlay during Play Scene preview. Veo 3.1 renders video with voice/SFX natively.
          </p>
        </div>
      )}
      
      {/* AI Tip */}
      <div className="flex items-start gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
        <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          <span className="text-indigo-300 font-medium">Pro Tip:</span>{' '}
          Segments with both Start and End frames use Frame-to-Video interpolation for best quality. 
          Click any segment to customize its generation settings before batch rendering.
        </div>
      </div>

      {/* DirectorDialog Modal */}
      {selectedSegment && (
        <DirectorDialog 
          segment={selectedSegment}
          sceneImageUrl={sceneImageUrl}
          scene={scene}
          isOpen={!!selectedSegment}
          onClose={() => setSelectedSegment(null)}
          onSaveConfig={handleSaveConfig}
        />
      )}
      
      {/* SceneVideoPlayer Modal */}
      <SceneVideoPlayer
        segments={segments}
        sceneNumber={sceneNumber}
        isOpen={isScenePlayerOpen}
        onClose={() => setIsScenePlayerOpen(false)}
        audioTracks={selectedAudioTracks}
        sceneAudio={{
          narrationUrl: scene?.narrationAudioUrl,
          musicUrl: scene?.musicAudio,
          // Collect dialogue audio URLs
          dialogueUrls: scene?.dialogueAudio?.en?.map(d => d.audioUrl) || [],
          // Collect SFX audio URLs
          sfxUrls: scene?.sfx?.filter(s => s.audioUrl).map(s => s.audioUrl!) || [],
        }}
      />
    </div>
    </TooltipProvider>
  )
}

export default DirectorConsole
