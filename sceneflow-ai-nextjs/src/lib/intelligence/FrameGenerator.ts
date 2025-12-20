/**
 * Frame Generator - Keyframe State Machine Intelligence
 * 
 * State machine logic for generating Start and End frames for video segments.
 * Implements the "Keyframe State Machine" pattern where:
 * 
 * 1. Segments are generated with transition types (CONTINUE vs CUT)
 * 2. Start frames inherit from previous segment's end frame (for CONTINUE)
 * 3. Start frames are freshly generated (for CUT)
 * 4. End frames are generated using Imagen 3 with identity lock
 * 5. Veo 3.1 FTV mode uses both frames for constrained video generation
 */

import { ActionType, getActionWeights, inferActionType } from './ActionWeights'
import { enhancePrompt, buildEndFramePrompt, generateNegativePrompt } from './PromptEnhancer'

// ============================================================================
// Types
// ============================================================================

export type TransitionType = 'CONTINUE' | 'CUT'

export type AnchorStatus = 
  | 'pending'           // No frames generated yet
  | 'start-locked'      // Start frame is ready
  | 'end-pending'       // Start locked, waiting for end frame
  | 'fully-anchored'    // Both start and end frames ready for FTV

export interface FrameAnchor {
  url: string
  description: string
  generatedAt: string
  actionType: ActionType
}

export interface SegmentFrameState {
  segmentId: string
  sequenceIndex: number
  transitionType: TransitionType
  duration: number
  actionPrompt: string
  actionType: ActionType
  
  // Frame anchors
  startFrame: FrameAnchor | null
  endFrame: FrameAnchor | null
  
  // State machine status
  anchorStatus: AnchorStatus
  
  // Generation metadata
  lastUpdated: string
  generationErrors?: string[]
}

export interface FrameGenerationRequest {
  segmentId: string
  segmentIndex: number
  actionPrompt: string
  duration: number
  transitionType: TransitionType
  
  // Previous segment's end frame (for CONTINUE transitions)
  previousEndFrame?: FrameAnchor | null
  
  // Scene context for prompt enhancement
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
  
  sceneContext?: {
    location?: string
    timeOfDay?: string
    atmosphere?: string
    lighting?: string
  }
  
  // Scene image as fallback/reference
  sceneImageUrl?: string
}

export interface FrameGenerationResult {
  success: boolean
  frameUrl?: string
  frameDescription?: string
  actionType: ActionType
  error?: string
  
  // Generation parameters used
  imageStrength?: number
  guidanceScale?: number
}

// ============================================================================
// State Machine Logic
// ============================================================================

/**
 * Determine the anchor status based on frame state
 */
export function determineAnchorStatus(
  startFrame: FrameAnchor | null,
  endFrame: FrameAnchor | null
): AnchorStatus {
  if (!startFrame) {
    return 'pending'
  }
  if (!endFrame) {
    return 'end-pending'
  }
  return 'fully-anchored'
}

/**
 * Determine if a segment should use CONTINUE or CUT transition
 * 
 * CONTINUE: Previous segment ends at same location/setup
 * CUT: Major scene change, location change, or dramatic beat
 */
export function determineTransitionType(
  segmentIndex: number,
  actionPrompt: string,
  previousSegmentAction?: string,
  triggerReason?: string
): TransitionType {
  // First segment always starts fresh
  if (segmentIndex === 0) {
    return 'CUT'
  }
  
  // Check trigger reason for explicit cuts
  if (triggerReason) {
    const cutTriggers = [
      'location change',
      'scene change',
      'time skip',
      'flashback',
      'flash forward',
      'new scene',
      'cut to'
    ]
    if (cutTriggers.some(trigger => triggerReason.toLowerCase().includes(trigger))) {
      return 'CUT'
    }
  }
  
  // Check action prompt for transition indicators
  const cutIndicators = [
    'meanwhile',
    'elsewhere',
    'cut to',
    'scene:',
    'int.',
    'ext.',
    'later',
    'the next day',
    'hours later',
    'flashback',
    'flash forward'
  ]
  
  const promptLower = actionPrompt.toLowerCase()
  if (cutIndicators.some(indicator => promptLower.includes(indicator))) {
    return 'CUT'
  }
  
  // Default to continue for most conversational/action sequences
  return 'CONTINUE'
}

/**
 * Build start frame generation request
 */
export function buildStartFrameRequest(
  request: FrameGenerationRequest
): {
  prompt: string
  negativePrompt: string
  imageStrength: number
  guidanceScale: number
  referenceImageUrl?: string
} {
  const actionType = inferActionType(request.actionPrompt)
  const weights = getActionWeights(actionType)
  
  // For CONTINUE transitions, use previous end frame as reference
  if (request.transitionType === 'CONTINUE' && request.previousEndFrame) {
    const prompt = enhancePrompt(
      `Beginning of segment: ${request.actionPrompt}. Continuous from previous shot.`,
      {
        actionType,
        framePosition: 'start',
        characters: request.characters,
        sceneContext: request.sceneContext,
        actionDescription: request.actionPrompt,
        previousFrameUrl: request.previousEndFrame.url
      }
    )
    
    return {
      prompt,
      negativePrompt: generateNegativePrompt(actionType),
      // High image strength for continuation
      imageStrength: Math.min(0.90, weights.imageStrength + 0.1),
      guidanceScale: weights.guidanceScale,
      referenceImageUrl: request.previousEndFrame.url
    }
  }
  
  // For CUT transitions or first segment, use scene image or generate fresh
  const prompt = enhancePrompt(
    `Opening frame: ${request.actionPrompt}`,
    {
      actionType,
      framePosition: 'start',
      characters: request.characters,
      sceneContext: request.sceneContext,
      actionDescription: request.actionPrompt
    }
  )
  
  return {
    prompt,
    negativePrompt: generateNegativePrompt(actionType),
    imageStrength: request.sceneImageUrl ? 0.75 : 0,
    guidanceScale: weights.guidanceScale,
    referenceImageUrl: request.sceneImageUrl
  }
}

/**
 * Build end frame generation request
 */
export function buildEndFrameRequest(
  request: FrameGenerationRequest,
  startFrame: FrameAnchor
): {
  prompt: string
  negativePrompt: string
  imageStrength: number
  guidanceScale: number
  referenceImageUrl: string
} {
  const actionType = inferActionType(request.actionPrompt)
  const weights = getActionWeights(actionType)
  
  const prompt = buildEndFramePrompt(
    startFrame.description,
    request.actionPrompt,
    request.duration,
    {
      actionType,
      characters: request.characters,
      sceneContext: request.sceneContext
    }
  )
  
  return {
    prompt,
    negativePrompt: generateNegativePrompt(actionType),
    // Use action-type-specific image strength for end frame
    imageStrength: weights.imageStrength,
    guidanceScale: weights.guidanceScale,
    referenceImageUrl: startFrame.url
  }
}

/**
 * Validate segment is ready for video generation (FTV mode)
 */
export function validateFTVReadiness(state: SegmentFrameState): {
  ready: boolean
  missingRequirements: string[]
} {
  const missing: string[] = []
  
  if (!state.startFrame) {
    missing.push('Start frame not generated')
  }
  
  if (!state.endFrame) {
    missing.push('End frame not generated')
  }
  
  if (state.duration < 2) {
    missing.push('Segment duration too short (minimum 2 seconds)')
  }
  
  if (state.duration > 8) {
    missing.push('Segment duration exceeds Veo 3.1 limit (maximum 8 seconds)')
  }
  
  return {
    ready: missing.length === 0,
    missingRequirements: missing
  }
}

/**
 * Calculate optimal segment duration based on action type
 */
export function calculateOptimalDuration(actionType: ActionType): {
  minimum: number
  recommended: number
  maximum: number
} {
  const durations: Record<ActionType, { min: number; rec: number; max: number }> = {
    static: { min: 2, rec: 3, max: 5 },
    subtle: { min: 2, rec: 4, max: 6 },
    speaking: { min: 3, rec: 5, max: 8 },
    gesture: { min: 2, rec: 4, max: 6 },
    movement: { min: 3, rec: 5, max: 8 },
    action: { min: 2, rec: 4, max: 6 },
    transformation: { min: 3, rec: 5, max: 8 }
  }
  
  const config = durations[actionType]
  return {
    minimum: config.min,
    recommended: config.rec,
    maximum: config.max
  }
}

/**
 * Build batch generation plan for all segments in a scene
 */
export function buildBatchGenerationPlan(
  segments: Array<{
    segmentId: string
    sequenceIndex: number
    actionPrompt: string
    duration: number
    triggerReason?: string
    startFrameUrl?: string
    endFrameUrl?: string
  }>
): SegmentFrameState[] {
  const sortedSegments = [...segments].sort((a, b) => a.sequenceIndex - b.sequenceIndex)
  const plan: SegmentFrameState[] = []
  
  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i]
    const previousSegment = i > 0 ? plan[i - 1] : null
    
    const actionType = inferActionType(segment.actionPrompt)
    const transitionType = determineTransitionType(
      i,
      segment.actionPrompt,
      previousSegment?.actionPrompt,
      segment.triggerReason
    )
    
    // Build frame anchors from existing data
    const startFrame: FrameAnchor | null = segment.startFrameUrl
      ? {
          url: segment.startFrameUrl,
          description: `Start frame for: ${segment.actionPrompt}`,
          generatedAt: new Date().toISOString(),
          actionType
        }
      : null
    
    const endFrame: FrameAnchor | null = segment.endFrameUrl
      ? {
          url: segment.endFrameUrl,
          description: `End frame for: ${segment.actionPrompt}`,
          generatedAt: new Date().toISOString(),
          actionType
        }
      : null
    
    plan.push({
      segmentId: segment.segmentId,
      sequenceIndex: segment.sequenceIndex,
      transitionType,
      duration: segment.duration,
      actionPrompt: segment.actionPrompt,
      actionType,
      startFrame,
      endFrame,
      anchorStatus: determineAnchorStatus(startFrame, endFrame),
      lastUpdated: new Date().toISOString()
    })
  }
  
  return plan
}

/**
 * Get next action for a segment in the generation workflow
 */
export function getNextAction(state: SegmentFrameState): 
  | { action: 'generate-start'; reason: string }
  | { action: 'generate-end'; reason: string }
  | { action: 'ready-for-video'; reason: string }
  | { action: 'complete'; reason: string } {
  
  switch (state.anchorStatus) {
    case 'pending':
      return {
        action: 'generate-start',
        reason: 'Start frame needed to anchor the segment'
      }
    
    case 'start-locked':
    case 'end-pending':
      return {
        action: 'generate-end',
        reason: 'End frame needed for FTV mode video generation'
      }
    
    case 'fully-anchored':
      return {
        action: 'ready-for-video',
        reason: 'Both frames anchored - ready for Veo 3.1 FTV generation'
      }
    
    default:
      return {
        action: 'complete',
        reason: 'Segment is fully processed'
      }
  }
}

export default {
  determineAnchorStatus,
  determineTransitionType,
  buildStartFrameRequest,
  buildEndFrameRequest,
  validateFTVReadiness,
  calculateOptimalDuration,
  buildBatchGenerationPlan,
  getNextAction
}
