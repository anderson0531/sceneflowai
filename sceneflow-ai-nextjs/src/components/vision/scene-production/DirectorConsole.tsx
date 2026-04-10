/**
 * DirectorConsole - Call Action Dashboard
 * 
 * The main view for the Director's Console "Pre-Flight" workflow.
 * Lists segments with "Ready" status and allows:
 * - Clicking a segment to open DirectorDialog for granular control
 * - Batch rendering with "Render Approved Only" or "Render All" modes
 * 
 * Status Indicators:
 * - auto-ready: Configured by system, not yet reviewed
 * - user-approved: User opened dialog and clicked "Approve"
 * - rendering: Currently generating video
 * - rendered: Video exists
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  Play, 
  CheckCircle,
  Clock,
  AlertCircle,
  Film,
  Loader2,
  Settings2,
  Sparkles,
  Clapperboard,
  Mic2,
  Volume2,
  MessageSquare,
  Music,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  PlayCircle,
  Timer,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Wand2,
  Shield,
  ShieldCheck,
  CloudUpload,
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationConfig,
  VideoGenerationMethod,
  SceneProductionData,
  SelectedAudioTracks,
  AudioTrackTimingSettings,
  SceneAudioConfig,
  ProductionStream,
  TextOverlay,
  ProductionTarget,
  AnimaticRenderSettings,
} from './types'
import { DirectorDialog } from './DirectorDialog'
// Dynamic import for VideoEditingDialog to prevent TDZ
// VideoEditingDialog → VideoEditingDialogV2 is shared between DirectorConsole (chunk 4195)
// and SegmentStudio (ScriptPanel chunk). When webpack's ModuleConcatenationPlugin scope-hoists
// this shared dependency, it reorders const declarations causing 'Cannot access eJ before initialization'.
const VideoEditingDialog = dynamic(
  () => import('./VideoEditingDialogV2').then(mod => ({ default: mod.VideoEditingDialog })),
  { ssr: false }
)
import { SceneVideoPlayer } from './SceneVideoPlayer'
// Dynamic import for SceneRenderDialog - shared between DirectorConsole and ScriptPanel chunks
const SceneRenderDialog = dynamic(
  () => import('./SceneRenderDialog').then(mod => ({ default: mod.SceneRenderDialog })),
  { ssr: false }
)
import { AddSpecialSegmentDialog, type FilmContext, type AdjacentSceneContext } from './AddSpecialSegmentDialog'
import { ProductionStreamsPanel } from './ProductionStreamsPanel'
// Dynamic import for SceneProductionMixer to avoid TDZ with LocalRenderService chain
const SceneProductionMixer = dynamic(
  () => import('./SceneProductionMixer').then(mod => ({ default: mod.SceneProductionMixer })),
  { ssr: false, loading: () => <div className="p-4 text-center text-zinc-500">Loading Mixer...</div> }
)
import { useVideoQueue } from '@/hooks/useVideoQueue'
import type { SceneAudioData } from './GuidePromptEditor'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'

// Default audio track selection state
const DEFAULT_AUDIO_TRACKS: SelectedAudioTracks = {
  narration: true,
  dialogue: true,
  music: false,
  sfx: false,
}

// Default timing settings
const DEFAULT_TIMING: AudioTrackTimingSettings = {
  startTime: 0,
  duration: 30,
}

// Stable empty segments reference to prevent TDZ render loops
// Using a module-level constant guarantees the same reference for the app's lifecycle
const EMPTY_SEGMENTS: SceneSegment[] = []

// Audio track timing state type
interface AudioTrackTimingState {
  narration: AudioTrackTimingSettings
  dialogue: AudioTrackTimingSettings
  music: AudioTrackTimingSettings
  sfx: AudioTrackTimingSettings
}

interface DirectorConsoleProps {
  sceneId: string
  sceneNumber: number
  projectId: string
  productionData: SceneProductionData | null
  sceneImageUrl?: string
  scene?: SceneAudioData
  onGenerate: (
    sceneId: string,
    segmentId: string,
    mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD',
    options?: {
      startFrameUrl?: string
      endFrameUrl?: string
      sourceVideoUrl?: string
      prompt?: string
      negativePrompt?: string
      duration?: number
      aspectRatio?: '16:9' | '9:16'
      resolution?: '720p' | '1080p'
      generationMethod?: VideoGenerationMethod
    }
  ) => Promise<void>
  onSegmentUpload?: (segmentId: string, file: File) => void
  /** Persist lock status to database */
  onLockSegment?: (segmentId: string, locked: boolean) => void
  /** Persist rendered scene URL to database */
  onRenderedSceneUrlChange?: (url: string | null) => void
  /** Persist production data (including production streams) to database */
  onProductionDataChange?: (data: SceneProductionData) => void
  /** Scene index (0-based) for audio generation API calls */
  sceneIndex?: number
  /** Generate audio for a specific scene, audio type, and language */
  onGenerateSceneAudio?: (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number, language?: string) => void | Promise<void>
  /** Generate all audio for all scenes in a given language */
  onGenerateAllAudio?: (language?: string) => void | Promise<void>
  /** Whether audio generation is in progress */
  isGeneratingAudio?: boolean
}

// Method badge colors and labels
const methodBadgeConfig: Record<VideoGenerationMethod, { label: string; className: string }> = {
  FTV: { label: 'INTERP', className: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  I2V: { label: 'I2V', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  T2V: { label: 'T2V', className: 'bg-green-500/20 text-green-300 border-green-500/50' },
  EXT: { label: 'EXT', className: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  REF: { label: 'REF', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },
}

// Status badge colors - Using film terminology
const statusBadgeConfig = {
  'auto-ready': { label: 'Ready', className: 'bg-slate-500/20 text-slate-300 border-slate-500/50', icon: Clock },
  'user-approved': { label: 'Approved', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: CheckCircle },
  'locked': { label: 'Locked', className: 'bg-green-500/20 text-green-300 border-green-500/50', icon: CheckCircle },
  'rendering': { label: 'Rolling', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: Loader2 },
  'rendered': { label: 'In the Can', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', icon: Film },
  'error': { label: 'Error', className: 'bg-red-500/20 text-red-300 border-red-500/50', icon: AlertCircle },
}

export const DirectorConsole: React.FC<DirectorConsoleProps> = ({
  sceneId,
  sceneNumber,
  projectId,
  productionData,
  sceneImageUrl,
  scene,
  onGenerate,
  onSegmentUpload,
  onLockSegment,
  onRenderedSceneUrlChange,
  onProductionDataChange,
  sceneIndex,
  onGenerateSceneAudio,
  onGenerateAllAudio,
  isGeneratingAudio,
}) => {
  // Use stable EMPTY_SEGMENTS constant to prevent TDZ render loops
  // productionData?.segments || [] creates a new array reference each render
  const segments = productionData?.segments ?? EMPTY_SEGMENTS

  const videoGenerationAvailable = useMemo(
    () => segments.some(s => s.activeAssetUrl && s.status === 'COMPLETE'),
    [segments]
  )
  
  // Video queue state and actions
  const {
    queue,
    isRendering,
    progress,
    currentSegmentId,
    completedCount,
    failedCount,
    isRateLimitPaused,
    rateLimitCountdown,
    updateConfig,
    processQueue,
    cancelRendering,
  } = useVideoQueue(segments, sceneId, sceneImageUrl, onGenerate)
  
  // Selected segment for DirectorDialog
  const [selectedSegment, setSelectedSegment] = useState<SceneSegment | null>(null)
  
  // Segment for VideoEditingDialog (editing completed videos)
  const [editingVideoSegment, setEditingVideoSegment] = useState<SceneSegment | null>(null)
  
  // Segment selection for batch operations (checkboxes)
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set())
  
  // Toggle segment selection
  const toggleSegmentSelection = useCallback((segmentId: string, checked: boolean) => {
    setSelectedSegmentIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(segmentId)
      } else {
        next.delete(segmentId)
      }
      return next
    })
  }, [])
  
  // Select/deselect all segments
  const selectAllSegments = useCallback(() => {
    setSelectedSegmentIds(new Set(queue.map(q => q.segmentId)))
  }, [queue])
  
  const deselectAllSegments = useCallback(() => {
    setSelectedSegmentIds(new Set())
  }, [])
  
  // Scene video player modal state
  const [isScenePlayerOpen, setIsScenePlayerOpen] = useState(false)
  
  // Collapsible state - default closed when segments are generated
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Scene Production Mixer collapsed state with localStorage persistence (default: collapsed)
  const [mixerCollapsed, setMixerCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mixerCollapsed')
      return saved ? JSON.parse(saved) : true // Default collapsed
    }
    return true
  })
  
  // Scene render dialog state
  const [isRenderDialogOpen, setIsRenderDialogOpen] = useState(false)
  
  // Rendered scene MP4 URL (from Cloud Run render) - initialize from productionData
  const [renderedSceneUrl, setRenderedSceneUrl] = useState<string | null>(
    productionData?.renderedSceneUrl || null
  )
  
  // Scene video player for rendered MP4
  const [isRenderedScenePlayerOpen, setIsRenderedScenePlayerOpen] = useState(false)
  
  // Production streams state - multi-language video renders
  const [productionStreams, setProductionStreams] = useState<ProductionStream[]>(
    productionData?.productionStreams || []
  )
  const [renderingStreamId, setRenderingStreamId] = useState<string | null>(null)
  const [streamRenderProgress, setStreamRenderProgress] = useState(0)
  const [productionTarget, setProductionTarget] = useState<ProductionTarget>({ streamType: 'animatic', language: 'en' })
  const [renderDialogMode, setRenderDialogMode] = useState<'video' | 'animatic'>('video')
  const [renderDialogAnimaticSettings, setRenderDialogAnimaticSettings] = useState<
    Partial<Omit<AnimaticRenderSettings, 'type'>> | undefined
  >(undefined)

  const renderDialogLanguage = useMemo(() => {
    if (renderingStreamId) {
      return productionStreams.find(s => s.id === renderingStreamId)?.language ?? productionTarget.language
    }
    return productionTarget.language
  }, [renderingStreamId, productionStreams, productionTarget.language])
  
  // Text overlays state - titles, lower thirds, subtitles
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>(
    (productionData?.textOverlays as TextOverlay[]) || []
  )
  
  // Segment-specific playback: start player at this segment index
  const [playFromSegmentIndex, setPlayFromSegmentIndex] = useState<number>(0)
  
  // Cinematic Elements dialog state - opens for inserting new cinematic segment
  const [cinematicDialogSegmentIndex, setCinematicDialogSegmentIndex] = useState<number | null>(null)
  
  // Audio track selection for video playback overlay
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<SelectedAudioTracks>(DEFAULT_AUDIO_TRACKS)
  
  // Audio track timing settings
  const [audioTrackTiming, setAudioTrackTiming] = useState<AudioTrackTimingState>({
    narration: { ...DEFAULT_TIMING },
    dialogue: { ...DEFAULT_TIMING },
    music: { ...DEFAULT_TIMING },
    sfx: { ...DEFAULT_TIMING },
  })
  
  // Persist mixerCollapsed to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mixerCollapsed', JSON.stringify(mixerCollapsed))
    }
  }, [mixerCollapsed])

  // Sync renderedSceneUrl when productionData changes (e.g., after page reload)
  useEffect(() => {
    if (productionData?.renderedSceneUrl && productionData.renderedSceneUrl !== renderedSceneUrl) {
      console.log('[DirectorConsole] Syncing renderedSceneUrl from productionData:', productionData.renderedSceneUrl)
      setRenderedSceneUrl(productionData.renderedSceneUrl)
    }
  }, [productionData?.renderedSceneUrl])

  // Sync productionStreams when productionData changes (e.g., after page reload)
  useEffect(() => {
    if (productionData) {
      const streamsFromData = productionData.productionStreams || []
      // Compare by ID to detect changes
      const currentIds = new Set(productionStreams.map(s => s.id))
      const newIds = new Set(streamsFromData.map((s: ProductionStream) => s.id))
      
      // Check if IDs are different OR if sizes are different
      const hasDifference = currentIds.size !== newIds.size || 
                           !Array.from(currentIds).every(id => newIds.has(id))
      
      if (hasDifference) {
        console.log('[DirectorConsole] Syncing productionStreams from productionData:', {
          before: productionStreams.length,
          after: streamsFromData.length,
          streams: streamsFromData.map((s: ProductionStream) => ({ id: s.id, status: s.status, language: s.language }))
        })
        setProductionStreams(streamsFromData)
      }
    }
  }, [productionData])

  // Get previous segment's last frame for Extend mode (prefer actual video frame over keyframe)
  const previousSegmentLastFrame = useMemo(() => {
    if (!editingVideoSegment || segments.length === 0) return null
    const currentIndex = segments.findIndex(s => s.segmentId === editingVideoSegment.segmentId)
    if (currentIndex <= 0) return null
    const previousSegment = segments[currentIndex - 1]
    
    // Priority 1: Get the latest successful take's actual last frame (extracted from video)
    const successfulTakes = previousSegment.takes?.filter(t => 
      t.status === 'done' && (t.lastFrameUrl || t.videoUrl || t.assetUrl)
    ) || []
    
    if (successfulTakes.length > 0) {
      const latestTake = successfulTakes[successfulTakes.length - 1]
      if (latestTake.lastFrameUrl) return latestTake.lastFrameUrl
      if (latestTake.thumbnailUrl) return latestTake.thumbnailUrl
    }
    
    // Priority 2: Fallback to pre-generated end keyframe
    return previousSegment.references?.endFrameUrl || null
  }, [editingVideoSegment, segments])
  
  // Update track timing
  const updateTrackTiming = useCallback((track: keyof AudioTrackTimingState, field: 'startTime' | 'duration', value: number) => {
    setAudioTrackTiming(prev => ({
      ...prev,
      [track]: {
        ...prev[track],
        [field]: Math.max(0, value),
      },
    }))
  }, [])
  
  // Toggle individual audio track
  const toggleAudioTrack = useCallback((track: keyof SelectedAudioTracks) => {
    setSelectedAudioTracks(prev => ({
      ...prev,
      [track]: !prev[track]
    }))
  }, [])
  
  // Handle saving config from dialog
  const handleSaveConfig = useCallback((config: VideoGenerationConfig) => {
    if (selectedSegment) {
      updateConfig(selectedSegment.segmentId, config)
      setSelectedSegment(null)
    }
  }, [selectedSegment, updateConfig])
  
  // Handle generate from dialog - saves config and triggers single segment generation
  // Pass config via overrideConfigs to bypass React state async timing issues
  const handleGenerateFromDialog = useCallback((segmentId: string, config: VideoGenerationConfig) => {
    updateConfig(segmentId, config)
    processQueue({
      mode: 'selected',
      priority: 'sequence',
      delayBetween: 6000,
      selectedIds: [segmentId],
      overrideConfigs: new Map([[segmentId, config]]),
    })
  }, [updateConfig, processQueue])
  
  // Handle batch render - approved only
  const handleRenderApproved = useCallback(() => {
    processQueue({
      mode: 'approved_only',
      priority: 'sequence',
      delayBetween: 6000,
    })
  }, [processQueue])
  
  // Handle batch render - all segments
  const handleRenderAll = useCallback(() => {
    processQueue({
      mode: 'all',
      priority: 'approved_first',
      delayBetween: 6000,
    })
  }, [processQueue])
  
  // Handle batch render - selected segments only (excluding locked)
  const handleRenderSelected = useCallback(() => {
    if (selectedSegmentIds.size === 0) return
    
    // Filter out locked segments
    const unlockedIds = Array.from(selectedSegmentIds).filter(id => {
      const item = queue.find(q => q.segmentId === id)
      return item && item.config.approvalStatus !== 'locked'
    })
    
    if (unlockedIds.length === 0) return
    
    processQueue({
      mode: 'selected',
      priority: 'sequence',
      delayBetween: 6000,
      selectedIds: unlockedIds,
    })
    // Clear selection after starting render
    setSelectedSegmentIds(new Set())
  }, [processQueue, selectedSegmentIds, queue])
  
  // Toggle segment lock status (locked/unlocked) - persists to DB
  const handleToggleLock = useCallback((segmentId: string) => {
    const item = queue.find(q => q.segmentId === segmentId)
    const segment = segments.find(s => s.segmentId === segmentId)
    if (item && segment) {
      // Check current lock state from both sources (segment.lockedForProduction or config status)
      const isCurrentlyLocked = segment.lockedForProduction || item.config.approvalStatus === 'locked'
      const newLockState = !isCurrentlyLocked
      const newStatus = newLockState ? 'locked' : 'auto-ready'
      
      console.log('[DirectorConsole] Toggle lock:', { 
        segmentId, 
        currentLocked: isCurrentlyLocked,
        newLocked: newLockState,
        segmentLockedForProduction: segment.lockedForProduction,
        configApprovalStatus: item.config.approvalStatus
      })
      
      // Update local queue state
      updateConfig(segmentId, { ...item.config, approvalStatus: newStatus })
      
      // Persist to DB if callback provided
      if (onLockSegment) {
        console.log('[DirectorConsole] Calling onLockSegment:', segmentId, newLockState)
        onLockSegment(segmentId, newLockState)
      } else {
        console.warn('[DirectorConsole] onLockSegment callback not provided!')
      }
    }
  }, [queue, segments, updateConfig, onLockSegment])
  
  // Mark segment for "Retake" - opens dialog for user to configure regeneration
  const handleMarkRetake = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.segmentId === segmentId)
    if (segment) {
      // Open DirectorDialog so user can review/edit settings before regenerating
      setSelectedSegment(segment)
    }
  }, [segments])
  
  // === Text Overlay Handlers ===
  
  // Handle text overlay changes - update local state and persist to database
  const handleTextOverlaysChange = useCallback((newOverlays: TextOverlay[]) => {
    setTextOverlays(newOverlays)
    
    // Persist to database via onProductionDataChange
    if (onProductionDataChange && productionData) {
      onProductionDataChange({
        ...productionData,
        textOverlays: newOverlays as import('./types').TextOverlayData[],
      })
    }
  }, [onProductionDataChange, productionData])
  
  // === Production Streams Handlers ===
  
  const handleRenderAnimatic = useCallback(
    async (language: string, resolution: '720p' | '1080p' | '4K', settings: AnimaticRenderSettings) => {
      const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language)
      const streamId = `stream-animatic-${language}-${Date.now()}`
      const newStream: ProductionStream = {
        id: streamId,
        streamType: 'animatic',
        language,
        languageLabel: languageInfo?.name || language,
        status: 'rendering',
        resolution,
        createdAt: new Date().toISOString(),
        renderSettings: settings,
      }
      const updatedStreams = [...productionStreams, newStream]
      setProductionStreams(updatedStreams)
      setRenderingStreamId(streamId)
      setStreamRenderProgress(0)
      setProductionTarget(prev => ({ ...prev, streamType: 'animatic', language }))
      setRenderDialogMode('animatic')
      setRenderDialogAnimaticSettings({
        kenBurnsIntensity: settings.kenBurnsIntensity,
        transitionStyle: settings.transitionStyle,
        transitionDuration: settings.transitionDuration,
        includeSubtitles: settings.includeSubtitles,
        subtitleStyle: settings.subtitleStyle,
      })
      if (onProductionDataChange && productionData) {
        onProductionDataChange({
          ...productionData,
          productionStreams: updatedStreams,
        })
      }
      setIsRenderDialogOpen(true)
    },
    [productionStreams, productionData, onProductionDataChange]
  )
  
  // Delete a production stream
  const handleDeleteStream = useCallback((streamId: string) => {
    const updatedStreams = productionStreams.filter(s => s.id !== streamId)
    setProductionStreams(updatedStreams)
    
    // Persist to database
    if (onProductionDataChange && productionData) {
      onProductionDataChange({
        ...productionData,
        productionStreams: updatedStreams,
      })
    }
  }, [productionStreams, productionData, onProductionDataChange])
  
  // Re-render an existing production stream
  const handleReRenderStream = useCallback(async (streamId: string) => {
    const stream = productionStreams.find(s => s.id === streamId)
    if (!stream) return
    
    // Update stream status to rendering
    const updatedStreams = productionStreams.map(s => 
      s.id === streamId 
        ? { ...s, status: 'rendering' as const, mp4Url: undefined }
        : s
    )
    setProductionStreams(updatedStreams)
    setRenderingStreamId(streamId)
    setStreamRenderProgress(0)
    setProductionTarget(prev => ({ ...prev, streamType: stream.streamType, language: stream.language }))
    setRenderDialogMode(stream.streamType === 'video' ? 'video' : 'animatic')
    if (stream.streamType === 'animatic' && stream.renderSettings?.type === 'animatic') {
      const rs = stream.renderSettings
      setRenderDialogAnimaticSettings({
        kenBurnsIntensity: rs.kenBurnsIntensity,
        transitionStyle: rs.transitionStyle,
        transitionDuration: rs.transitionDuration,
        includeSubtitles: rs.includeSubtitles,
        subtitleStyle: rs.subtitleStyle,
      })
    } else {
      setRenderDialogAnimaticSettings(undefined)
    }
    
    if (onProductionDataChange && productionData) {
      onProductionDataChange({
        ...productionData,
        productionStreams: updatedStreams,
      })
    }
    
    setIsRenderDialogOpen(true)
  }, [productionStreams, productionData, onProductionDataChange])
  
  // Preview a production stream
  const handlePreviewStream = useCallback((streamId: string, mp4Url: string) => {
    const stream = productionStreams.find(s => s.id === streamId)
    if (stream) {
      setRenderedSceneUrl(mp4Url)
      setIsRenderedScenePlayerOpen(true)
    }
  }, [productionStreams])
  
  // Download a production stream
  const handleDownloadStream = useCallback((streamId: string, mp4Url: string, language: string) => {
    const link = document.createElement('a')
    link.href = mp4Url
    link.download = `scene-${sceneNumber}-${language}.mp4`
    link.click()
  }, [sceneNumber])
  
  // Update stream when render completes
  const handleRenderComplete = useCallback((downloadUrl: string, streamType?: 'video' | 'animatic') => {
    console.log('[DirectorConsole] Scene render complete:', downloadUrl)
    setRenderedSceneUrl(downloadUrl)
    
    if (renderingStreamId) {
      const updatedStreams = productionStreams.map(s => 
        s.id === renderingStreamId 
          ? { 
              ...s, 
              status: 'complete' as const, 
              mp4Url: downloadUrl,
              completedAt: new Date().toISOString(),
              streamType: streamType === 'animatic' ? 'animatic' as const : 'video' as const,
            }
          : s
      )
      setProductionStreams(updatedStreams)
      setRenderingStreamId(null)
      setStreamRenderProgress(0)
      
      // Persist production streams to database
      if (onProductionDataChange && productionData) {
        onProductionDataChange({
          ...productionData,
          productionStreams: updatedStreams,
        })
      }
    }
    
    // Persist rendered scene URL to database
    if (onRenderedSceneUrlChange) {
      onRenderedSceneUrlChange(downloadUrl)
    }
  }, [renderingStreamId, productionStreams, productionData, onProductionDataChange, onRenderedSceneUrlChange])
  
  // Count segments by status
  const statusCounts = {
    approved: queue.filter(q => q.config.approvalStatus === 'user-approved').length,
    autoReady: queue.filter(q => q.config.approvalStatus === 'auto-ready').length,
    locked: queue.filter(q => q.config.approvalStatus === 'locked').length,
    rendered: queue.filter(q => q.status === 'complete').length,
    retakes: queue.filter(q => q.status === 'complete' && q.config.approvalStatus === 'auto-ready').length,
    total: queue.length,
  }
  
  // Count selected segments that are NOT locked (eligible for generation)
  const selectedUnlockedCount = Array.from(selectedSegmentIds).filter(id => {
    const item = queue.find(q => q.segmentId === id)
    return item && item.config.approvalStatus !== 'locked'
  }).length
  
  // No segments state
  if (segments.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clapperboard className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-30" />
        <h3 className="!text-base !leading-normal font-semibold text-slate-300 mb-2">No Segments Available</h3>
        <p className="text-sm text-slate-500">
          Initialize scene production in the Frame step first to create video segments.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Video Generation Header - FTV Mode Ready style */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 transition-colors group"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
            <Clapperboard className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-indigo-300 font-medium">Video Generation</span>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              {statusCounts.rendered}/{statusCounts.total} rendered
            </Badge>
            <span className="text-indigo-400/70 text-sm hidden sm:inline ml-2">Generate video clips from keyframes using AI</span>
          </button>
          
          <div className="flex gap-3 items-center">
            {isRendering ? (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {isRateLimitPaused ? (
                    <>
                      <span className="text-amber-400 font-medium">⏸ Rate Limited</span>
                      <span className="text-amber-300">Resuming in {rateLimitCountdown}s...</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rendering {completedCount + 1} of {queue.length}...</span>
                    </>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={cancelRendering}
                  className="bg-slate-800 border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {/* Generate button - renders selected unlocked segments */}
                <Button 
                  size="sm"
                  onClick={handleRenderSelected}
                  disabled={selectedUnlockedCount === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Generate ({selectedUnlockedCount})
                </Button>
                {statusCounts.rendered > 0 && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setIsScenePlayerOpen(true)}
                    className="bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Play Segments ({statusCounts.rendered})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Collapsible Content */}
      {isExpanded && (
      <>
      {/* Progress Bar (visible during rendering) */}
      {isRendering && (
        <div className="space-y-2">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${isRateLimitPaused ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{completedCount} completed</span>
            {isRateLimitPaused && <span className="text-amber-400">⏸ Paused ({rateLimitCountdown}s)</span>}
            {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Segment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {queue.map((item) => {
          const segment = segments.find(s => s.segmentId === item.segmentId)
          if (!segment) return null
          
          // Fallback to defaults if config values are not recognized
          const methodConfig = methodBadgeConfig[item.config.mode] || methodBadgeConfig['I2V']
          const statusConfig = statusBadgeConfig[item.config.approvalStatus] || statusBadgeConfig['auto-ready']
          const StatusIcon = statusConfig.icon
          const isCurrentlyRendering = currentSegmentId === item.segmentId
          
          return (
            <div 
              key={item.segmentId}
              className={`
                border rounded-lg p-4 transition-all 
                hover:border-indigo-500/70 hover:bg-slate-800/50
                ${item.config.approvalStatus === 'user-approved' 
                  ? 'bg-indigo-900/10 border-indigo-500/30' 
                  : 'bg-slate-800/30 border-slate-700/50'
                }
                ${selectedSegmentIds.has(item.segmentId) ? 'ring-4 ring-amber-500 bg-amber-500/10' : ''}
                ${isCurrentlyRendering ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''}
              `}
            >
              <div className="flex gap-4">
                {/* Selection Checkbox */}
                <div className="flex-shrink-0 flex items-start pt-1">
                  <Checkbox
                    checked={selectedSegmentIds.has(item.segmentId)}
                    onCheckedChange={(checked) => toggleSegmentSelection(item.segmentId, checked === true)}
                    className="border-slate-500"
                  />
                </div>
                
                {/* Thumbnail Preview */}
                <div className="w-32 aspect-video bg-black rounded overflow-hidden relative flex-shrink-0">
                  {item.thumbnailUrl ? (
                    <img 
                      src={item.thumbnailUrl} 
                      alt={`Segment ${item.sequenceIndex + 1}`}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Film className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  
                  {/* Method Badge */}
                  <Badge 
                    variant="outline"
                    className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0 ${methodConfig.className}`}
                  >
                    {methodConfig.label}
                  </Badge>
                  
                  {/* Rendering Overlay */}
                  {isCurrentlyRendering && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                  )}
                  
                  {/* Complete Overlay with Play Button */}
                  {item.status === 'complete' && !isCurrentlyRendering && (
                    <>
                      <div className="absolute top-1 left-1 flex items-center gap-1">
                        <Badge className="bg-emerald-500/80 text-white text-[10px] px-1.5 py-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Done
                        </Badge>
                        {segment.isUserUpload && (
                          <Badge className="bg-sky-500/80 text-white text-[10px] px-1.5 py-0">
                            <CloudUpload className="w-3 h-3 mr-1" />
                            Uploaded
                          </Badge>
                        )}
                        {item.config.approvalStatus === 'locked' && (
                          <Badge className="bg-amber-500/80 text-white text-[10px] px-1.5 py-0">
                            <ShieldCheck className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                      {/* Play Button Overlay */}
                      <button
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Open SceneVideoPlayer starting at this segment
                          const segmentIndex = segments.findIndex(s => s.segmentId === item.segmentId)
                          if (segmentIndex >= 0) {
                            setPlayFromSegmentIndex(segmentIndex)
                            setIsScenePlayerOpen(true)
                          }
                        }}
                        title="Play segment video"
                      >
                        <PlayCircle className="w-10 h-10 text-white/0 group-hover:text-white/90 transition-colors drop-shadow-lg" />
                      </button>
                    </>
                  )}
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-200">
                      Segment {item.sequenceIndex + 1}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`flex items-center gap-1 text-[10px] ${statusConfig.className}`}
                    >
                      <StatusIcon className={`w-3 h-3 ${item.config.approvalStatus === 'rendering' ? 'animate-spin' : ''}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {item.config.prompt || 'No prompt configured'}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    {segment.isUserUpload ? (
                      // Uploaded video: show actual duration and upload indicator
                      <>
                        <span className="text-sky-400 font-medium">
                          {segment.actualVideoDuration 
                            ? `${Math.round(segment.actualVideoDuration)}s` 
                            : `${item.config.duration}s`
                          }
                        </span>
                        <span>•</span>
                        <span>{item.config.aspectRatio}</span>
                        <span>•</span>
                        <span className="text-sky-400">User Upload</span>
                      </>
                    ) : (
                      // AI-generated video: show configured duration and confidence
                      <>
                        <span>{item.config.duration}s</span>
                        <span>•</span>
                        <span>{item.config.aspectRatio}</span>
                        <span>•</span>
                        <span>{item.config.confidence}% confidence</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Action Icons */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {/* Upload Video Button - Disabled when protected */}
                  {onSegmentUpload && (
                    <>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id={`upload-video-${item.segmentId}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            onSegmentUpload(item.segmentId, file)
                          }
                          e.target.value = '' // Reset for re-upload
                        }}
                        disabled={item.config.approvalStatus === 'locked'}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={item.config.approvalStatus === 'locked' 
                              ? "text-slate-600 cursor-not-allowed opacity-50" 
                              : "text-slate-500 hover:text-slate-300"
                            }
                            disabled={item.config.approvalStatus === 'locked'}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (item.config.approvalStatus === 'locked') {
                                import('sonner').then(({ toast }) => {
                                  toast.error('Segment is protected', {
                                    description: 'Unprotect this segment first to upload a new video',
                                  })
                                })
                                return
                              }
                              document.getElementById(`upload-video-${item.segmentId}`)?.click()
                            }}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.config.approvalStatus === 'locked' 
                            ? 'Unprotect segment to upload' 
                            : 'Upload Video'
                          }
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  
                  {/* Copy Prompt Button - For external generation */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-500 hover:text-amber-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          const prompt = item.config.prompt || segment.userEditedPrompt || segment.generatedPrompt || ''
                          if (prompt) {
                            navigator.clipboard.writeText(prompt)
                            import('sonner').then(({ toast }) => {
                              toast.success('Prompt copied to clipboard!', {
                                description: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
                              })
                            })
                          } else {
                            import('sonner').then(({ toast }) => {
                              toast.error('No prompt available for this segment')
                            })
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy Prompt for External Generation</TooltipContent>
                  </Tooltip>
                  
                  {/* Take Button - Opens DirectorDialog for generation/regeneration */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 px-2"
                    onClick={() => setSelectedSegment(segment)}
                  >
                    <Settings2 className="w-3.5 h-3.5 mr-1" />
                    Take ({segment.takes?.length || 1})
                  </Button>
                </div>
              </div>
              
              {/* Protect Action for completed segments */}
              {item.status === 'complete' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={item.config.approvalStatus === 'locked' ? 'default' : 'outline'}
                        size="sm"
                        className={item.config.approvalStatus === 'locked' 
                          ? 'flex-1 bg-amber-600 hover:bg-amber-700 text-white' 
                          : 'flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }
                        onClick={() => handleToggleLock(item.segmentId)}
                      >
                        {item.config.approvalStatus === 'locked' ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                            Protected
                          </>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5 mr-1.5" />
                            Protect
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {item.config.approvalStatus === 'locked' 
                        ? 'Unprotect to allow replacement' 
                        : 'Protect this segment from batch operations'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </>
      )}

      
      {/* Scene Production Mixer - Unified render workflow (Collapsible) */}
      {segments.length > 0 && sceneId && (
        <div className="mt-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg overflow-hidden">
          {/* Mixer Header - Collapsible */}
          <button
            onClick={() => setMixerCollapsed(!mixerCollapsed)}
            className="w-full p-4 hover:bg-purple-500/5 transition-colors flex items-center gap-3"
          >
            {mixerCollapsed ? <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-400 flex-shrink-0" />}
            <Clapperboard className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-purple-300 font-medium">Scene Production Mixer</span>
            <span className="text-purple-400/70 text-sm ml-auto">Render final scene with audio</span>
          </button>
          
          {/* Collapsible Content */}
          <AnimatePresence>
            {!mixerCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-purple-500/20"
              >
        <SceneProductionMixer
          sceneId={sceneId}
          sceneNumber={sceneNumber}
          projectId={projectId}
          segments={segments}
          productionData={productionData}
          audioAssets={{
            narrationAudioUrl: scene?.narrationAudioUrl,
            narrationAudio: scene?.narrationAudio,
            narration: scene?.narration,
            dialogueAudio: scene?.dialogueAudio,
            dialogue: scene?.dialogue,
            musicAudio: scene?.musicAudio,
            music: scene?.music,
            sfx: scene?.sfx,
          }}
          textOverlays={textOverlays}
          onTextOverlaysChange={handleTextOverlaysChange}
          sceneIndex={sceneIndex}
          onGenerateSceneAudio={onGenerateSceneAudio}
          onGenerateAllAudio={onGenerateAllAudio}
          isGeneratingAudio={isGeneratingAudio}
          productionTarget={productionTarget}
          onProductionTargetChange={setProductionTarget}
          videoGenerationAvailable={videoGenerationAvailable}
          onRenderComplete={(downloadUrl, language) => {
            // Update the rendered scene URL
            setRenderedSceneUrl(downloadUrl)
            
            // Update or add the completed stream
            const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language)
            const updatedStreams = (() => {
              const prev = productionStreams
              // Check if there's an existing stream for this language
              const existingIndex = prev.findIndex(s => s.language === language)
              if (existingIndex >= 0) {
                // Update existing stream to complete
                return prev.map((s, i) => 
                  i === existingIndex 
                    ? { ...s, status: 'complete' as const, streamType: 'video' as const, mp4Url: downloadUrl, completedAt: new Date().toISOString() }
                    : s
                )
              }
              // Add new completed stream
              return [...prev, {
                id: `stream-${language}-${Date.now()}`,
                language,
                languageLabel: languageInfo?.name || language,
                status: 'complete' as const,
                streamType: 'video' as const,
                mp4Url: downloadUrl,
                completedAt: new Date().toISOString(),
              }]
            })()
            
            setProductionStreams(updatedStreams)
            
            // Persist to database - both URL and production streams
            if (onRenderedSceneUrlChange) {
              onRenderedSceneUrlChange(downloadUrl)
            }
            
            // Persist production streams to database
            // Always call with the new data, even if productionData was initially undefined
            if (onProductionDataChange) {
              const baseData = productionData || { isSegmented: false, segments: [] }
              onProductionDataChange({
                ...baseData,
                renderedSceneUrl: downloadUrl,
                renderedAt: new Date().toISOString(),
                productionStreams: updatedStreams,
              } as SceneProductionData)
            }
          }}
          onProductionStreamsChange={(streams) => {
            setProductionStreams(streams)
          }}
          isGeneratingSegments={isRendering}
        />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Production Streams Panel - View & manage animatic/video renders */}
      <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-purple-500/30">
        <ProductionStreamsPanel
          productionStreams={productionStreams}
          selectedLanguage={productionTarget.language}
          streamTypeTab={productionTarget.streamType}
          onRenderAnimatic={handleRenderAnimatic}
          onDeleteStream={handleDeleteStream}
          onReRenderStream={handleReRenderStream}
          onPreviewStream={handlePreviewStream}
          onDownloadStream={handleDownloadStream}
          isRendering={!!renderingStreamId}
          renderingStreamId={renderingStreamId}
          renderProgress={streamRenderProgress}
          hasSegmentChanges={false}
          videoGenerationAvailable={videoGenerationAvailable}
          disabled={isRendering}
        />
      </div>

      {/* DirectorDialog Modal */}
      {selectedSegment && (
        <DirectorDialog 
          segment={selectedSegment}
          sceneImageUrl={sceneImageUrl}
          scene={scene}
          isOpen={!!selectedSegment}
          onClose={() => setSelectedSegment(null)}
          onSaveConfig={handleSaveConfig}
          onGenerate={handleGenerateFromDialog}
        />
      )}
      
      {/* SceneVideoPlayer Modal */}
      <SceneVideoPlayer
        segments={segments}
        sceneNumber={sceneNumber}
        isOpen={isScenePlayerOpen}
        onClose={() => {
          setIsScenePlayerOpen(false)
          setPlayFromSegmentIndex(0)
        }}
        startAtSegment={playFromSegmentIndex}
        audioTracks={selectedAudioTracks}
        sceneAudio={{
          narrationUrl: scene?.narrationAudioUrl,
          musicUrl: scene?.musicAudio,
          // Collect dialogue audio URLs
          dialogueUrls: scene?.dialogueAudio?.en?.map(d => d?.audioUrl).filter(Boolean) || [],
          // Collect SFX audio URLs
          sfxUrls: scene?.sfx?.filter(s => s?.audioUrl).map(s => s.audioUrl!) || [],
        }}
        audioConfig={{
          narration: scene?.narrationAudioUrl ? {
            url: scene.narrationAudioUrl,
            startTime: audioTrackTiming.narration.startTime,
            duration: audioTrackTiming.narration.duration,
            volume: 0.8,
          } : undefined,
          music: scene?.musicAudio ? {
            url: scene.musicAudio,
            startTime: audioTrackTiming.music.startTime,
            duration: audioTrackTiming.music.duration,
            volume: 0.5,
            loop: false,
          } : undefined,
          dialogue: scene?.dialogueAudio?.en?.filter(d => d?.audioUrl).map((d, i) => ({
            url: d.audioUrl!,
            startTime: audioTrackTiming.dialogue.startTime + (i * 2), // Stagger dialogue lines
            duration: audioTrackTiming.dialogue.duration,
            volume: 0.9,
          })),
          sfx: scene?.sfx?.filter(s => s?.audioUrl).map((s, i) => ({
            url: s.audioUrl!,
            startTime: audioTrackTiming.sfx.startTime + (i * 1), // Stagger SFX
            duration: audioTrackTiming.sfx.duration,
            volume: 0.6,
          })),
        } as SceneAudioConfig}
      />
      
      {/* VideoEditingDialog for editing completed segment videos */}
      {editingVideoSegment && (
        <VideoEditingDialog
          open={!!editingVideoSegment}
          onClose={() => setEditingVideoSegment(null)}
          segment={editingVideoSegment}
          allSegments={segments}
          sceneImageUrl={sceneImageUrl}
          characters={scene?.characters}
          previousSegmentLastFrame={previousSegmentLastFrame}
          onGenerate={async (data) => {
            // Map VideoEditingDialog data to VideoGenerationConfig
            const segmentId = editingVideoSegment.segmentId
            const updatedConfig = {
              ...editingVideoSegment.config,
              mode: data.method,
              prompt: data.prompt,
              negativePrompt: data.negativePrompt || editingVideoSegment.config.negativePrompt,
              duration: data.duration || editingVideoSegment.config.duration,
              aspectRatio: data.aspectRatio || editingVideoSegment.config.aspectRatio,
              resolution: data.resolution || editingVideoSegment.config.resolution,
            }
            updateConfig(segmentId, updatedConfig)
            // Pass config via overrideConfigs to bypass React state async timing
            processQueue({
              mode: 'selected',
              priority: 'sequence',
              delayBetween: 6000,
              selectedIds: [segmentId],
              overrideConfigs: new Map([[segmentId, updatedConfig]]),
            })
            setEditingVideoSegment(null)
          }}
          isGenerating={isRendering && currentSegmentId === editingVideoSegment.segmentId}
        />
      )}
      
      {/* Scene Render Dialog - for exporting scene as MP4 */}
      <SceneRenderDialog
        open={isRenderDialogOpen}
        onOpenChange={(open) => {
          setIsRenderDialogOpen(open)
          if (!open) {
            setRenderDialogAnimaticSettings(undefined)
          }
        }}
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        projectId={projectId}
        segments={segments}
        productionData={productionData}
        renderMode={renderDialogMode}
        initialLanguage={renderDialogLanguage}
        animaticRenderSettings={renderDialogAnimaticSettings}
        audioData={{
          narrationUrl: scene?.narrationAudioUrl || scene?.narrationAudio?.[renderDialogLanguage]?.url,
          narrationDuration: scene?.narrationAudio?.[renderDialogLanguage]?.duration ?? 30,
          dialogueEntries: (() => {
            const dAudio = scene?.dialogueAudio
            const arr = Array.isArray(dAudio) ? dAudio : dAudio?.[renderDialogLanguage] || []
            return arr.filter(Boolean).map((d: { audioUrl?: string; duration?: number; character?: string }, i: number) => ({
              audioUrl: d?.audioUrl,
              duration: d?.duration ?? 3,
              character: scene?.dialogue?.[i]?.character || d?.character,
            }))
          })(),
          musicUrl: scene?.musicAudio,
          musicDuration: 30,
          sfxUrl: scene?.sfx?.find(s => s.audioUrl)?.audioUrl,
          sfxDuration: 5,
        }}
        onRenderComplete={handleRenderComplete}
      />
      
      {/* Rendered Scene MP4 Player Modal */}
      {isRenderedScenePlayerOpen && renderedSceneUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl p-4">
            <button
              onClick={() => setIsRenderedScenePlayerOpen(false)}
              className="absolute -top-2 -right-2 z-10 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300"
            >
              ✕
            </button>
            <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="!text-sm !leading-normal !mb-0 text-white font-medium flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-cyan-400" />
                  Scene {sceneNumber} - Rendered Video
                </h3>
                <a
                  href={renderedSceneUrl}
                  download={`scene-${sceneNumber}.mp4`}
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download MP4
                </a>
              </div>
              <video
                src={renderedSceneUrl}
                controls
                autoPlay
                className="w-full aspect-video bg-black"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* AddSpecialSegmentDialog for inserting cinematic elements */}
      <AddSpecialSegmentDialog
        open={cinematicDialogSegmentIndex !== null}
        onOpenChange={(open) => {
          if (!open) setCinematicDialogSegmentIndex(null)
        }}
        sceneId={sceneId}
        sceneNumber={sceneNumber}
        existingSegments={segments}
        insertAfterIndex={cinematicDialogSegmentIndex ?? undefined}
        adjacentContext={{
          currentScene: {
            heading: scene?.sceneHeading,
            action: scene?.action,
            narration: scene?.narration,
          },
          // Adjacent context could be enhanced with previous/next scene data if available
        }}
        onAddSegment={(segmentData) => {
          // Handle adding the new cinematic segment
          // This will need to integrate with the parent component's segment management
          import('sonner').then(({ toast }) => {
            toast.success(`${segmentData.segmentPurpose} segment added!`, {
              description: 'Configure it in the Director Dialog to generate video.',
            })
          })
          setCinematicDialogSegmentIndex(null)
          // TODO: Actually insert the segment via onProductionDataChange
        }}
        filmContext={{
          title: scene?.filmTitle,
          genre: scene?.genre ? [scene.genre] : undefined,
          tone: scene?.tone,
        }}
      />
    </div>
    </TooltipProvider>
  )
}

export default DirectorConsole
