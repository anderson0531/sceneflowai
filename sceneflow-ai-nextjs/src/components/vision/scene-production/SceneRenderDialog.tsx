/**
 * SceneRenderDialog - Configure and trigger scene video export
 * 
 * Allows users to select:
 * - Audio tracks to include (narration, dialogue, music, SFX)
 * - Output resolution (720p, 1080p, 4K)
 * - Preview estimated duration
 * 
 * Triggers Cloud Run FFmpeg render job to concatenate
 * segment MP4s with audio tracks.
 */

'use client'

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Film,
  Mic2,
  MessageSquare,
  Music,
  Volume2,
  Clock,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { SceneSegment, SceneProductionData } from './types'

interface AudioTrackInfo {
  type: 'narration' | 'dialogue' | 'music' | 'sfx'
  count: number
  totalDuration: number
  enabled: boolean
}

interface SceneRenderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneId: string
  sceneNumber: number
  projectId: string
  segments: SceneSegment[]
  productionData: SceneProductionData | null
  /** Audio URLs from scene data */
  audioData?: {
    narrationUrl?: string
    narrationDuration?: number
    dialogueEntries?: Array<{
      audioUrl?: string
      duration?: number
      character?: string
    }>
    musicUrl?: string
    musicDuration?: number
    sfxUrl?: string
    sfxDuration?: number
  }
  onRenderComplete?: (downloadUrl: string) => void
}

type RenderStatus = 'idle' | 'preparing' | 'uploading' | 'rendering' | 'complete' | 'error'

export const SceneRenderDialog: React.FC<SceneRenderDialogProps> = ({
  open,
  onOpenChange,
  sceneId,
  sceneNumber,
  projectId,
  segments,
  productionData,
  audioData,
  onRenderComplete,
}) => {
  // Audio track selection state
  const [includeNarration, setIncludeNarration] = useState(true)
  const [includeDialogue, setIncludeDialogue] = useState(true)
  const [includeMusic, setIncludeMusic] = useState(false)
  const [includeSfx, setIncludeSfx] = useState(false)
  
  // Output settings
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4K'>('1080p')
  
  // Render status
  const [status, setStatus] = useState<RenderStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  // Calculate rendered segments
  const renderedSegments = useMemo(() => {
    return segments.filter(s => s.activeAssetUrl && s.status === 'COMPLETE')
  }, [segments])

  // Calculate total video duration
  const totalDuration = useMemo(() => {
    return renderedSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  }, [renderedSegments])

  // Audio track summary
  const audioTracks = useMemo((): AudioTrackInfo[] => {
    const tracks: AudioTrackInfo[] = []
    
    if (audioData?.narrationUrl) {
      tracks.push({
        type: 'narration',
        count: 1,
        totalDuration: audioData.narrationDuration || 0,
        enabled: includeNarration,
      })
    }
    
    if (audioData?.dialogueEntries?.length) {
      const dialogueCount = audioData.dialogueEntries.filter(d => d.audioUrl).length
      const dialogueDuration = audioData.dialogueEntries.reduce((sum, d) => sum + (d.duration || 0), 0)
      if (dialogueCount > 0) {
        tracks.push({
          type: 'dialogue',
          count: dialogueCount,
          totalDuration: dialogueDuration,
          enabled: includeDialogue,
        })
      }
    }
    
    if (audioData?.musicUrl) {
      tracks.push({
        type: 'music',
        count: 1,
        totalDuration: audioData.musicDuration || 0,
        enabled: includeMusic,
      })
    }
    
    if (audioData?.sfxUrl) {
      tracks.push({
        type: 'sfx',
        count: 1,
        totalDuration: audioData.sfxDuration || 0,
        enabled: includeSfx,
      })
    }
    
    return tracks
  }, [audioData, includeNarration, includeDialogue, includeMusic, includeSfx])

  // Get audio track icon
  const getTrackIcon = (type: 'narration' | 'dialogue' | 'music' | 'sfx') => {
    switch (type) {
      case 'narration': return <Mic2 className="w-4 h-4" />
      case 'dialogue': return <MessageSquare className="w-4 h-4" />
      case 'music': return <Music className="w-4 h-4" />
      case 'sfx': return <Volume2 className="w-4 h-4" />
    }
  }

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle render button click
  const handleRender = async () => {
    if (renderedSegments.length === 0) {
      setError('No rendered video segments available')
      return
    }

    setStatus('preparing')
    setProgress(0)
    setError(null)
    setDownloadUrl(null)

    try {
      // Build request payload
      const segmentData = renderedSegments.map(s => ({
        segmentId: s.segmentId,
        sequenceIndex: s.sequenceIndex,
        videoUrl: s.activeAssetUrl!,
        startTime: s.startTime,
        endTime: s.endTime,
      }))

      // Build audio tracks
      const audioTracks: {
        narration?: Array<{ url: string; startTime: number; duration: number }>
        dialogue?: Array<{ url: string; startTime: number; duration: number; character?: string }>
        music?: Array<{ url: string; startTime: number; duration: number }>
        sfx?: Array<{ url: string; startTime: number; duration: number }>
      } = {}

      if (includeNarration && audioData?.narrationUrl) {
        audioTracks.narration = [{
          url: audioData.narrationUrl,
          startTime: 0,
          duration: audioData.narrationDuration || totalDuration,
        }]
      }

      if (includeDialogue && audioData?.dialogueEntries) {
        const dialogueClips = audioData.dialogueEntries
          .filter(d => d.audioUrl)
          .map((d, i) => ({
            url: d.audioUrl!,
            startTime: 0, // TODO: Calculate proper timing based on segment mapping
            duration: d.duration || 3,
            character: d.character,
          }))
        if (dialogueClips.length > 0) {
          audioTracks.dialogue = dialogueClips
        }
      }

      if (includeMusic && audioData?.musicUrl) {
        audioTracks.music = [{
          url: audioData.musicUrl,
          startTime: 0,
          duration: audioData.musicDuration || totalDuration,
        }]
      }

      if (includeSfx && audioData?.sfxUrl) {
        audioTracks.sfx = [{
          url: audioData.sfxUrl,
          startTime: 0,
          duration: audioData.sfxDuration || totalDuration,
        }]
      }

      setStatus('uploading')
      setProgress(10)

      // Call scene render API
      const response = await fetch(`/api/scene/${sceneId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneId,
          sceneNumber,
          resolution,
          audioConfig: {
            includeNarration,
            includeDialogue,
            includeMusic,
            includeSfx,
            language: 'en',
          },
          segments: segmentData,
          audioTracks,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Render failed: ${response.status}`)
      }

      const result = await response.json()
      setJobId(result.jobId)
      setStatus('rendering')
      setProgress(30)

      // Poll for job status
      await pollJobStatus(result.jobId)

    } catch (err) {
      console.error('[SceneRenderDialog] Render error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  // Poll job status until complete
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 120 // 10 minutes with 5s interval
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++

      try {
        const response = await fetch(`/api/scene/${sceneId}/render?jobId=${jobId}`)
        if (!response.ok) continue

        const data = await response.json()
        
        if (data.status === 'COMPLETED') {
          setStatus('complete')
          setProgress(100)
          setDownloadUrl(data.downloadUrl)
          onRenderComplete?.(data.downloadUrl)
          return
        }

        if (data.status === 'FAILED') {
          throw new Error(data.error || 'Render job failed')
        }

        // Update progress
        setProgress(30 + (data.progress || 0) * 0.7)
      } catch (err) {
        console.warn('[SceneRenderDialog] Poll error:', err)
      }
    }

    throw new Error('Render timed out')
  }

  // Handle download
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open && status !== 'rendering') {
      setStatus('idle')
      setProgress(0)
      setError(null)
      setDownloadUrl(null)
      setJobId(null)
    }
    onOpenChange(open)
  }

  const isRendering = status === 'preparing' || status === 'uploading' || status === 'rendering'
  const canRender = renderedSegments.length > 0 && !isRendering

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <Film className="w-5 h-5 text-indigo-400" />
            Render Scene {sceneNumber}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Combine video segments with audio into a final MP4
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Segments Summary */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Video Segments</Label>
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">
                  {renderedSegments.length} of {segments.length} segments ready
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                {formatDuration(totalDuration)}
              </div>
            </div>
            {renderedSegments.length < segments.length && (
              <p className="text-xs text-amber-400">
                ⚠️ Some segments are not rendered yet
              </p>
            )}
          </div>

          {/* Audio Track Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-300">Audio Tracks</Label>
            
            <div className="space-y-2">
              {/* Narration */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-slate-300">Narration</span>
                  {audioData?.narrationUrl && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30">
                      {formatDuration(audioData.narrationDuration || 0)}
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={includeNarration}
                  onCheckedChange={setIncludeNarration}
                  disabled={!audioData?.narrationUrl || isRendering}
                />
              </div>

              {/* Dialogue */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300">Dialogue</span>
                  {audioData?.dialogueEntries && audioData.dialogueEntries.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-300 border-green-500/30">
                      {audioData.dialogueEntries.filter(d => d.audioUrl).length} clips
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={includeDialogue}
                  onCheckedChange={setIncludeDialogue}
                  disabled={!audioData?.dialogueEntries?.some(d => d.audioUrl) || isRendering}
                />
              </div>

              {/* Music */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-slate-300">Background Music</span>
                  {audioData?.musicUrl && (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                      {formatDuration(audioData.musicDuration || 0)}
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={includeMusic}
                  onCheckedChange={setIncludeMusic}
                  disabled={!audioData?.musicUrl || isRendering}
                />
              </div>

              {/* SFX */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-slate-300">Sound Effects</span>
                  {audioData?.sfxUrl && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30">
                      {formatDuration(audioData.sfxDuration || 0)}
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={includeSfx}
                  onCheckedChange={setIncludeSfx}
                  disabled={!audioData?.sfxUrl || isRendering}
                />
              </div>
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Output Resolution</Label>
            <Select
              value={resolution}
              onValueChange={(value: '720p' | '1080p' | '4K') => setResolution(value)}
              disabled={isRendering}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p (1280×720)</SelectItem>
                <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                <SelectItem value="4K">4K (3840×2160)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Progress / Status */}
          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {status === 'preparing' && 'Preparing render job...'}
                  {status === 'uploading' && 'Uploading job specification...'}
                  {status === 'rendering' && 'Rendering video...'}
                  {status === 'complete' && 'Render complete!'}
                  {status === 'error' && 'Render failed'}
                </span>
                <span className="text-slate-500">{Math.round(progress)}%</span>
              </div>
              <Progress 
                value={progress} 
                className={`h-2 ${status === 'error' ? 'bg-red-900' : status === 'complete' ? 'bg-emerald-900' : 'bg-slate-700'}`}
              />
              {status === 'error' && error && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {status === 'complete' && downloadUrl && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video ready for download</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {status === 'complete' && downloadUrl ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="border-slate-600 text-slate-300"
              >
                Close
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download MP4
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isRendering}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRender}
                disabled={!canRender}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rendering...
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 mr-2" />
                    Render Scene
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
