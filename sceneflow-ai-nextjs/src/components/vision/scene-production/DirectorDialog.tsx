/**
 * DirectorDialog - Video Generation Configuration Modal
 * 
 * Part of the Director's Console "Pre-Flight" workflow.
 * Allows users to review and edit auto-drafted generation settings
 * before batch rendering.
 * 
 * Features:
 * - 3-tab interface: Text-to-Video | Image-to-Video | Extend | Reference
 * - Visual preview area showing start frame for I2V mode
 * - Prompt editing with contextual tips
 * - Advanced settings accordion (aspect ratio, resolution, negative prompts)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/Input'
import { 
  CheckCircle, 
  Info,
  Wand2,
  ImageIcon,
  FastForward,
  Type,
  AlertCircle,
  Play,
  Sparkles,
  Loader2,
  Undo2,
  Send,
  Users,
  X,
  Plus,
  ImageOff,
  Library,
  MapPin,
  Box,
  Shirt,
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationMethod, 
  VideoGenerationConfig 
} from './types'
import { useSegmentConfig, type SegmentGuideContext, segmentHasBatchGuideDialogue } from '@/hooks/useSegmentConfig'
import { GuidePromptEditor, type SceneAudioData } from './GuidePromptEditor'
import {
  buildDefaultBatchGuidePrompt,
  type GuideCharacterDemographic,
} from '@/lib/scene/segmentGuidePrompt'
import { DirectionDialog } from './DirectionDialog'
import { cn } from '@/lib/utils'
import { ContentPolicyAlert, PolicyFixedBanner } from './ContentPolicyAlert'
import { ImageEditModal } from '@/components/vision/ImageEditModal'
import { AnalyzeKeyframeRiskPanel } from './AnalyzeKeyframeRiskPanel'
import { moderatePrompt, type ModerationResult } from '@/utils/promptModerator'
import { shouldInitializeDirectorDialogState } from '@/lib/vision/directorDialogState'
import { MAX_VERTEX_GEMINI_REFERENCE_IMAGES } from '@/lib/vision/referenceLimits'
import { resolveSegmentVideoReferences } from '@/lib/vision/resolveBeatVideoReferences'
import type { BlueprintAspectRatio } from '@/lib/treatment/blueprintFoundation'
import { toVideoAspectRatio } from '@/lib/vision/artStyle'

type DirectorReferenceType = 'scene' | 'character' | 'object' | 'location' | 'wardrobe'

interface DirectorLibraryReference {
  id: string
  type: DirectorReferenceType
  name: string
  imageUrl: string
  description?: string
}

interface DirectorReferenceEntry {
  url: string
  name: string
  type: DirectorReferenceType
  role?: string
}

interface DirectorDialogProps {
  segment: SceneSegment
  sceneId: string
  sceneImageUrl?: string
  scene?: SceneAudioData
  isOpen: boolean
  onSaveConfig: (config: VideoGenerationConfig) => void
  onGenerate?: (segmentId: string, config: VideoGenerationConfig) => void
  onClose: () => void
  /** Persist keyframe after AI edit (same as vision handleEditFrame) */
  onSaveEditedKeyframe?: (
    sceneId: string,
    segmentId: string,
    frameType: 'start' | 'end',
    newFrameUrl: string
  ) => void
  /** Character demographics for guide / batch voice anchoring */
  guideCharacters?: GuideCharacterDemographic[]
  /** When true, video prompt is read-only (beat-first: edit script or Pre-Vis instead) */
  readOnlyPrompts?: boolean
  /** Object/prop references for keyframe AI edit modal and REF library */
  objectReferences?: Array<{ id: string; name: string; imageUrl?: string; description?: string }>
  /** Character references for optional identity preservation during keyframe edit and REF library */
  characterReferences?: Array<{
    name: string
    referenceImage?: string
    description?: string
    wardrobes?: Array<{ id: string; name: string; headshotUrl?: string; fullBodyUrl?: string }>
  }>
  /** Scene references for REF library */
  sceneReferences?: Array<{ id: string; name: string; imageUrl?: string; description?: string }>
  /** Location references for REF library */
  locationReferences?: Array<{
    id: string
    location: string
    locationDisplay: string
    imageUrl: string
    description?: string
  }>
  /** Locked project aspect ratio from Blueprint */
  projectAspectRatio?: BlueprintAspectRatio
  sceneIndex?: number
  filmTitle?: string
  /** Saved queue config (preserves videoProvider across dialog re-opens). */
  savedConfig?: VideoGenerationConfig
}

// Map internal mode names to VideoGenerationMethod
const modeToMethod: Record<string, VideoGenerationMethod> = {
  'TEXT_TO_VIDEO': 'T2V',
  'IMAGE_TO_VIDEO': 'I2V',
  'FRAME_TO_VIDEO': 'FTV',
  'EXTEND': 'EXT',
  'REFERENCE_IMAGES': 'REF',
}

const methodToMode: Record<VideoGenerationMethod, string> = {
  'T2V': 'TEXT_TO_VIDEO',
  'I2V': 'IMAGE_TO_VIDEO',
  'FTV': 'IMAGE_TO_VIDEO',
  'EXT': 'EXTEND',
  'REF': 'REFERENCE_IMAGES',
  'CIN': 'CINEMATIC',
}

/** Map generation method to UI tab (FTV coerced to I2V on active production path). */
function uiModeForMethod(method: VideoGenerationMethod): string {
  return methodToMode[method] ?? 'TEXT_TO_VIDEO'
}

function refsToConfig(entries: DirectorReferenceEntry[]): NonNullable<VideoGenerationConfig['referenceImages']> {
  return entries.map((e) => ({
    url: e.url,
    type: e.type === 'location' || e.type === 'object' ? 'style' : 'character',
    name: e.name,
    role: e.role,
  }))
}

export const DirectorDialog: React.FC<DirectorDialogProps> = ({ 
  segment, 
  sceneId,
  sceneImageUrl,
  scene,
  isOpen, 
  onSaveConfig,
  onGenerate,
  onClose,
  onSaveEditedKeyframe,
  guideCharacters = [],
  readOnlyPrompts = false,
  objectReferences = [],
  characterReferences = [],
  sceneReferences = [],
  locationReferences = [],
  projectAspectRatio = '16:9',
  sceneIndex,
  filmTitle,
  savedConfig,
}) => {
  const segmentGuideContext = useMemo<SegmentGuideContext | undefined>(() => {
    if (!scene) return undefined
    return {
      scene,
      characters: guideCharacters,
      sceneIndex,
      filmTitle,
      projectCharacters: characterReferences,
      locationReferences,
      objectReferences,
      fullScene: scene as unknown as Record<string, unknown>,
    }
  }, [scene, guideCharacters, sceneIndex, filmTitle, characterReferences, locationReferences, objectReferences])

  const lockedVideoAspect = toVideoAspectRatio(projectAspectRatio)

  // Get auto-drafted config (includes batch guidePrompt when dialogue is assigned)
  const { config: autoConfig, methodLabel, methodReason } = useSegmentConfig(
    segment,
    sceneImageUrl,
    segmentGuideContext,
    projectAspectRatio
  )

  const batchGuideSeed = useMemo(
    () =>
      scene && segmentHasBatchGuideDialogue(segment)
        ? buildDefaultBatchGuidePrompt(segment, scene, guideCharacters)
        : '',
    [scene, segment, guideCharacters]
  )
  
  // Local state initialized with auto-drafted values
  const [mode, setMode] = useState<string>(methodToMode[autoConfig.mode])
  const [prompt, setPrompt] = useState(autoConfig.prompt)
  const [motionPrompt, setMotionPrompt] = useState(autoConfig.motionPrompt)
  const [visualPrompt, setVisualPrompt] = useState(autoConfig.visualPrompt)
  const [negativePrompt, setNegativePrompt] = useState(autoConfig.negativePrompt)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(lockedVideoAspect)
  const [resolution, setResolution] = useState<'720p' | '1080p'>(autoConfig.resolution)
  const [duration, setDuration] = useState(autoConfig.duration)
  const [guidePrompt, setGuidePrompt] = useState('')

  // Full API prompt preview / override
  const [apiPromptPreview, setApiPromptPreview] = useState('')
  const [apiPromptPreviewLoading, setApiPromptPreviewLoading] = useState(false)
  const [apiPromptPreviewError, setApiPromptPreviewError] = useState<string | null>(null)
  const [useCustomApiPrompt, setUseCustomApiPrompt] = useState(false)
  const [apiPromptOverride, setApiPromptOverride] = useState('')
  const [allowPolicyFallback, setAllowPolicyFallback] = useState(false)
  const [videoProvider, setVideoProvider] = useState<'vertex' | 'aggregator'>('vertex')
  const [videoModel, setVideoModel] = useState('kling-2.6')
  const [aggregatorEnabled, setAggregatorEnabled] = useState(false)
  const [aggregatorModels, setAggregatorModels] = useState<
    Array<{ id: string; label: string; costPerSecondUsd: number; nativeAudio: boolean }>
  >([])
  
  // Intelligent prompt modification state
  const [promptInstruction, setPromptInstruction] = useState('')
  const [isModifyingPrompt, setIsModifyingPrompt] = useState(false)
  const [isOptimizingForMode, setIsOptimizingForMode] = useState(false)
  const [promptHistory, setPromptHistory] = useState<string[]>([])  // For undo support
  
  // Reference images state (Omni REF — up to 8 labeled references)
  const [referenceImages, setReferenceImages] = useState<DirectorReferenceEntry[]>([])

  const autoResolvedRefs = useMemo(() => {
    if (!scene || !segment.beatId) {
      return { entries: [] as DirectorReferenceEntry[], warnings: [] as string[] }
    }
    const resolved = resolveSegmentVideoReferences(segment, scene as unknown as Record<string, unknown>, {
      sceneIndex,
      projectCharacters: characterReferences,
      locationReferences,
      objectReferences,
      filmTitle,
    })
    const entries: DirectorReferenceEntry[] = resolved.labeledRefs.map((ref) => ({
      url: ref.url,
      name: ref.name,
      type:
        ref.role === 'location'
          ? 'location'
          : ref.role?.startsWith('prop-')
            ? 'object'
            : ref.role === 'wardrobe'
              ? 'wardrobe'
              : 'character',
      role: ref.role,
    }))
    return { entries, warnings: resolved.warnings }
  }, [scene, segment, sceneIndex, characterReferences, locationReferences, objectReferences, filmTitle])

  const combinedReferenceLibrary = useMemo((): DirectorLibraryReference[] => {
    const library: DirectorLibraryReference[] = []

    sceneReferences.forEach(ref => {
      if (ref.imageUrl) {
        library.push({
          id: ref.id,
          type: 'scene',
          name: ref.name,
          imageUrl: ref.imageUrl,
          description: ref.description,
        })
      }
    })

    characterReferences.forEach(char => {
      if (char.referenceImage) {
        library.push({
          id: `char-${char.name}`,
          type: 'character',
          name: char.name,
          imageUrl: char.referenceImage,
          description: char.description,
        })
      }
      char.wardrobes?.forEach(wardrobe => {
        const wardrobeWithPreview = wardrobe as {
          fullBodyUrl?: string
          headshotUrl?: string
          previewImageUrl?: string
        }
        const imageUrl =
          wardrobeWithPreview.fullBodyUrl ??
          wardrobeWithPreview.headshotUrl ??
          wardrobeWithPreview.previewImageUrl
        if (!imageUrl) return
        library.push({
          id: `wardrobe-${char.name}-${wardrobe.id}`,
          type: 'wardrobe',
          name: `${char.name} — ${wardrobe.name}`,
          imageUrl,
        })
      })
    })

    objectReferences.forEach(ref => {
      if (ref.imageUrl) {
        library.push({
          id: ref.id,
          type: 'object',
          name: ref.name,
          imageUrl: ref.imageUrl,
          description: ref.description,
        })
      }
    })

    locationReferences.forEach(ref => {
      if (ref.imageUrl) {
        library.push({
          id: ref.id,
          type: 'location',
          name: ref.locationDisplay || ref.location,
          imageUrl: ref.imageUrl,
          description: ref.description,
        })
      }
    })

    return library
  }, [sceneReferences, characterReferences, objectReferences, locationReferences])

  const handleSelectLibraryReference = useCallback((ref: DirectorLibraryReference) => {
    setReferenceImages(prev => {
      if (prev.length >= MAX_VERTEX_GEMINI_REFERENCE_IMAGES || prev.some((p) => p.url === ref.imageUrl)) {
        return prev
      }
      return [
        ...prev,
        { url: ref.imageUrl, name: ref.name, type: ref.type },
      ]
    })
  }, [])
  
  // Direction Dialog state
  const [isDirectionDialogOpen, setIsDirectionDialogOpen] = useState(false)
  
  // Content policy post-failure state (after Vertex rejects a generation)
  const [postFailureModerationResult, setPostFailureModerationResult] = useState<ModerationResult | null>(null)
  const [promptFixApplied, setPromptFixApplied] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [imageTriggered, setImageTriggered] = useState(false)

  // Force GuidePromptEditor remount on reset
  const [editorResetKey, setEditorResetKey] = useState(0)

  const [keyframeEdit, setKeyframeEdit] = useState<{ frameType: 'start' | 'end'; url: string } | null>(null)
  // Quality tier state - default to 'fast' for all modes (cost-optimized)
  // Users can manually select 'premium' when higher quality is needed
  const [qualityTier, setQualityTier] = useState<'fast' | 'premium'>('fast')
  const wasOpenRef = useRef(false)
  const lastInitializedSegmentIdRef = useRef<string | null>(null)
  
  // Intelligent prompt modification handler
  const handleModifyPrompt = useCallback(async () => {
    if (!promptInstruction.trim()) return
    
    const currentPrompt = visualPrompt
    if (!currentPrompt) return
    
    setIsModifyingPrompt(true)
    
    // Save current prompt to history for undo
    setPromptHistory(prev => [...prev, currentPrompt])
    
    try {
      const response = await fetch('/api/prompt/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt,
          instruction: promptInstruction,
          mode: modeToMethod[mode],
          context: {
            hasStartFrame: !!(segment.startFrameUrl || segment.references?.startFrameUrl),
            hasEndFrame: !!(segment.endFrameUrl || segment.references?.endFrameUrl),
          }
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.modifiedPrompt) {
          setVisualPrompt(data.modifiedPrompt)
          setPromptInstruction('')
        }
      } else {
        console.error('[DirectorDialog] Failed to modify prompt')
      }
    } catch (error) {
      console.error('[DirectorDialog] Error modifying prompt:', error)
    } finally {
      setIsModifyingPrompt(false)
    }
  }, [mode, motionPrompt, visualPrompt, promptInstruction, segment])
  
  // Undo prompt modification
  const handleUndoPrompt = useCallback(() => {
    if (promptHistory.length === 0) return
    
    const previousPrompt = promptHistory[promptHistory.length - 1]
    setPromptHistory(prev => prev.slice(0, -1))
    
    setVisualPrompt(previousPrompt)
  }, [promptHistory])
  
  // Optimize prompt for the currently selected mode
  const handleOptimizeForMode = useCallback(async () => {
    const currentPrompt = visualPrompt
    if (!currentPrompt?.trim()) return
    
    setIsOptimizingForMode(true)
    
    // Save current prompt to history for undo
    setPromptHistory(prev => [...prev, currentPrompt])
    
    // Mode-specific optimization instructions
    const modeInstructions: Record<string, string> = {
      'FRAME_TO_VIDEO': 'Rewrite this prompt specifically for Frame-to-Video (FTV) interpolation mode. Focus ONLY on describing smooth motion and transitions between the start and end keyframes. Remove any camera movements that would cause the video to deviate from matching the end frame (no zoom out, pan away, pull back). Add language that anchors to the end frame. Remove detailed scene descriptions - focus on MOTION only.',
      'IMAGE_TO_VIDEO': 'Rewrite this prompt for Image-to-Video (I2V) mode. The video will animate from a reference image. Describe how the static image should come to life - subtle movements, breathing, blinking, environmental motion. Maintain consistency with the starting image composition.',
      'TEXT_TO_VIDEO': 'Rewrite this prompt for Text-to-Video (T2V) mode. Describe the complete visual scene including composition, lighting, characters, environment, and action. Be specific about visual details since there is no reference image.',
      'EXTEND': 'Rewrite this prompt for video extension mode. Focus on describing the continuation of motion and action that would naturally follow from a previous video clip. Maintain visual continuity.',
    }
    
    const instruction = modeInstructions[mode] || modeInstructions['TEXT_TO_VIDEO']
    
    try {
      const response = await fetch('/api/prompt/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt,
          instruction,
          mode: modeToMethod[mode],
          context: {
            hasStartFrame: !!(segment.startFrameUrl || segment.references?.startFrameUrl),
            hasEndFrame: !!(segment.endFrameUrl || segment.references?.endFrameUrl),
          }
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.modifiedPrompt) {
          setVisualPrompt(data.modifiedPrompt)
        }
      } else {
        console.error('[DirectorDialog] Failed to optimize prompt for mode')
        // Revert history since optimization failed
        setPromptHistory(prev => prev.slice(0, -1))
      }
    } catch (error) {
      console.error('[DirectorDialog] Error optimizing prompt:', error)
      // Revert history since optimization failed
      setPromptHistory(prev => prev.slice(0, -1))
    } finally {
      setIsOptimizingForMode(false)
    }
  }, [mode, motionPrompt, visualPrompt, segment])
  
  // Calculate dynamic Visual Fidelity based on currently selected mode
  const visualFidelity = useMemo(() => {
    const activePrompt = visualPrompt
    
    const baseScores: Record<string, number> = {
      'IMAGE_TO_VIDEO': 75,
      'EXTEND': 68,
      'TEXT_TO_VIDEO': 35,
    }
    
    let score = baseScores[mode] || 50
    
    // Prompt quality bonus (based on length and specificity)
    const wordCount = (activePrompt || '').split(/\s+/).filter(w => w).length
    if (wordCount >= 20 && wordCount <= 80) score += 4
    else if (wordCount >= 10) score += 2
    
    // Specific motion/visual terms improve fidelity
    const promptLower = (activePrompt || '').toLowerCase()
    if (promptLower.includes('camera')) score += 2
    if (promptLower.includes('slowly') || promptLower.includes('smoothly')) score += 1
    if (promptLower.includes('cinematic') || promptLower.includes('photorealistic')) score += 1
    
    if (mode === 'TEXT_TO_VIDEO' && (segment.startFrameUrl || segment.references?.startFrameUrl)) score += 10
    
    return Math.min(100, Math.max(10, Math.round(score)))
  }, [mode, segment, visualPrompt])
  
  useEffect(() => {
    setPrompt(visualPrompt)
  }, [visualPrompt])
  
  // Auto-optimize prompt when mode changes
  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode)
    // Trigger auto-optimization for the new mode (after state updates)
    setTimeout(() => {
      const currentPrompt = visualPrompt
      if (currentPrompt?.trim()) {
        handleOptimizeForModeWithValue(newMode, currentPrompt)
      }
    }, 0)
  }, [motionPrompt, visualPrompt])
  
  // Optimize prompt for a specific mode with a given prompt value
  const handleOptimizeForModeWithValue = useCallback(async (targetMode: string, currentPrompt: string) => {
    if (!currentPrompt?.trim()) return
    
    setIsOptimizingForMode(true)
    
    // Save current prompt to history for undo
    setPromptHistory(prev => [...prev, currentPrompt])
    
    // Mode-specific optimization instructions
    const modeInstructions: Record<string, string> = {
      'FRAME_TO_VIDEO': 'Rewrite this prompt specifically for Frame-to-Video (FTV) interpolation mode. Focus ONLY on describing smooth motion and transitions between the start and end keyframes. Remove any camera movements that would cause the video to deviate from matching the end frame (no zoom out, pan away, pull back). Add language that anchors to the end frame. Remove detailed scene descriptions - focus on MOTION only.',
      'IMAGE_TO_VIDEO': 'Rewrite this prompt for Image-to-Video (I2V) mode. The video will animate from a reference image. Describe how the static image should come to life - subtle movements, breathing, blinking, environmental motion. Maintain consistency with the starting image composition.',
      'TEXT_TO_VIDEO': 'Rewrite this prompt for Text-to-Video (T2V) mode. Describe the complete visual scene including composition, lighting, characters, environment, and action. Be specific about visual details since there is no reference image.',
      'EXTEND': 'Rewrite this prompt for video extension mode. Focus on describing the continuation of motion and action that would naturally follow from a previous video clip. Maintain visual continuity.',
    }
    
    const instruction = modeInstructions[targetMode] || modeInstructions['TEXT_TO_VIDEO']
    
    try {
      const response = await fetch('/api/prompt/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt,
          instruction,
          mode: modeToMethod[targetMode],
          context: {
            hasStartFrame: !!(segment.startFrameUrl || segment.references?.startFrameUrl),
            hasEndFrame: !!(segment.endFrameUrl || segment.references?.endFrameUrl),
          }
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.modifiedPrompt) {
          setVisualPrompt(data.modifiedPrompt)
        }
      } else {
        console.error('[DirectorDialog] Failed to optimize prompt for mode')
        setPromptHistory(prev => prev.slice(0, -1))
      }
    } catch (error) {
      console.error('[DirectorDialog] Error optimizing prompt:', error)
      setPromptHistory(prev => prev.slice(0, -1))
    } finally {
      setIsOptimizingForMode(false)
    }
  }, [segment])
  
  const initializeDialogState = useCallback(() => {
    const isContinuation =
      segment.veoTimelineContinuation ||
      segment.generationMethod === 'EXT' ||
      segment.videoChain?.chainMethod === 'extension'
    const initialMode = isContinuation
      ? 'EXTEND'
      : uiModeForMethod(autoConfig.mode)

    setMode(initialMode)
    setPrompt(autoConfig.prompt)
    setMotionPrompt(autoConfig.motionPrompt)
    setVisualPrompt(autoConfig.visualPrompt)
    setNegativePrompt(autoConfig.negativePrompt)
    setAspectRatio(lockedVideoAspect)
    setResolution(autoConfig.resolution)
    setDuration(isContinuation ? 10 : autoConfig.duration)
    setGuidePrompt(batchGuideSeed || autoConfig.guidePrompt || '')
    setReferenceImages(autoResolvedRefs.entries)
    // Reset content policy state on open
    setPostFailureModerationResult(null)
    setPromptFixApplied(false)
    setLocalError(null)
    setImageTriggered(false)
    setKeyframeEdit(null)
    setUseCustomApiPrompt(autoConfig.useCustomApiPrompt ?? savedConfig?.useCustomApiPrompt ?? false)
    setApiPromptOverride(autoConfig.apiPromptOverride ?? savedConfig?.apiPromptOverride ?? '')
    setAllowPolicyFallback(autoConfig.allowPolicyFallback ?? savedConfig?.allowPolicyFallback ?? false)
    setVideoProvider(savedConfig?.videoProvider ?? autoConfig.videoProvider ?? 'vertex')
    setVideoModel(savedConfig?.videoModel ?? autoConfig.videoModel ?? 'kling-2.6')
    setApiPromptPreview('')
    setApiPromptPreviewError(null)
  }, [autoConfig, savedConfig, lockedVideoAspect, batchGuideSeed, segment, autoResolvedRefs.entries])

  const fetchApiPromptPreview = useCallback(async () => {
    const method = modeToMethod[mode]
    const startFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || undefined
    const endFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl || undefined
    const refPayload =
      method === 'REF'
        ? referenceImages.map((ref) => ({
            url: ref.url,
            type: (ref.type === 'character' || ref.type === 'wardrobe' ? 'character' : 'style') as
              | 'style'
              | 'character',
            name: ref.name,
            role: ref.role,
          }))
        : undefined

    setApiPromptPreviewLoading(true)
    setApiPromptPreviewError(null)
    try {
      const res = await fetch(
        `/api/segments/${encodeURIComponent(segment.segmentId)}/preview-api-prompt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: visualPrompt,
            guidePrompt: guidePrompt || undefined,
            generationMethod: method,
            startFrameUrl,
            endFrameUrl,
            segmentIndex: segment.sequenceIndex,
            referenceImages: refPayload,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Preview failed (${res.status})`)
      }
      const data = await res.json()
      setApiPromptPreview(data.apiPrompt || '')
    } catch (e) {
      setApiPromptPreviewError(
        e instanceof Error ? e.message : 'Preview unavailable — enable custom mode to paste prompt manually'
      )
    } finally {
      setApiPromptPreviewLoading(false)
    }
  }, [mode, visualPrompt, guidePrompt, referenceImages, segment])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      void fetchApiPromptPreview()
    }, 400)
    return () => clearTimeout(timer)
  }, [isOpen, fetchApiPromptPreview])

  const displayedApiPrompt = useCustomApiPrompt ? apiPromptOverride : apiPromptPreview
  const canGenerateWithCustomPrompt = !useCustomApiPrompt || apiPromptOverride.trim().length > 0

  const appendAdvancedConfig = (config: VideoGenerationConfig): VideoGenerationConfig => ({
    ...config,
    useCustomApiPrompt,
    apiPromptOverride: useCustomApiPrompt ? apiPromptOverride.trim() : undefined,
    allowPolicyFallback: videoProvider === 'vertex' ? allowPolicyFallback : false,
    videoProvider,
    videoModel: videoProvider === 'aggregator' ? videoModel : undefined,
  })

  const selectedAggregatorModelLabel =
    aggregatorModels.find((m) => m.id === videoModel)?.label ?? videoModel

  const generateButtonLabel =
    videoProvider === 'aggregator'
      ? `Generate via Multiplatform${selectedAggregatorModelLabel ? ` (${selectedAggregatorModelLabel})` : ''}`
      : 'Generate via Veo'

  useEffect(() => {
    if (!isOpen) return
    void fetch('/api/config/video-providers', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setAggregatorEnabled(data.enabled === true)
        if (Array.isArray(data.models)) {
          setAggregatorModels(data.models)
          if (data.defaultModel && !videoModel) setVideoModel(data.defaultModel)
        }
      })
      .catch(() => setAggregatorEnabled(false))
  }, [isOpen])

  // Initialize state only on open transition or segment change while open.
  useEffect(() => {
    const shouldInit = shouldInitializeDirectorDialogState({
      isOpen,
      wasOpen: wasOpenRef.current,
      currentSegmentId: segment.segmentId,
      lastInitializedSegmentId: lastInitializedSegmentIdRef.current,
    })

    if (shouldInit) {
      initializeDialogState()
      lastInitializedSegmentIdRef.current = segment.segmentId
    }

    if (!isOpen) {
      lastInitializedSegmentIdRef.current = null
    }

    wasOpenRef.current = isOpen
  }, [isOpen, segment.segmentId, initializeDialogState])

  // Detect post-failure content policy errors when segment status changes
  useEffect(() => {
    if (segment.status === 'ERROR' && segment.errorMessage) {
      const errMsg = segment.errorMessage
      setLocalError(errMsg)

      const isContentPolicy = errMsg.includes('Content Policy') ||
        errMsg.includes('safety filter') ||
        errMsg.includes('violat') ||
        errMsg.includes('usage guidelines')

      if (isContentPolicy) {
        const currentPrompt = visualPrompt
        const isImageBasedMethod = mode === 'IMAGE_TO_VIDEO' || mode === 'REFERENCE_IMAGES'
        const fromServer = segment.lastContentPolicyFailure
        const hintLines = fromServer?.hints?.length
          ? fromServer.hints
          : []

        if (fromServer?.optionalSanitized?.prompt) {
          setImageTriggered(false)
          setPostFailureModerationResult({
            isClean: false,
            severity: 'low',
            flaggedTerms: [],
            suggestedPrompt: fromServer.optionalSanitized.prompt,
            warnings: [
              ...hintLines,
              'Optional: Auto-Fix updates your main video prompt (and guide/audio text if suggestions exist).',
            ],
          })
        } else if (fromServer?.optionalSanitized?.guidePrompt && currentPrompt) {
          setImageTriggered(false)
          setPostFailureModerationResult({
            isClean: false,
            severity: 'low',
            flaggedTerms: [],
            suggestedPrompt: currentPrompt,
            warnings: [
              ...hintLines,
              'Optional: Auto-Fix will apply softer wording to your audio/SFX guide only.',
            ],
          })
        } else if (currentPrompt) {
          const modResult = moderatePrompt(currentPrompt)
          if (modResult.isClean && isImageBasedMethod) {
            setImageTriggered(true)
            setPostFailureModerationResult({
              isClean: false,
              severity: 'medium',
              flaggedTerms: [],
              suggestedPrompt: currentPrompt,
              warnings: [
                ...hintLines,
                'Your prompt passed local checks, but Vertex still blocked the request. With start/end frames or a reference image, the visuals—not the text—often cause the block.',
                'Try Image-to-Video with only the start frame, adjust keyframes, or use "Retry as Text-to-Video" below.',
              ],
            })
          } else if (modResult.isClean) {
            setImageTriggered(false)
            setPostFailureModerationResult({
              isClean: false,
              severity: 'medium',
              flaggedTerms: [],
              suggestedPrompt: currentPrompt,
              warnings: [
                ...hintLines,
                'Vertex rejected the request but no local trigger words were found. Try AI Rephrase or optional wording after a retry.',
              ],
            })
          } else {
            setImageTriggered(false)
            setPostFailureModerationResult({
              ...modResult,
              warnings: [...hintLines, ...modResult.warnings],
            })
          }
        }
      } else {
        setPostFailureModerationResult(null)
      }
    } else if (segment.status === 'COMPLETE' || segment.status === 'GENERATING') {
      setLocalError(null)
      setPostFailureModerationResult(null)
      setImageTriggered(false)
    }
  }, [segment.status, segment.errorMessage, segment.lastContentPolicyFailure, mode, motionPrompt, visualPrompt])
  
  const handleSave = () => {
    const method = modeToMethod[mode]
    const effectiveMethod = method === 'FTV' ? 'I2V' : method
    const resolvedStartFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || null
    
    const savedConfig = appendAdvancedConfig({
      mode: effectiveMethod,
      prompt: visualPrompt,
      motionPrompt,
      visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration: mode === 'EXTEND' ? 10 : duration,
      startFrameUrl: resolvedStartFrameUrl,
      endFrameUrl: null,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      qualityTier: qualityTier,
      referenceImages: method === 'REF' ? refsToConfig(referenceImages) : undefined,
    })
    onSaveConfig(savedConfig)
  }
  
  // AI Rephrase handler for ContentPolicyAlert
  const handleAIRephrase = useCallback(async (originalPrompt: string): Promise<string> => {
    const response = await fetch('/api/prompt/rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: originalPrompt,
        flaggedTerms: postFailureModerationResult?.flaggedTerms.map(ft => ft.term) || []
      })
    })
    if (!response.ok) throw new Error('Failed to rephrase prompt')
    const data = await response.json()
    return data.rephrasedPrompt || data.prompt || originalPrompt
  }, [postFailureModerationResult])

  // Apply content policy fix — updates the active prompt
  const handleApplyContentFix = useCallback((fixedPrompt: string) => {
    setVisualPrompt(fixedPrompt)
    const g = segment.lastContentPolicyFailure?.optionalSanitized?.guidePrompt
    if (g) {
      setGuidePrompt(g)
    }
    setPostFailureModerationResult(null)
    setLocalError(null)
    setImageTriggered(false)
    setPromptFixApplied(true)
    setTimeout(() => setPromptFixApplied(false), 5000)
  }, [segment.lastContentPolicyFailure])

  // Retry as T2V — fallback when reference image triggers content policy
  const handleRetryAsT2V = useCallback(() => {
    setMode('TEXT_TO_VIDEO')
    setLocalError(null)
    setPostFailureModerationResult(null)
    setImageTriggered(false)
    setPromptFixApplied(false)
    
    const currentPrompt = visualPrompt
    if (currentPrompt) {
      setVisualPrompt(currentPrompt)
    }
    
    // Build T2V config without reference images and generate
    const t2vConfig = appendAdvancedConfig({
      mode: 'T2V',
      prompt: currentPrompt || visualPrompt,
      motionPrompt,
      visualPrompt: currentPrompt || visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration: mode === 'EXTEND' ? 10 : duration,
      startFrameUrl: null,
      endFrameUrl: null,
      sourceVideoUrl: null,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      qualityTier,
    })
    
    onSaveConfig(t2vConfig)
    if (onGenerate) {
      onGenerate(segment.segmentId, t2vConfig)
    }
    onClose()
  }, [mode, motionPrompt, visualPrompt, negativePrompt, guidePrompt, aspectRatio, resolution, duration, autoConfig.confidence, qualityTier, onSaveConfig, onGenerate, segment.segmentId, onClose, appendAdvancedConfig])

  // Handle generate - saves config AND triggers generation
  const handleGenerate = () => {
    const method = modeToMethod[mode]
    const effectiveMethod = method === 'FTV' ? 'I2V' : method
    const resolvedStartFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || null
    
    const savedConfig = appendAdvancedConfig({
      mode: effectiveMethod,
      prompt: visualPrompt,
      motionPrompt,
      visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration: mode === 'EXTEND' ? 10 : duration,
      startFrameUrl: resolvedStartFrameUrl,
      endFrameUrl: null,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      qualityTier: qualityTier,
      referenceImages: method === 'REF' ? refsToConfig(referenceImages) : undefined,
    })
    
    onSaveConfig(savedConfig)
    if (onGenerate) {
      onGenerate(segment.segmentId, savedConfig)
    }
    onClose()
  }
  
  const startFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl
  const hasExistingVideo = segment.activeAssetUrl && segment.assetType === 'video'
  const isContinuationSegment =
    segment.veoTimelineContinuation ||
    segment.generationMethod === 'EXT' ||
    segment.videoChain?.chainMethod === 'extension'
  const continuationDialogueExcerpt =
    segment.dialoguePortion?.excerpt?.trim() ||
    segment.dialogueLines?.find((d) => d.covered !== false)?.line?.trim() ||
    ''
  
  const tabStates = {
    TEXT_TO_VIDEO: true,
    IMAGE_TO_VIDEO: !!startFrameUrl || !!sceneImageUrl,
    EXTEND: !!hasExistingVideo || isContinuationSegment || !!autoConfig.sourceVideoUrl,
    REFERENCE_IMAGES: true,
  }
  
  const tabDisabledReasons: Record<string, string> = {
    IMAGE_TO_VIDEO: !tabStates.IMAGE_TO_VIDEO ? 'Generate a Start Frame first (Frame step)' : '',
    EXTEND: !tabStates.EXTEND ? 'Generate the previous part first or render a source video' : '',
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
        
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            Generate Video: Beat {segment.sequenceIndex + 1}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Review and customize generation parameters before rendering.
          </DialogDescription>
        </DialogHeader>

        {/* Guide Prompt Editor - Audio & Scene Direction Context */}
        {scene && (
          <div className="mt-2 space-y-2">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-slate-600 text-slate-300"
                onClick={() => {
                  setGuidePrompt(batchGuideSeed)
                  setEditorResetKey(k => k + 1)
                }}
                disabled={!batchGuideSeed}
              >
                Reset to segment dialogue
              </Button>
            </div>
            <GuidePromptEditor
              key={`guide-editor-${segment.segmentId}-${editorResetKey}`}
              segment={segment}
              scene={scene}
              characters={guideCharacters}
              defaultElementsMode={
                segment.dialogueLineIds && segment.dialogueLineIds.length > 0 ? 'batch' : 'interactive'
              }
              onGuidePromptChange={setGuidePrompt}
              onNegativePromptChange={setNegativePrompt}
            />
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 mt-4">
          
          {/* Mode Selection Tabs */}
          <div className="col-span-12">
            {!tabStates.IMAGE_TO_VIDEO && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Frame-First Workflow:</strong> Generate keyframes in the Frame step for better character consistency. 
                  Text-to-Video is available but may result in character drift.
                </span>
              </div>
            )}
            
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="bg-slate-800/80 w-full grid grid-cols-2 md:grid-cols-4 gap-1 p-1">
                <TabsTrigger 
                  value="TEXT_TO_VIDEO" 
                  className="gap-2 data-[state=active]:bg-indigo-600"
                  disabled={!tabStates.TEXT_TO_VIDEO}
                >
                  <Type className="w-4 h-4" />
                  <span className="hidden sm:inline">Text-to-Video</span>
                  <span className="sm:hidden">T2V</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="IMAGE_TO_VIDEO" 
                  className="gap-2 data-[state=active]:bg-indigo-600 disabled:opacity-50"
                  disabled={!tabStates.IMAGE_TO_VIDEO}
                  title={tabDisabledReasons.IMAGE_TO_VIDEO}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Image-to-Video</span>
                  <span className="sm:hidden">I2V</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="REFERENCE_IMAGES" 
                  className="gap-2 data-[state=active]:bg-emerald-600"
                  disabled={!tabStates.REFERENCE_IMAGES}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Reference</span>
                  <span className="sm:hidden">REF</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="EXTEND" 
                  className="gap-2 data-[state=active]:bg-indigo-600 disabled:opacity-50"
                  disabled={!tabStates.EXTEND}
                  title={tabDisabledReasons.EXTEND}
                >
                  <FastForward className="w-4 h-4" />
                  <span>Extend</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Preview Area */}
          <div className="col-span-7 bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
            {mode === 'REFERENCE_IMAGES' ? (
              /* Reference Images Preview - Shows uploaded character/style references */
              <div className="p-4 w-full max-h-full overflow-y-auto">
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <div className="flex items-center gap-3 mb-4">
                    {referenceImages.length > 0 ? (
                      referenceImages.map((entry, index) => (
                        <div key={`${entry.url}-${index}`} className="relative group">
                          <div className="w-24 h-24 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                            <img 
                              src={entry.url} 
                              alt={entry.name}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <button
                            onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <Badge className="absolute bottom-1 left-1 text-[10px] bg-slate-800/90 capitalize">{entry.type}</Badge>
                        </div>
                      ))
                    ) : null}
                    {referenceImages.length < MAX_VERTEX_GEMINI_REFERENCE_IMAGES && (
                      <label className="w-24 h-24 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800 transition-colors">
                        <Plus className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400">Add Ref</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file && referenceImages.length < MAX_VERTEX_GEMINI_REFERENCE_IMAGES) {
                              const reader = new FileReader()
                              reader.onload = () => {
                                setReferenceImages(prev => [
                                  ...prev,
                                  {
                                    url: reader.result as string,
                                    name: file.name,
                                    type: 'character',
                                  },
                                ])
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {autoResolvedRefs.warnings.length > 0 && (
                    <p className="text-xs text-amber-400/90 text-center mb-2">{autoResolvedRefs.warnings[0]}</p>
                  )}
                  <p className="text-sm text-slate-400 text-center">
                    {referenceImages.length === 0 
                      ? `Auto-detected beat references appear here (up to ${MAX_VERTEX_GEMINI_REFERENCE_IMAGES})`
                      : `${referenceImages.length}/${MAX_VERTEX_GEMINI_REFERENCE_IMAGES} reference images added`
                    }
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Use character headshots or style references from your project
                  </p>

                  {/* Reference Library Picker */}
                  <div className="w-full border-t border-slate-700 pt-4 mt-2">
                    <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                      <Library className="w-4 h-4" />
                      Select from Reference Library
                    </h3>
                    {combinedReferenceLibrary.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        <Library className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No reference images available in your project</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                        {combinedReferenceLibrary.filter(r => r.type === 'character').length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> Characters
                            </h4>
                            <div className="grid grid-cols-4 gap-2">
                              {combinedReferenceLibrary.filter(r => r.type === 'character').map(ref => (
                                <button
                                  key={ref.id}
                                  type="button"
                                  disabled={referenceImages.length >= MAX_VERTEX_GEMINI_REFERENCE_IMAGES || referenceImages.some((e) => e.url === ref.imageUrl)}
                                  onClick={() => handleSelectLibraryReference(ref)}
                                  className="group relative aspect-square rounded-lg border border-slate-700 overflow-hidden hover:border-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                                    <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-white bg-purple-500 rounded-full p-1" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {combinedReferenceLibrary.filter(r => r.type === 'wardrobe').length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-rose-400 mb-2 flex items-center gap-1">
                              <Shirt className="w-3.5 h-3.5" /> Wardrobe
                            </h4>
                            <div className="grid grid-cols-4 gap-2">
                              {combinedReferenceLibrary.filter(r => r.type === 'wardrobe').map(ref => (
                                <button
                                  key={ref.id}
                                  type="button"
                                  disabled={referenceImages.length >= MAX_VERTEX_GEMINI_REFERENCE_IMAGES || referenceImages.some((e) => e.url === ref.imageUrl)}
                                  onClick={() => handleSelectLibraryReference(ref)}
                                  className="group relative aspect-square rounded-lg border border-slate-700 overflow-hidden hover:border-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                                    <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-white bg-rose-500 rounded-full p-1" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {combinedReferenceLibrary.filter(r => r.type === 'scene').length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" /> Scene References
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              {combinedReferenceLibrary.filter(r => r.type === 'scene').map(ref => (
                                <button
                                  key={ref.id}
                                  type="button"
                                  disabled={referenceImages.length >= MAX_VERTEX_GEMINI_REFERENCE_IMAGES || referenceImages.some((e) => e.url === ref.imageUrl)}
                                  onClick={() => handleSelectLibraryReference(ref)}
                                  className="group relative aspect-video rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                                    <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-white bg-blue-500 rounded-full p-1" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {combinedReferenceLibrary.filter(r => r.type === 'location').length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> Locations
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              {combinedReferenceLibrary.filter(r => r.type === 'location').map(ref => (
                                <button
                                  key={ref.id}
                                  type="button"
                                  disabled={referenceImages.length >= MAX_VERTEX_GEMINI_REFERENCE_IMAGES || referenceImages.some((e) => e.url === ref.imageUrl)}
                                  onClick={() => handleSelectLibraryReference(ref)}
                                  className="group relative aspect-video rounded-lg border border-slate-700 overflow-hidden hover:border-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                                    <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-white bg-emerald-500 rounded-full p-1" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {combinedReferenceLibrary.filter(r => r.type === 'object').length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                              <Box className="w-3.5 h-3.5" /> Object References
                            </h4>
                            <div className="grid grid-cols-4 gap-2">
                              {combinedReferenceLibrary.filter(r => r.type === 'object').map(ref => (
                                <button
                                  key={ref.id}
                                  type="button"
                                  disabled={referenceImages.length >= MAX_VERTEX_GEMINI_REFERENCE_IMAGES || referenceImages.some((e) => e.url === ref.imageUrl)}
                                  onClick={() => handleSelectLibraryReference(ref)}
                                  className="group relative aspect-square rounded-lg border border-slate-700 overflow-hidden hover:border-amber-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-left">
                                    <div className="text-[10px] text-white font-medium truncate">{ref.name}</div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-white bg-amber-500 rounded-full p-1" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : mode === 'EXTEND' ? (
              <div className="p-4 w-full space-y-3">
                {hasExistingVideo ? (
                  <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative">
                    <video 
                      src={segment.activeAssetUrl!}
                      className="w-full h-full object-cover"
                      controls
                      muted
                    />
                    <Badge className="absolute top-2 left-2 bg-slate-800">Source Video</Badge>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-100">
                    Extension continues from the previous part of this beat. Generate earlier parts in order.
                  </div>
                )}
                {continuationDialogueExcerpt ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                    <p className="text-xs font-medium text-slate-400 mb-1">Remaining dialogue (sent in guide prompt)</p>
                    <p className="text-sm text-slate-200 italic">&ldquo;{continuationDialogueExcerpt}&rdquo;</p>
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">Extension clips are fixed at 10s and use the same auto-extend route as dialogue splits.</p>
              </div>
            ) : (startFrameUrl || sceneImageUrl) ? (
              <div className="p-4 w-full space-y-2">
                <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative">
                  <img 
                    src={startFrameUrl || sceneImageUrl} 
                    alt="Reference Frame"
                    className="w-full h-full object-cover" 
                  />
                  <Badge className="absolute top-2 left-2 bg-slate-800">Reference Image</Badge>
                </div>
                {onSaveEditedKeyframe && startFrameUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-[10px] h-7 border-purple-500/40 text-purple-200 hover:bg-purple-950/40"
                    onClick={() => setKeyframeEdit({ frameType: 'start', url: startFrameUrl })}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI edit start frame
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 p-8">
                <Type className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">Text-Only Generation</p>
                <p className="text-xs mt-1 opacity-60">No reference image available</p>
              </div>
            )}
            
            {/* Mode Badge */}
            <div className="absolute top-2 right-2">
                <Badge 
                  variant="outline" 
                  className={`
                    ${mode === 'IMAGE_TO_VIDEO' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : ''}
                    ${mode === 'TEXT_TO_VIDEO' ? 'bg-green-500/20 text-green-300 border-green-500/50' : ''}
                    ${mode === 'EXTEND' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : ''}
                    ${mode === 'REFERENCE_IMAGES' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : ''}
                  `}
                >
                  {mode === 'REFERENCE_IMAGES' ? 'Reference Mode' : 'Generation Mode'}
                </Badge>
            </div>
            
            {/* Visual Fidelity indicator - predicts generation accuracy and consistency */}
            {(
              <div className="absolute bottom-2 left-2">
                <Badge 
                  variant="outline" 
                  className={`bg-slate-800/80 border-slate-600 ${
                    visualFidelity >= 85 ? 'text-green-400' :
                    visualFidelity >= 70 ? 'text-yellow-400' :
                    'text-orange-400'
                  }`}
                >
                  Visual Fidelity: {visualFidelity}%
                </Badge>
              </div>
            )}
          </div>

          {/* Right Panel: Controls & Prompt */}
          <div className="col-span-5 flex flex-col gap-4">
            
            {/* Prompt Direction Entry */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Prompt Direction</Label>
                {!readOnlyPrompts && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDirectionDialogOpen(true)}
                    className="h-6 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Assistant
                  </Button>
                )}
              </div>
              {readOnlyPrompts && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Derived from scene direction. Edit the script or regenerate Pre-Vis to change motion intent.
                </p>
              )}
              <Textarea 
                value={visualPrompt}
                onChange={(e) => {
                  if (readOnlyPrompts) return
                  setVisualPrompt(e.target.value)
                }}
                readOnly={readOnlyPrompts}
                className="min-h-[120px] bg-slate-800/80 border-slate-700 text-slate-200 text-sm focus:border-indigo-500/50 transition-colors read-only:opacity-80 read-only:cursor-default"
                placeholder="Enter prompt direction here..."
              />
              {isOptimizingForMode && (
                <div className="flex items-center gap-2 mt-1 text-xs text-indigo-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Optimizing for {mode === 'IMAGE_TO_VIDEO' ? 'Image-to-Video' : 'Text-to-Video'}...</span>
                </div>
              )}
            </div>

                {/* Duration Selector */}
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-300">Duration</Label>
                  {mode === 'EXTEND' ? (
                    <p className="text-sm text-slate-400">Fixed at 10s for extension (matches auto-extend route)</p>
                  ) : (
                  <div className="flex gap-2">
                    {[4, 6, 8, 10].map((d) => (
                      <Button
                        key={d}
                        variant={duration === d ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDuration(d)}
                        className={`flex-1 ${duration === d ? 'bg-indigo-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        {d}s
                      </Button>
                    ))}
                  </div>
                  )}
                </div>

            {/* Advanced Settings Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white text-sm">
                  Advanced Settings
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Aspect Ratio</Label>
                      <Select
                        value={aspectRatio}
                        onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}
                        disabled
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="16:9">16:9 Landscape</SelectItem>
                          <SelectItem value="9:16">9:16 Portrait</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Resolution */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Resolution</Label>
                      <Select value={resolution} onValueChange={(v) => setResolution(v as '720p' | '1080p')}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="720p">720p HD</SelectItem>
                          <SelectItem value="1080p">1080p Full HD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Quality Tier</Label>
                      <Select value={qualityTier} onValueChange={(v) => setQualityTier(v as 'fast' | 'premium')}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="fast">Fast (~$1.60/8s) - Good for T2V, I2V</SelectItem>
                          <SelectItem value="premium">Premium (~$6.00/8s) - Better motion reasoning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Negative Prompt */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Negative Prompt</Label>
                      <Textarea 
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="h-16 bg-slate-800 border-slate-700 text-white text-sm resize-none"
                        placeholder="What to avoid..."
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Advanced: full API prompt + backup engine opt-in */}
            <Accordion type="single" collapsible className="mt-3">
              <AccordionItem value="api-prompt" className="border-slate-700">
                <AccordionTrigger className="text-sm text-slate-300 hover:no-underline py-2">
                  Advanced — API Prompt
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-slate-400 text-xs">
                      Full prompt sent to API {apiPromptPreviewLoading ? '(updating…)' : '(preview)'}
                    </Label>
                    {apiPromptPreviewLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    )}
                  </div>
                  {apiPromptPreviewError && !useCustomApiPrompt && (
                    <p className="text-xs text-amber-400/90">{apiPromptPreviewError}</p>
                  )}
                  <Textarea
                    value={displayedApiPrompt}
                    onChange={(e) => {
                      if (useCustomApiPrompt) setApiPromptOverride(e.target.value)
                    }}
                    readOnly={!useCustomApiPrompt}
                    className={cn(
                      'min-h-[120px] font-mono text-xs bg-slate-800 border-slate-700 text-slate-200 resize-y',
                      !useCustomApiPrompt && 'opacity-90'
                    )}
                    placeholder="Server-assembled prompt preview…"
                  />
                  <p className="text-[10px] text-slate-500">
                    {displayedApiPrompt.length.toLocaleString()} characters
                    {displayedApiPrompt.length > 8000 && (
                      <span className="text-amber-400 ml-2">Long prompt — may increase block risk</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        const on = !useCustomApiPrompt
                        setUseCustomApiPrompt(on)
                        if (on && !apiPromptOverride.trim()) {
                          setApiPromptOverride(apiPromptPreview)
                        }
                      }}
                    >
                      <Checkbox
                        id="useCustomApiPrompt"
                        checked={useCustomApiPrompt}
                        onCheckedChange={(checked) => {
                          const on = checked === true
                          setUseCustomApiPrompt(on)
                          if (on && !apiPromptOverride.trim()) {
                            setApiPromptOverride(apiPromptPreview)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs text-slate-300">Use custom API prompt</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-slate-600"
                      onClick={() => {
                        setUseCustomApiPrompt(false)
                        setApiPromptOverride('')
                        void fetchApiPromptPreview()
                      }}
                    >
                      Reset to preview
                    </Button>
                  </div>
                  {aggregatorEnabled && (
                    <div className="space-y-2 pt-2 border-t border-slate-700/80">
                      <Label className="text-slate-400 text-xs">Video provider</Label>
                      <Select
                        value={videoProvider}
                        onValueChange={(v) =>
                          setVideoProvider(v as 'vertex' | 'aggregator')
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="vertex">Google Veo (default)</SelectItem>
                          <SelectItem value="aggregator">
                            Multiplatform (bypasses Google policy)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {videoProvider === 'aggregator' && (
                        <>
                          <Label className="text-slate-400 text-xs">Model</Label>
                          <Select value={videoModel} onValueChange={setVideoModel}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {aggregatorModels.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                  {m.nativeAudio ? ' · audio' : ''} (~$
                                  {m.costPerSecondUsd.toFixed(2)}/s)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Multiplatform models use provider-native content policies (Kling,
                            Runway, ByteDance), which are less restrictive than Google for creative
                            violence, NIL, and trigger words.
                          </p>
                          <p className="text-[10px] text-emerald-400/90">
                            Active: Multiplatform · {selectedAggregatorModelLabel}
                          </p>
                        </>
                      )}
                      {videoProvider === 'vertex' && aggregatorEnabled && (
                        <p className="text-[10px] text-slate-500">Active: Google Veo (default)</p>
                      )}
                    </div>
                  )}
                  {videoProvider === 'vertex' && (
                  <div
                    className="flex items-start gap-2 cursor-pointer pt-1"
                    onClick={() => setAllowPolicyFallback((prev) => !prev)}
                  >
                    <Checkbox
                      id="allowPolicyFallback"
                      checked={allowPolicyFallback}
                      onCheckedChange={(checked) => setAllowPolicyFallback(checked === true)}
                      className="mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Allow backup engine if blocked
                      <span className="block text-slate-500 mt-0.5">
                        Uses an alternate video provider when Vertex blocks the prompt. May cost additional credits.
                      </span>
                    </span>
                  </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Content Policy Alerts */}

            {/* Success banner after fix applied */}
            {promptFixApplied && (
              <div className="mt-3">
                <PolicyFixedBanner onDismiss={() => setPromptFixApplied(false)} />
              </div>
            )}

            {/* Post-failure Error Banner */}
            {localError && (
              <div className="mt-3">
                {postFailureModerationResult ? (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg border ${imageTriggered ? 'bg-amber-900/30 border-amber-700' : 'bg-red-900/30 border-red-700'}`}>
                      <div className="flex items-start gap-2">
                        {imageTriggered ? (
                          <ImageOff className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          {imageTriggered ? (
                            <>
                              <p className="text-sm font-medium text-amber-200 mb-1">Reference Image Flagged</p>
                              <p className="text-xs text-amber-300/80">Your prompt is clean, but the reference image appears to have triggered Vertex AI&apos;s safety filters. This can happen with dramatic visual effects like explosions, supernovae, or intense lighting — even when the image was generated by Vertex AI itself.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-red-200 mb-1">Video Prompt Rejected</p>
                              <p className="text-xs text-red-300/80">Vertex AI&apos;s safety filters rejected this prompt. Use Auto-Fix or AI Rephrase below.</p>
                            </>
                          )}
                        </div>
                        <button onClick={() => { setLocalError(null); setPostFailureModerationResult(null); setImageTriggered(false) }} className={imageTriggered ? 'text-amber-400 hover:text-amber-300' : 'text-red-400 hover:text-red-300'}><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {startFrameUrl && (
                      <AnalyzeKeyframeRiskPanel
                        startFrameUrl={startFrameUrl}
                        promptExcerpt={visualPrompt}
                        emphasizeImageHypothesis={imageTriggered}
                      />
                    )}
                    {imageTriggered ? (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleRetryAsT2V}
                          className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Type className="w-4 h-4" />
                          Retry as Text-to-Video (without reference images)
                        </button>
                        <p className="text-[11px] text-slate-400 text-center">Generates using only the text prompt, bypassing the flagged reference image.</p>
                      </div>
                    ) : (
                      <ContentPolicyAlert
                        moderationResult={postFailureModerationResult}
                        onApplyFix={handleApplyContentFix}
                        onDismiss={() => { setLocalError(null); setPostFailureModerationResult(null) }}
                        enableAIRegeneration={true}
                        onRegenerateWithAI={handleAIRephrase}
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-900/30 border border-red-700">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <pre className="text-xs text-red-200 whitespace-pre-wrap font-sans leading-relaxed">{localError}</pre>
                      </div>
                      <button onClick={() => setLocalError(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-auto flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                onClick={() => handleGenerate()}
                disabled={!canGenerateWithCustomPrompt}
              >
                <Play className="w-4 h-4 mr-2" />
                {generateButtonLabel}
              </Button>
            </div>
          </div>

        </div>
        
        {/* Direction Dialog for prompt review and modification */}
        <DirectionDialog
          isOpen={isDirectionDialogOpen}
          onClose={() => setIsDirectionDialogOpen(false)}
          currentPrompt={visualPrompt}
          onPromptChange={(newPrompt) => {
            setVisualPrompt(newPrompt)
          }}
          mode={mode}
          hasStartFrame={!!(segment.startFrameUrl || segment.references?.startFrameUrl)}
          hasEndFrame={false}
        />
      </DialogContent>
    </Dialog>

    {keyframeEdit && onSaveEditedKeyframe && (
      <ImageEditModal
        open={!!keyframeEdit}
        onOpenChange={(o) => {
          if (!o) setKeyframeEdit(null)
        }}
        imageUrl={keyframeEdit.url}
        imageType="scene"
        aspectRatio="16:9"
        title={`Edit ${keyframeEdit.frameType === 'start' ? 'Start' : 'End'} Frame`}
        objectReferences={objectReferences.filter(
          (ref): ref is { id: string; name: string; imageUrl: string; description?: string } =>
            !!ref.imageUrl
        )}
        subjectReference={(() => {
          const firstLine = segment.dialogueLines?.find((d) => d.covered !== false)
          const charName = firstLine?.character
          if (!charName) return undefined
          const char = characterReferences.find((c) => c.name === charName)
          if (!char?.referenceImage) return undefined
          return {
            imageUrl: char.referenceImage,
            description: char.description || charName,
          }
        })()}
        onSave={(newUrl) => {
          onSaveEditedKeyframe(sceneId, segment.segmentId, keyframeEdit.frameType, newUrl)
          setKeyframeEdit(null)
        }}
      />
    )}
    </>
  )
}

export default DirectorDialog
