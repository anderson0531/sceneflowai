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
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FinalCutTimeline } from '@/components/final-cut/FinalCutTimeline'
import { ExportDialog, type ExportSettings } from '@/components/final-cut/ExportDialog'
import type {
  FinalCutStream,
  StreamScene,
  StreamSegment,
  TransitionEffect,
  Overlay,
  ProductionLanguage,
  ProductionFormat
} from '@/lib/types/finalCut'
import { getLanguageName } from '@/constants/languages'

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
  
  const searchProjectIdRaw = searchParams.get('projectId')
  const searchProjectId =
    searchProjectIdRaw && searchProjectIdRaw.trim() !== '' ? searchProjectIdRaw.trim() : undefined

  // URL wins; else global store (Production often keeps project only in local state until we fetch here)
  const projectId =
    searchProjectId || currentProject?.id || (isDemo ? 'demo-project' : undefined)
  
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
    const sceneProductionState = project?.metadata?.sceneProductionState || {}
    
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
    const toastId = toast.loading(`Starting Final Cut export (${settings.resolution} @ ${settings.frameRate}fps)...`)
    
    try {
      const { LocalRenderService } = await import('@/lib/video/LocalRenderService')
      const { upload } = await import('@vercel/blob/client')
      
      // Calculate total duration across all scenes
      const totalDuration = selectedStream.scenes.reduce((max, scene) => 
        Math.max(max, scene.endTime), 
        0
      )
      
      const configSegments: any[] = []
      const configAudioClips: any[] = []
      const configTextOverlays: any[] = []
      
      // Map Final Cut timeline into LocalRenderService config
      for (const scene of selectedStream.scenes) {
        for (const seg of scene.segments) {
          if (!seg.assetUrl) continue
          
          // 1. Video/Image segment
          configSegments.push({
            segmentId: seg.id,
            assetUrl: seg.assetUrl,
            assetType: seg.assetType,
            startTime: scene.startTime + (seg.startTime / 1000),
            duration: seg.durationMs / 1000,
            includeVideoAudio: true // Could be based on seg settings
          })
          
          // 2. Audio tracks for the segment
          if (seg.audioTracks) {
            for (const track of seg.audioTracks) {
              if (!track.sourceUrl) continue
              configAudioClips.push({
                url: track.sourceUrl,
                startTime: scene.startTime + (seg.startTime / 1000) + (track.startOffset / 1000),
                duration: track.duration / 1000,
                volume: (track.volume ?? 100) / 100,
                type: track.type
              })
            }
          }
          
          // 3. Overlays for the segment
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
                    textShadow: true
                  },
                  timing: {
                    startTime: scene.startTime + (seg.startTime / 1000) + (overlay.startTime / 1000),
                    duration: overlay.duration / 1000,
                    fadeInMs: 200,
                    fadeOutMs: 200
                  }
                })
              }
            }
          }
        }
      }
      
      const config = {
        segments: configSegments,
        audioClips: configAudioClips,
        textOverlays: configTextOverlays,
        resolution: settings.resolution.includes('4K') || settings.resolution.includes('1080') ? '1080p' : '720p',
        fps: settings.frameRate || 30,
        totalDuration,
      } as const
      
      const renderService = new LocalRenderService()
      
      const result = await renderService.render(config, (progress: any) => {
        if (progress.phase === 'rendering' || progress.phase === 'encoding') {
          toast.loading(`Rendering Final Cut: ${Math.round(progress.progress)}%`, { id: toastId })
        }
      })
      
      if (!result.success || !result.blobUrl || !result.blob) {
        throw new Error(result.error || 'Unknown render error')
      }
      
      toast.loading('Render complete! Uploading to secure cloud storage...', { id: toastId })
      
      // Upload to Blob storage
      const filename = `final-cut-${currentProject.id}-${selectedStreamId}-${Date.now()}.webm`
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
      
      toast.success('Final Cut exported successfully! Ready for Screening Room.', { 
        id: toastId,
        duration: 10000,
        action: {
          label: 'Open Screening Room',
          onClick: () => window.open(`/screening-room`, '_blank')
        }
      })
      
    } catch (error) {
      console.error('Final Cut Export Error:', error)
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId, duration: 8000 })
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
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-sf-primary mx-auto mb-4" />
          <p className="text-gray-400">Loading Final Cut...</p>
        </div>
      </div>
    )
  }
  
  if (!currentProject && !isDemo) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
          <p className="text-gray-400 mb-4">Please select a project from the dashboard.</p>
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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
            <Film className="w-4 h-4" />
            <span className="font-medium">Demo Mode</span>
            <span className="text-amber-400/70">- Viewing 10-scene test project. No data will be saved.</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          <Link href={isDemo ? '/dashboard' : `/dashboard/workflow/vision/${projectId}`}>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isDemo ? 'Exit Demo' : 'Back to Production'}
            </Button>
          </Link>
          
          <div className="h-6 w-px bg-gray-700" />
          
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Final Cut</h1>
              <p className="text-xs text-gray-500">{isDemo ? 'Demo Project' : currentProject?.title}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isDemo && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-gray-400 hover:text-white"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
          
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
          
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
          
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setExportDialogOpen(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
          
              <div className="h-6 w-px bg-gray-700" />
            </>
          )}
          
          <Link href={`/dashboard/workflow/premiere?projectId=${projectId}${isDemo ? '&demo=true' : ''}`}>
            <Button
              size="sm"
              className="bg-sf-primary hover:bg-sf-accent"
            >
              Continue to Premiere
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>
      
      {/* Export Dialog */}
      {(() => {
        const selectedStream = streams.find(s => s.id === selectedStreamId)
        const hasRenderedScenes = selectedStream?.scenes?.some(s =>
          s.segments?.some(seg => seg.assetUrl && seg.assetType === 'video')
        ) ?? false
        return (
          <ExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            streamName={selectedStream?.name || 'Untitled Stream'}
            streamLanguage={getLanguageName(selectedStream?.language || 'en')}
            totalDuration={totalDuration}
            sceneCount={selectedStream?.scenes?.length || 0}
            onExport={handleExportWithSettings}
            hasRenderedScenes={hasRenderedScenes}
          />
        )
      })()}

      {/* Main Content - Timeline */}
      <main className="flex-1">
        <FinalCutTimeline
          projectId={projectId || ''}
          streams={streams}
          selectedStreamId={selectedStreamId}
          onStreamSelect={handleStreamSelect}
          onCreateStream={handleCreateStream}
          onSceneReorder={handleSceneReorder}
          onTransitionUpdate={handleTransitionUpdate}
          onOverlayUpdate={handleOverlayUpdate}
          onExport={handleExport}
          totalDuration={totalDuration}
          isProcessing={isSaving}
        />
      </main>
    </div>
  )
}
