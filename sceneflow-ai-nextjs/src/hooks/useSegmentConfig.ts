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
 *   WITH intelligent filtering to avoid end-frame conflicts
 * - Generation Mode (I2V/T2V): Visual descriptions from Frame step's visual prompt
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { useMemo } from 'react'
import { resolveVeoRefForExtension } from '@/lib/video/veoChainQueue'
import type { SceneSegment, VideoGenerationMethod } from '@/components/vision/scene-production/types'
import type { VideoGenerationConfig, ApprovalStatus } from '@/components/vision/scene-production/types'
import {
  buildDefaultBatchGuidePrompt,
  type GuideCharacterDemographic,
  type GuidePromptSceneContext,
} from '@/lib/scene/segmentGuidePrompt'
import {
  narrowPromptForFtvFrameLock,
  buildMinimalFtvPerformPrompt,
  FTV_SILENT_MOTION_HINT,
} from '@/lib/vision/ftvPromptNormalize'

/** Scene script + audio fields used to auto-build Veo guide text for batch generate */
export type SegmentGuideContext = {
  scene: GuidePromptSceneContext
  characters?: GuideCharacterDemographic[]
}

/**
 * FTV-SPECIFIC: Removes motion language that conflicts with end-frame anchoring
 * 
 * Problem: Prompts like "camera pulls back" or "character walks away" cause Veo
 * to generate video that doesn't match the end frame because the motion described
 * moves AWAY from the end state rather than TOWARDS it.
 * 
 * Solution: Strip out directional motion that could conflict, and add anchoring language.
 * 
 * Design Decision: Anchoring phrase is PREPENDED (not appended) because Veo 3.1
 * weights the beginning of prompts more heavily for compositional guidance.
 */
function sanitizeFTVPrompt(prompt: string): string {
  if (!prompt) return prompt
  
  // Motion phrases that commonly conflict with end-frame matching
  // These describe movement AWAY from a position rather than towards it
  const conflictingPatterns = [
    // Camera movements away
    /camera\s+(pulls?\s+back|dollies?\s+(back|out)|zooms?\s+out|tracks?\s+(back|away)|retreats?|withdraws?)/gi,
    /pull-?back/gi,
    /dolly\s+out/gi,
    /zoom\s+out/gi,
    /wide-?angle.*reveals?/gi,
    /revealing\s+(the|a)/gi,
    // Character movements away
    /(walks?|moves?|steps?|turns?|exits?|leaves?|departs?)\s+(away|off|out|back)/gi,
    /walking\s+away/gi,
    /turning\s+away/gi,
    /exits?\s+(the\s+)?(scene|frame|room|shot)/gi,
    // Generic away movements
    /moves?\s+to\s+(the\s+)?(background|distance|far)/gi,
    /recedes?/gi,
    /fades?\s+(away|out|back)/gi,
  ]
  
  let sanitized = prompt
  
  // Remove conflicting motion phrases
  for (const pattern of conflictingPatterns) {
    sanitized = sanitized.replace(pattern, '')
  }
  
  // Clean up any double spaces or orphaned punctuation
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[,\.]\s*/g, '')
    .trim()
  
  return sanitized
}

/**
 * FTV-SPECIFIC: Minimal text for frame-to-frame interpolation.
 *
 * Start/end images encode blocking and pose; when dialogue exists, only the perform cue
 * (`Name speaks, "..."`) is sent. Silent beats get a one-line motion hint plus optional camera metadata.
 */
function generateFTVMotionPrompt(segment: SceneSegment, skipAnchoringPhrase?: boolean): string {
  let basePrompt = ''

  if (segment.userInstruction && segment.userInstruction.trim()) {
    basePrompt = segment.userInstruction.trim()
  } else if (segment.userEditedPrompt && segment.userEditedPrompt.trim()) {
    basePrompt = segment.userEditedPrompt.trim()
  } else if (segment.videoPrompt && segment.videoPrompt.trim()) {
    basePrompt = segment.videoPrompt.trim()
  } else if (segment.generatedPrompt && segment.generatedPrompt.trim()) {
    basePrompt = segment.generatedPrompt.trim()
  } else {
    const parts: string[] = []
    if (segment.action || segment.actionPrompt) {
      parts.push(segment.action || segment.actionPrompt || '')
    }
    if (segment.emotionalBeat) {
      parts.push(`Emotional tone: ${segment.emotionalBeat}`)
    }
    basePrompt = parts.join('. ') || 'Subtle ambient motion and natural movement.'
  }

  basePrompt = narrowPromptForFtvFrameLock(basePrompt)

  const dialogueOnly = buildMinimalFtvPerformPrompt(segment, basePrompt)
  if (dialogueOnly) {
    console.log('[FTV Prompt] Dialogue-only perform cue (blocking omitted; frames carry poses)')
    return dialogueOnly
  }

  if (!basePrompt.trim()) {
    basePrompt = 'Subtle natural motion and expression between the two keyframes.'
  }

  basePrompt = sanitizeFTVPrompt(basePrompt)

  const cameraMovement = segment.cameraMovement || ''
  if (cameraMovement && cameraMovement.toLowerCase() !== 'static') {
    const isConflicting = /pull|back|out|away|retreat|reveal/i.test(cameraMovement)
    if (!isConflicting && !basePrompt.toLowerCase().includes('camera')) {
      basePrompt = `Camera ${cameraMovement}. ${basePrompt}`
    }
  }

  const hasTransitionLanguage = /\b(interpolat|transition|between.*frame|start.*end\s*frame|end\s*keyframe|final\s*frame|smoothly\s*(interpolate|transition)|match.*end)\b/i.test(
    basePrompt
  )

  if (skipAnchoringPhrase || hasTransitionLanguage) {
    console.log(
      '[FTV Prompt] Silent beat — skipping short motion hint:',
      skipAnchoringPhrase ? 'explicitly requested' : 'prompt already has transition language'
    )
    return basePrompt
  }

  const finalPrompt = `${FTV_SILENT_MOTION_HINT}\n\n${basePrompt}`
  console.log('[FTV Prompt] Silent beat with motion hint:', finalPrompt.substring(0, 120) + '...')
  return finalPrompt
}

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
 * 
 * IMPORTANT: For FTV mode, this function routes to generateFTVMotionPrompt()
 * which prefers dialogue-only perform cues; silent beats use a short motion hint.
 */
function generateMotionPrompt(segment: SceneSegment, sceneImageUrl?: string): string {
  const masterSceneStart =
    segment.sequenceIndex === 0 && sceneImageUrl?.trim() ? sceneImageUrl.trim() : ''
  // Check if this is FTV mode (has both start and end frames)
  const hasStartFrame = !!(
    segment.startFrameUrl ||
    segment.references?.startFrameUrl ||
    masterSceneStart
  )
  const hasEndFrame = !!(segment.endFrameUrl || segment.references?.endFrameUrl)
  
  // For FTV mode: use the intelligent prompt generator with end-frame anchoring
  if (hasStartFrame && hasEndFrame) {
    return generateFTVMotionPrompt(segment)
  }
  
  // For non-FTV modes (I2V, T2V): use original logic without modification
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
function detectRecommendedMethod(
  segment: SceneSegment,
  sceneImageUrl?: string,
  allSegments?: SceneSegment[]
): VideoGenerationMethod {
  if (
    segment.veoTimelineContinuation ||
    segment.generationMethod === 'EXT' ||
    segment.videoChain?.chainMethod === 'extension'
  ) {
    const segments = allSegments ?? []
    const partIndex =
      segment.dialoguePortion?.partIndex ?? segment.videoChain?.partIndex ?? segment.sequenceIndex
    if (partIndex > 0) {
      const prev =
        segments.find(
          (s) =>
            s.beatId === segment.beatId &&
            (s.dialoguePortion?.partIndex === partIndex - 1 ||
              s.videoChain?.partIndex === partIndex - 1)
        ) ?? segments.find((s) => s.sequenceIndex === segment.sequenceIndex - 1)
      if (prev?.takes?.[0]?.veoVideoRef?.trim()) {
        return 'EXT'
      }
    }
  }

  const masterSceneFrame =
    segment.sequenceIndex === 0 && sceneImageUrl?.trim()
      ? sceneImageUrl.trim()
      : ''
  const hasStartFrame = !!(
    segment.startFrameUrl ||
    segment.references?.startFrameUrl ||
    masterSceneFrame
  )
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

/** True when batch auto-guide can include dialogue (IDs or embedded segment lines). */
export function segmentHasBatchGuideDialogue(segment: SceneSegment): boolean {
  return (
    (segment.dialogueLineIds?.length ?? 0) > 0 ||
    (segment.dialogueLines?.length ?? 0) > 0
  )
}

/** Resolved URLs passed to Veo (segment fields + first-segment scene master frame). */
function resolveSegmentFrameUrls(segment: SceneSegment, sceneImageUrl?: string) {
  const masterSceneFrame =
    segment.sequenceIndex === 0 && sceneImageUrl?.trim()
      ? sceneImageUrl.trim()
      : null
  const startFrameUrl =
    segment.startFrameUrl ||
    segment.references?.startFrameUrl ||
    masterSceneFrame ||
    null
  const endFrameUrl =
    segment.endFrameUrl || segment.references?.endFrameUrl || null
  return { startFrameUrl, endFrameUrl }
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
  sceneImageUrl?: string,
  guideContext?: SegmentGuideContext,
  defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9'
): SegmentConfigResult {
  return useMemo(() => {
    const method = detectRecommendedMethod(segment, sceneImageUrl, [segment])
    const confidence = calculateConfidence(segment, method)
    const approvalStatus = determineApprovalStatus(segment)
    
    // Generate appropriate prompt based on method
    const motionPrompt = generateMotionPrompt(segment, sceneImageUrl)
    const visualPrompt = generateVisualPrompt(segment, sceneImageUrl)
    
    // Choose primary prompt based on method
    const prompt = method === 'FTV' ? motionPrompt : visualPrompt

    const { startFrameUrl: resolvedStart, endFrameUrl: resolvedEnd } =
      resolveSegmentFrameUrls(segment, sceneImageUrl)

    const guidePrompt =
      guideContext?.scene && segmentHasBatchGuideDialogue(segment)
        ? buildDefaultBatchGuidePrompt(
            segment,
            guideContext.scene,
            guideContext.characters ?? [],
            {
              omitDialogue:
                method === 'FTV' && segmentHasBatchGuideDialogue(segment),
            }
          )
        : ''
    
    const extVeoRef =
      method === 'EXT' ? resolveVeoRefForExtension([segment], segment) : undefined

    const config: VideoGenerationConfig = {
      mode: method,
      prompt,
      motionPrompt,
      visualPrompt,
      aspectRatio: defaultAspectRatio === '1:1' || defaultAspectRatio === '4:3'
        ? '16:9'
        : defaultAspectRatio,
      resolution: method === 'EXT' ? '720p' : '720p',
      duration:
        method === 'EXT'
          ? 8
          : Math.max(4, Math.min(8, Math.round(segment.endTime - segment.startTime))),
      negativePrompt: '',
      approvalStatus,
      confidence,
      guidePrompt: guidePrompt || undefined,
      // Asset URLs for generation
      startFrameUrl: resolvedStart,
      endFrameUrl: resolvedEnd,
      sourceVideoUrl:
        extVeoRef ??
        (segment.activeAssetUrl && segment.assetType === 'video'
          ? segment.activeAssetUrl
          : null),
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
  }, [segment, sceneImageUrl, guideContext, defaultAspectRatio])
}

/**
 * Hook to batch-process multiple segments and generate configs
 * @param segments - Array of scene segments to process
 * @param sceneImageUrl - Optional fallback image URL
 * @param skip - If true, skip all processing and return empty map (for TDZ quarantine)
 */
export function useSegmentConfigs(
  segments: SceneSegment[],
  sceneImageUrl?: string,
  skip?: boolean,
  guideContext?: SegmentGuideContext,
  defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9'
): Map<string, SegmentConfigResult> {
  return useMemo(() => {
    // QUARANTINE GUARD: Skip all processing if told to
    // This prevents TDZ errors during the initial module evaluation phase
    if (skip) {
      return new Map<string, SegmentConfigResult>()
    }
    
    const configMap = new Map<string, SegmentConfigResult>()
    
    // Filter out any undefined or invalid segments
    const validSegments = segments.filter((s): s is SceneSegment => 
      s != null && typeof s.segmentId === 'string'
    )
    
    for (const segment of validSegments) {
      const method = detectRecommendedMethod(segment, sceneImageUrl, validSegments)
      const confidence = calculateConfidence(segment, method)
      const approvalStatus = determineApprovalStatus(segment)
      
      const motionPrompt = generateMotionPrompt(segment, sceneImageUrl)
      const visualPrompt = generateVisualPrompt(segment, sceneImageUrl)
      const prompt = method === 'FTV' ? motionPrompt : visualPrompt

      const { startFrameUrl: resolvedStart, endFrameUrl: resolvedEnd } =
        resolveSegmentFrameUrls(segment, sceneImageUrl)

      const guidePrompt =
        guideContext?.scene && segmentHasBatchGuideDialogue(segment)
          ? buildDefaultBatchGuidePrompt(
              segment,
              guideContext.scene,
              guideContext.characters ?? [],
              {
                omitDialogue:
                  method === 'FTV' && segmentHasBatchGuideDialogue(segment),
              }
            )
          : ''
      
      const extVeoRef =
        method === 'EXT' ? resolveVeoRefForExtension(validSegments, segment) : undefined

      const config: VideoGenerationConfig = {
        mode: method,
        prompt,
        motionPrompt,
        visualPrompt,
        aspectRatio: defaultAspectRatio === '1:1' || defaultAspectRatio === '4:3'
          ? '16:9'
          : defaultAspectRatio,
        resolution: '720p',
        duration:
          method === 'EXT'
            ? 8
            : Math.max(4, Math.min(8, Math.round(segment.endTime - segment.startTime))),
        negativePrompt: '',
        approvalStatus,
        confidence,
        guidePrompt: guidePrompt || undefined,
        startFrameUrl: resolvedStart,
        endFrameUrl: resolvedEnd,
        sourceVideoUrl:
          extVeoRef ??
          (segment.activeAssetUrl && segment.assetType === 'video'
            ? segment.activeAssetUrl
            : null),
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
  }, [segments, sceneImageUrl, skip, guideContext, defaultAspectRatio])
}

export default useSegmentConfig
