/**
 * SceneRenderDialog - "Scene Composer" Modal
 * 
 * Refactored design with two sections:
 * - Section A: Video Sequence - Per-segment audio control
 * - Section B: Audio Overlays - Track cards with timing offsets
 */

'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/Input'
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
  Globe,
  Video,
  VolumeX,
} from 'lucide-react'
import type { SceneSegment, SceneProductionData } from './types'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'

// Audio track configuration with timing
interface AudioTrackConfig {
  enabled: boolean
  volume: number      // 0 to 1
  startOffset: number // Start time in seconds
}

interface SceneRenderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneId: string
  sceneNumber: number
  projectId: string
  segments: SceneSegment[]
  productionData: SceneProductionData | null
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
  // Per-segment audio settings: { [segmentId]: { includeAudio: boolean, volume: number } }
  const [segmentAudioSettings, setSegmentAudioSettings] = useState<Record<string, { includeAudio: boolean; volume: number }>>({})
  
  // Audio overlay track configurations with start offsets
  const [narrationConfig, setNarrationConfig] = useState<AudioTrackConfig>({ enabled: true, volume: 0.8, startOffset: 0 })
  const [dialogueConfig, setDialogueConfig] = useState<AudioTrackConfig>({ enabled: true, volume: 0.9, startOffset: 0 })
  const [musicConfig, setMusicConfig] = useState<AudioTrackConfig>({ enabled: false, volume: 0.3, startOffset: 0 })
  const [sfxConfig, setSfxConfig] = useState<AudioTrackConfig>({ enabled: false, volume: 0.6, startOffset: 0 })
  
  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  
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

  // Initialize per-segment audio settings when segments change
  useEffect(() => {
    const newSettings: Record<string, { includeAudio: boolean; volume: number }> = {}
    segments.forEach(s => {
      if (s.activeAssetUrl && s.status === 'COMPLETE') {
        newSettings[s.segmentId] = segmentAudioSettings[s.segmentId] || { includeAudio: true, volume: 1.0 }
      }
    })
    setSegmentAudioSettings(newSettings)
  }, [segments]) // eslint-disable-line react-hooks/exhaustive-deps

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Mute/Unmute all segments
  const handleMuteAll = (mute: boolean) => {
    const newSettings = { ...segmentAudioSettings }
    Object.keys(newSettings).forEach(key => {
      newSettings[key] = { ...newSettings[key], includeAudio: !mute }
    })
    setSegmentAudioSettings(newSettings)
  }

  // Check if all segments are muted
  const allSegmentsMuted = useMemo(() => {
    return Object.values(segmentAudioSettings).every(s => !s.includeAudio)
  }, [segmentAudioSettings])

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
      // Build request payload with per-segment audio settings
      const segmentData = renderedSegments.map((s, idx) => {
        const audioSettings = segmentAudioSettings[s.segmentId] || { includeAudio: true, volume: 1.0 }
        return {
          segmentId: s.segmentId,
          sequenceIndex: s.sequenceIndex,
          videoUrl: s.activeAssetUrl!,
          startTime: s.startTime,
          endTime: s.endTime,
          audioSource: audioSettings.includeAudio ? 'original' : 'none',
          audioVolume: audioSettings.volume,
        }
      })

      // Build audio tracks with timing offsets
      const audioTracks: {
        narration?: Array<{ url: string; startTime: number; duration: number; volume: number }>
        dialogue?: Array<{ url: string; startTime: number; duration: number; volume: number; character?: string }>
        music?: Array<{ url: string; startTime: number; duration: number; volume: number }>
        sfx?: Array<{ url: string; startTime: number; duration: number; volume: number }>
      } = {}

      if (narrationConfig.enabled && audioData?.narrationUrl) {
        audioTracks.narration = [{
          url: audioData.narrationUrl,
          startTime: narrationConfig.startOffset,
          duration: audioData.narrationDuration || totalDuration,
          volume: narrationConfig.volume,
        }]
      }

      if (dialogueConfig.enabled && audioData?.dialogueEntries) {
        const dialogueClips = audioData.dialogueEntries
          .filter(d => d.audioUrl)
          .map((d) => ({
            url: d.audioUrl!,
            startTime: dialogueConfig.startOffset,
            duration: d.duration || 3,
            volume: dialogueConfig.volume,
            character: d.character,
          }))
        if (dialogueClips.length > 0) {
          audioTracks.dialogue = dialogueClips
        }
      }

      if (musicConfig.enabled && audioData?.musicUrl) {
        audioTracks.music = [{
          url: audioData.musicUrl,
          startTime: musicConfig.startOffset,
          duration: audioData.musicDuration || totalDuration,
          volume: musicConfig.volume,
        }]
      }

      if (sfxConfig.enabled && audioData?.sfxUrl) {
        audioTracks.sfx = [{
          url: audioData.sfxUrl,
          startTime: sfxConfig.startOffset,
          duration: audioData.sfxDuration || totalDuration,
          volume: sfxConfig.volume,
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
            includeNarration: narrationConfig.enabled,
            includeDialogue: dialogueConfig.enabled,
            includeMusic: musicConfig.enabled,
            includeSfx: sfxConfig.enabled,
            includeSegmentAudio: !allSegmentsMuted,
            language: selectedLanguage,
            narrationVolume: narrationConfig.volume,
            dialogueVolume: dialogueConfig.volume,
            musicVolume: musicConfig.volume,
            sfxVolume: sfxConfig.volume,
            segmentAudioVolume: 1.0,
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
    const maxAttempts = 120
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

        setProgress(30 + (data.progress || 0) * 0.7)
      } catch (err) {
        console.warn('[SceneRenderDialog] Poll error:', err)
      }
    }

    throw new Error('Render timed out')
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

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

  // Audio Track Card Component
  const AudioTrackCard = ({
    icon,
    name,
    duration,
    clipCount,
    config,
    setConfig,
    disabled,
    iconColor,
    accentColor,
  }: {
    icon: React.ReactNode
    name: string
    duration?: number
    clipCount?: number
    config: AudioTrackConfig
    setConfig: (config: AudioTrackConfig) => void
    disabled: boolean
    iconColor: string
    accentColor: string
  }) => (
    <div className={`bg-slate-800/50 rounded-lg p-3 space-y-3 border ${config.enabled && !disabled ? accentColor : 'border-transparent'}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={disabled ? 'text-slate-600' : iconColor}>{icon}</span>
          <span className={`text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-200'}`}>{name}</span>
          {duration !== undefined && duration > 0 && (
            <Badge variant="outline" className="text-xs bg-slate-700/50 text-slate-400 border-slate-600">
              {formatDuration(duration)}
            </Badge>
          )}
          {clipCount !== undefined && clipCount > 0 && (
            <Badge variant="outline" className="text-xs bg-slate-700/50 text-slate-400 border-slate-600">
              {clipCount} clips
            </Badge>
          )}
          {disabled && (
            <span className="text-xs text-slate-600">Not available</span>
          )}
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          disabled={disabled || isRendering}
        />
      </div>
      
      {/* Controls Row - Only show when enabled and not disabled */}
      {config.enabled && !disabled && (
        <div className="grid grid-cols-2 gap-4">
          {/* Start Time Input */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Start at</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={config.startOffset}
                onChange={(e) => setConfig({ ...config, startOffset: parseFloat(e.target.value) || 0 })}
                disabled={isRendering}
                className="h-8 w-20 bg-slate-900 border-slate-700 text-sm text-center"
              />
              <span className="text-xs text-slate-500">sec</span>
            </div>
          </div>
          
          {/* Volume Slider */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Volume</label>
            <div className="flex items-center gap-2">
              <Slider
                value={[config.volume * 100]}
                onValueChange={([val]) => setConfig({ ...config, volume: val / 100 })}
                max={100}
                step={1}
                disabled={isRendering}
                className="flex-1"
              />
              <span className="text-xs text-slate-400 w-8 text-right">{Math.round(config.volume * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <Film className="w-5 h-5 text-purple-400" />
            Scene Composer
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure video segments and audio tracks for Scene {sceneNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* ============================================ */}
          {/* SECTION A: Video Sequence & Original Audio  */}
          {/* ============================================ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                Video Sequence ({renderedSegments.length} Segments)
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDuration(totalDuration)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMuteAll(!allSegmentsMuted)}
                  disabled={isRendering || renderedSegments.length === 0}
                  className="h-7 text-xs text-slate-400 hover:text-slate-200"
                >
                  {allSegmentsMuted ? (
                    <>
                      <Volume2 className="w-3 h-3 mr-1" />
                      Unmute All
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3 h-3 mr-1" />
                      Mute All
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Segment List */}
            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 max-h-48 overflow-y-auto">
              {renderedSegments.map((segment, idx) => {
                const settings = segmentAudioSettings[segment.segmentId] || { includeAudio: true, volume: 1.0 }
                const duration = segment.endTime - segment.startTime
                
                return (
                  <div 
                    key={segment.segmentId} 
                    className={`flex items-center justify-between px-3 py-2 ${idx !== renderedSegments.length - 1 ? 'border-b border-slate-700/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 w-6">#{idx + 1}</span>
                      <span className="text-sm text-slate-300">Segment {idx + 1}</span>
                      <span className="text-xs text-slate-500">{formatDuration(duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.includeAudio ? (
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-600" />
                      )}
                      <Switch
                        checked={settings.includeAudio}
                        onCheckedChange={(checked) => {
                          setSegmentAudioSettings(prev => ({
                            ...prev,
                            [segment.segmentId]: { ...settings, includeAudio: checked }
                          }))
                        }}
                        disabled={isRendering}
                      />
                    </div>
                  </div>
                )
              })}
              {renderedSegments.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  No rendered segments available
                </div>
              )}
            </div>
            
            {renderedSegments.length < segments.length && (
              <p className="text-xs text-amber-400">
                ⚠️ {segments.length - renderedSegments.length} segment(s) not yet rendered
              </p>
            )}
          </div>

          {/* ============================================ */}
          {/* SECTION B: Audio Overlays & Timing          */}
          {/* ============================================ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                Audio Tracks & Timing
              </Label>
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  disabled={isRendering}
                >
                  <SelectTrigger className="w-[120px] h-8 bg-slate-800 border-slate-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code} className="text-xs">
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              {/* Narration Track */}
              <AudioTrackCard
                icon={<Mic2 className="w-4 h-4" />}
                name="Narration"
                duration={audioData?.narrationDuration}
                config={narrationConfig}
                setConfig={setNarrationConfig}
                disabled={!audioData?.narrationUrl}
                iconColor="text-blue-400"
                accentColor="border-blue-500/30"
              />

              {/* Dialogue Track */}
              <AudioTrackCard
                icon={<MessageSquare className="w-4 h-4" />}
                name="Dialogue"
                clipCount={audioData?.dialogueEntries?.filter(d => d.audioUrl).length}
                config={dialogueConfig}
                setConfig={setDialogueConfig}
                disabled={!audioData?.dialogueEntries?.some(d => d.audioUrl)}
                iconColor="text-green-400"
                accentColor="border-green-500/30"
              />

              {/* Background Music Track */}
              <AudioTrackCard
                icon={<Music className="w-4 h-4" />}
                name="Background Music"
                duration={audioData?.musicDuration}
                config={musicConfig}
                setConfig={setMusicConfig}
                disabled={!audioData?.musicUrl}
                iconColor="text-purple-400"
                accentColor="border-purple-500/30"
              />

              {/* Sound Effects Track */}
              <AudioTrackCard
                icon={<Volume2 className="w-4 h-4" />}
                name="Sound Effects"
                duration={audioData?.sfxDuration}
                config={sfxConfig}
                setConfig={setSfxConfig}
                disabled={!audioData?.sfxUrl}
                iconColor="text-amber-400"
                accentColor="border-amber-500/30"
              />
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
                className="bg-purple-600 hover:bg-purple-700"
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
