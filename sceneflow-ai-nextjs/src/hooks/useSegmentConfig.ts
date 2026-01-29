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
 * 
 * Priority:
 * 1. segment.userInstruction (user override)
 * 2. segment.userEditedPrompt (user-edited version)
 * 3. segment.generatedPrompt (AI cinematic description with scene context)
 * 4. Generated from segment metadata (action, camera, emotion)
 * 
 * Note: For Veo 3.1 speech synthesis, the generatedPrompt should include
 * dialogue in the format: "Character speaks the following line [emotion]: 'text'"
 */
function generateMotionPrompt(segment: SceneSegment): string {
  // Priority 1: User instruction override
  if (segment.userInstruction && segment.userInstruction.trim()) {
    return segment.userInstruction.trim()
  }
  
  // Priority 2: User-edited prompt (can serve as motion instruction)
  if (segment.userEditedPrompt && segment.userEditedPrompt.trim()) {
    return segment.userEditedPrompt.trim()
  }
  
  // Priority 3: AI-generated cinematic prompt (includes scene description & dialogue)
  // This is critical for Veo 3.1 speech synthesis - it contains the full context
  if (segment.generatedPrompt && segment.generatedPrompt.trim()) {
    // Add camera motion context if available
    const cameraMovement = segment.cameraMovement || ''
    if (cameraMovement && cameraMovement.toLowerCase() !== 'static') {
      return `Camera ${cameraMovement}. ${segment.generatedPrompt.trim()}`
    }
    return segment.generatedPrompt.trim()
  }
  
  const action = segment.action || segment.actionPrompt || ''
  const cameraMovement = segment.cameraMovement || ''
  const emotionalBeat = segment.emotionalBeat || ''
  
  // Build motion-focused prompt from metadata
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
 * 
 * Priority:
 * 1. segment.userInstruction (user override)
 * 2. segment.userEditedPrompt (user-edited version)
 * 3. segment.generatedPrompt (AI-generated from script)
 * 4. segment.actionPrompt (action description)
 * 5. Built from metadata (shotType, action)
 */
function generateVisualPrompt(segment: SceneSegment, sceneImageUrl?: string): string {
  // Priority 1: User instruction override
  if (segment.userInstruction && segment.userInstruction.trim()) {
    return segment.userInstruction.trim()
  }
  
  // Priority 2: User-edited prompt
  if (segment.userEditedPrompt && segment.userEditedPrompt.trim()) {
    return segment.userEditedPrompt.trim()
  }
  
  // Priority 3: Generated prompt from AI/script
  if (segment.generatedPrompt && segment.generatedPrompt.trim()) {
    return segment.generatedPrompt.trim()
  }
  
  // Priority 4: Action prompt
  if (segment.actionPrompt && segment.actionPrompt.trim()) {
    return segment.actionPrompt.trim()
  }
  
  // Priority 5: Build from metadata
  const action = segment.action || ''
  const shotType = segment.shotType || 'medium shot'
  
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
 * VISUAL FIDELITY SCORE: Predicts the likelihood of accurate generation
 * without character drift, hallucinations, or needing retakes.
 * 
 * Higher scores = fewer "slot machine" retakes
 * Lower scores = warn user about potential inconsistencies
 * 
 * Score factors:
 * - Method type (FTV > I2V > EXT > T2V)
 * - Frame anchors (more constraints = higher fidelity)
 * - Prompt quality (specific, detailed prompts = better results)
 * - Character references (helps maintain consistency)
 */
function calculateConfidence(segment: SceneSegment, method: VideoGenerationMethod): number {
  const hasStartFrame = !!(segment.startFrameUrl || segment.references?.startFrameUrl)
  const hasEndFrame = !!(segment.endFrameUrl || segment.references?.endFrameUrl)
  const hasCharacterRefs = (segment.references?.characterRefs?.length || 0) > 0
  
  // Get the active prompt for quality analysis
  const activePrompt = segment.userEditedPrompt || segment.generatedPrompt || segment.userInstruction || ''
  const promptQuality = analyzePromptQuality(activePrompt)
  
  let confidence = 50 // Base confidence
  
  switch (method) {
    case 'FTV':
      // Frame-to-Video: HIGHEST FIDELITY
      // Both start+end frames constrain the output, minimizing drift
      confidence = 92
      // Prompt quality adds up to 8 points for perfect prompt
      confidence += Math.round(promptQuality * 0.08)
      break
      
    case 'I2V':
      // Image-to-Video: GOOD FIDELITY
      // Start frame anchors the beginning, but ending is unconstrained
      confidence = 75
      // Prompt is more important here since ending is unconstrained
      confidence += Math.round(promptQuality * 0.12)
      if (hasCharacterRefs) confidence += 5
      break
      
    case 'EXT':
      // Extend: MODERATE FIDELITY
      // Uses previous video context but drift increases with extensions
      confidence = 68
      confidence += Math.round(promptQuality * 0.08)
      break
      
    case 'T2V':
      // Text-to-Video: LOWEST FIDELITY
      // No visual reference = highest risk of drift/hallucination
      confidence = 35
      // Prompt quality is critical for T2V - adds up to 20 points
      confidence += Math.round(promptQuality * 0.20)
      if (hasCharacterRefs) confidence += 10
      break
  }
  
  return Math.min(100, Math.max(10, confidence))
}

/**
 * Analyzes prompt quality to estimate generation accuracy
 * Returns a score from 0-100
 * 
 * Factors:
 * - Length (too short = vague, too long = potentially conflicting)
 * - Specificity (concrete nouns, actions vs abstract concepts)
 * - Motion clarity (for video: describes actions, camera movement)
 * - Quality markers (cinematic, photorealistic, etc.)
 */
function analyzePromptQuality(prompt: string): number {
  if (!prompt || prompt.trim().length === 0) return 0
  
  const text = prompt.toLowerCase()
  const wordCount = prompt.split(/\s+/).length
  
  let score = 50 // Base score
  
  // Length scoring: optimal is 30-80 words
  if (wordCount < 10) score -= 20      // Too vague
  else if (wordCount < 20) score -= 10 // A bit short
  else if (wordCount <= 80) score += 15 // Good length
  else if (wordCount <= 120) score += 5 // Slightly long
  else score -= 10                      // Too long, may conflict
  
  // Specificity: concrete visual descriptors
  const specificTerms = [
    'camera', 'slowly', 'smoothly', 'gradually', 'subtle',
    'lighting', 'shadow', 'bright', 'dark', 'golden',
    'close-up', 'wide shot', 'medium shot', 'tracking',
    'expression', 'gesture', 'posture', 'movement'
  ]
  const specificCount = specificTerms.filter(term => text.includes(term)).length
  score += Math.min(15, specificCount * 3)
  
  // Motion/action clarity (important for video)
  const actionTerms = ['moves', 'walks', 'turns', 'looks', 'reaches', 'speaks', 'gestures', 'stands', 'sits']
  const hasActions = actionTerms.some(term => text.includes(term))
  if (hasActions) score += 10
  
  // Quality markers that help guide generation
  const qualityMarkers = ['cinematic', 'photorealistic', 'film grain', 'professional', 'high quality', '8k', '4k']
  const hasQuality = qualityMarkers.some(term => text.includes(term))
  if (hasQuality) score += 5
  
  // Negative: vague/abstract terms that can cause inconsistency
  const vagueTerms = ['beautiful', 'amazing', 'cool', 'nice', 'interesting', 'dynamic']
  const vagueCount = vagueTerms.filter(term => text.includes(term)).length
  score -= vagueCount * 5
  
  return Math.min(100, Math.max(0, score))
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
