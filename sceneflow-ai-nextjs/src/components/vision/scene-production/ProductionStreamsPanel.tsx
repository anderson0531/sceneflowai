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
  Pause,
  Upload,
  Pencil,
  Check,
} from 'lucide-react'
import { FLAG_EMOJIS } from '@/constants/languages'
import type {
  ProductionStream,
  ProductionStreamStatus,
  ProductionStreamType,
  AnimaticRenderSettings,
} from './types'
import { getProductionStreamDisplayName } from './defaults'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ============================================================================
// Types & Props
// ============================================================================

interface ProductionStreamsPanelProps {
  /** Existing production streams for this scene */
  productionStreams: ProductionStream[]
  /** Currently selected language for audio tracks (synced with mixer output target) */
  selectedLanguage: string
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
  /** Upload an MP4 as a new production stream for the active tab type */
  onUploadStream?: (streamType: ProductionStreamType, file: File) => Promise<void>
  /** Rename a stream's display label */
  onRenameStream?: (streamId: string, displayName: string) => void
  /** Whether a stream upload is in progress */
  isUploadingStream?: boolean
  /** Last upload error message */
  streamUploadError?: string | null
  onDismissStreamUploadError?: () => void
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
  /** Sync Animatic/Video tab with mixer output target */
  streamType?: ProductionStreamType
  onStreamTypeChange?: (streamType: ProductionStreamType) => void
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
    description: 'Ken Burns animation with Beat Frames'
  },
  video: { 
    Icon: VideoIcon, 
    label: 'Video', 
    description: 'Full AI-generated video'
  },
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

  const timelineDuration = useMemo(() => {
    if (Number.isFinite(duration) && duration > 0 && !Number.isNaN(duration)) {
      return duration
    }
    if (typeof stream.duration === 'number' && stream.duration > 0 && Number.isFinite(stream.duration)) {
      return stream.duration
    }
    return 0
  }, [duration, stream.duration])
  
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
  
  const applyDurationFromVideo = useCallback(() => {
    if (!videoRef.current) return
    const d = videoRef.current.duration
    const fallback =
      typeof stream.duration === 'number' && stream.duration > 0 ? stream.duration : 0
    if (Number.isFinite(d) && d > 0 && !Number.isNaN(d)) {
      setDuration(d)
    } else if (fallback > 0) {
      setDuration(fallback)
    } else {
      setDuration(0)
    }
  }, [stream.duration])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      applyDurationFromVideo()
      setIsLoaded(true)
    }
  }, [applyDurationFromVideo])

  const handleDurationChange = useCallback(() => {
    applyDurationFromVideo()
  }, [applyDurationFromVideo])
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value)
    const cap = timelineDuration > 0 ? timelineDuration : duration
    const newTime =
      Number.isFinite(cap) && cap > 0 ? Math.min(Math.max(0, raw), cap) : Math.max(0, raw)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [timelineDuration, duration])
  
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0 || Number.isNaN(seconds)) {
      return '0:00'
    }
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
            <span className="text-sm font-medium text-white">{getProductionStreamDisplayName(stream)}</span>
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              stream.streamType === 'video' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-500/20 text-purple-300'
            }`}>
              <streamTypeConfig.Icon className="w-4 h-4" />
              {streamTypeConfig.label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600/60 text-slate-200">
              v{stream.streamVersion ?? 1}
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
          onDurationChange={handleDurationChange}
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
          max={timelineDuration > 0 ? timelineDuration : 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
            [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:bg-cyan-300 [&::-webkit-slider-thumb]:transition-colors"
        />
        
        <span className="text-xs text-slate-400 min-w-[40px] text-right">
          {formatTime(timelineDuration)}
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
  onRename,
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
  onRename?: (displayName: string) => void
  disabled?: boolean
}) {
  const statusConfig = STATUS_CONFIG[stream.status]
  const flag = FLAG_EMOJIS[stream.language] || '🌐'
  const streamTypeConfig = STREAM_TYPE_CONFIG[stream.streamType || 'animatic']
  const displayName = getProductionStreamDisplayName(stream)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditingName) setNameDraft(displayName)
  }, [displayName, isEditingName])

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus()
  }, [isEditingName])

  const commitRename = useCallback(() => {
    const trimmed = nameDraft.trim()
    const currentCustom = stream.displayName?.trim() ?? ''
    if (trimmed !== currentCustom) onRename?.(trimmed)
    setIsEditingName(false)
  }, [nameDraft, stream.displayName, onRename])

  const cancelRename = useCallback(() => {
    setNameDraft(displayName)
    setIsEditingName(false)
  }, [displayName])
  
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
          <div className="flex items-center gap-2 flex-wrap">
            {isEditingName && onRename ? (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') cancelRename()
                  }}
                  className="h-7 min-w-[120px] max-w-[220px] flex-1 px-2 text-sm bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  aria-label="Stream name"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={commitRename}
                  className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                  title="Save name"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelRename}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-200"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="font-medium text-gray-200 truncate max-w-[200px]" title={displayName}>
                  {displayName}
                </span>
                {onRename && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    disabled={disabled}
                    className="p-0.5 text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-40"
                    title="Edit stream name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {stream.source === 'upload' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                Uploaded
              </span>
            )}
            {/* Stream type badge */}
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              stream.streamType === 'video' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-500/20 text-purple-300'
            }`}>
              <streamTypeConfig.Icon className="w-4 h-4" />
              {streamTypeConfig.label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600/50 text-slate-300 font-medium">
              Version {stream.streamVersion ?? 1}
            </span>
            <span className={`flex items-center gap-1 text-xs ${statusConfig.className}`}>
              <statusConfig.Icon className={`w-4 h-4 ${statusConfig.iconClassName || ''}`} />
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {stream.displayName?.trim() && (
              <span className="text-gray-400">{stream.languageLabel}</span>
            )}
            {stream.duration && <span>{formatDuration(stream.duration)}</span>}
            {stream.resolution && <span>• {stream.resolution}</span>}
            {stream.completedAt && <span>• {formatTimeAgo(stream.completedAt)}</span>}
          </div>
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {stream.status === 'rendering' ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3">
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${renderProgress || 0}%` }}
                />
              </div>
              <span className="text-xs text-blue-400">{renderProgress || 0}%</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 px-2 text-gray-400 hover:text-red-300 hover:bg-gray-700"
              title="Clear stuck render entry"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Clear
            </Button>
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
              title="New version (keeps this export; adds another render)"
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
  onRenderAnimatic: _onRenderAnimatic,
  onRenderProduction: _onRenderProduction, // Legacy - maps to onRenderAnimatic
  onDeleteStream,
  onReRenderStream,
  onPreviewStream,
  onDownloadStream,
  onUploadStream,
  onRenameStream,
  isRendering = false,
  renderingStreamId,
  renderProgress,
  isUploadingStream = false,
  streamUploadError,
  onDismissStreamUploadError,
  hasSegmentChanges = false,
  videoGenerationAvailable = false,
  streamType: controlledStreamType,
  onStreamTypeChange,
  disabled = false
}: ProductionStreamsPanelProps) {
  const [internalStreamTab, setInternalStreamTab] = useState<ProductionStreamType>('video')
  const streamsPanelTab = controlledStreamType ?? internalStreamTab
  const setStreamsPanelTab = onStreamTypeChange ?? setInternalStreamTab
  const selectedStreamType = streamsPanelTab
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const selectedLanguageFlag = FLAG_EMOJIS[selectedLanguage] || '🌐'

  const handleUploadFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !onUploadStream) return
      await onUploadStream(selectedStreamType, file)
    },
    [onUploadStream, selectedStreamType]
  )

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
  
  const currentStreams = useMemo(() => {
    return [...videoStreams].sort((a, b) => {
      const lang = a.language.localeCompare(b.language)
      if (lang !== 0) return lang
      const dv = (b.streamVersion ?? 1) - (a.streamVersion ?? 1)
      if (dv !== 0) return dv
      return new Date(b.completedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.createdAt || 0).getTime()
    })
  }, [videoStreams])
  
  return (
    <div className="space-y-4">
      {/* Header — align with ProductionSectionHeader (KeyFrame / Video / Mixer cards) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Film className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-white tracking-tight">
                Production Streams — Export (MP4)
              </h3>
              {productionStreams.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-200 rounded-md border border-purple-500/25">
                  {productionStreams.length} total
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Finished MP4 exports for this scene by language and type. Preview live work in Screening Room or the Mixer — review finished files here.
            </p>
          </div>
        </div>
        {hasSegmentChanges && productionStreams.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
            Beats changed — new render recommended
          </span>
        )}
      </div>

      {/* Video exports for this scene */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <VideoIcon className="w-3.5 h-3.5 text-indigo-400" />
        <span>Showing <span className="text-indigo-200 font-medium">Video</span> exports for this scene</span>
      </div>

      {onUploadStream && (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-slate-600/60 bg-slate-900/40">
          <input
            ref={uploadInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={handleUploadFileChange}
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || isRendering || isUploadingStream}
              onClick={() => uploadInputRef.current?.click()}
              className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              {isUploadingStream ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploadingStream ? 'Uploading…' : 'Upload Video MP4'}
            </Button>
            <span className="text-xs text-slate-500">
              {selectedLanguageFlag} Mixer language: <span className="text-slate-300">{selectedLanguage}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Import an external MP4 (up to 500MB). It is versioned like mixer renders and appears in Final Cut.
          </p>
          {streamUploadError && (
            <div className="flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="flex-1">{streamUploadError}</span>
              {onDismissStreamUploadError && (
                <button
                  type="button"
                  onClick={onDismissStreamUploadError}
                  className="text-red-400/80 hover:text-red-200 underline shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
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
              onRename={onRenameStream ? (name) => onRenameStream(stream.id, name) : undefined}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      
      {selectedStreamType === 'animatic' && (
        <div className="p-3 bg-gray-800/25 rounded-lg border border-gray-700/60">
          <p className="text-xs text-gray-400 text-center">
            New animatic exports: use <span className="text-purple-300 font-medium">Render</span> in the Production Mixer footer, or <span className="text-purple-300 font-medium">Upload</span> above. Rename streams with the pencil icon.
          </p>
        </div>
      )}

      {selectedStreamType === 'video' && videoGenerationAvailable && (
        <div className="p-3 bg-gray-800/25 rounded-lg border border-gray-700/60">
          <p className="text-xs text-gray-400 text-center">
            New stitched video exports: use <span className="text-indigo-300 font-medium">Render</span> in the Production Mixer footer, or <span className="text-indigo-300 font-medium">Upload</span> above.
          </p>
        </div>
      )}

      
      {/* Video tab notice when video generation not available */}
      {selectedStreamType === 'video' && !videoGenerationAvailable && (
        <div className="p-3 bg-indigo-900/20 border border-indigo-700/50 rounded-lg">
          <p className="text-xs text-indigo-300 text-center">
            Generate AI video segments to stitch a video stream from the mixer, or upload an external MP4 above.
          </p>
        </div>
      )}
      
      {selectedStreamType === 'animatic' && animaticStreams.length === 0 && (
        <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
          <p className="text-xs text-purple-300 text-center">
            No animatic files yet. Render from the mixer footer or upload an MP4 above.
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
