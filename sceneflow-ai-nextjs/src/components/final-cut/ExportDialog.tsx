'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  Upload,
  X,
  Clock,
  Clapperboard,
  Languages,
  Sparkles,
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
  /** One local video per timeline scene (scene 1, then 2, …) — bypasses cloud URLs */
  localSceneFiles?: File[]
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamName: string
  streamLanguage: string
  totalDuration: number
  sceneCount: number
  onExport: (settings: ExportSettings) => Promise<void>
  /** Any segment has a resolvable image or video URL (timeline + Production metadata) */
  hasExportableMedia: boolean
  /** At least one segment resolves to a video clip (not image-only) */
  hasVideoClipSegments: boolean
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2.5">{children}</p>
  )
}

const MP4_PRESETS = EXPORT_PRESETS.filter((p) => p.containerFormat === 'mp4')
const WEBM_PRESETS = EXPORT_PRESETS.filter((p) => p.containerFormat === 'webm')

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
  hasExportableMedia,
  hasVideoClipSegments,
}: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('mp4-1080p')
  const [includeSubtitles, setIncludeSubtitles] = useState(false)
  const [includeBurnedCaptions, setIncludeBurnedCaptions] = useState(false)
  const [watermark, setWatermark] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [manualSceneFiles, setManualSceneFiles] = useState<File[]>([])
  const manualFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) setManualSceneFiles([])
  }, [open])

  const stitchReady =
    sceneCount > 0 && manualSceneFiles.length === sceneCount

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
        localSceneFiles: stitchReady ? manualSceneFiles : undefined,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const renderPresetCard = (p: ExportPreset) => {
    const isSelected = selectedPreset === p.id
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => setSelectedPreset(p.id)}
        className={cn(
          'flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150',
          isSelected
            ? 'border-violet-400/70 bg-violet-500/15 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]'
            : 'border-zinc-700/80 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800/50'
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 mt-0.5 p-1.5 rounded-lg',
            isSelected ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-500'
          )}
        >
          {p.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-medium', isSelected ? 'text-white' : 'text-zinc-200')}>{p.label}</span>
            {p.recommended && (
              <Badge variant="secondary" className="bg-violet-500/25 text-violet-200 text-[10px] px-1.5 py-0 border-0">
                Recommended
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{p.description}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
              {(p.containerFormat ?? 'webm').toUpperCase()}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">{p.resolution}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">{p.frameRate}fps</span>
          </div>
        </div>
        {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-1" />}
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl sm:rounded-2xl">
        <div className="relative overflow-y-auto flex-1 px-6 pt-6 pb-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-950/40 to-transparent rounded-t-2xl" />

          <DialogHeader className="relative text-left space-y-1 pr-8">
            <DialogTitle className="text-xl font-semibold tracking-tight text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30">
                <Clapperboard className="w-5 h-5" />
              </span>
              Export master
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
              <span className="text-zinc-200 font-medium">{streamName}</span>
              <span className="text-zinc-500"> · </span>
              {streamLanguage}
              <span className="block text-xs text-zinc-500 mt-1.5">
                Browser encode: MP4 (H.264) when supported, otherwise WebM. Saves to Downloads and stores a link for
                re-download.
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-emerald-400/90 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Duration</p>
                <p className="text-sm font-semibold text-white tabular-nums">{formatDuration(totalDuration)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 flex items-center gap-2.5">
              <Film className="w-4 h-4 text-amber-400/90 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Scenes</p>
                <p className="text-sm font-semibold text-white tabular-nums">{sceneCount}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 flex items-center gap-2.5">
              <Languages className="w-4 h-4 text-sky-400/90 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Language</p>
                <p className="text-sm font-semibold text-white truncate">{streamLanguage}</p>
              </div>
            </div>
          </div>

          {/* Local files first — primary workaround */}
          {sceneCount > 0 && (
            <div className="relative mt-6">
              <SectionLabel>
                <span className="inline-flex items-center gap-1.5">
                  <Upload className="w-3 h-3" />
                  Local merge
                </span>
              </SectionLabel>
              <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 to-zinc-900/80 p-4 ring-1 ring-violet-500/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Use scene files from your computer</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xl">
                      Select <strong className="text-zinc-200">{sceneCount} videos</strong> in timeline order (scene 1 →{' '}
                      {sceneCount}). Skips cloud URLs; keeps audio from each file. Final Cut overlays are not applied on
                      this path.
                    </p>
                  </div>
                  {manualSceneFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualSceneFiles([])
                        if (manualFileInputRef.current) manualFileInputRef.current.value = ''
                      }}
                      className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 shrink-0"
                      aria-label="Clear selected files"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={manualFileInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.mov,.m4v"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files ? Array.from(e.target.files) : []
                    setManualSceneFiles(list)
                  }}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-violet-500/40 bg-violet-600/10 text-violet-100 hover:bg-violet-600/20 hover:text-white"
                    onClick={() => manualFileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-2" />
                    Choose videos
                  </Button>
                  <span className="text-xs text-zinc-500">
                    {manualSceneFiles.length === 0
                      ? 'No files yet'
                      : `${manualSceneFiles.length} / ${sceneCount} selected`}
                  </span>
                  {stitchReady && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready — export will stitch these files
                    </span>
                  )}
                </div>
                {manualSceneFiles.length > 0 && manualSceneFiles.length !== sceneCount && (
                  <p className="text-xs text-amber-400/95 mt-2">
                    Pick exactly {sceneCount} files to match scenes (re-order in the file picker if needed).
                  </p>
                )}
                {manualSceneFiles.length > 0 && (
                  <ul className="mt-3 max-h-28 overflow-y-auto rounded-lg border border-zinc-800 bg-black/20 px-3 py-2 text-[11px] text-zinc-400 space-y-1 font-mono">
                    {manualSceneFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="truncate">
                        <span className="text-zinc-600 mr-2">{i + 1}.</span>
                        {f.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Timeline status */}
          <div className="relative mt-5 space-y-3">
            {!hasExportableMedia && !stitchReady && (
              <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-100">Timeline has no linked media</p>
                  <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                    Production URLs are not resolving on this timeline. Save the project from Production, use{' '}
                    <strong className="text-amber-100/90">Local merge</strong> above with your scene MP4s, or fix links
                    and Save Final Cut.
                  </p>
                </div>
              </div>
            )}
            {hasExportableMedia && !hasVideoClipSegments && !stitchReady && (
              <div className="flex gap-3 rounded-xl border border-sky-500/20 bg-sky-950/15 p-3.5">
                <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-sky-100">Stills / animatic</p>
                  <p className="text-xs text-sky-100/70 mt-1 leading-relaxed">
                    Export will use images and Ken Burns where set. Render video in Production for full-motion clips.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="relative mt-6">
            <SectionLabel>MP4 output</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{MP4_PRESETS.map(renderPresetCard)}</div>
          </div>

          <div className="relative mt-5">
            <SectionLabel>WebM & social</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{WEBM_PRESETS.map(renderPresetCard)}</div>
          </div>

          {/* Options */}
          <div className="relative mt-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <SectionLabel>Options</SectionLabel>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeSubtitles}
                  onChange={(e) => setIncludeSubtitles(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500/30"
                />
                <div>
                  <span className="text-sm text-zinc-200 group-hover:text-white">Subtitle track (SRT)</span>
                  <p className="text-[11px] text-zinc-500">Bundled when supported</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeBurnedCaptions}
                  onChange={(e) => setIncludeBurnedCaptions(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500/30"
                />
                <div>
                  <span className="text-sm text-zinc-200 group-hover:text-white">Burn-in captions</span>
                  <p className="text-[11px] text-zinc-500">Rendered on picture</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500/30"
                />
                <div>
                  <span className="text-sm text-zinc-200 group-hover:text-white">SceneFlow watermark</span>
                  <p className="text-[11px] text-zinc-500">Corner branding</p>
                </div>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="relative mt-5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Est. size</span>
              <span className="text-white font-medium tabular-nums">{estimatedFileSize}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-zinc-500 shrink-0">Output</span>
              <span className="text-zinc-200 text-right text-xs sm:text-sm font-medium truncate">
                {(preset.containerFormat ?? 'webm').toUpperCase()} · {preset.resolution} · {preset.frameRate}fps
              </span>
            </div>
          </div>
        </div>

        {/* Sticky actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-6 py-4">
          <p className="text-[11px] text-zinc-500 max-w-md leading-relaxed order-2 sm:order-1">
            One continuous file. MP4 may fall back to WebM in some browsers — both work in YouTube and most editors.
          </p>
          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="bg-violet-600 hover:bg-violet-500 text-white min-w-[140px] h-9 shadow-lg shadow-violet-900/30"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
