/**
 * DirectorDialog - Video Generation Configuration Modal
 * 
 * Part of the Director's Console "Pre-Flight" workflow.
 * Allows users to review and edit auto-drafted generation settings
 * before batch rendering.
 * 
 * Features:
 * - 4-tab interface: Text-to-Video | Image-to-Video | Frame-to-Video | Extend
 * - Visual preview area showing Start → End frames for FTV mode
 * - Prompt editing with contextual tips
 * - Advanced settings accordion (aspect ratio, resolution, negative prompts)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  ArrowRight, 
  CheckCircle, 
  Info,
  Wand2,
  ImageIcon,
  Film,
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
} from 'lucide-react'
import type { 
  SceneSegment, 
  VideoGenerationMethod, 
  VideoGenerationConfig 
} from './types'
import { useSegmentConfig, type SegmentGuideContext } from '@/hooks/useSegmentConfig'
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
  'FTV': 'FRAME_TO_VIDEO',
  'EXT': 'EXTEND',
  'REF': 'REFERENCE_IMAGES',
  'CIN': 'CINEMATIC',
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
}) => {
  const segmentGuideContext = useMemo<SegmentGuideContext | undefined>(() => {
    if (!scene) return undefined
    return { scene, characters: guideCharacters }
  }, [scene, guideCharacters])

  // Get auto-drafted config (includes batch guidePrompt when dialogue is assigned)
  const { config: autoConfig, methodLabel, methodReason } = useSegmentConfig(
    segment,
    sceneImageUrl,
    segmentGuideContext
  )

  const batchGuideSeed = useMemo(
    () =>
      scene && (segment.dialogueLineIds?.length ?? 0) > 0
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
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(autoConfig.aspectRatio)
  const [resolution, setResolution] = useState<'720p' | '1080p'>(autoConfig.resolution)
  const [duration, setDuration] = useState(autoConfig.duration)
  const [guidePrompt, setGuidePrompt] = useState('')
  
  // Intelligent prompt modification state
  const [promptInstruction, setPromptInstruction] = useState('')
  const [isModifyingPrompt, setIsModifyingPrompt] = useState(false)
  const [isOptimizingForMode, setIsOptimizingForMode] = useState(false)
  const [promptHistory, setPromptHistory] = useState<string[]>([])  // For undo support
  
  // Reference images state (for REF mode - up to 3 character/style references)
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  
  // Direction Dialog state
  const [isDirectionDialogOpen, setIsDirectionDialogOpen] = useState(false)
  
  // Content policy post-failure state (after Vertex rejects a generation)
  const [postFailureModerationResult, setPostFailureModerationResult] = useState<ModerationResult | null>(null)
  const [promptFixApplied, setPromptFixApplied] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [imageTriggered, setImageTriggered] = useState(false)
  
  // FTV prompt options
  const [skipAnchoringPhrase, setSkipAnchoringPhrase] = useState(false)

  const [keyframeEdit, setKeyframeEdit] = useState<{ frameType: 'start' | 'end'; url: string } | null>(null)
  // Quality tier state - default to 'fast' for all modes (cost-optimized)
  // Users can manually select 'premium' when higher quality is needed
  const [qualityTier, setQualityTier] = useState<'fast' | 'premium'>('fast')
  
  // Intelligent prompt modification handler
  const handleModifyPrompt = useCallback(async () => {
    if (!promptInstruction.trim()) return
    
    const currentPrompt = mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
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
          if (mode === 'FRAME_TO_VIDEO') {
            setMotionPrompt(data.modifiedPrompt)
          } else {
            setVisualPrompt(data.modifiedPrompt)
          }
          setPromptInstruction('') // Clear instruction after successful modification
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
    
    if (mode === 'FRAME_TO_VIDEO') {
      setMotionPrompt(previousPrompt)
    } else {
      setVisualPrompt(previousPrompt)
    }
  }, [mode, promptHistory])
  
  // Optimize prompt for the currently selected mode
  const handleOptimizeForMode = useCallback(async () => {
    const currentPrompt = mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
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
          if (mode === 'FRAME_TO_VIDEO') {
            setMotionPrompt(data.modifiedPrompt)
          } else {
            setVisualPrompt(data.modifiedPrompt)
          }
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
    const hasStartFrame = !!(segment.startFrameUrl || segment.references?.startFrameUrl)
    const hasEndFrame = !!(segment.endFrameUrl || segment.references?.endFrameUrl)
    const activePrompt = mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
    
    // Base scores by method (reflects retake risk)
    const baseScores: Record<string, number> = {
      'FRAME_TO_VIDEO': 92,   // Best: both frames constrain output
      'IMAGE_TO_VIDEO': 75,   // Good: start frame anchors generation
      'EXTEND': 68,           // Moderate: uses existing video context
      'TEXT_TO_VIDEO': 35,    // Lowest: no visual reference
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
    
    // Frame availability bonuses - suggest better method
    if (mode === 'IMAGE_TO_VIDEO' && hasEndFrame) score += 5
    if (mode === 'TEXT_TO_VIDEO' && hasStartFrame) score += 10
    
    return Math.min(100, Math.max(10, Math.round(score)))
  }, [mode, segment, motionPrompt, visualPrompt])
  
  // Sync prompt based on mode
  useEffect(() => {
    const method = modeToMethod[mode]
    if (method === 'FTV') {
      setPrompt(motionPrompt)
    } else {
      setPrompt(visualPrompt)
    }
  }, [mode, motionPrompt, visualPrompt])
  
  // Note: FTV no longer auto-switches to premium for cost optimization.
  // The UI shows "Premium recommended for FTV" hint to let users choose.
  
  // Auto-optimize prompt when mode changes
  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode)
    // Trigger auto-optimization for the new mode (after state updates)
    setTimeout(() => {
      const currentPrompt = newMode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
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
          if (targetMode === 'FRAME_TO_VIDEO') {
            setMotionPrompt(data.modifiedPrompt)
          } else {
            setVisualPrompt(data.modifiedPrompt)
          }
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
  
  // Reset state when dialog opens with new segment
  useEffect(() => {
    if (isOpen) {
      setMode(methodToMode[autoConfig.mode])
      setPrompt(autoConfig.prompt)
      setMotionPrompt(autoConfig.motionPrompt)
      setVisualPrompt(autoConfig.visualPrompt)
      setNegativePrompt(autoConfig.negativePrompt)
      setAspectRatio(autoConfig.aspectRatio)
      setResolution(autoConfig.resolution)
      setDuration(autoConfig.duration)
      // Reset content policy state on open
      setPostFailureModerationResult(null)
      setPromptFixApplied(false)
      setLocalError(null)
      setImageTriggered(false)
      setKeyframeEdit(null)
    }
  }, [isOpen, autoConfig])

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
        const currentPrompt = mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
        const isImageBasedMethod = mode === 'FRAME_TO_VIDEO' || mode === 'IMAGE_TO_VIDEO' || mode === 'REFERENCE_IMAGES'
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
    // Use directly resolved frame URLs (not from autoConfig which may be stale)
    const resolvedStartFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || null
    const resolvedEndFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl || null
    
    const savedConfig: VideoGenerationConfig = {
      mode: method,
      prompt: method === 'FTV' ? motionPrompt : visualPrompt,
      motionPrompt,
      visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration,
      startFrameUrl: resolvedStartFrameUrl,
      endFrameUrl: resolvedEndFrameUrl,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      // FTV options
      skipAnchoringPhrase: method === 'FTV' ? skipAnchoringPhrase : undefined,
      // Quality tier
      qualityTier: qualityTier,
      // Reference images (for REF mode)
      referenceImages: method === 'REF' ? referenceImages : undefined,
    }
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
    if (mode === 'FRAME_TO_VIDEO') {
      setMotionPrompt(fixedPrompt)
    } else {
      setVisualPrompt(fixedPrompt)
    }
    const g = segment.lastContentPolicyFailure?.optionalSanitized?.guidePrompt
    if (g) {
      setGuidePrompt(g)
    }
    setPostFailureModerationResult(null)
    setLocalError(null)
    setImageTriggered(false)
    setPromptFixApplied(true)
    setTimeout(() => setPromptFixApplied(false), 5000)
  }, [mode, segment.lastContentPolicyFailure])

  // Retry as T2V — fallback when reference image triggers content policy
  const handleRetryAsT2V = useCallback(() => {
    setMode('TEXT_TO_VIDEO')
    setLocalError(null)
    setPostFailureModerationResult(null)
    setImageTriggered(false)
    setPromptFixApplied(false)
    
    const currentPrompt = mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt
    if (currentPrompt) {
      setVisualPrompt(currentPrompt)
    }
    
    // Build T2V config without reference images and generate
    const t2vConfig: VideoGenerationConfig = {
      mode: 'T2V',
      prompt: currentPrompt || visualPrompt,
      motionPrompt,
      visualPrompt: currentPrompt || visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration,
      startFrameUrl: null,
      endFrameUrl: null,
      sourceVideoUrl: null,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      qualityTier,
    }
    
    onSaveConfig(t2vConfig)
    if (onGenerate) {
      onGenerate(segment.segmentId, t2vConfig)
    }
    onClose()
  }, [mode, motionPrompt, visualPrompt, negativePrompt, guidePrompt, aspectRatio, resolution, duration, autoConfig.confidence, qualityTier, onSaveConfig, onGenerate, segment.segmentId, onClose])

  // Handle generate - saves config AND triggers generation
  const handleGenerate = () => {
    const method = modeToMethod[mode]
    const finalPrompt = method === 'FTV' ? motionPrompt : visualPrompt

    // Use directly resolved frame URLs (not from autoConfig which may be stale)
    const resolvedStartFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || null
    const resolvedEndFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl || null
    
    const savedConfig: VideoGenerationConfig = {
      mode: method,
      prompt: finalPrompt,
      motionPrompt: motionPrompt,
      visualPrompt: visualPrompt,
      negativePrompt,
      guidePrompt: guidePrompt || undefined,
      aspectRatio,
      resolution,
      duration,
      startFrameUrl: resolvedStartFrameUrl,
      endFrameUrl: resolvedEndFrameUrl,
      sourceVideoUrl: autoConfig.sourceVideoUrl,
      approvalStatus: 'auto-ready',
      confidence: autoConfig.confidence,
      // FTV options
      skipAnchoringPhrase: method === 'FTV' ? skipAnchoringPhrase : undefined,
      // Quality tier - FTV can use premium for better interpolation
      qualityTier: qualityTier,
      // Reference images (for REF mode)
      referenceImages: method === 'REF' ? referenceImages : undefined,
    }
    
    // Debug: Log FTV config to verify frame URLs are passed
    if (method === 'FTV') {
      console.log('[DirectorDialog] FTV generation config:', {
        method,
        startFrameUrl: resolvedStartFrameUrl,
        endFrameUrl: resolvedEndFrameUrl,
        prompt: savedConfig.prompt?.substring(0, 50) + '...'
      })
    }
    
    onSaveConfig(savedConfig)
    if (onGenerate) {
      onGenerate(segment.segmentId, savedConfig)
    }
    onClose()
  }
  
  const startFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl
  const endFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl
  const hasExistingVideo = segment.activeAssetUrl && segment.assetType === 'video'
  
  // FRAME-FIRST WORKFLOW: Determine which tabs should be enabled
  // I2V requires a start frame, FTV requires both frames
  // These prerequisites ensure character consistency via frame anchoring
  const tabStates = {
    TEXT_TO_VIDEO: true, // Always available (but not recommended if frames exist)
    IMAGE_TO_VIDEO: !!startFrameUrl || !!sceneImageUrl,
    FRAME_TO_VIDEO: !!startFrameUrl && !!endFrameUrl,
    EXTEND: !!hasExistingVideo,
    REFERENCE_IMAGES: true, // Always available - uses character reference images
  }
  
  // Messaging for disabled tabs
  const tabDisabledReasons: Record<string, string> = {
    IMAGE_TO_VIDEO: !tabStates.IMAGE_TO_VIDEO ? 'Generate a Start Frame first (Frame step)' : '',
    FRAME_TO_VIDEO: !tabStates.FRAME_TO_VIDEO 
      ? (!startFrameUrl ? 'Generate Start Frame first' : 'Generate End Frame to enable interpolation')
      : '',
    EXTEND: !tabStates.EXTEND ? 'Render a video first' : '',
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
        
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            Generate Video: Segment {segment.sequenceIndex + 1}
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
                onClick={() => setGuidePrompt(batchGuideSeed)}
                disabled={!batchGuideSeed}
              >
                Reset to segment dialogue
              </Button>
            </div>
            <GuidePromptEditor
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
            {/* Frame-First Recommendation Banner */}
            {tabStates.FRAME_TO_VIDEO && mode !== 'FRAME_TO_VIDEO' && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
                <Film className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Recommended:</strong> Frame-to-Video mode uses both keyframes for best character consistency.
                </span>
              </div>
            )}
            
            {/* Missing Frame Warning */}
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
              <TabsList className="bg-slate-800/80 w-full grid grid-cols-3 md:grid-cols-5 gap-1 p-1">
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
                  value="FRAME_TO_VIDEO" 
                  className="gap-2 data-[state=active]:bg-purple-600 disabled:opacity-50"
                  disabled={!tabStates.FRAME_TO_VIDEO}
                  title={tabDisabledReasons.FRAME_TO_VIDEO}
                >
                  <Film className="w-4 h-4" />
                  <span className="hidden sm:inline">Frame-to-Video</span>
                  <span className="sm:hidden">FTV</span>
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
            {/* Visual Logic based on Mode */}
            {mode === 'FRAME_TO_VIDEO' && startFrameUrl && endFrameUrl ? (
              <div className="flex items-center gap-4 p-4 w-full">
                <div className="flex-1 relative space-y-1.5">
                  <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                    <img 
                      src={startFrameUrl} 
                      alt="Start Frame"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <Badge className="absolute top-2 left-2 bg-slate-800">Start</Badge>
                  {onSaveEditedKeyframe && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full text-[10px] h-7 border-purple-500/40 text-purple-200 hover:bg-purple-950/40"
                      onClick={() => setKeyframeEdit({ frameType: 'start', url: startFrameUrl })}
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      AI edit start
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex-1 relative space-y-1.5">
                  <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                    <img 
                      src={endFrameUrl} 
                      alt="End Frame"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <Badge className="absolute top-2 left-2 bg-slate-800">End</Badge>
                  {onSaveEditedKeyframe && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full text-[10px] h-7 border-purple-500/40 text-purple-200 hover:bg-purple-950/40"
                      onClick={() => setKeyframeEdit({ frameType: 'end', url: endFrameUrl })}
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      AI edit end
                    </Button>
                  )}
                </div>
              </div>
            ) : mode === 'REFERENCE_IMAGES' ? (
              /* Reference Images Preview - Shows uploaded character/style references */
              <div className="p-4 w-full">
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <div className="flex items-center gap-3 mb-4">
                    {referenceImages.length > 0 ? (
                      referenceImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="w-24 h-24 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                            <img 
                              src={url} 
                              alt={`Reference ${index + 1}`}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <button
                            onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <Badge className="absolute bottom-1 left-1 text-[10px] bg-slate-800/90">Ref {index + 1}</Badge>
                        </div>
                      ))
                    ) : null}
                    {referenceImages.length < 3 && (
                      <label className="w-24 h-24 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800 transition-colors">
                        <Plus className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400">Add Ref</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file && referenceImages.length < 3) {
                              // Convert to data URL for preview (in production, upload to storage)
                              const reader = new FileReader()
                              reader.onload = () => {
                                setReferenceImages(prev => [...prev, reader.result as string])
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 text-center">
                    {referenceImages.length === 0 
                      ? 'Add up to 3 reference images for character/style consistency'
                      : `${referenceImages.length}/3 reference images added`
                    }
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Use character headshots or style references from your project
                  </p>
                </div>
              </div>
            ) : mode === 'EXTEND' && hasExistingVideo ? (
              <div className="p-4 w-full">
                <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                  <video 
                    src={segment.activeAssetUrl!}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                </div>
                <Badge className="absolute top-2 left-2 bg-slate-800">Source Video</Badge>
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
                    ${mode === 'FRAME_TO_VIDEO' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : ''}
                    ${mode === 'IMAGE_TO_VIDEO' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : ''}
                    ${mode === 'TEXT_TO_VIDEO' ? 'bg-green-500/20 text-green-300 border-green-500/50' : ''}
                    ${mode === 'EXTEND' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : ''}
                    ${mode === 'REFERENCE_IMAGES' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : ''}
                  `}
                >
                  {mode === 'FRAME_TO_VIDEO' ? 'Interpolation Mode' : mode === 'REFERENCE_IMAGES' ? 'Reference Mode' : 'Generation Mode'}
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
            
            {/* Prompt Direction Preview with Direct Button */}
            <div className="flex flex-col gap-2">
              {/* Prompt Preview Box */}
              <div 
                className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 transition-colors group"
                onClick={() => setIsDirectionDialogOpen(true)}
              >
                <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                  {(mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt) || (
                    <span className="text-slate-500 italic">No prompt direction set. Click to add direction.</span>
                  )}
                </p>
                {isOptimizingForMode && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-indigo-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Optimizing for {mode === 'FRAME_TO_VIDEO' ? 'Frame-to-Video' : mode === 'IMAGE_TO_VIDEO' ? 'Image-to-Video' : 'Text-to-Video'}...</span>
                  </div>
                )}
              </div>
              
              {/* Direct Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDirectionDialogOpen(true)}
                className="w-full bg-slate-800 border-slate-700 text-indigo-400 hover:bg-indigo-950/50 hover:border-indigo-500/50 hover:text-indigo-300"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Direct
              </Button>
            </div>

                {/* Duration Selector */}
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-300">Duration</Label>
                  <div className="flex gap-2">
                    {[4, 6, 8].map((d) => (
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
                </div>

            {/* Advanced Settings Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white text-sm">
                  Advanced Settings
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* FTV Anchoring Option - Only show for FTV mode */}
                    {mode === 'FRAME_TO_VIDEO' && (
                      <div className="flex items-start gap-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                        <input
                          type="checkbox"
                          id="skipAnchoringPhrase"
                          checked={skipAnchoringPhrase}
                          onChange={(e) => setSkipAnchoringPhrase(e.target.checked)}
                          className="mt-1 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <label htmlFor="skipAnchoringPhrase" className="text-sm text-slate-300 cursor-pointer">
                            Skip motion transition guidance
                          </label>
                          <p className="text-xs text-slate-400 mt-1">
                            By default, we prepend motion instructions like &quot;A smooth, continuous transition...&quot; to FTV prompts. 
                            Enable this if your prompt already describes the transition to avoid duplicate guidance.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">Aspect Ratio</Label>
                      <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '16:9' | '9:16')}>
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
                    
                    {/* Quality Tier - Show cost difference, FTV benefits from premium */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-slate-400 text-xs">
                        Quality Tier {mode === 'FRAME_TO_VIDEO' && <span className="text-purple-400">(Premium recommended for FTV)</span>}
                      </Label>
                      <Select value={qualityTier} onValueChange={(v) => setQualityTier(v as 'fast' | 'premium')}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="fast">Fast (~$1.60/8s) - Good for T2V, I2V</SelectItem>
                          <SelectItem value="premium">Premium (~$6.00/8s) - Better motion reasoning</SelectItem>
                        </SelectContent>
                      </Select>
                      {mode === 'FRAME_TO_VIDEO' && qualityTier === 'fast' && (
                        <p className="text-xs text-amber-400/80 mt-1">
                          ⚠️ FTV interpolation quality is significantly better with Premium tier
                        </p>
                      )}
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
                    {(startFrameUrl || endFrameUrl) && (
                      <AnalyzeKeyframeRiskPanel
                        startFrameUrl={startFrameUrl}
                        endFrameUrl={endFrameUrl}
                        promptExcerpt={mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt}
                        emphasizeImageHypothesis={imageTriggered || mode === 'FRAME_TO_VIDEO'}
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => handleGenerate()}
              >
                <Play className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>

        </div>
        
        {/* Direction Dialog for prompt review and modification */}
        <DirectionDialog
          isOpen={isDirectionDialogOpen}
          onClose={() => setIsDirectionDialogOpen(false)}
          currentPrompt={mode === 'FRAME_TO_VIDEO' ? motionPrompt : visualPrompt}
          onPromptChange={(newPrompt) => {
            if (mode === 'FRAME_TO_VIDEO') {
              setMotionPrompt(newPrompt)
            } else {
              setVisualPrompt(newPrompt)
            }
          }}
          mode={mode}
          hasStartFrame={!!(segment.startFrameUrl || segment.references?.startFrameUrl)}
          hasEndFrame={!!(segment.endFrameUrl || segment.references?.endFrameUrl)}
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
        title={`Edit ${keyframeEdit.frameType === 'start' ? 'Start' : 'End'} Frame`}
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
