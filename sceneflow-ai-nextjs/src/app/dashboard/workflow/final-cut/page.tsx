'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft,
  ArrowRight,
  Save, 
  Download, 
  Share2, 
  Settings,
  Loader2,
  Film,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FinalCutTimeline } from '@/components/final-cut/FinalCutTimeline'
import { FinalCutMediaBrowser } from '@/components/final-cut/FinalCutMediaBrowser'
import { ExportDialog, type ExportSettings } from '@/components/final-cut/ExportDialog'
import type { LocalRenderConfig, LocalRenderResolution } from '@/lib/video/LocalRenderService'
import type {
  FinalCutStream,
  StreamScene,
  StreamSegment,
  StreamSettings,
  TransitionEffect,
  Overlay,
  ProductionLanguage,
  ProductionFormat
} from '@/lib/types/finalCut'
import { getLanguageName } from '@/constants/languages'
import { resolveStreamSegmentMediaForExport } from '@/lib/final-cut/resolveSegmentMedia'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { ProductionSectionHeader } from '@/components/vision/scene-production/ProductionSectionHeader'
import { cn } from '@/lib/utils'

const LS_SECTION_STREAMS = 'finalCut.section.streams'
const LS_SECTION_MIXER = 'finalCut.section.mixer'
const LS_MOBILE_PANE = 'finalCut.section.mobilePane'

function mapExportResolutionStringToLocal(resolution: string): LocalRenderResolution {
  const r = resolution.toLowerCase()
  if (r.includes('3840') || r.includes('2160')) return '4K'
  if (r.includes('1280') && r.includes('720')) return '720p'
  return '1080p'
}

/** Save rendered video to the user's Downloads folder (same-origin blob; reliable for WebM). */
function probeVideoDurationFromUrl(blobUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.playsInline = true
    const cleanup = () => {
      v.removeAttribute('src')
      v.load()
    }
    v.onloadedmetadata = () => {
      const d = v.duration
      cleanup()
      if (Number.isFinite(d) && d > 0) resolve(d)
      else reject(new Error('Could not read duration from video file'))
    }
    v.onerror = () => {
      cleanup()
      reject(new Error('Could not open video file (unsupported or corrupt)'))
    }
    v.src = blobUrl
  })
}

function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ============================================================================
// Types
// ============================================================================

interface ProjectSceneData {
  sceneId: string
  sceneNumber: number
  heading?: string
  segments: Array<{
    segmentId: string
    assetUrl?: string | null
    assetType?: 'video' | 'image'
    startTime: number
    endTime: number
  }>
  productionStreams?: Array<{
    id: string
    language: string
    mp4Url?: string | null
    streamType: 'animatic' | 'video'
    duration?: number
  }>
}

// ============================================================================
// Demo Mode Data
// ============================================================================

const createDemoStream = (): FinalCutStream => {
  const demoScenes: StreamScene[] = Array.from({ length: 10 }, (_, i) => {
    const sceneNumber = i + 1
    const startTime = i * 30 // Each scene is 30 seconds
    const segments: StreamSegment[] = [
      {
        id: `demo-segment-${sceneNumber}-1`,
        sceneId: `demo-scene-${sceneNumber}`,
        sequenceIndex: 0,
        sourceSegmentId: `src-segment-${sceneNumber}-1`,
        assetUrl: '',
        assetType: 'image',
        startTime: 0,
        endTime: 15,
        durationMs: 15000,
        overlays: [],
        audioTracks: []
      },
      {
        id: `demo-segment-${sceneNumber}-2`,
        sceneId: `demo-scene-${sceneNumber}`,
        sequenceIndex: 1,
        sourceSegmentId: `src-segment-${sceneNumber}-2`,
        assetUrl: '',
        assetType: 'image',
        startTime: 15,
        endTime: 30,
        durationMs: 15000,
        overlays: [],
        audioTracks: []
      }
    ]

    return {
      id: `stream-scene-${sceneNumber}`,
      streamId: 'demo-stream',
      sceneNumber,
      sourceSceneId: `demo-scene-${sceneNumber}`,
      segments,
      startTime,
      endTime: startTime + 30,
      durationMs: 30000,
      heading: getDemoSceneHeading(sceneNumber),
      visualDescription: getDemoSceneDescription(sceneNumber)
    }
  })

  return {
    id: 'demo-stream',
    projectId: 'demo-project',
    language: 'en',
    format: 'full-video',
    name: 'Demo Stream (10 Scenes)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes: demoScenes,
    status: 'draft',
    settings: {
      resolution: '1080p',
      frameRate: 24,
      aspectRatio: '16:9',
      audioMixProfile: 'cinematic',
      masterVolume: 100,
      colorGrade: 'natural',
      upscalingEnabled: false,
      upscalingProvider: 'none',
      watermarkEnabled: false,
      watermarkPosition: 'bottom-right'
    },
    exports: []
  }
}

const getDemoSceneHeading = (sceneNumber: number): string => {
  const headings = [
    'INT. COFFEE SHOP - DAY',
    'EXT. CITY STREET - DAY',
    'INT. OFFICE BUILDING - DAY',
    'EXT. PARK - AFTERNOON',
    'INT. APARTMENT - EVENING',
    'EXT. ROOFTOP - SUNSET',
    'INT. RESTAURANT - NIGHT',
    'EXT. ALLEYWAY - NIGHT',
    'INT. CAR (MOVING) - NIGHT',
    'EXT. BEACH - DAWN'
  ]
  return headings[sceneNumber - 1] || `SCENE ${sceneNumber}`
}

const getDemoSceneDescription = (sceneNumber: number): string => {
  const descriptions = [
    'Two characters meet for the first time over coffee, tension builds.',
    'The protagonist walks through a bustling city, lost in thought.',
    'A crucial meeting takes place with unexpected revelations.',
    'A moment of reflection as characters discuss their next move.',
    'Quiet evening scene, character prepares for what\'s to come.',
    'Dramatic confrontation with stunning sunset backdrop.',
    'Celebratory dinner turns into heated argument.',
    'Chase sequence through dark alleys, high stakes.',
    'Intense conversation as characters race against time.',
    'Resolution and new beginning as sun rises over the ocean.'
  ]
  return descriptions[sceneNumber - 1] || `Scene ${sceneNumber} visual description.`
}

// ============================================================================
// FinalCutPage Component
// ============================================================================

export default function FinalCutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentProject = useStore((s) => s.currentProject)
  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const updateProject = useStore((s) => s.updateProject)
  
  // Check for demo mode
  const isDemo = searchParams.get('demo') === 'true'
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [streams, setStreams] = useState<FinalCutStream[]>([])
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [streamsExpanded, setStreamsExpanded] = useState(true)
  const [mixerExpanded, setMixerExpanded] = useState(true)
  const [mobilePane, setMobilePane] = useState<'library' | 'edit'>('edit')

  const searchProjectIdRaw = searchParams.get('projectId')
  const searchProjectId =
    searchProjectIdRaw && searchProjectIdRaw.trim() !== '' ? searchProjectIdRaw.trim() : undefined

  // URL wins; else global store (Production often keeps project only in local state until we fetch here)
  const projectId =
    searchProjectId || currentProject?.id || (isDemo ? 'demo-project' : undefined)

  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_SECTION_STREAMS)
      if (s !== null) setStreamsExpanded(s === 'true')
      const m = localStorage.getItem(LS_SECTION_MIXER)
      if (m !== null) setMixerExpanded(m === 'true')
      const pane = localStorage.getItem(LS_MOBILE_PANE)
      if (pane === 'library' || pane === 'edit') setMobilePane(pane)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_SECTION_STREAMS, String(streamsExpanded))
      localStorage.setItem(LS_SECTION_MIXER, String(mixerExpanded))
      localStorage.setItem(LS_MOBILE_PANE, mobilePane)
    } catch {
      /* ignore */
    }
  }, [streamsExpanded, mixerExpanded, mobilePane])

  const productionVisionHref = projectId
    ? `/dashboard/workflow/vision/${projectId}${isDemo ? '?demo=true' : ''}`
    : undefined
  
  // ============================================================================
  // Create default stream from project data
  // ============================================================================
  
  const createDefaultStream = useCallback((project: any): FinalCutStream | null => {
    // Get scenes from project
    const scenes = project?.metadata?.visionPhase?.script?.script?.scenes ||
                   project?.script?.scenes ||
                   []
    
    if (scenes.length === 0) {
      return null
    }
    
    // Get production data for each scene
    const sceneProductionState = getSceneProductionStateFromMetadata(project?.metadata)
    
    // Build stream scenes
    let currentTime = 0
    const streamScenes: StreamScene[] = scenes.map((scene: any, index: number) => {
      const sceneId = scene.id || scene.sceneId || `scene-${index}`
      const productionData = sceneProductionState[sceneId]
      
      // Get segments from production data
      const segments: StreamSegment[] = (productionData?.segments || []).map((seg: any, segIndex: number) => ({
        id: seg.segmentId || `segment-${sceneId}-${segIndex}`,
        sceneId,
        sequenceIndex: segIndex,
        sourceSegmentId: seg.segmentId,
        assetUrl: seg.activeAssetUrl || seg.references?.startFrameUrl || '',
        assetType: seg.assetType || 'image',
        startTime: seg.startTime || 0,
        endTime: seg.endTime || 5,
        durationMs: ((seg.endTime || 5) - (seg.startTime || 0)) * 1000,
        overlays: [],
        audioTracks: []
      }))
      
      // Calculate scene duration
      const sceneDuration = segments.length > 0
        ? segments.reduce((max, seg) => Math.max(max, seg.endTime), 0)
        : 30 // Default 30 seconds if no segments
      
      const streamScene: StreamScene = {
        id: `stream-scene-${sceneId}`,
        streamId: 'default-stream',
        sceneNumber: scene.sceneNumber || index + 1,
        sourceSceneId: sceneId,
        segments,
        startTime: currentTime,
        endTime: currentTime + sceneDuration,
        durationMs: sceneDuration * 1000,
        heading: typeof scene.heading === 'string' ? scene.heading : scene.heading?.text,
        visualDescription: scene.visualDescription
      }
      
      currentTime += sceneDuration
      
      return streamScene
    })
    
    return {
      id: 'default-stream',
      projectId: project.id,
      language: 'en',
      format: 'full-video',
      name: 'English (Video)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      scenes: streamScenes,
      settings: {
        resolution: '1080p',
        frameRate: 24,
        aspectRatio: '16:9',
        audioMixProfile: 'cinematic',
        masterVolume: 100,
        colorGrade: 'natural',
        upscalingEnabled: false,
        upscalingProvider: 'none',
        watermarkEnabled: false,
        watermarkPosition: 'bottom-right'
      },
      exports: []
    }
  }, [])

  // ============================================================================
  // Initialize from project data (after createDefaultStream — avoids TDZ on deps)
  // ============================================================================

  useEffect(() => {
    if (isDemo) {
      const demoStream = createDemoStream()
      setStreams([demoStream])
      setSelectedStreamId(demoStream.id)
      setIsLoading(false)
      return
    }

    const targetId = searchProjectId || useStore.getState().currentProject?.id
    if (!targetId) {
      setIsLoading(false)
      router.replace('/dashboard')
      return
    }

    let cancelled = false

    ;(async () => {
      let project = useStore.getState().currentProject
      if (project?.id !== targetId) {
        setIsLoading(true)
        try {
          const res = await fetch(`/api/projects/${targetId}`, { cache: 'no-store' })
          if (!res.ok) {
            const detail = await res.text().catch(() => res.statusText)
            throw new Error(detail || `HTTP ${res.status}`)
          }
          const data = await res.json()
          project = data.project ?? data
          if (cancelled) return
          setCurrentProject(project)
        } catch (err) {
          if (!cancelled) {
            console.error('[FinalCut] Failed to load project:', err)
            toast.error('Could not open Final Cut. Return to Production and try again.')
            router.replace('/dashboard')
            setIsLoading(false)
          }
          return
        }
      }

      if (cancelled || !project) return

      setIsLoading(true)
      try {
        const existingStreams = (project.metadata as any)?.finalCutStreams as FinalCutStream[] | undefined

        if (existingStreams && existingStreams.length > 0) {
          setStreams(existingStreams)
          setSelectedStreamId(existingStreams[0].id)
        } else {
          const defaultStream = createDefaultStream(project)
          if (defaultStream) {
            setStreams([defaultStream])
            setSelectedStreamId(defaultStream.id)
          } else {
            setStreams([])
            setSelectedStreamId(null)
            toast.error('No scenes found for this project. Complete script and Production first.')
          }
        }
      } catch (error) {
        console.error('Failed to initialize Final Cut:', error)
        toast.error('Failed to load project data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isDemo, searchProjectId, router, setCurrentProject, createDefaultStream])
  
  // ============================================================================
  // Stream Management
  // ============================================================================
  
  const handleStreamSelect = useCallback((streamId: string) => {
    setSelectedStreamId(streamId)
  }, [])
  
  const handleCreateStream = useCallback(async (
    language: ProductionLanguage, 
    format: ProductionFormat
  ) => {
    if (!currentProject) return
    
    const existingStream = streams.find(
      s => s.language === language && s.format === format
    )
    
    if (existingStream) {
      toast.error(`A ${language} ${format} stream already exists`)
      return
    }
    
    // Clone scenes from first stream (or create default)
    const baseStream = streams[0] || createDefaultStream(currentProject)
    if (!baseStream) {
      toast.error('No scenes available to create stream')
      return
    }
    
    const newStreamId = `stream-${language}-${format}-${Date.now()}`
    const newStream: FinalCutStream = {
      ...baseStream,
      id: newStreamId,
      language,
      format,
      name: `${getLanguageName(language)} (${format === 'full-video' ? 'Video' : 'Animatic'})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      scenes: baseStream.scenes.map(scene => ({
        ...scene,
        id: `stream-scene-${scene.sourceSceneId}-${newStreamId}`,
        streamId: newStreamId
      })),
      exports: []
    }
    
    setStreams(prev => [...prev, newStream])
    setSelectedStreamId(newStreamId)
    toast.success(`Created ${newStream.name} stream`)
  }, [streams, currentProject, createDefaultStream])
  
  // ============================================================================
  // Scene & Transition Updates
  // ============================================================================
  
  const handleSceneReorder = useCallback((sceneIds: string[]) => {
    setStreams(prev => prev.map(stream => {
      if (stream.id !== selectedStreamId) return stream
      
      // Reorder scenes based on new order
      const reorderedScenes = sceneIds.map(id => 
        stream.scenes.find(s => s.id === id)
      ).filter(Boolean) as StreamScene[]
      
      // Recalculate timing
      let currentTime = 0
      const updatedScenes = reorderedScenes.map(scene => {
        const duration = scene.durationMs / 1000
        const updated = {
          ...scene,
          startTime: currentTime,
          endTime: currentTime + duration
        }
        currentTime += duration
        return updated
      })
      
      return {
        ...stream,
        scenes: updatedScenes,
        updatedAt: new Date().toISOString()
      }
    }))
  }, [selectedStreamId])
  
  const handleTransitionUpdate = useCallback((sceneId: string, transition: TransitionEffect) => {
    setStreams(prev => prev.map(stream => {
      if (stream.id !== selectedStreamId) return stream
      
      return {
        ...stream,
        scenes: stream.scenes.map(scene =>
          scene.id === sceneId ? { ...scene, transition } : scene
        ),
        updatedAt: new Date().toISOString()
      }
    }))
    
    toast.success('Transition updated')
  }, [selectedStreamId])
  
  const handleOverlayUpdate = useCallback((segmentId: string, overlays: Overlay[]) => {
    setStreams(prev => prev.map(stream => {
      if (stream.id !== selectedStreamId) return stream
      
      return {
        ...stream,
        scenes: stream.scenes.map(scene => ({
          ...scene,
          segments: scene.segments.map(segment =>
            segment.id === segmentId ? { ...segment, overlays } : segment
          )
        })),
        updatedAt: new Date().toISOString()
      }
    }))
    
    toast.success('Overlays updated')
  }, [selectedStreamId])

  const handleStreamSettingsChange = useCallback(
    (updates: Partial<StreamSettings>) => {
      if (!selectedStreamId) return
      setStreams((prev) =>
        prev.map((stream) =>
          stream.id === selectedStreamId
            ? {
                ...stream,
                settings: { ...stream.settings, ...updates },
                updatedAt: new Date().toISOString(),
              }
            : stream
        )
      )
    },
    [selectedStreamId]
  )
  
  // ============================================================================
  // Save & Export
  // ============================================================================
  
  const handleSave = useCallback(async () => {
    if (!currentProject) return
    
    setIsSaving(true)
    try {
      // Save streams to project metadata
      await updateProject(currentProject.id, {
        ...currentProject,
        metadata: {
          ...currentProject.metadata,
          finalCutStreams: streams
        } as any
      })
      
      toast.success('Final Cut saved')
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save Final Cut')
    } finally {
      setIsSaving(false)
    }
  }, [currentProject, streams, updateProject])
  
  const handleExport = useCallback(async (streamId: string, settings: any) => {
    setExportDialogOpen(true)
  }, [])
  
  const handleExportWithSettings = useCallback(async (settings: ExportSettings) => {
    if (!currentProject) return
    const selectedStream = streams.find(s => s.id === selectedStreamId)
    if (!selectedStream) return
    
    setExportDialogOpen(false)
    const toastId = toast.loading(
      settings.localSceneFiles?.length
        ? `Stitching ${settings.localSceneFiles.length} local videos (${settings.resolution} @ ${settings.frameRate}fps)…`
        : `Starting Final Cut export (${settings.resolution} @ ${settings.frameRate}fps)...`
    )

    const blobUrlsToRevoke: string[] = []

    try {
      const { LocalRenderService } = await import('@/lib/video/LocalRenderService')
      const { upload } = await import('@vercel/blob/client')
      
      const timelineTotalDuration = selectedStream.scenes.reduce(
        (max, scene) => Math.max(max, scene.endTime),
        0
      )

      const configSegments: LocalRenderConfig['segments'] = []
      const configAudioClips: LocalRenderConfig['audioClips'] = []
      const configTextOverlays: NonNullable<LocalRenderConfig['textOverlays']> = []

      const liveProject = useStore.getState().currentProject
      const projectForExport =
        liveProject?.id === currentProject.id ? liveProject : currentProject
      const sceneProductionState = getSceneProductionStateFromMetadata(projectForExport.metadata)

      const manualFiles = settings.localSceneFiles
      let totalDuration = timelineTotalDuration
      const masterGain =
        Math.max(0, Math.min(100, selectedStream.settings?.masterVolume ?? 100)) / 100

      if (manualFiles && manualFiles.length > 0) {
        const sceneCount = selectedStream.scenes.length
        if (manualFiles.length !== sceneCount) {
          throw new Error(
            `Local stitch needs exactly ${sceneCount} videos (one per scene in timeline order). You selected ${manualFiles.length}.`
          )
        }
        let compositionT = 0
        for (let i = 0; i < manualFiles.length; i++) {
          const file = manualFiles[i]
          const blobUrl = URL.createObjectURL(file)
          blobUrlsToRevoke.push(blobUrl)
          const durationSec = await probeVideoDurationFromUrl(blobUrl)
          configSegments.push({
            segmentId: `manual-scene-${i}-${file.name.replace(/\W+/g, '_').slice(0, 40)}`,
            assetUrl: blobUrl,
            assetType: 'video',
            startTime: compositionT,
            duration: durationSec,
            includeVideoAudio: true,
            volume: masterGain,
          })
          compositionT += durationSec
        }
        totalDuration = compositionT
      } else {
        // Map Final Cut timeline into LocalRenderService config
        for (const scene of selectedStream.scenes) {
          for (const seg of scene.segments) {
            const media = resolveStreamSegmentMediaForExport(seg, scene.sourceSceneId, sceneProductionState)
            if (!media) continue

            const segmentStartSec = scene.startTime + seg.startTime

            configSegments.push({
              segmentId: seg.id,
              assetUrl: media.assetUrl,
              assetType: media.assetType,
              startTime: segmentStartSec,
              duration: seg.durationMs / 1000,
              includeVideoAudio: true,
              volume: masterGain,
            })

            if (seg.audioTracks) {
              for (const track of seg.audioTracks) {
                if (!track.sourceUrl) continue
                configAudioClips.push({
                  url: track.sourceUrl,
                  startTime: segmentStartSec + track.startOffset / 1000,
                  duration: track.duration / 1000,
                  volume: ((track.volume ?? 100) / 100) * masterGain,
                  type: track.type,
                })
              }
            }

            if (seg.overlays) {
              for (const overlay of seg.overlays) {
                if (overlay.type === 'text') {
                  configTextOverlays.push({
                    id: overlay.id,
                    text: overlay.content,
                    position: { x: overlay.position.x, y: overlay.position.y, anchor: 'center' },
                    style: {
                      fontFamily: overlay.style.fontFamily || 'Inter',
                      fontSize: overlay.style.fontSize || 36,
                      fontWeight: 700,
                      color: overlay.style.color || '#ffffff',
                      textShadow: true,
                    },
                    timing: {
                      startTime: segmentStartSec + overlay.startTime / 1000,
                      duration: overlay.duration / 1000,
                      fadeInMs: 200,
                      fadeOutMs: 200,
                    },
                  })
                }
              }
            }
          }
        }

        if (configSegments.length === 0) {
          throw new Error(
            'No segment video or image URLs were found. Use “Stitch local scene videos” in Export, or fix Production links and save.'
          )
        }
      }
      
      const config: LocalRenderConfig = {
        segments: configSegments,
        audioClips: configAudioClips,
        textOverlays: configTextOverlays,
        resolution: mapExportResolutionStringToLocal(settings.resolution),
        fps: settings.frameRate || 30,
        totalDuration,
        exportFormat: settings.containerFormat,
        // Probed blob durations are authoritative; avoids HTMLVideoElement.duration inflation (slow/frozen picture vs normal audio).
        trustSegmentDurations: !!(manualFiles && manualFiles.length > 0),
      }
      
      const renderService = new LocalRenderService()
      
      const result = await renderService.render(config, (progress: any) => {
        if (progress.phase === 'rendering' || progress.phase === 'encoding') {
          toast.loading(`Rendering Final Cut: ${Math.round(progress.progress)}%`, { id: toastId })
        }
      })
      
      if (!result.success || !result.blobUrl || !result.blob) {
        throw new Error(result.error || 'Unknown render error')
      }

      const ext =
        result.containerUsed === 'mp4' || (result.mimeType && result.mimeType.includes('mp4'))
          ? 'mp4'
          : 'webm'
      const filename = `final-cut-${currentProject.id}-${selectedStreamId}-${Date.now()}.${ext}`

      // Save to Downloads immediately so YouTube upload is obvious (upload below is a backup URL)
      downloadBlobAsFile(result.blob, filename)
      
      toast.loading('Render complete! Uploading a copy for Screening Room…', { id: toastId })
      
      // Upload to Blob storage
      const videoFile = new File([result.blob], filename, { type: result.mimeType || 'video/webm' })
      
      const uploadedBlob = await upload(
        `renders/${filename}`,
        videoFile,
        {
          access: 'public',
          handleUploadUrl: '/api/segments/upload-video-url',
        }
      )
      
      // Revoke local object URL to free memory
      LocalRenderService.revokeBlobUrl(result.blobUrl)
      
      // Update Project Metadata
      const updatedMetadata = {
        ...currentProject.metadata,
        exportedVideoUrl: uploadedBlob.url
      }
      
      await updateProject(currentProject.id, {
        ...currentProject,
        metadata: updatedMetadata
      })

      const webmFallbackNote =
        settings.containerFormat === 'mp4' && result.containerUsed === 'webm'
          ? ' Your browser encoded WebM instead of MP4; the file still works in YouTube and most editors.'
          : ''

      toast.success(
        `Saved to Downloads as ${filename}.${webmFallbackNote} Use "Download last export" in the header if you need the link again.`,
        {
          id: toastId,
          duration: 14000,
          action: {
            label: 'Open file link',
            onClick: () => window.open(uploadedBlob.url, '_blank', 'noopener,noreferrer'),
          },
        }
      )
      
    } catch (error) {
      console.error('Final Cut Export Error:', error)
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId, duration: 8000 })
    } finally {
      for (const u of blobUrlsToRevoke) {
        try {
          URL.revokeObjectURL(u)
        } catch {
          /* ignore */
        }
      }
    }
  }, [currentProject, streams, selectedStreamId, updateProject])
  
  // ============================================================================
  // Calculate total duration
  // ============================================================================
  
  const totalDuration = useMemo(() => {
    const selectedStream = streams.find(s => s.id === selectedStreamId)
    if (!selectedStream || selectedStream.scenes.length === 0) return 60 // Default
    
    return selectedStream.scenes.reduce((max, scene) => 
      Math.max(max, scene.endTime), 
      0
    )
  }, [streams, selectedStreamId])

  const sceneProductionState = useMemo(
    () => getSceneProductionStateFromMetadata(currentProject?.metadata),
    [currentProject?.metadata]
  )

  const lastExportUrl = (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)
    ?.exportedVideoUrl

  const finalCutScreenings = useMemo(() => {
    if (!projectId) return []

    const items: Array<{
      id: string
      title: string
      streamId?: string
      videoUrl?: string
      createdAt: string
      status: 'draft' | 'active' | 'completed' | 'expired'
      viewerCount: number
      averageCompletion: number
    }> = []

    const exported = (
      (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl || ''
    ).trim()
    if (exported) {
      items.push({
        id: `project-export-${projectId}`,
        title: 'Latest project export',
        videoUrl: exported,
        createdAt: new Date().toISOString(),
        status: 'draft',
        viewerCount: 0,
        averageCompletion: 0,
      })
    }

    for (const stream of streams) {
      for (const ex of stream.exports ?? []) {
        const url = (ex.outputUrl || '').trim()
        if (!url) continue
        const done = ex.status === 'complete'
        items.push({
          id: ex.id,
          title: `Export · ${stream.name}`,
          streamId: stream.id,
          videoUrl: url,
          createdAt: ex.completedAt || ex.createdAt,
          status: done ? 'active' : 'draft',
          viewerCount: 0,
          averageCompletion: 0,
        })
      }
    }

    return items
  }, [projectId, currentProject?.metadata, streams])
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(139, 92, 246, 0.2), transparent 50%)',
          }}
        />
        <div className="text-center text-zinc-100 relative">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm font-medium">Loading Final Cut…</p>
        </div>
      </div>
    )
  }
  
  if (!currentProject && !isDemo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center text-zinc-100 max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-400/90 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No project selected</h2>
          <p className="text-zinc-500 mb-4 text-sm">Choose a project from the dashboard.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Ambient studio backdrop (overview-video polish) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 15% -10%, rgba(139, 92, 246, 0.22), transparent 52%),
            radial-gradient(ellipse 90% 70% at 92% 8%, rgba(217, 70, 239, 0.12), transparent 48%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(59, 130, 246, 0.08), transparent 55%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-size:24px_24px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]"
        aria-hidden
      />
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2.5">
          <div className="flex items-center justify-center gap-2 text-amber-200/95 text-sm">
            <Film className="w-4 h-4 shrink-0" />
            <span className="font-medium">Demo mode</span>
            <span className="text-amber-200/60 hidden sm:inline">10-scene sample · nothing is saved</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/65 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href={isDemo ? '/dashboard' : `/dashboard/workflow/vision/${projectId}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800/80 -ml-1"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{isDemo ? 'Exit demo' : 'Production'}</span>
            </Button>
          </Link>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 ring-1 ring-violet-500/25">
              <Film className="w-5 h-5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white truncate">
                {isDemo ? 'Demo project' : currentProject?.title ?? 'Project'}
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                Final Cut · assembly workspace
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {!isDemo && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800/80"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Save</span>
              </Button>

              {lastExportUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/35 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300"
                  asChild
                >
                  <a href={lastExportUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Last export</span>
                  </a>
                </Button>
              ) : null}

              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 hidden md:inline-flex">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 hidden md:inline-flex">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>

              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-950/40"
                onClick={() => setExportDialogOpen(true)}
              >
                <Download className="w-4 h-4 sm:mr-2" />
                Export
              </Button>

              <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
            </>
          )}

          <Link href={`/dashboard/workflow/premiere?projectId=${projectId}${isDemo ? '&demo=true' : ''}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600 bg-zinc-900/50 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500"
            >
              <span className="hidden sm:inline">Premiere</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>
      
      {/* Export Dialog */}
      {(() => {
        const selectedStream = streams.find(s => s.id === selectedStreamId)
        const prodMeta = getSceneProductionStateFromMetadata(currentProject?.metadata)
        let hasExportableMedia = false
        let hasVideoClipSegments = false
        for (const s of selectedStream?.scenes ?? []) {
          for (const seg of s.segments ?? []) {
            const m = resolveStreamSegmentMediaForExport(seg, s.sourceSceneId, prodMeta)
            if (m) {
              hasExportableMedia = true
              if (m.assetType === 'video') hasVideoClipSegments = true
            }
          }
        }
        return (
          <ExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            streamName={selectedStream?.name || 'Untitled Stream'}
            streamLanguage={getLanguageName(selectedStream?.language || 'en')}
            totalDuration={totalDuration}
            sceneCount={selectedStream?.scenes?.length || 0}
            onExport={handleExportWithSettings}
            hasExportableMedia={hasExportableMedia}
            hasVideoClipSegments={hasVideoClipSegments}
          />
        )
      })()}

      {/* Library column + editor workspace (iMovie-style); Screenings live under Share in the library */}
      <main className="relative flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 px-4 sm:px-5 py-4 overflow-hidden border-t border-white/[0.06]">
        {/* Workspace hero title (distinct from compact sticky header) */}
        <div className="shrink-0 relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-violet-950/50 via-zinc-950/70 to-fuchsia-950/25 px-5 py-4 sm:px-7 sm:py-5 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_24px_80px_-32px_rgba(139,92,246,0.35)] backdrop-blur-md">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl motion-reduce:opacity-40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl motion-reduce:opacity-40"
            aria-hidden
          />
          <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/90">
                SceneFlow Studio
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white [text-shadow:0_2px_28px_rgba(139,92,246,0.35)]">
                Final Cut
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400 max-w-xl leading-relaxed">
                Assembly · mix · export — precision timeline for your overview and delivery.
              </p>
            </div>
            {isDemo ? (
              <p className="text-xs text-zinc-500 shrink-0 sm:text-right max-w-[200px] sm:max-w-xs truncate">
                Demo reel · sample timeline
              </p>
            ) : currentProject?.title ? (
              <p className="text-xs text-zinc-500 tabular-nums shrink-0 sm:text-right max-w-[200px] sm:max-w-xs truncate">
                {currentProject.title}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="flex lg:hidden shrink-0 rounded-xl border border-white/[0.1] bg-zinc-950/50 backdrop-blur-md p-1 gap-1 shadow-lg shadow-black/20"
          role="tablist"
          aria-label="Final Cut layout"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'library'}
            onClick={() => setMobilePane('library')}
            className={cn(
              'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
              mobilePane === 'library'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
            )}
          >
            Library
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'edit'}
            onClick={() => setMobilePane('edit')}
            className={cn(
              'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
              mobilePane === 'edit'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
            )}
          >
            Edit
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-3 sm:gap-4 min-h-[min(55vh,480px)]">
          <section
            className={cn(
              'min-h-0 flex flex-col overflow-hidden',
              mobilePane === 'edit' && 'hidden lg:flex'
            )}
          >
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-white/[0.08] bg-zinc-950/50 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/30 ring-1 ring-white/[0.04]">
              <ProductionSectionHeader
                icon={Film}
                title="Project media"
                titleClassName="font-semibold tracking-tight"
                badge={streams.length > 0 ? streams.length : undefined}
                collapsible
                expanded={streamsExpanded}
                onToggle={() => setStreamsExpanded((e) => !e)}
                className="bg-zinc-950/70 border-b border-white/[0.06] shrink-0"
              />
              {streamsExpanded ? (
                <FinalCutMediaBrowser
                  className="flex-1 min-h-0 rounded-none border-0 shadow-none bg-zinc-950/30"
                  streams={streams}
                  selectedStreamId={selectedStreamId}
                  onSelectStream={handleStreamSelect}
                  onCreateStream={handleCreateStream}
                  disabled={isDemo || isSaving || (!isDemo && !currentProject)}
                  productionHref={productionVisionHref}
                  showProductionLink={!!productionVisionHref}
                  projectId={projectId}
                  projectName={isDemo ? 'Demo project' : currentProject?.title}
                  finalCutScreenings={finalCutScreenings}
                  screeningCredits={100}
                  onCreateScreening={() => {
                    toast.message('Screenings', {
                      description:
                        'Screening creation will connect to the Premiere workflow in a future update.',
                    })
                  }}
                  onUploadExternal={async (_file: File) => {
                    toast.message('Upload', {
                      description: 'External screening upload is not wired yet.',
                    })
                    throw new Error('Not implemented')
                  }}
                />
              ) : null}
            </div>
          </section>

          <section
            className={cn(
              'min-h-0 flex flex-col overflow-hidden min-h-[min(50vh,440px)]',
              mobilePane === 'library' && 'hidden lg:flex'
            )}
          >
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-violet-500/25 bg-zinc-950/55 backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_28px_100px_-36px_rgba(139,92,246,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <ProductionSectionHeader
                icon={Film}
                title="Final Cut Mixer"
                titleClassName="font-semibold tracking-tight"
                badge={
                  streams.find((s) => s.id === selectedStreamId)?.scenes.length ?? undefined
                }
                rightHint="Program monitor and assembly timeline"
                collapsible
                expanded={mixerExpanded}
                onToggle={() => setMixerExpanded((e) => !e)}
                className="bg-zinc-950/80 border-b border-violet-500/20 shrink-0"
              />
              {mixerExpanded ? (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <FinalCutTimeline
                    projectId={projectId || ''}
                    streams={streams}
                    selectedStreamId={selectedStreamId}
                    onSceneReorder={handleSceneReorder}
                    onTransitionUpdate={handleTransitionUpdate}
                    onOverlayUpdate={handleOverlayUpdate}
                    onExport={handleExport}
                    totalDuration={totalDuration}
                    isProcessing={isSaving}
                    sceneProductionState={sceneProductionState}
                    productionVisionHref={productionVisionHref}
                    onStreamSettingsChange={handleStreamSettingsChange}
                    hideMixerSectionHeader
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
