'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Film, Globe, Monitor, Subtitles, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'

interface SceneForExport {
  id: string
  title?: string
  segments?: Array<{
    id?: string
    segmentId?: string
    startTime?: number
    endTime?: number
    activeAssetUrl?: string
    keyframeSettings?: any
    assetType?: 'video' | 'image'
  }>
  audioTracks?: Record<string, {
    url: string
    duration?: number
  }>
  // Legacy format fields
  narrationAudioUrl?: string
  dialogueAudio?: any
}

interface ExportVideoModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle?: string
  availableLanguages: string[] // Language codes that have generated audio
  scenes?: SceneForExport[] // Scene data to export
}

type Resolution = '720p' | '1080p' | '4K'
type ExportStatus = 'idle' | 'submitting' | 'processing' | 'done' | 'failed'

const RESOLUTION_OPTIONS: { value: Resolution; label: string; description: string }[] = [
  { value: '720p', label: '720p HD', description: 'Faster export, smaller file' },
  { value: '1080p', label: '1080p Full HD', description: 'Recommended for most uses' },
  { value: '4K', label: '4K Ultra HD', description: 'Highest quality, larger file' },
]

export function ExportVideoModal({
  isOpen,
  onClose,
  projectId,
  projectTitle = 'Untitled Project',
  availableLanguages,
  scenes = [],
}: ExportVideoModalProps) {
  // Form state
  const [language, setLanguage] = useState<string>(availableLanguages[0] || 'en')
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [includeSubtitles, setIncludeSubtitles] = useState(false)
  
  // Export state
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renderId, setRenderId] = useState<string | null>(null)

  // Filter languages to only show those with available audio
  const selectableLanguages = SUPPORTED_LANGUAGES.filter(
    lang => availableLanguages.includes(lang.code)
  )

  // Poll for render status
  const pollRenderStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/export/video/status/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check render status')
      }

      setProgress(data.progress)

      if (data.status === 'done' && data.url) {
        setExportStatus('done')
        setDownloadUrl(data.url)
        return true // Stop polling
      } else if (data.status === 'failed') {
        setExportStatus('failed')
        setError(data.error || 'Video rendering failed')
        return true // Stop polling
      }

      return false // Continue polling
    } catch (err) {
      console.error('[ExportVideoModal] Poll error:', err)
      setExportStatus('failed')
      setError(err instanceof Error ? err.message : 'Failed to check export status')
      return true // Stop polling on error
    }
  }, [])

  // Polling effect
  useEffect(() => {
    if (exportStatus !== 'processing' || !renderId) return

    const pollInterval = setInterval(async () => {
      const shouldStop = await pollRenderStatus(renderId)
      if (shouldStop) {
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [exportStatus, renderId, pollRenderStatus])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setExportStatus('idle')
        setProgress(0)
        setDownloadUrl(null)
        setError(null)
        setRenderId(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Update language when availableLanguages changes
  useEffect(() => {
    if (availableLanguages.length > 0 && !availableLanguages.includes(language)) {
      setLanguage(availableLanguages[0])
    }
  }, [availableLanguages, language])

  const handleExport = async () => {
    setExportStatus('submitting')
    setError(null)

    try {
      // Use screening-room endpoint for Screening Room scene format
      const response = await fetch('/api/export/screening-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectTitle,
          language,
          resolution,
          includeSubtitles,
          scenes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start video export')
      }

      // Support both Cloud Run (jobId) and Shotstack (renderId)
      const jobOrRenderId = data.jobId || data.renderId
      setRenderId(jobOrRenderId)
      setExportStatus('processing')
      setProgress(10)
    } catch (err) {
      console.error('[ExportVideoModal] Export error:', err)
      setExportStatus('failed')
      setError(err instanceof Error ? err.message : 'Failed to start export')
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  const handleClose = () => {
    if (exportStatus === 'processing') {
      // Warn user that export is still in progress
      if (!window.confirm('Export is still in progress. Are you sure you want to close?')) {
        return
      }
    }
    onClose()
  }

  const getStatusMessage = () => {
    switch (exportStatus) {
      case 'submitting':
        return 'Starting export...'
      case 'processing':
        if (progress < 25) return 'Preparing assets...'
        if (progress < 50) return 'Rendering video...'
        if (progress < 90) return 'Encoding and finalizing...'
        return 'Almost done...'
      case 'done':
        return 'Export complete!'
      case 'failed':
        return error || 'Export failed'
      default:
        return null
    }
  }

  const isExporting = exportStatus === 'submitting' || exportStatus === 'processing'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            Export as MP4
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Export &quot;{projectTitle}&quot; as a video file with your selected audio track.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Language Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Globe className="w-4 h-4 text-blue-400" />
              Audio Language
            </label>
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isExporting}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {selectableLanguages.map(lang => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableLanguages.length === 0 && (
              <p className="text-xs text-amber-400">
                No audio tracks available. Generate audio for at least one language first.
              </p>
            )}
          </div>

          {/* Resolution Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Monitor className="w-4 h-4 text-blue-400" />
              Resolution
            </label>
            <Select
              value={resolution}
              onValueChange={(v) => setResolution(v as Resolution)}
              disabled={isExporting}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {RESOLUTION_OPTIONS.map(opt => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700"
                  >
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-xs text-gray-400">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subtitles Toggle */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="subtitles"
              checked={includeSubtitles}
              onCheckedChange={(checked) => setIncludeSubtitles(checked === true)}
              disabled={isExporting}
              className="border-gray-600"
            />
            <label
              htmlFor="subtitles"
              className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer"
            >
              <Subtitles className="w-4 h-4 text-blue-400" />
              Include subtitles
            </label>
          </div>

          {/* Progress Indicator */}
          {isExporting && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{getStatusMessage()}</span>
                <span className="text-blue-400 font-medium">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success State */}
          {exportStatus === 'done' && downloadUrl && (
            <div className="flex items-center gap-3 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-300 font-medium">Export complete!</p>
                <p className="text-xs text-green-400/70">Your video is ready for download.</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {exportStatus === 'failed' && error && (
            <div className="flex items-center gap-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-300 font-medium">Export failed</p>
                <p className="text-xs text-red-400/70">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {exportStatus === 'done' ? 'Close' : 'Cancel'}
          </Button>

          {exportStatus === 'done' && downloadUrl ? (
            <Button
              variant="primary"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download MP4
            </Button>
          ) : exportStatus === 'failed' ? (
            <Button
              variant="primary"
              onClick={handleExport}
            >
              Try Again
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting || availableLanguages.length === 0}
              className={cn(
                isExporting && 'opacity-80',
                availableLanguages.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Video
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
