'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  Play, 
  Download, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Film,
  Clock,
  XCircle,
  Clapperboard,
  Video as VideoIcon,
  Maximize2,
  X,
  Pause
} from 'lucide-react'
import { SUPPORTED_LANGUAGES, FLAG_EMOJIS } from '@/constants/languages'
import type {
  ProductionStream,
  ProductionStreamStatus,
  ProductionStreamType,
  AnimaticRenderSettings,
} from './types'

// ============================================================================
// Types & Props
// ============================================================================

interface ProductionStreamsPanelProps {
  /** Existing production streams for this scene */
  productionStreams: ProductionStream[]
  /** Currently selected language for audio tracks (synced with mixer output target) */
  selectedLanguage: string
  /** When set, Animatic / Video tab is controlled by parent (e.g. mixer output) */
  streamTypeTab?: ProductionStreamType
  /** Callback to render a new animatic production stream */
  onRenderAnimatic?: (language: string, resolution: '720p' | '1080p' | '4K', settings: AnimaticRenderSettings) => Promise<void>
  /** Legacy callback for backwards compatibility - renders as animatic */
  onRenderProduction?: (language: string, resolution: '720p' | '1080p' | '4K') => Promise<void>
  /** Callback to delete a production stream */
  onDeleteStream: (streamId: string) => void
  /** Callback to re-render an existing stream */
  onReRenderStream: (streamId: string) => Promise<void>
  /** Callback to preview a stream */
  onPreviewStream: (streamId: string, mp4Url: string) => void
  /** Callback to download a stream */
  onDownloadStream: (streamId: string, mp4Url: string, language: string) => void
  /** Whether any render is in progress */
  isRendering?: boolean
  /** ID of stream currently rendering (if any) */
  renderingStreamId?: string | null
  /** Render progress (0-100) */
  renderProgress?: number
  /** Whether the segments have changed since last render */
  hasSegmentChanges?: boolean
  /** Whether video generation is available (requires segment videos) */
  videoGenerationAvailable?: boolean
  /** Disabled state */
  disabled?: boolean
}

// ============================================================================
// Constants & Helpers
// ============================================================================

// FLAG_EMOJIS imported from @/constants/languages

interface StreamTypeEntry {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
}

const STREAM_TYPE_CONFIG: Record<ProductionStreamType, StreamTypeEntry> = {
  animatic: { 
    Icon: Clapperboard, 
    label: 'Animatic', 
    description: 'Ken Burns animation with keyframes'
  },
  video: { 
    Icon: VideoIcon, 
    label: 'Video', 
    description: 'Full AI-generated video'
  },
}

/** Defaults for “Compose animatic” (same as previous inline form defaults). */
const DEFAULT_ANIMATIC_EXPORT_SETTINGS: AnimaticRenderSettings = {
  type: 'animatic',
  kenBurnsIntensity: 'subtle',
  transitionStyle: 'crossfade',
  transitionDuration: 0.5,
  includeSubtitles: false,
}

interface StatusEntry {
  Icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  label: string
  className: string
}

const STATUS_CONFIG: Record<ProductionStreamStatus, StatusEntry> = {
  pending: { Icon: Clock, label: 'Pending', className: 'text-gray-400' },
  rendering: { Icon: Loader2, iconClassName: 'animate-spin', label: 'Rendering', className: 'text-blue-400' },
  complete: { Icon: CheckCircle2, label: 'Ready', className: 'text-green-400' },
  failed: { Icon: XCircle, label: 'Failed', className: 'text-red-400' },
  stale: { Icon: AlertCircle, label: 'Stale', className: 'text-amber-400' },
  outdated: { Icon: AlertCircle, label: 'Outdated', className: 'text-amber-400' },
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// ============================================================================
// Inline Video Player Component
// ============================================================================

interface InlineVideoPlayerProps {
  stream: ProductionStream
  onClose: () => void
  onExpandFullscreen: () => void
  onDownload: () => void
}

function InlineVideoPlayer({ stream, onClose, onExpandFullscreen, onDownload }: InlineVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const flag = FLAG_EMOJIS[stream.language] || '🌐'
  const streamTypeConfig = STREAM_TYPE_CONFIG[stream.streamType || 'animatic']
  
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [isPlaying])
  
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])
  
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoaded(true)
    }
  }, [])
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current && stream.mp4Url) {
      videoRef.current.play().catch(() => {
        // Auto-play may be blocked by browser
      })
    }
  }, [stream.mp4Url])
  
  return (
    <div className="mb-4 bg-slate-900/90 rounded-xl border border-cyan-500/30 overflow-hidden shadow-lg shadow-cyan-500/10 animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{flag}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{stream.languageLabel}</span>
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              stream.streamType === 'video' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-500/20 text-purple-300'
            }`}>
              <streamTypeConfig.Icon className="w-4 h-4" />
              {streamTypeConfig.label}
            </span>
            {stream.resolution && (
              <span className="text-xs text-slate-400">{stream.resolution}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDownload}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
            title="Download MP4"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onExpandFullscreen}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
            title="Expand to fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Video Container */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={stream.mp4Url || undefined}
          className="w-full aspect-video"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
        
        {/* Loading overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}
      </div>
      
      {/* Custom Controls */}
      <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/80">
        <button
          onClick={togglePlayPause}
          className="p-1.5 text-white hover:text-cyan-400 transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        
        <span className="text-xs text-slate-400 min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
            [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:bg-cyan-300 [&::-webkit-slider-thumb]:transition-colors"
        />
        
        <span className="text-xs text-slate-400 min-w-[40px] text-right">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

function ProductionStreamCard({
  stream,
  isRendering,
  isActive,
  renderProgress,
  onPreview,
  onDownload,
  onReRender,
  onDelete,
  disabled
}: {
  stream: ProductionStream
  isRendering: boolean
  isActive?: boolean
  renderProgress?: number
  onPreview: () => void
  onDownload: () => void
  onReRender: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const statusConfig = STATUS_CONFIG[stream.status]
  const flag = FLAG_EMOJIS[stream.language] || '🌐'
  const streamTypeConfig = STREAM_TYPE_CONFIG[stream.streamType || 'animatic']
  
  return (
    <div className={`flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border transition-all duration-200 ${
      isActive 
        ? 'border-cyan-500/60 ring-1 ring-cyan-500/30 bg-cyan-500/5' 
        : 'border-gray-700/50 hover:border-gray-600/50'
    }`}>
      {/* Left: Language, type, and status */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl" title={stream.languageLabel}>{flag}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-200 truncate">{stream.languageLabel}</span>
            {/* Stream type badge */}
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              stream.streamType === 'video' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-500/20 text-purple-300'
            }`}>
              <streamTypeConfig.Icon className="w-4 h-4" />
              {streamTypeConfig.label}
            </span>
            <span className={`flex items-center gap-1 text-xs ${statusConfig.className}`}>
              <statusConfig.Icon className={`w-4 h-4 ${statusConfig.iconClassName || ''}`} />
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {stream.duration && <span>{formatDuration(stream.duration)}</span>}
            {stream.resolution && <span>• {stream.resolution}</span>}
            {stream.completedAt && <span>• {formatTimeAgo(stream.completedAt)}</span>}
          </div>
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {stream.status === 'rendering' ? (
          <div className="flex items-center gap-2 px-3">
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${renderProgress || 0}%` }}
              />
            </div>
            <span className="text-xs text-blue-400">{renderProgress || 0}%</span>
          </div>
        ) : stream.status === 'complete' && stream.mp4Url ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={onPreview}
              disabled={disabled}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              title="Preview"
            >
              <Play className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDownload}
              disabled={disabled}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              title="Download MP4"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReRender}
              disabled={disabled || isRendering}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              title="Re-render"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={disabled || isRendering}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-700"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : stream.status === 'failed' ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReRender}
              disabled={disabled || isRendering}
              className="h-8 px-2 text-amber-400 hover:text-amber-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={disabled || isRendering}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function ProductionStreamsPanel({
  productionStreams,
  selectedLanguage,
  streamTypeTab,
  onRenderAnimatic,
  onRenderProduction, // Legacy - maps to onRenderAnimatic
  onDeleteStream,
  onReRenderStream,
  onPreviewStream,
  onDownloadStream,
  isRendering = false,
  renderingStreamId,
  renderProgress,
  hasSegmentChanges = false,
  videoGenerationAvailable = false,
  disabled = false
}: ProductionStreamsPanelProps) {
  const selectedStreamType: ProductionStreamType = streamTypeTab ?? 'animatic'

  // Inline video preview state
  const [previewingStreamId, setPreviewingStreamId] = useState<string | null>(null)
  
  // Get the stream being previewed
  const previewingStream = useMemo(() => 
    previewingStreamId ? productionStreams.find(s => s.id === previewingStreamId) : null,
    [previewingStreamId, productionStreams]
  )
  
  // Handle inline preview toggle
  const handleInlinePreview = useCallback((streamId: string) => {
    setPreviewingStreamId(current => current === streamId ? null : streamId)
  }, [])
  
  // Handle expanding to fullscreen (uses existing parent callback)
  const handleExpandFullscreen = useCallback(() => {
    if (previewingStream?.mp4Url) {
      onPreviewStream(previewingStream.id, previewingStream.mp4Url)
      setPreviewingStreamId(null)
    }
  }, [previewingStream, onPreviewStream])
  
  // Handle download from inline player
  const handleInlineDownload = useCallback(() => {
    if (previewingStream?.mp4Url) {
      onDownloadStream(previewingStream.id, previewingStream.mp4Url, previewingStream.language)
    }
  }, [previewingStream, onDownloadStream])
  
  // Close inline preview when switching tabs
  useEffect(() => {
    setPreviewingStreamId(null)
  }, [selectedStreamType])
  
  // Filter streams by type
  const animaticStreams = useMemo(() => 
    productionStreams.filter(s => !s.streamType || s.streamType === 'animatic'),
    [productionStreams]
  )
  
  const videoStreams = useMemo(() => 
    productionStreams.filter(s => s.streamType === 'video'),
    [productionStreams]
  )
  
  const currentStreams = selectedStreamType === 'animatic' ? animaticStreams : videoStreams
  
  const handleComposeAnimatic = useCallback(async () => {
    if (!selectedLanguage) return
    const resolution: '720p' | '1080p' | '4K' = '1080p'
    if (onRenderAnimatic) {
      await onRenderAnimatic(selectedLanguage, resolution, DEFAULT_ANIMATIC_EXPORT_SETTINGS)
    } else if (onRenderProduction) {
      await onRenderProduction(selectedLanguage, resolution)
    }
  }, [selectedLanguage, onRenderAnimatic, onRenderProduction])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-medium text-gray-200">Production Streams</h4>
          {productionStreams.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
              {productionStreams.length}
            </span>
          )}
        </div>
        {hasSegmentChanges && productionStreams.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" />
            Segments changed - re-render recommended
          </span>
        )}
      </div>
      
      {/* Stream Type Tabs */}
      <p className="text-[11px] text-gray-500">
        Library of finished exports for this scene. View follows the same Animatic vs Video choice as Preview output in the Scene Production Mixer above.
      </p>
      <div className="flex items-center gap-2 text-xs">
        {selectedStreamType === 'animatic' ? (
          <>
            <Clapperboard className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-purple-200">Showing Animatic exports</span>
            <span className="px-1.5 py-0.5 text-[11px] bg-purple-500/20 text-purple-300 rounded">
              {animaticStreams.length}
            </span>
          </>
        ) : (
          <>
            <VideoIcon className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-indigo-200">Showing Video exports</span>
            <span className="px-1.5 py-0.5 text-[11px] bg-indigo-500/20 text-indigo-300 rounded">
              {videoStreams.length}
            </span>
          </>
        )}
      </div>
      
      {/* Inline Video Player */}
      {previewingStream && previewingStream.mp4Url && (
        <InlineVideoPlayer
          stream={previewingStream}
          onClose={() => setPreviewingStreamId(null)}
          onExpandFullscreen={handleExpandFullscreen}
          onDownload={handleInlineDownload}
        />
      )}
      
      {/* Existing Streams (filtered by type) */}
      {currentStreams.length > 0 && (
        <div className="space-y-2">
          {currentStreams.map(stream => (
            <ProductionStreamCard
              key={stream.id}
              stream={stream}
              isRendering={isRendering && renderingStreamId === stream.id}
              isActive={previewingStreamId === stream.id}
              renderProgress={renderingStreamId === stream.id ? renderProgress : undefined}
              onPreview={() => stream.mp4Url && handleInlinePreview(stream.id)}
              onDownload={() => stream.mp4Url && onDownloadStream(stream.id, stream.mp4Url, stream.language)}
              onReRender={() => onReRenderStream(stream.id)}
              onDelete={() => onDeleteStream(stream.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      
      {/* Animatic: open scene composer (language follows mixer Preview output) */}
      {selectedStreamType === 'animatic' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
          <p className="text-xs text-gray-400 flex-1">
            Uses <span className="text-gray-200 font-medium">Preview output</span> language from the mixer (
            {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name ?? selectedLanguage.toUpperCase()}
            ). Adjust Ken Burns and transitions in the dialog.
          </p>
          <Button
            size="sm"
            onClick={handleComposeAnimatic}
            disabled={disabled || isRendering || !selectedLanguage || !(onRenderAnimatic || onRenderProduction)}
            className="h-9 shrink-0 text-white bg-purple-600 hover:bg-purple-700"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening…
              </>
            ) : (
              <>
                <Clapperboard className="w-4 h-4 mr-2" />
                Compose animatic…
              </>
            )}
          </Button>
        </div>
      )}

      {selectedStreamType === 'video' && videoGenerationAvailable && (
        <div className="p-3 bg-gray-800/25 rounded-lg border border-gray-700/60">
          <p className="text-xs text-gray-400 text-center">
            New stitched video exports: use <span className="text-indigo-300 font-medium">Render</span> in the Scene Production Mixer footer. This list shows completed outputs for preview and download.
          </p>
        </div>
      )}

      
      {/* Video tab notice when video generation not available */}
      {selectedStreamType === 'video' && !videoGenerationAvailable && (
        <div className="p-3 bg-indigo-900/20 border border-indigo-700/50 rounded-lg">
          <p className="text-xs text-indigo-300 text-center">
            Generate AI video segments first to create a video production stream.
            Video streams stitch together your AI-generated clips with audio.
          </p>
        </div>
      )}
      
      {selectedStreamType === 'animatic' && animaticStreams.length === 0 && (
        <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
          <p className="text-xs text-purple-300 text-center">
            No animatic files yet. Use Compose animatic above to open the export wizard (defaults: subtle Ken Burns, crossfade).
          </p>
        </div>
      )}
      
      {/* Help text */}
      {currentStreams.length === 0 && selectedStreamType === 'video' && videoGenerationAvailable && (
        <p className="text-xs text-gray-500 text-center">
          Stitched video exports from the mixer will show up here.
        </p>
      )}
    </div>
  )
}
