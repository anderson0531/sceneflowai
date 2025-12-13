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
  SegmentKeyframeSettings,
} from './types'
import { Calculator, Sparkles, RefreshCw, Loader2, AlertCircle, Film, Clock, Sliders, MessageSquare, Settings2 } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Segment generation options
export interface SegmentGenerationOptions {
  targetDuration: number
  alignWithNarration: boolean
  addLeadInSegment: boolean
  leadInDuration: number
  customInstructions: string
  focusMode: 'balanced' | 'action' | 'dialogue' | 'cinematic'
}

interface SceneProductionManagerProps {
  sceneId: string
  sceneNumber: number
  heading?: string
  scene?: any // Add scene prop
  productionData?: SceneProductionData | null
  references: SceneProductionReferences
  onInitialize: (sceneId: string, options: { targetDuration: number; generationOptions?: SegmentGenerationOptions }) => Promise<void>
  onPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onKeyframeChange?: (sceneId: string, segmentId: string, keyframeSettings: SegmentKeyframeSettings) => void
  onDialogueAssignmentChange?: (sceneId: string, segmentId: string, dialogueLineIds: string[]) => void
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
  onSegmentResize?: (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => void
  onAudioClipChange?: (sceneId: string, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => void
  // Phase 7: Segment reordering
  onReorderSegments?: (sceneId: string, oldIndex: number, newIndex: number) => void
  // Image editing (reuses ImageEditModal from Frame step)
  onEditImage?: (imageUrl: string) => void
  // Establishing Shot support
  onAddEstablishingShot?: (sceneId: string, style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  onEstablishingShotStyleChange?: (sceneId: string, segmentId: string, style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => void
  // Take selection - allows user to choose which take to use as active asset
  onSelectTake?: (sceneId: string, segmentId: string, takeId: string, takeAssetUrl: string) => void
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
  onKeyframeChange,
  onDialogueAssignmentChange,
  onGenerate,
  onUpload,
  audioTracks: externalAudioTracks,
  onGenerateSceneMp4,
  onAddSegment,
  onDeleteSegment,
  onSegmentResize,
  onAudioClipChange,
  onReorderSegments,
  onEditImage,
  onAddEstablishingShot,
  onEstablishingShotStyleChange,
  onSelectTake,
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
  
  // Wrapper for adding establishing shot - pass scene data and style from props
  const handleAddEstablishingShotWrapper = useCallback(
    (style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => {
      if (onAddEstablishingShot) {
        onAddEstablishingShot(sceneId, style)
      }
    },
    [sceneId, onAddEstablishingShot]
  )
  
  // NOTE: handleEstablishingShotStyleChangeWrapper is defined AFTER selectedSegmentId (line ~350)
  // to avoid TDZ (Temporal Dead Zone) errors in minified production builds
  
  const handleDeleteSegmentWrapper = useCallback(
    (segmentId: string) => {
      if (onDeleteSegment) {
        onDeleteSegment(sceneId, segmentId)
      }
    },
    [sceneId, onDeleteSegment]
  )
  
  // Phase 7: Wrapper for segment reordering
  const handleReorderSegmentsWrapper = useCallback(
    (oldIndex: number, newIndex: number) => {
      if (onReorderSegments) {
        onReorderSegments(sceneId, oldIndex, newIndex)
      }
    },
    [sceneId, onReorderSegments]
  )
  
  // Wrapper for segment resize/move (maps to onVisualClipChange in SceneTimeline)
  const handleSegmentResizeWrapper = useCallback(
    (segmentId: string, changes: { startTime?: number; duration?: number; trimStart?: number; trimEnd?: number }) => {
      if (onSegmentResize) {
        // Only pass startTime and duration - trimStart/trimEnd handled locally
        onSegmentResize(sceneId, segmentId, { startTime: changes.startTime, duration: changes.duration })
      }
    },
    [sceneId, onSegmentResize]
  )
  
  const handleAudioClipChangeWrapper = useCallback(
    (trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => {
      if (onAudioClipChange) {
        onAudioClipChange(sceneId, trackType, clipId, changes)
      }
    },
    [sceneId, onAudioClipChange]
  )
  
  // Wrapper for duration changes from SegmentStudio settings panel
  const handleDurationChangeWrapper = useCallback(
    (segmentId: string, newDuration: number) => {
      if (onSegmentResize) {
        onSegmentResize(sceneId, segmentId, { duration: newDuration })
      }
    },
    [sceneId, onSegmentResize]
  )
  
  const [targetDuration, setTargetDuration] = useState<number>(productionData?.targetSegmentDuration ?? 8)
  
  // Enhanced generation options state
  const [alignWithNarration, setAlignWithNarration] = useState(true)
  const [addLeadInSegment, setAddLeadInSegment] = useState(true)
  const [leadInDuration, setLeadInDuration] = useState(2)
  const [customInstructions, setCustomInstructions] = useState('')
  const [focusMode, setFocusMode] = useState<'balanced' | 'action' | 'dialogue' | 'cinematic'>('balanced')
  const [showInitialDialog, setShowInitialDialog] = useState(false)
  
  // Phase 2: Dialogue Coverage - parse scene dialogue into trackable lines
  // NOTE: sceneDialogueLines can be computed early, but dialogue assignment state
  // must be defined after selectedSegmentId (see below)
  const sceneDialogueLines = useMemo(() => {
    if (!scene?.dialogue || !Array.isArray(scene.dialogue)) return []
    return scene.dialogue.map((d: any, idx: number) => ({
      id: `dialogue-${idx}`,
      character: d.character || 'Unknown',
      line: d.line || d.text || '',
    }))
  }, [scene?.dialogue])
  
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

  // Wrapper for changing establishing shot style - MUST be defined after selectedSegmentId
  const handleEstablishingShotStyleChangeWrapper = useCallback(
    (style: 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => {
      if (onEstablishingShotStyleChange && selectedSegmentId) {
        onEstablishingShotStyleChange(sceneId, selectedSegmentId, style)
      }
    },
    [sceneId, selectedSegmentId, onEstablishingShotStyleChange]
  )

  // Wrapper for selecting a take as the active asset - MUST be defined after selectedSegmentId
  const handleSelectTakeWrapper = useCallback(
    (takeId: string, takeAssetUrl: string) => {
      if (onSelectTake && selectedSegmentId) {
        onSelectTake(sceneId, selectedSegmentId, takeId, takeAssetUrl)
      }
    },
    [sceneId, selectedSegmentId, onSelectTake]
  )

  // Phase 2: Dialogue assignments - must be after selectedSegmentId is defined
  const [dialogueAssignments, setDialogueAssignments] = useState<Record<string, Set<string>>>({})
  
  // Phase 6: Initialize dialogue assignments from persisted dialogueLineIds
  useEffect(() => {
    const initialAssignments: Record<string, Set<string>> = {}
    segments.forEach((segment) => {
      if (segment.dialogueLineIds && segment.dialogueLineIds.length > 0) {
        initialAssignments[segment.segmentId] = new Set(segment.dialogueLineIds)
      }
    })
    if (Object.keys(initialAssignments).length > 0) {
      setDialogueAssignments(initialAssignments)
    }
  }, []) // Only run once on mount
  
  // Get dialogue lines assigned to the selected segment
  const selectedSegmentDialogue = useMemo(() => {
    if (!selectedSegmentId) return []
    const assigned = dialogueAssignments[selectedSegmentId] || new Set()
    return sceneDialogueLines
      .filter(d => assigned.has(d.id))
      .map(d => ({ ...d, covered: true }))
  }, [selectedSegmentId, dialogueAssignments, sceneDialogueLines])
  
  // Handler to toggle dialogue assignment to selected segment
  const handleToggleDialogue = useCallback((dialogueId: string) => {
    if (!selectedSegmentId) return
    
    setDialogueAssignments(prev => {
      const currentSet = prev[selectedSegmentId] || new Set()
      const newSet = new Set(currentSet)
      let updatedAssignments: Record<string, Set<string>>
      
      if (newSet.has(dialogueId)) {
        // Remove from this segment
        newSet.delete(dialogueId)
        updatedAssignments = {
          ...prev,
          [selectedSegmentId]: newSet
        }
        toast.success('Dialogue removed from segment')
      } else {
        // First, remove from any other segment
        updatedAssignments = {}
        Object.entries(prev).forEach(([segId, dialSet]) => {
          const newDialSet = new Set(dialSet)
          newDialSet.delete(dialogueId)
          if (newDialSet.size > 0) {
            updatedAssignments[segId] = newDialSet
          }
        })
        // Add to current segment
        newSet.add(dialogueId)
        updatedAssignments[selectedSegmentId] = newSet
        toast.success('Dialogue assigned to segment')
      }
      
      // Phase 6: Persist dialogue assignment to database
      const dialogueLineIds = Array.from(newSet)
      onDialogueAssignmentChange?.(sceneId, selectedSegmentId, dialogueLineIds)
      
      return updatedAssignments
    })
  }, [selectedSegmentId, sceneId, onDialogueAssignmentChange])

  // Phase 3: Local state for keyframe settings per segment (for preview in Screening Room)
  const [segmentKeyframes, setSegmentKeyframes] = useState<Record<string, SegmentKeyframeSettings>>({})
  
  // Handler to update keyframe settings for selected segment
  const handleKeyframeChange = useCallback((settings: SegmentKeyframeSettings) => {
    if (!selectedSegmentId) return
    
    // Update local state for immediate UI feedback
    setSegmentKeyframes(prev => ({
      ...prev,
      [selectedSegmentId]: settings,
    }))
    
    // Phase 5: Persist keyframe settings to database
    onKeyframeChange?.(sceneId, selectedSegmentId, settings)
    
    toast.success('Animation settings updated', {
      description: settings.useAutoDetect ? 'Auto-detect enabled' : `${settings.direction || 'custom'} with ${settings.easingType} easing`,
      duration: 1500,
    })
  }, [selectedSegmentId, sceneId, onKeyframeChange])
  
  // Get the selected segment with merged keyframe settings
  const selectedSegmentWithKeyframes = useMemo(() => {
    if (!selectedSegment) return null
    const keyframes = segmentKeyframes[selectedSegment.segmentId]
    if (keyframes) {
      return { ...selectedSegment, keyframeSettings: keyframes }
    }
    return selectedSegment
  }, [selectedSegment, segmentKeyframes])

  const handleInitialize = async () => {
    setShowConfirmDialog(false)
    setShowInitialDialog(false)
    setIsInitializing(true)
    setGenerationProgress(10)
    
    // Build generation options
    const generationOptions: SegmentGenerationOptions = {
      targetDuration,
      alignWithNarration,
      addLeadInSegment,
      leadInDuration,
      customInstructions,
      focusMode,
    }
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 5, 85))
    }, 2000)
    
    try {
      await onInitialize(sceneId, { targetDuration, generationOptions })
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

  // Reusable segment generation dialog content
  const SegmentGenerationDialogContent = ({ isRegenerate = false }: { isRegenerate?: boolean }) => (
    <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Film className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <DialogTitle className="text-left">
              {isRegenerate ? 'Regenerate Scene Segments' : 'Generate Scene Segments'}
            </DialogTitle>
            <DialogDescription className="text-left">
              Configure how segments are created for this scene.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      
      <Tabs defaultValue="timing" className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timing" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Timing</span>
          </TabsTrigger>
          <TabsTrigger value="alignment" className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Alignment</span>
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instructions</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Segment Duration</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={4}
                  max={8}
                  step={0.5}
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">seconds (4-8s recommended for Veo 3.1)</span>
              </div>
              <p className="text-xs text-gray-400">
                Shorter segments (4-5s) work better for dialogue-heavy scenes. Longer segments (6-8s) suit action sequences.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Focus Mode</Label>
              <Select value={focusMode} onValueChange={(v) => setFocusMode(v as typeof focusMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced - Auto-detect optimal cuts</SelectItem>
                  <SelectItem value="dialogue">Dialogue Focus - Cut on speaker changes</SelectItem>
                  <SelectItem value="action">Action Focus - Emphasize movement/blocking</SelectItem>
                  <SelectItem value="cinematic">Cinematic - Longer takes, fewer cuts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        
        {/* Alignment Tab */}
        <TabsContent value="alignment" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex-1">
                <Label className="text-sm font-medium">Align with Narration</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Add non-dialogue segments at the beginning to align visuals with narration/voiceover timing.
                </p>
              </div>
              <Switch 
                checked={alignWithNarration} 
                onCheckedChange={setAlignWithNarration}
              />
            </div>
            
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex-1">
                <Label className="text-sm font-medium">Add Lead-In Segment</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Insert an establishing shot before dialogue begins to set the scene.
                </p>
              </div>
              <Switch 
                checked={addLeadInSegment} 
                onCheckedChange={setAddLeadInSegment}
              />
            </div>
            
            {addLeadInSegment && (
              <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-medium">Lead-In Duration</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    step={0.5}
                    value={leadInDuration}
                    onChange={(e) => setLeadInDuration(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">seconds</span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Instructions Tab */}
        <TabsContent value="instructions" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Instructions</Label>
              <Textarea
                placeholder="Add any special instructions for segment generation...&#10;&#10;Examples:&#10;- Focus on character reactions&#10;- Include more establishing shots&#10;- Emphasize the tension between characters"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[120px] text-sm"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setCustomInstructions(prev => prev + (prev ? '\n' : '') + 'Focus on character reactions and emotional beats')}
              >
                + Reactions
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setCustomInstructions(prev => prev + (prev ? '\n' : '') + 'Prefer close-ups for dialogue moments')}
              >
                + Close-ups
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setCustomInstructions(prev => prev + (prev ? '\n' : '') + 'Include wide shots to show character positions')}
              >
                + Wide Shots
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <DialogFooter className="mt-6">
        <Button 
          variant="outline" 
          onClick={() => isRegenerate ? setShowConfirmDialog(false) : setShowInitialDialog(false)}
        >
          Cancel
        </Button>
        <Button onClick={handleInitialize} disabled={isInitializing}>
          <Sparkles className="w-4 h-4 mr-2" />
          {isRegenerate ? 'Regenerate Segments' : 'Generate Segments'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )

  if (!productionData || !productionData.isSegmented || productionData.segments.length === 0) {
    return (
      <>
        {/* Initial Dialog for Generation */}
        <Dialog open={showInitialDialog} onOpenChange={setShowInitialDialog}>
          <SegmentGenerationDialogContent isRegenerate={false} />
        </Dialog>
        
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Initialize Scene Production
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Break this scene into generation-ready segments. We will analyze the direction & script to propose
            keyframes and produce expert prompts for each cut.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                setShowInitialDialog(true)
              }} 
              disabled={isInitializing} 
              className="flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" />
              Configure & Generate
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            We will balance keyframes with natural breaks to keep continuity tight across segments.
          </p>
        </div>
      </>
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
      
      {/* Enhanced Segment Generation Dialog - for regeneration */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <SegmentGenerationDialogContent isRegenerate={true} />
      </Dialog>
    
      <div className="space-y-3">
        {/* Header with segment count and regenerate button */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {productionData.segments.length} segments · Target {productionData.targetSegmentDuration}s
          </p>
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
              <Film className="w-4 h-4 mr-2" />
              Generate
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
              onVisualClipChange={onSegmentResize ? handleSegmentResizeWrapper : undefined}
              onAddSegment={onAddSegment ? handleAddSegmentWrapper : undefined}
              onDeleteSegment={onDeleteSegment ? handleDeleteSegmentWrapper : undefined}
              onAudioClipChange={onAudioClipChange ? handleAudioClipChangeWrapper : undefined}
              dialogueAssignments={dialogueAssignments}
              onReorderSegments={onReorderSegments ? handleReorderSegmentsWrapper : undefined}
              onAddEstablishingShot={onAddEstablishingShot ? handleAddEstablishingShotWrapper : undefined}
              sceneFrameUrl={scene?.imageUrl}
            />
          </div>

          {/* Right Panel: Segment Studio (scrollable) */}
          <div className="w-80 flex-shrink-0">
            <SegmentStudio
              segment={selectedSegmentWithKeyframes}
              segments={segments}
              onSegmentChange={setSelectedSegmentId}
              previousSegmentLastFrame={previousSegmentLastFrame}
              onPromptChange={handlePromptChange}
              onDurationChange={onSegmentResize ? handleDurationChangeWrapper : undefined}
              onGenerate={handleGenerate}
              onUploadMedia={handleUpload}
              references={references}
              sceneImageUrl={scene?.imageUrl}
              audioTracks={audioTracks}
              segmentIndex={segments.findIndex(s => s.segmentId === selectedSegmentId)}
              sceneDialogueLines={sceneDialogueLines}
              segmentDialogueLines={selectedSegmentDialogue}
              onToggleDialogue={handleToggleDialogue}
              onKeyframeChange={handleKeyframeChange}
              onEditImage={onEditImage}
              onAddEstablishingShot={onAddEstablishingShot && !segments.some(s => s.isEstablishingShot) ? handleAddEstablishingShotWrapper : undefined}
              onEstablishingShotStyleChange={onEstablishingShotStyleChange ? handleEstablishingShotStyleChangeWrapper : undefined}
              onSelectTake={onSelectTake ? handleSelectTakeWrapper : undefined}
            />
          </div>
        </div>
      </div>
    </>
  )
}