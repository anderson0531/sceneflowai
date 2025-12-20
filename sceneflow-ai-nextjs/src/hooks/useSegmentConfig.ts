/**
 * useSegmentConfig Hook - Auto-Draft Logic for Director's Console
 * 
 * Intelligently maps Frame step data to Veo 3.1 generation parameters
 * before the user opens the DirectorDialog.
 * 
 * Detection Rules:
 * - startFrame + endFrame exist → Default Mode: FRAME_TO_VIDEO (Interpolation)
 * - only startFrame exists → Default Mode: IMAGE_TO_VIDEO
 * - no frames (rare) → Default Mode: TEXT_TO_VIDEO
 * 
 * Prompt Strategy:
 * - Interpolation Mode (FTV): Motion instructions derived from script action
 * - Generation Mode (I2V/T2V): Visual descriptions from Frame step's visual prompt
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { useMemo } from 'react'
import type { SceneSegment, VideoGenerationMethod } from '@/components/vision/scene-production/types'
import type { VideoGenerationConfig, ApprovalStatus } from '@/components/vision/scene-production/types'

/**
 * Generates a motion-focused prompt for Frame-to-Video interpolation
 * Describes movement between start and end frames, not the visual content
 */
function generateMotionPrompt(segment: SceneSegment): string {
  const action = segment.action || segment.actionPrompt || ''
  const cameraMovement = segment.cameraMovement || ''
  const emotionalBeat = segment.emotionalBeat || ''
  
  // Build motion-focused prompt
  const parts: string[] = []
  
  // Camera movement first (most important for interpolation)
  if (cameraMovement) {
    parts.push(`Camera ${cameraMovement}.`)
  }
  
  // Character/subject action
  if (action) {
    // Transform action description to motion instruction
    const motionAction = action
      .replace(/^(The )?character /, '')
      .replace(/stands|sits|holds/, 'moves to')
    parts.push(motionAction)
  }
  
  // Emotional context for subtle performance
  if (emotionalBeat) {
    parts.push(`Emotional tone: ${emotionalBeat}.`)
  }
  
  // Default motion instruction if nothing specific
  if (parts.length === 0) {
    parts.push('Smooth camera movement, subtle ambient motion.')
  }
  
  return parts.join(' ')
}

/**
 * Generates a visual-focused prompt for I2V/T2V generation
 * Describes the scene and atmosphere
 */
function generateVisualPrompt(segment: SceneSegment, sceneImageUrl?: string): string {
  const generatedPrompt = segment.generatedPrompt || ''
  const userPrompt = segment.userEditedPrompt || ''
  const action = segment.action || segment.actionPrompt || ''
  const shotType = segment.shotType || 'medium shot'
  
  // Prefer user-edited prompt if available
  if (userPrompt) {
    return userPrompt
  }
  
  // Use generated prompt if available
  if (generatedPrompt) {
    return generatedPrompt
  }
  
  // Build visual prompt from metadata
  const parts: string[] = []
  
  parts.push(`${shotType},`)
  
  if (action) {
    parts.push(action)
  }
  
  // Add cinematic quality markers
  parts.push('cinematic lighting, film grain, high quality')
  
  return parts.join(' ')
}

/**
 * Determines the recommended generation method based on available assets
 * 
 * FRAME-FIRST WORKFLOW: Prioritizes frame-based methods (FTV > I2V > T2V)
 * because character consistency is best achieved by "baking" character
 * references into keyframes via Imagen 3, then using those frames to
 * anchor Veo video generation.
 * 
 * Priority:
 * 1. FTV (Frame-to-Video): Both start+end frames = best character lock
 * 2. I2V (Image-to-Video): Start frame only = good character anchor
 * 3. EXT (Extend): Extend existing video
 * 4. T2V (Text-to-Video): No frames = risk of character drift
 */
function detectRecommendedMethod(segment: SceneSegment): VideoGenerationMethod {
  const hasStartFrame = !!(segment.startFrameUrl || segment.references?.startFrameUrl)
  const hasEndFrame = !!(segment.endFrameUrl || segment.references?.endFrameUrl)
  const hasExistingVideo = !!(segment.activeAssetUrl && segment.assetType === 'video')
  
  // Frame-to-Video: Best quality with both keyframes (RECOMMENDED)
  // Character faces baked into frames provide visual anchors
  if (hasStartFrame && hasEndFrame) {
    return 'FTV'
  }
  
  // Image-to-Video: Good quality with just start frame
  if (hasStartFrame) {
    return 'I2V'
  }
  
  // Video Extension: If we have existing video and want to extend
  if (hasExistingVideo) {
    return 'EXT'
  }
  
  // Text-to-Video: Fallback when no frames available (not recommended)
  return 'T2V'
}

/**
 * Generates confidence score for the recommended method
 * 
 * FRAME-FIRST: FTV/I2V get higher confidence because they use
 * frame anchors which produce more consistent character appearance.
 */
function calculateConfidence(segment: SceneSegment, method: VideoGenerationMethod): number {
  const hasStartFrame = !!(segment.startFrameUrl || segment.references?.startFrameUrl)
  const hasEndFrame = !!(segment.endFrameUrl || segment.references?.endFrameUrl)
  const hasPrompt = !!(segment.generatedPrompt || segment.userEditedPrompt)
  const hasCharacterRefs = (segment.references?.characterRefs?.length || 0) > 0
  
  let confidence = 50 // Base confidence
  
  switch (method) {
    case 'FTV':
      // Both frames = highest confidence (best character lock)
      confidence = 95
      if (hasPrompt) confidence += 5
      break
    case 'I2V':
      // Start frame = good confidence
      confidence = 80
      if (hasPrompt) confidence += 10
      if (hasCharacterRefs) confidence += 5
      break
    case 'EXT':
      // Extension = medium confidence (depends on source video quality)
      confidence = 70
      break
    case 'T2V':
      // Text only = low confidence (character drift risk)
      confidence = 45
      if (hasPrompt) confidence += 10
      if (hasCharacterRefs) confidence += 10
      break
  }
  
  return Math.min(100, confidence)
}

/**
 * Determines approval status based on segment state
 */
function determineApprovalStatus(segment: SceneSegment): ApprovalStatus {
  // Already has video = rendered
  if (segment.activeAssetUrl && segment.assetType === 'video' && segment.status === 'COMPLETE') {
    return 'rendered'
  }
  
  // Currently generating
  if (segment.status === 'GENERATING') {
    return 'rendering'
  }
  
  // Has error
  if (segment.status === 'ERROR') {
    return 'error'
  }
  
  // Default: auto-ready (system configured, not yet user-reviewed)
  return 'auto-ready'
}

export interface SegmentConfigResult {
  /** Auto-drafted video generation config */
  config: VideoGenerationConfig
  /** Whether this segment is ready for rendering */
  isReady: boolean
  /** Whether user has reviewed this config */
  isApproved: boolean
  /** Recommended method display label */
  methodLabel: string
  /** Short description of why this method was chosen */
  methodReason: string
}

/**
 * Hook to generate auto-drafted video generation config for a segment
 */
export function useSegmentConfig(
  segment: SceneSegment,
  sceneImageUrl?: string
): SegmentConfigResult {
  return useMemo(() => {
    const method = detectRecommendedMethod(segment)
    const confidence = calculateConfidence(segment, method)
    const approvalStatus = determineApprovalStatus(segment)
    
    // Generate appropriate prompt based on method
    const motionPrompt = generateMotionPrompt(segment)
    const visualPrompt = generateVisualPrompt(segment, sceneImageUrl)
    
    // Choose primary prompt based on method
    const prompt = method === 'FTV' ? motionPrompt : visualPrompt
    
    const config: VideoGenerationConfig = {
      mode: method,
      prompt,
      motionPrompt,
      visualPrompt,
      aspectRatio: '16:9',
      resolution: '720p',
      duration: Math.max(4, Math.min(8, Math.round(segment.endTime - segment.startTime))),
      negativePrompt: '',
      approvalStatus,
      confidence,
      // Asset URLs for generation
      startFrameUrl: segment.startFrameUrl || segment.references?.startFrameUrl || null,
      endFrameUrl: segment.endFrameUrl || segment.references?.endFrameUrl || null,
      sourceVideoUrl: segment.activeAssetUrl && segment.assetType === 'video' ? segment.activeAssetUrl : null,
    }
    
    // Method labels for UI
    const methodLabels: Record<VideoGenerationMethod, string> = {
      FTV: 'Frame Interpolation',
      I2V: 'Image to Video',
      T2V: 'Text to Video',
      EXT: 'Video Extension',
      REF: 'Reference-Based',
    }
    
    // FRAME-FIRST: Enhanced method reasons with guidance
    const methodReasons: Record<VideoGenerationMethod, string> = {
      FTV: 'Best quality: Both keyframes anchor character appearance',
      I2V: 'Good quality: Start frame anchors character appearance',
      T2V: '⚠️ Lower quality: Generate frames first for better consistency',
      EXT: 'Extends existing video seamlessly',
      REF: 'Character references guide generation',
    }
    
    return {
      config,
      isReady: confidence >= 50 && approvalStatus !== 'error',
      isApproved: approvalStatus === 'user-approved',
      methodLabel: methodLabels[method],
      methodReason: methodReasons[method],
    }
  }, [segment, sceneImageUrl])
}

/**
 * Hook to batch-process multiple segments and generate configs
 */
export function useSegmentConfigs(
  segments: SceneSegment[],
  sceneImageUrl?: string
): Map<string, SegmentConfigResult> {
  return useMemo(() => {
    const configMap = new Map<string, SegmentConfigResult>()
    
    for (const segment of segments) {
      const method = detectRecommendedMethod(segment)
      const confidence = calculateConfidence(segment, method)
      const approvalStatus = determineApprovalStatus(segment)
      
      const motionPrompt = generateMotionPrompt(segment)
      const visualPrompt = generateVisualPrompt(segment, sceneImageUrl)
      const prompt = method === 'FTV' ? motionPrompt : visualPrompt
      
      const config: VideoGenerationConfig = {
        mode: method,
        prompt,
        motionPrompt,
        visualPrompt,
        aspectRatio: '16:9',
        resolution: '720p',
        duration: Math.max(4, Math.min(8, Math.round(segment.endTime - segment.startTime))),
        negativePrompt: '',
        approvalStatus,
        confidence,
        startFrameUrl: segment.startFrameUrl || segment.references?.startFrameUrl || null,
        endFrameUrl: segment.endFrameUrl || segment.references?.endFrameUrl || null,
        sourceVideoUrl: segment.activeAssetUrl && segment.assetType === 'video' ? segment.activeAssetUrl : null,
      }
      
      const methodLabels: Record<VideoGenerationMethod, string> = {
        FTV: 'Frame Interpolation',
        I2V: 'Image to Video',
        T2V: 'Text to Video',
        EXT: 'Video Extension',
        REF: 'Reference-Based',
      }
      
      const methodReasons: Record<VideoGenerationMethod, string> = {
        FTV: 'Both start and end frames available',
        I2V: 'Start frame available',
        T2V: 'No frames available',
        EXT: 'Existing video can be extended',
        REF: 'Character references available',
      }
      
      configMap.set(segment.segmentId, {
        config,
        isReady: confidence >= 50 && approvalStatus !== 'error',
        isApproved: approvalStatus === 'user-approved',
        methodLabel: methodLabels[method],
        methodReason: methodReasons[method],
      })
    }
    
    return configMap
  }, [segments, sceneImageUrl])
}

export default useSegmentConfig
