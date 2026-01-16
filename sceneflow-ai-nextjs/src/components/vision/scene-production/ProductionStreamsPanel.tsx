'use client'

import React, { useState, useMemo } from 'react'
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
  XCircle
} from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import type { ProductionStream, ProductionStreamStatus, ProductionAudioMixConfig } from './types'

interface ProductionStreamsPanelProps {
  /** Existing production streams for this scene */
  productionStreams: ProductionStream[]
  /** Currently selected language for audio tracks */
  selectedLanguage: string
  /** Callback to render a new production stream */
  onRenderProduction: (language: string, resolution: '720p' | '1080p' | '4K') => Promise<void>
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
  /** Disabled state */
  disabled?: boolean
}

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

function ProductionStreamCard({
  stream,
  isRendering,
  renderProgress,
  onPreview,
  onDownload,
  onReRender,
  onDelete,
  disabled
}: {
  stream: ProductionStream
  isRendering: boolean
  renderProgress?: number
  onPreview: () => void
  onDownload: () => void
  onReRender: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const statusConfig = STATUS_CONFIG[stream.status]
  const flag = FLAG_EMOJIS[stream.language] || '🌐'
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      {/* Left: Language and status */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl" title={stream.languageLabel}>{flag}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-200 truncate">{stream.languageLabel}</span>
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
  onRenderProduction,
  onDeleteStream,
  onReRenderStream,
  onPreviewStream,
  onDownloadStream,
  isRendering = false,
  renderingStreamId,
  renderProgress,
  hasSegmentChanges = false,
  disabled = false
}: ProductionStreamsPanelProps) {
  const [newLanguage, setNewLanguage] = useState(selectedLanguage)
  const [newResolution, setNewResolution] = useState<'720p' | '1080p' | '4K'>('1080p')
  
  // Languages that already have production streams
  const existingLanguages = useMemo(() => 
    new Set(productionStreams.map(s => s.language)),
    [productionStreams]
  )
  
  // Available languages for new production
  const availableLanguages = useMemo(() => 
    SUPPORTED_LANGUAGES.filter(l => !existingLanguages.has(l.code)),
    [existingLanguages]
  )
  
  const handleRenderNew = async () => {
    if (!newLanguage) return
    await onRenderProduction(newLanguage, newResolution)
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
      
      {/* Existing Streams */}
      {productionStreams.length > 0 && (
        <div className="space-y-2">
          {productionStreams.map(stream => (
            <ProductionStreamCard
              key={stream.id}
              stream={stream}
              isRendering={isRendering && renderingStreamId === stream.id}
              renderProgress={renderingStreamId === stream.id ? renderProgress : undefined}
              onPreview={() => stream.mp4Url && onPreviewStream(stream.id, stream.mp4Url)}
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
          disabled={disabled || isRendering || !newLanguage}
          className="h-8 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isRendering ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Render Production
            </>
          )}
        </Button>
      </div>
      
      {/* Help text */}
      {productionStreams.length === 0 && (
        <p className="text-xs text-gray-500 text-center">
          Create production streams to render your scene with audio in different languages.
          Video segments are generated once; audio overlays are language-specific.
        </p>
      )}
    </div>
  )
}
