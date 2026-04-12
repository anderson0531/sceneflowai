'use client'

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Monitor,
  Smartphone,
  Film,
  Youtube,
  Tv,
  CheckCircle2,
  Info,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export interface ExportPreset {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  resolution: string
  aspectRatio: string
  frameRate: number
  codec: 'h264' | 'h265' | 'prores'
  bitrate: string
  recommended?: boolean
  platform?: string
  /** Browser MediaRecorder output; MP4 uses H.264 when the browser supports it */
  containerFormat?: 'mp4' | 'webm'
}

export interface ExportSettings {
  presetId: string
  resolution: string
  aspectRatio: string
  frameRate: number
  codec: 'h264' | 'h265' | 'prores'
  bitrate: string
  includeSubtitles: boolean
  includeBurnedCaptions: boolean
  watermark: boolean
  containerFormat: 'mp4' | 'webm'
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamName: string
  streamLanguage: string
  totalDuration: number
  sceneCount: number
  onExport: (settings: ExportSettings) => Promise<void>
  /** Whether there are rendered scenes available */
  hasRenderedScenes: boolean
}

// ============================================================================
// Presets
// ============================================================================

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'mp4-1080p',
    label: 'MP4 · 1080p',
    icon: <Youtube className="w-5 h-5" />,
    description: '1920×1080 H.264 — best default for sharing and desktop editors',
    resolution: '1920x1080',
    aspectRatio: '16:9',
    frameRate: 30,
    codec: 'h264',
    bitrate: '8 Mbps',
    recommended: true,
    platform: 'mp4-1080',
    containerFormat: 'mp4',
  },
  {
    id: 'mp4-720p',
    label: 'MP4 · 720p',
    icon: <Monitor className="w-5 h-5" />,
    description: '1280×720 — faster export and smaller files',
    resolution: '1280x720',
    aspectRatio: '16:9',
    frameRate: 30,
    codec: 'h264',
    bitrate: '5 Mbps',
    platform: 'mp4-720',
    containerFormat: 'mp4',
  },
  {
    id: 'mp4-4k',
    label: 'MP4 · 4K UHD',
    icon: <Film className="w-5 h-5" />,
    description: '3840×2160 — highest quality; longer render and larger files',
    resolution: '3840x2160',
    aspectRatio: '16:9',
    frameRate: 30,
    codec: 'h264',
    bitrate: '24 Mbps',
    platform: 'mp4-4k',
    containerFormat: 'mp4',
  },
  {
    id: 'youtube-1080',
    label: 'YouTube / Vimeo (WebM)',
    icon: <Youtube className="w-5 h-5" />,
    description: '1080p WebM — legacy browser encode path',
    resolution: '1920x1080',
    aspectRatio: '16:9',
    frameRate: 24,
    codec: 'h264',
    bitrate: '12 Mbps',
    platform: 'youtube',
    containerFormat: 'webm',
  },
  {
    id: 'social-vertical',
    label: 'TikTok / Reels / Shorts',
    icon: <Smartphone className="w-5 h-5" />,
    description: '1080x1920 vertical — output is 16:9 canvas (letterboxed)',
    resolution: '1080x1920',
    aspectRatio: '9:16',
    frameRate: 30,
    codec: 'h264',
    bitrate: '8 Mbps',
    platform: 'social-vertical',
    containerFormat: 'webm',
  },
  {
    id: 'social-square',
    label: 'Instagram / Facebook',
    icon: <Monitor className="w-5 h-5" />,
    description: '1080x1080 square — output is 16:9 canvas (letterboxed)',
    resolution: '1080x1080',
    aspectRatio: '1:1',
    frameRate: 30,
    codec: 'h264',
    bitrate: '8 Mbps',
    platform: 'social-square',
    containerFormat: 'webm',
  },
  {
    id: 'cinema-4k',
    label: 'Cinema 4K (WebM)',
    icon: <Film className="w-5 h-5" />,
    description: '3840×2160 WebM — use MP4 · 4K for H.264 when supported',
    resolution: '3840x2160',
    aspectRatio: '16:9',
    frameRate: 24,
    codec: 'h265',
    bitrate: '35 Mbps',
    platform: 'cinema',
    containerFormat: 'webm',
  },
  {
    id: 'broadcast-hd',
    label: 'Broadcast / TV (WebM)',
    icon: <Tv className="w-5 h-5" />,
    description: '1080p WebM — server/ProRes workflows use Production export',
    resolution: '1920x1080',
    aspectRatio: '16:9',
    frameRate: 24,
    codec: 'prores',
    bitrate: '45 Mbps',
    platform: 'broadcast',
    containerFormat: 'webm',
  },
]

// ============================================================================
// Format duration helper
// ============================================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ============================================================================
// Component
// ============================================================================

export function ExportDialog({
  open,
  onOpenChange,
  streamName,
  streamLanguage,
  totalDuration,
  sceneCount,
  onExport,
  hasRenderedScenes,
}: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('mp4-1080p')
  const [includeSubtitles, setIncludeSubtitles] = useState(false)
  const [includeBurnedCaptions, setIncludeBurnedCaptions] = useState(false)
  const [watermark, setWatermark] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const preset = useMemo(
    () => EXPORT_PRESETS.find(p => p.id === selectedPreset) || EXPORT_PRESETS[0],
    [selectedPreset]
  )

  const estimatedFileSize = useMemo(() => {
    // Rough file size estimate: bitrate * duration
    const bitrateNum = parseInt(preset.bitrate) || 12
    const sizeMB = (bitrateNum * totalDuration) / 8
    if (sizeMB > 1000) return `~${(sizeMB / 1000).toFixed(1)} GB`
    return `~${Math.round(sizeMB)} MB`
  }, [preset, totalDuration])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport({
        presetId: selectedPreset,
        resolution: preset.resolution,
        aspectRatio: preset.aspectRatio,
        frameRate: preset.frameRate,
        codec: preset.codec,
        bitrate: preset.bitrate,
        includeSubtitles,
        includeBurnedCaptions,
        watermark,
        containerFormat: preset.containerFormat ?? 'webm',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 text-xl">
            <Download className="w-5 h-5 text-purple-400" />
            Export Film
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Export <span className="text-white font-medium">{streamName}</span> as a final video file.
            MP4 uses the browser&apos;s MediaRecorder (H.264 when supported); otherwise export falls back to WebM automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Stream Info Summary */}
        <div className="flex items-center gap-4 mt-2 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Duration</span>
            <span className="text-sm font-medium text-white">{formatDuration(totalDuration)}</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Scenes</span>
            <span className="text-sm font-medium text-white">{sceneCount}</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Language</span>
            <span className="text-sm font-medium text-white">{streamLanguage}</span>
          </div>
        </div>

        {/* Warning: No rendered scenes */}
        {!hasRenderedScenes && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mt-2">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-200 font-medium">No rendered scenes detected</p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Return to Production to render each scene before exporting. Scenes without renders will use keyframe images with Ken Burns animation.
              </p>
            </div>
          </div>
        )}

        {/* Platform Presets */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Platform Preset</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPORT_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30'
                      : 'border-gray-700 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 mt-0.5",
                    isSelected ? 'text-purple-400' : 'text-gray-500'
                  )}>
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isSelected ? 'text-white' : 'text-gray-300'
                      )}>
                        {p.label}
                      </span>
                      {p.recommended && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{p.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                        {(p.containerFormat ?? 'webm').toUpperCase()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{p.resolution}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{p.aspectRatio}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{p.frameRate}fps</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{p.codec.toUpperCase()}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Options</h3>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeSubtitles}
              onChange={(e) => setIncludeSubtitles(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500/30"
            />
            <div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Include subtitle track (SRT)</span>
              <p className="text-[11px] text-gray-500">Separate subtitle file included in export package</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeBurnedCaptions}
              onChange={(e) => setIncludeBurnedCaptions(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500/30"
            />
            <div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Burn-in captions</span>
              <p className="text-[11px] text-gray-500">Hard-coded captions rendered directly on the video</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500/30"
            />
            <div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">SceneFlow watermark</span>
              <p className="text-[11px] text-gray-500">Adds a subtle SceneFlow branding in the corner</p>
            </div>
          </label>
        </div>

        {/* Export Summary */}
        <div className="mt-4 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Estimated file size</span>
            <span className="text-white font-medium">{estimatedFileSize}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-400">Format</span>
            <span className="text-white font-medium">
              {(preset.containerFormat ?? 'webm').toUpperCase()} • {preset.resolution} • {preset.codec.toUpperCase()} • {preset.frameRate}fps
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
          <p className="text-[11px] text-gray-500 max-w-[260px]">
            Combines all scenes into one video. When the render finishes, the file is saved to your Downloads folder
            {(preset.containerFormat ?? 'webm') === 'mp4' ? ' (MP4, or WebM if your browser cannot record MP4)' : ' (WebM)'}.
            A link is also stored for re-download from Final Cut.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Film
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
