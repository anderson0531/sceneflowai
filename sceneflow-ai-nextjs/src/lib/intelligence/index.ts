/**
 * Intelligence Library
 * 
 * Centralized AI-powered decision making for the Keyframe State Machine.
 * This library provides intelligent defaults and recommendations for:
 * 
 * 1. ActionWeights - Image generation parameters based on action intensity
 * 2. PromptEnhancer - Inverse proportionality prompt injection
 * 3. FrameGenerator - State machine for Start/End frame workflow
 * 
 * Usage:
 * ```typescript
 * import { ActionWeights, PromptEnhancer, FrameGenerator } from '@/lib/intelligence'
 * 
 * // Infer action type from prompt
 * const actionType = ActionWeights.inferActionType("character walks across room")
 * 
 * // Get generation parameters
 * const weights = ActionWeights.getActionWeights(actionType)
 * 
 * // Enhance prompt with identity lock
 * const enhancedPrompt = PromptEnhancer.enhancePrompt(basePrompt, config)
 * 
 * // Build frame generation request
 * const request = FrameGenerator.buildStartFrameRequest(segmentData)
 * ```
 */

import * as ActionWeights from './ActionWeights'
import * as PromptEnhancer from './PromptEnhancer'
import * as FrameGenerator from './FrameGenerator'

export { ActionWeights, PromptEnhancer, FrameGenerator }

// Re-export key types
export type { ActionType, ActionWeightConfig } from './ActionWeights'
export type { PromptEnhancementConfig } from './PromptEnhancer'
export type { 
  TransitionType, 
  AnchorStatus, 
  FrameAnchor, 
  SegmentFrameState,
  FrameGenerationRequest,
  FrameGenerationResult
} from './FrameGenerator'

// Convenience re-exports of commonly used functions
export const inferActionType = ActionWeights.inferActionType
export const getActionWeights = ActionWeights.getActionWeights
export const enhancePrompt = PromptEnhancer.enhancePrompt
export const buildEndFramePrompt = PromptEnhancer.buildEndFramePrompt
export const determineTransitionType = FrameGenerator.determineTransitionType
export const buildBatchGenerationPlan = FrameGenerator.buildBatchGenerationPlan
export const validateFTVReadiness = FrameGenerator.validateFTVReadiness
