'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Play, 
  Download, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Globe, 
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
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import type { 
  ProductionStream, 
  ProductionStreamStatus, 
  ProductionStreamType,
  AnimaticRenderSettings,
  KenBurnsIntensity
} from './types'

// ============================================================================
// Types & Props
// ============================================================================

interface ProductionStreamsPanelProps {
  /** Existing production streams for this scene */
  productionStreams: ProductionStream[]
  /** Currently selected language for audio tracks */
  selectedLanguage: string
  /** Callback to render a new animatic production stream */
  onRenderAnimatic?: (language: string, resolution: '720p' | '1080p' | '4K', settings: AnimaticRenderSettings) => Promise<void>
  /** Callback to render a new video production stream */
  onRenderVideo?: (language: string, resolution: '720p' | '1080p' | '4K') => Promise<void>
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

const FLAG_EMOJIS: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇧🇷',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  th: '🇹🇭',
  hi: '🇮🇳',
  ar: '🇸🇦',
  ru: '🇷🇺'
}

const STREAM_TYPE_CONFIG: Record<ProductionStreamType, { icon: React.ReactNode; label: string; description: string }> = {
  animatic: { 
    icon: <Clapperboard className="w-4 h-4" />, 
    label: 'Animatic', 
    description: 'Ken Burns animation with keyframes'
  },
  video: { 
    icon: <VideoIcon className="w-4 h-4" />, 
    label: 'Video', 
    description: 'Full AI-generated video'
  },
}

const KEN_BURNS_OPTIONS: { value: KenBurnsIntensity; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'dramatic', label: 'Dramatic' },
]

const TRANSITION_OPTIONS: { value: 'cut' | 'crossfade' | 'fade-to-black'; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'fade-to-black', label: 'Fade to Black' },
]

const STATUS_CONFIG: Record<ProductionStreamStatus, { icon: React.ReactNode; label: string; className: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, label: 'Pending', className: 'text-gray-400' },
  rendering: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Rendering', className: 'text-blue-400' },
  complete: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Ready', className: 'text-green-400' },
  failed: { icon: <XCircle className="w-4 h-4" />, label: 'Failed', className: 'text-red-400' },
  stale: { icon: <AlertCircle className="w-4 h-4" />, label: 'Stale', className: 'text-amber-400' }
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
              {streamTypeConfig.icon}
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
          src={stream.mp4Url}
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
              {streamTypeConfig.icon}
              {streamTypeConfig.label}
            </span>
            <span className={`flex items-center gap-1 text-xs ${statusConfig.className}`}>
              {statusConfig.icon}
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
  onRenderAnimatic,
  onRenderVideo,
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
  const [newLanguage, setNewLanguage] = useState(selectedLanguage)
  const [newResolution, setNewResolution] = useState<'720p' | '1080p' | '4K'>('1080p')
  const [selectedStreamType, setSelectedStreamType] = useState<ProductionStreamType>('animatic')
  
  // Animatic-specific settings
  const [kenBurnsIntensity, setKenBurnsIntensity] = useState<KenBurnsIntensity>('subtle')
  const [transitionStyle, setTransitionStyle] = useState<'cut' | 'crossfade' | 'fade-to-black'>('crossfade')
  
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
  
  // Languages that already have production streams of current type
  const existingLanguages = useMemo(() => 
    new Set(currentStreams.map(s => s.language)),
    [currentStreams]
  )
  
  // Available languages for new production
  const availableLanguages = useMemo(() => 
    SUPPORTED_LANGUAGES.filter(l => !existingLanguages.has(l.code)),
    [existingLanguages]
  )
  
  const handleRenderNew = async () => {
    if (!newLanguage) return
    
    if (selectedStreamType === 'animatic') {
      const settings: AnimaticRenderSettings = {
        kenBurnsIntensity,
        transitionStyle,
        transitionDuration: 0.5,
        includeSubtitles: false,
      }
      
      if (onRenderAnimatic) {
        await onRenderAnimatic(newLanguage, newResolution, settings)
      } else if (onRenderProduction) {
        // Legacy fallback
        await onRenderProduction(newLanguage, newResolution)
      }
    } else if (selectedStreamType === 'video' && onRenderVideo) {
      await onRenderVideo(newLanguage, newResolution)
    }
  }
  
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
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg">
        <button
          onClick={() => setSelectedStreamType('animatic')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
            selectedStreamType === 'animatic'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          Animatic
          {animaticStreams.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {animaticStreams.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedStreamType('video')}
          disabled={!videoGenerationAvailable && videoStreams.length === 0}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
            selectedStreamType === 'video'
              ? 'bg-indigo-600 text-white'
              : !videoGenerationAvailable && videoStreams.length === 0
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }`}
          title={!videoGenerationAvailable && videoStreams.length === 0 ? 'Generate segment videos first' : undefined}
        >
          <VideoIcon className="w-4 h-4" />
          Video
          {videoStreams.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {videoStreams.length}
            </span>
          )}
        </button>
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
      
      {/* Add New Production */}
      <div className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
        <Globe className="w-4 h-4 text-gray-500" />
        <Select
          value={newLanguage}
          onValueChange={setNewLanguage}
          disabled={disabled || isRendering}
        >
          <SelectTrigger className="w-[140px] h-8 bg-gray-800 border-gray-600 text-sm">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {/* Show current language first, even if stream exists */}
            {SUPPORTED_LANGUAGES.map(lang => (
              <SelectItem 
                key={lang.code} 
                value={lang.code}
                className="text-gray-200"
              >
                {FLAG_EMOJIS[lang.code] || '🌐'} {lang.name}
                {existingLanguages.has(lang.code) && ' (exists)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={newResolution}
          onValueChange={(v) => setNewResolution(v as '720p' | '1080p' | '4K')}
          disabled={disabled || isRendering}
        >
          <SelectTrigger className="w-[90px] h-8 bg-gray-800 border-gray-600 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="720p" className="text-gray-200">720p</SelectItem>
            <SelectItem value="1080p" className="text-gray-200">1080p</SelectItem>
            <SelectItem value="4K" className="text-gray-200">4K</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          size="sm"
          onClick={handleRenderNew}
          disabled={disabled || isRendering || !newLanguage || (selectedStreamType === 'video' && !videoGenerationAvailable)}
          className={`h-8 text-white ${
            selectedStreamType === 'animatic' 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isRendering ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Render {STREAM_TYPE_CONFIG[selectedStreamType].label}
            </>
          )}
        </Button>
      </div>
      
      {/* Animatic Settings (only shown when animatic tab is selected) */}
      {selectedStreamType === 'animatic' && (
        <div className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Ken Burns:</span>
            <Select
              value={kenBurnsIntensity}
              onValueChange={(v) => setKenBurnsIntensity(v as KenBurnsIntensity)}
              disabled={disabled || isRendering}
            >
              <SelectTrigger className="w-[100px] h-7 bg-gray-800 border-gray-600 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {KEN_BURNS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-gray-200 text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Transitions:</span>
            <Select
              value={transitionStyle}
              onValueChange={(v) => setTransitionStyle(v as 'cut' | 'crossfade' | 'fade-to-black')}
              disabled={disabled || isRendering}
            >
              <SelectTrigger className="w-[110px] h-7 bg-gray-800 border-gray-600 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {TRANSITION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-gray-200 text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      
      {/* Help text */}
      {currentStreams.length === 0 && selectedStreamType === 'animatic' && (
        <p className="text-xs text-gray-500 text-center">
          Create animatic streams to render your scene with Ken Burns animation and audio.
          Great for early reviews and storyboard presentations.
        </p>
      )}
      {currentStreams.length === 0 && selectedStreamType === 'video' && videoGenerationAvailable && (
        <p className="text-xs text-gray-500 text-center">
          Create video streams to combine your AI-generated video segments with audio.
          This is your final production output.
        </p>
      )}
    </div>
  )
}

