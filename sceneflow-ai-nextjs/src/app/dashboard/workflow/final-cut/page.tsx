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
import type {
  FinalCutStream,
  StreamScene,
  StreamSegment,
  TransitionEffect,
  Overlay,
  ProductionLanguage,
  ProductionFormat
} from '@/lib/types/finalCut'

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
    totalDurationMs: 300000, // 5 minutes
    transitions: [],
    status: 'draft',
    exportSettings: {
      resolution: '1080p',
      frameRate: 24,
      codec: 'h264'
    }
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
  const { currentProject, updateProject } = useStore()
  
  // Check for demo mode
  const isDemo = searchParams.get('demo') === 'true'
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [streams, setStreams] = useState<FinalCutStream[]>([])
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null)
  
  // Get project ID from URL or current project
  const projectId = searchParams.get('projectId') || currentProject?.id || (isDemo ? 'demo-project' : undefined)
  
  // ============================================================================
  // Initialize from project data
  // ============================================================================
  
  useEffect(() => {
    // Demo mode - load demo stream
    if (isDemo) {
      const demoStream = createDemoStream()
      setStreams([demoStream])
      setSelectedStreamId(demoStream.id)
      setIsLoading(false)
      return
    }
    
    // Normal mode - require currentProject
    if (!currentProject) {
      router.push('/dashboard')
      return
    }
    
    const initializeStreams = async () => {
      setIsLoading(true)
      
      try {
        // Check if project has existing Final Cut streams
        const existingStreams = currentProject.metadata?.finalCutStreams as FinalCutStream[] | undefined
        
        if (existingStreams && existingStreams.length > 0) {
          setStreams(existingStreams)
          setSelectedStreamId(existingStreams[0].id)
        } else {
          // Create default stream from scene production data
          const defaultStream = createDefaultStream(currentProject)
          if (defaultStream) {
            setStreams([defaultStream])
            setSelectedStreamId(defaultStream.id)
          }
        }
      } catch (error) {
        console.error('Failed to initialize Final Cut:', error)
        toast.error('Failed to load project data')
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeStreams()
  }, [currentProject, router, isDemo])
  
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
    const languageNames: Record<ProductionLanguage, string> = {
      en: 'English', th: 'Thai', ja: 'Japanese', ko: 'Korean',
      zh: 'Chinese', es: 'Spanish', fr: 'French', de: 'German',
      pt: 'Portuguese', hi: 'Hindi', ar: 'Arabic', ru: 'Russian'
    }
    
    const newStream: FinalCutStream = {
      ...baseStream,
      id: newStreamId,
      language,
      format,
      name: `${languageNames[language]} (${format === 'full-video' ? 'Video' : 'Animatic'})`,
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
      await updateProject({
        ...currentProject,
        metadata: {
          ...currentProject.metadata,
          finalCutStreams: streams
        }
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
    toast.info('Export feature coming soon!')
    // TODO: Implement export functionality
  }, [])
  
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
              <p className="text-xs text-gray-500">{currentProject.title}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <div className="h-6 w-px bg-gray-700" />
          
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
