'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SceneTimeline, AudioTracksData } from './SceneTimeline'
import { SegmentStudio, GenerationType } from './SegmentStudio'
import {
  SceneProductionData,
  SceneProductionReferences,
  SceneSegment,
} from './types'
import { Calculator, Sparkles, RefreshCw, Loader2, AlertCircle, Film } from 'lucide-react'
import { toast } from 'sonner'
import { GeneratingOverlay } from '@/components/ui/GeneratingOverlay'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SceneProductionManagerProps {
  sceneId: string
  sceneNumber: number
  heading?: string
  scene?: any // Add scene prop
  productionData?: SceneProductionData | null
  references: SceneProductionReferences
  onInitialize: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onGenerate: (sceneId: string, segmentId: string, mode: GenerationType, options?: { 
    startFrameUrl?: string
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
  }) => Promise<void>
  onUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  audioTracks?: AudioTracksData
  onGenerateSceneMp4?: () => void
  onAddSegment?: (sceneId: string, afterSegmentId: string | null, duration: number) => void
  onDeleteSegment?: (sceneId: string, segmentId: string) => void
  onAudioClipChange?: (sceneId: string, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
}

export function SceneProductionManager({
  sceneId,
  sceneNumber,
  heading,
  scene, // Destructure scene
  productionData,
  references,
  onInitialize,
  onPromptChange,
  onGenerate,
  onUpload,
  audioTracks: externalAudioTracks,
  onGenerateSceneMp4,
  onAddSegment,
  onDeleteSegment,
  onAudioClipChange,
}: SceneProductionManagerProps) {
  // Create stable callback wrappers - these must be defined early to avoid minification issues
  const handleAddSegmentWrapper = useCallback(
    (afterSegmentId: string | null, duration: number) => {
      if (onAddSegment) {
        onAddSegment(sceneId, afterSegmentId, duration)
      }
    },
    [sceneId, onAddSegment]
  )
  
  const handleDeleteSegmentWrapper = useCallback(
    (segmentId: string) => {
      if (onDeleteSegment) {
        onDeleteSegment(sceneId, segmentId)
      }
    },
    [sceneId, onDeleteSegment]
  )
  
  const handleAudioClipChangeWrapper = useCallback(
    (trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => {
      if (onAudioClipChange) {
        onAudioClipChange(sceneId, trackType, clipId, changes)
      }
    },
    [sceneId, onAudioClipChange]
  )
  
  const [targetDuration, setTargetDuration] = useState<number>(productionData?.targetSegmentDuration ?? 8)
  
  // Build audio tracks from scene data if not provided externally
  const [audioTracksState, setAudioTracksState] = useState<AudioTracksData>({})
  useEffect(() => {
    if (productionData?.targetSegmentDuration) {
      setTargetDuration(productionData.targetSegmentDuration)
    }
  }, [productionData?.targetSegmentDuration])

  // Build audio tracks from scene data when scene changes
  useEffect(() => {
    if (!scene) return
    
    const newTracks: AudioTracksData = {}
    const sceneDuration = productionData?.segments?.reduce((acc, seg) => Math.max(acc, seg.endTime), 10) || 10
    
    // Voiceover from scene narration - get duration from audio metadata
    const voUrl = scene.narrationAudioUrl || scene.narrationAudio?.en?.url || scene.descriptionAudioUrl || scene.descriptionAudio?.en?.url
    if (voUrl) {
      // Try to get stored duration from audio metadata (set during generation)
      const voDuration = scene.narrationAudio?.en?.duration 
        || scene.narrationDuration 
        || scene.descriptionAudio?.en?.duration
        || scene.descriptionDuration 
        || 0 // Will be calculated from actual audio file if 0
      newTracks.voiceover = {
        id: 'vo-scene',
        url: voUrl,
        startTime: 0,
        duration: voDuration,
        label: 'Narration',
        volume: 1,
      }
    }
    
    // Dialogue from scene - check multi-language structure (dialogueAudio.en) first, then legacy formats
    let dialogueArray: any[] = []
    if (scene.dialogueAudio) {
      if (scene.dialogueAudio.en && Array.isArray(scene.dialogueAudio.en)) {
        // Multi-language structure: dialogueAudio: { en: [...], es: [...] }
        dialogueArray = scene.dialogueAudio.en
      } else if (Array.isArray(scene.dialogueAudio)) {
        // Legacy structure: dialogueAudio: [...]
        dialogueArray = scene.dialogueAudio
      }
    } else if (scene.dialogue && Array.isArray(scene.dialogue)) {
      // Fallback to scene.dialogue with audioUrl property
      dialogueArray = scene.dialogue.filter((d: any) => d.audioUrl || d.url)
    }
    
    if (dialogueArray.length > 0) {
      const dialogueClips: AudioTracksData['dialogue'] = []
      let currentTime = 0
      dialogueArray.forEach((d: any, idx: number) => {
        const url = d.audioUrl || d.url
        if (url) {
          const dur = d.duration || 3
          dialogueClips.push({
            id: `dialogue-${idx}`,
            url,
            startTime: currentTime,
            duration: dur,
            label: d.character || d.speaker || d.characterName || `Line ${idx + 1}`,
            volume: 1,
          })
          currentTime += dur + 0.5 // Small gap between dialogue
        }
      })
      if (dialogueClips.length > 0) {
        newTracks.dialogue = dialogueClips
      }
    }
    
    // Music from scene
    const musicUrl = scene.musicAudio || scene.music?.url || scene.musicUrl
    if (musicUrl) {
      newTracks.music = {
        id: 'music-scene',
        url: musicUrl,
        startTime: 0,
        duration: scene.musicDuration || sceneDuration,
        label: scene.music?.name || 'Music',
        volume: 0.6,
      }
    }
    
    // SFX from scene
    if (Array.isArray(scene.sfxAudio) && scene.sfxAudio.length > 0) {
      const sfxClips: AudioTracksData['sfx'] = []
      scene.sfxAudio.forEach((sfxUrl: string, idx: number) => {
        if (sfxUrl) {
          const sfxDef = scene.sfx?.[idx]
          sfxClips.push({
            id: `sfx-${idx}`,
            url: sfxUrl,
            startTime: sfxDef?.startTime || idx * 2,
            duration: sfxDef?.duration || 2,
            label: sfxDef?.name || sfxDef?.description || `SFX ${idx + 1}`,
            volume: 0.8,
          })
        }
      })
      if (sfxClips.length > 0) {
        newTracks.sfx = sfxClips
      }
    }
    
    setAudioTracksState(newTracks)
  }, [scene, productionData?.segments])

  // Merge external audio tracks with scene-derived tracks
  const audioTracks = useMemo(() => {
    return {
      ...audioTracksState,
      ...externalAudioTracks,
    }
  }, [audioTracksState, externalAudioTracks])
  
  // Generate a key to force timeline refresh when audio changes
  const audioTracksKey = useMemo(() => {
    return JSON.stringify({
      vo: audioTracks.voiceover?.url,
      dialogue: audioTracks.dialogue?.map(d => d.url),
      music: audioTracks.music?.url,
      sfx: audioTracks.sfx?.map(s => s.url),
    })
  }, [audioTracks])

  const [isInitializing, setIsInitializing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentPlayingSegmentId, setCurrentPlayingSegmentId] = useState<string | null>(null)
  const segments = productionData?.segments ?? []
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(segments[0]?.segmentId ?? null)

  useEffect(() => {
    if (segments.length > 0) {
      if (!selectedSegmentId || !segments.some((segment) => segment.segmentId === selectedSegmentId)) {
        setSelectedSegmentId(segments[0].segmentId)
      }
    } else {
      setSelectedSegmentId(null)
    }
  }, [segments, selectedSegmentId])

  const selectedSegment: SceneSegment | null =
    segments.find((segment) => segment.segmentId === selectedSegmentId) ?? null

  const handleInitialize = async () => {
    setShowConfirmDialog(false)
    setIsInitializing(true)
    setGenerationProgress(10)
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 5, 85))
    }, 2000)
    
    try {
      await onInitialize(sceneId, { targetDuration })
      setGenerationProgress(100)
      toast.success('Segments generated successfully', {
        description: `Created intelligent video segments with cinematic prompts`
      })
    } catch (error) {
      console.error('[SceneProduction] Initialize failed', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate segments')
    } finally {
      clearInterval(progressInterval)
      setIsInitializing(false)
      setGenerationProgress(0)
    }
  }

  const handlePromptChange = (prompt: string) => {
    if (!selectedSegment) return
    onPromptChange(sceneId, selectedSegment.segmentId, prompt)
  }

  const handleGenerate = async (mode: GenerationType, options?: { 
    startFrameUrl?: string
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
  }) => {
    if (!selectedSegment) return
    await onGenerate(sceneId, selectedSegment.segmentId, mode, options)
  }

  // Get previous segment's last frame for continuity
  const previousSegmentLastFrame = useMemo(() => {
    if (!selectedSegment || segments.length === 0) return null
    const currentIndex = segments.findIndex(s => s.segmentId === selectedSegment.segmentId)
    if (currentIndex <= 0) return null
    const previousSegment = segments[currentIndex - 1]
    return previousSegment.references.endFrameUrl || null
  }, [selectedSegment, segments])

  const handleUpload = async (file: File) => {
    if (!selectedSegment) return
    await onUpload(sceneId, selectedSegment.segmentId, file)
  }

  // Handle playhead changes from timeline
  const handlePlayheadChange = useCallback((time: number, segmentId?: string) => {
    if (segmentId) {
      setCurrentPlayingSegmentId(segmentId)
    }
  }, [])

  // Build available audio assets from scene data
  const availableAudioAssets = useMemo(() => {
    const assets: Array<{
      id: string
      label: string
      url: string
      type: 'voiceover' | 'dialogue' | 'music' | 'sfx'
      duration?: number
      source: 'scene' | 'take' | 'library'
    }> = []
    
    // Add scene-level audio if available
    if (scene?.narrationAudioUrl || scene?.narrationAudio?.en?.url) {
      assets.push({
        id: 'scene-narration',
        label: 'Scene Narration',
        url: scene.narrationAudioUrl || scene.narrationAudio?.en?.url,
        type: 'voiceover',
        source: 'scene',
      })
    }
    
    if (scene?.descriptionAudioUrl || scene?.descriptionAudio?.en?.url) {
      assets.push({
        id: 'scene-description',
        label: 'Scene Description',
        url: scene.descriptionAudioUrl || scene.descriptionAudio?.en?.url,
        type: 'voiceover',
        source: 'scene',
      })
    }
    
    // Add dialogue from scene
    const dialogueArray = scene?.dialogueAudio || scene?.dialogue || []
    if (Array.isArray(dialogueArray)) {
      dialogueArray.forEach((d: any, idx: number) => {
        const url = d.audioUrl || d.url
        if (url) {
          assets.push({
            id: `scene-dialogue-${idx}`,
            label: d.character || d.speaker || `Dialogue ${idx + 1}`,
            url,
            type: 'dialogue',
            duration: d.duration,
            source: 'scene',
          })
        }
      })
    }
    
    // Add music from scene
    if (scene?.musicAudio || scene?.music?.url) {
      assets.push({
        id: 'scene-music',
        label: 'Scene Music',
        url: scene.musicAudio || scene.music?.url,
        type: 'music',
        source: 'scene',
      })
    }
    
    // Add SFX from scene
    if (Array.isArray(scene?.sfxAudio)) {
      scene.sfxAudio.forEach((sfxUrl: string, idx: number) => {
        if (sfxUrl) {
          const sfxDef = scene.sfx?.[idx]
          assets.push({
            id: `scene-sfx-${idx}`,
            label: sfxDef?.name || sfxDef?.description || `SFX ${idx + 1}`,
            url: sfxUrl,
            type: 'sfx',
            duration: sfxDef?.duration,
            source: 'scene',
          })
        }
      })
    }
    
    return assets
  }, [scene])

  if (!productionData || !productionData.isSegmented || productionData.segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Initialize Scene Production
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Break this scene into generation-ready segments. We’ll analyze the direction & script to propose
          keyframes and produce expert prompts for each cut.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 flex flex-col gap-1">
            Target Segment Duration (seconds)
            <Input
              type="number"
              min={4}
              step={0.5}
              value={targetDuration}
              onChange={(event) => setTargetDuration(Number(event.target.value))}
              className="w-32"
            />
          </label>
          <Button 
            onClick={(e) => {
              e.stopPropagation()
              handleInitialize()
            }} 
            disabled={isInitializing} 
            className="flex items-center gap-2"
          >
            <Film className="w-4 h-4" />
            {isInitializing ? 'Generating…' : 'Generate'}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          We’ll balance keyframes with natural breaks to keep continuity tight across segments.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Freeze Screen Overlay during generation */}
      <GeneratingOverlay 
        visible={isInitializing} 
        title="Generating Intelligent Segments..." 
        progress={generationProgress}
        subtext="Analyzing dialogue, scene direction, and character blocking with Gemini 3.0"
      />
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-left">Update Scene Segments</DialogTitle>
                <DialogDescription className="text-left">
                  This will regenerate all segments for this scene.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Confirm that you want to update the current Scene Segments? 
              New segments will be generated using the latest script, dialogue, and scene direction.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInitialize}
              className="flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Segments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <div className="space-y-4">
        {/* Header with scene info and regenerate button */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Scene {sceneNumber}: {heading || 'Untitled'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {productionData.segments.length} segments · Target {productionData.targetSegmentDuration}s
            </p>
          </div>
          {productionData?.isSegmented && (
            <Button
              variant="outline"
              size="sm"
              disabled={isInitializing}
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirmDialog(true)
              }}
              className="shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Segments
            </Button>
          )}
        </div>

        {/* Optimized Layout: Timeline (left) + Segment Studio Panel (right) */}
        <div className="flex gap-4 h-[680px] overflow-y-auto overflow-x-auto">
          {/* Main Area: Scene Timeline with Video Player */}
          <div className="flex-1 min-w-0 flex flex-col min-w-[500px]">
            <SceneTimeline
              key={audioTracksKey}
              segments={segments}
              selectedSegmentId={selectedSegmentId ?? undefined}
              onSegmentSelect={setSelectedSegmentId}
              audioTracks={audioTracks}
              onPlayheadChange={handlePlayheadChange}
              onGenerateSceneMp4={onGenerateSceneMp4}
              onAddSegment={onAddSegment ? handleAddSegmentWrapper : undefined}
              onDeleteSegment={onDeleteSegment ? handleDeleteSegmentWrapper : undefined}
              onAudioClipChange={onAudioClipChange ? handleAudioClipChangeWrapper : undefined}
            />
          </div>

          {/* Right Panel: Segment Studio (scrollable) */}
          <div className="w-80 flex-shrink-0">
            <SegmentStudio
              segment={selectedSegment}
              segments={segments}
              onSegmentChange={setSelectedSegmentId}
              previousSegmentLastFrame={previousSegmentLastFrame}
              onPromptChange={handlePromptChange}
              onGenerate={handleGenerate}
              onUploadMedia={handleUpload}
              references={references}
              sceneImageUrl={scene?.imageUrl}
              audioTracks={audioTracks}
            />
          </div>
        </div>
      </div>
    </>
  )
}