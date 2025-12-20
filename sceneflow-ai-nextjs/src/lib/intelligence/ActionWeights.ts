/**
 * Action Weights - Keyframe State Machine Intelligence
 * 
 * Determines image generation parameters (imageStrength, guidanceScale) based on
 * the type of action/change between the start and end frames of a segment.
 * 
 * PRINCIPLE: Inverse proportionality
 * - Low action (holding pose, subtle look) → HIGH imageStrength (preserve appearance)
 * - High action (running, transforming) → LOW imageStrength (allow change)
 * 
 * This ensures character consistency for static shots while allowing dynamic
 * motion for action sequences.
 */

export type ActionType = 
  | 'static'           // Character holds pose, no movement
  | 'subtle'           // Micro-expressions, eye movement, breathing
  | 'speaking'         // Dialogue delivery, mouth movement
  | 'gesture'          // Hand gestures, head turns
  | 'movement'         // Walking, repositioning
  | 'action'           // Running, fighting, physical activity
  | 'transformation'   // Major change (costume, lighting, time skip)

export interface ActionWeightConfig {
  // Image-to-image strength (0.0-1.0)
  // Higher = preserve more of the source image
  imageStrength: number
  
  // Guidance scale for CFG (1-20)
  // Higher = follow prompt more strictly
  guidanceScale: number
  
  // Number of inference steps (10-50)
  inferenceSteps: number
  
  // Recommended seed strategy
  seedStrategy: 'consistent' | 'varied' | 'random'
  
  // Description for UI/logging
  description: string
}

/**
 * Action weight configurations keyed by action type
 */
export const ACTION_WEIGHT_CONFIGS: Record<ActionType, ActionWeightConfig> = {
  static: {
    imageStrength: 0.90,
    guidanceScale: 7.5,
    inferenceSteps: 30,
    seedStrategy: 'consistent',
    description: 'Minimal change - character holds pose, environment static'
  },
  subtle: {
    imageStrength: 0.85,
    guidanceScale: 7.0,
    inferenceSteps: 30,
    seedStrategy: 'consistent',
    description: 'Micro-expressions, breathing, subtle shifts'
  },
  speaking: {
    imageStrength: 0.80,
    guidanceScale: 7.5,
    inferenceSteps: 35,
    seedStrategy: 'consistent',
    description: 'Dialogue delivery with mouth and expression changes'
  },
  gesture: {
    imageStrength: 0.70,
    guidanceScale: 8.0,
    inferenceSteps: 35,
    seedStrategy: 'varied',
    description: 'Hand gestures, head turns, body language'
  },
  movement: {
    imageStrength: 0.55,
    guidanceScale: 8.5,
    inferenceSteps: 40,
    seedStrategy: 'varied',
    description: 'Walking, repositioning in scene'
  },
  action: {
    imageStrength: 0.40,
    guidanceScale: 9.0,
    inferenceSteps: 45,
    seedStrategy: 'random',
    description: 'Running, fighting, dynamic physical activity'
  },
  transformation: {
    imageStrength: 0.25,
    guidanceScale: 10.0,
    inferenceSteps: 50,
    seedStrategy: 'random',
    description: 'Major scene change - costume, lighting, time skip'
  }
}

/**
 * Get action weights for a given action type
 */
export function getActionWeights(actionType: ActionType): ActionWeightConfig {
  return ACTION_WEIGHT_CONFIGS[actionType] || ACTION_WEIGHT_CONFIGS.gesture
}

/**
 * Analyze prompt/action description to infer action type
 * Uses keyword matching and sentiment analysis
 */
export function inferActionType(actionPrompt: string): ActionType {
  const prompt = actionPrompt.toLowerCase()
  
  // Transformation indicators
  const transformationKeywords = [
    'transforms', 'changes into', 'time passes', 'suddenly',
    'flash forward', 'cut to', 'scene change', 'different outfit',
    'lighting shifts', 'years later', 'morning becomes'
  ]
  if (transformationKeywords.some(kw => prompt.includes(kw))) {
    return 'transformation'
  }
  
  // Action indicators
  const actionKeywords = [
    'runs', 'running', 'jumps', 'jumping', 'fights', 'fighting',
    'chases', 'falls', 'crashes', 'explodes', 'sprints', 'leaps',
    'dives', 'attacks', 'dodges', 'kicks', 'punches', 'throws'
  ]
  if (actionKeywords.some(kw => prompt.includes(kw))) {
    return 'action'
  }
  
  // Movement indicators
  const movementKeywords = [
    'walks', 'walking', 'moves', 'moving', 'crosses', 'enters',
    'exits', 'approaches', 'retreats', 'paces', 'steps', 'turns around',
    'sits down', 'stands up', 'leans', 'reaches'
  ]
  if (movementKeywords.some(kw => prompt.includes(kw))) {
    return 'movement'
  }
  
  // Gesture indicators
  const gestureKeywords = [
    'gestures', 'points', 'waves', 'nods', 'shakes head', 'shrugs',
    'tilts head', 'raises hand', 'crosses arms', 'puts hand',
    'looks at', 'glances', 'shifts weight'
  ]
  if (gestureKeywords.some(kw => prompt.includes(kw))) {
    return 'gesture'
  }
  
  // Speaking indicators
  const speakingKeywords = [
    'says', 'speaks', 'tells', 'asks', 'replies', 'whispers',
    'shouts', 'yells', 'explains', 'dialogue', 'conversation',
    'talking', 'speaking', 'responds', 'answers'
  ]
  if (speakingKeywords.some(kw => prompt.includes(kw))) {
    return 'speaking'
  }
  
  // Subtle indicators
  const subtleKeywords = [
    'slight', 'subtle', 'barely', 'gently', 'softly', 'slowly',
    'breathing', 'blinks', 'eyes', 'expression', 'smirks', 'smiles slightly',
    'frowns', 'thinks', 'contemplates', 'pauses'
  ]
  if (subtleKeywords.some(kw => prompt.includes(kw))) {
    return 'subtle'
  }
  
  // Static indicators
  const staticKeywords = [
    'holds', 'remains', 'stays', 'frozen', 'still', 'motionless',
    'unchanged', 'maintains', 'keeps', 'continues to hold'
  ]
  if (staticKeywords.some(kw => prompt.includes(kw))) {
    return 'static'
  }
  
  // Default to gesture for most conversational content
  return 'gesture'
}

/**
 * Calculate blended weights for complex actions
 * Useful when a segment contains multiple action types
 */
export function blendActionWeights(
  actionTypes: ActionType[],
  weights?: number[]
): ActionWeightConfig {
  if (actionTypes.length === 0) {
    return ACTION_WEIGHT_CONFIGS.gesture
  }
  
  if (actionTypes.length === 1) {
    return ACTION_WEIGHT_CONFIGS[actionTypes[0]]
  }
  
  // Default to equal weighting if not specified
  const normalizedWeights = weights || actionTypes.map(() => 1 / actionTypes.length)
  
  // Blend each parameter
  let imageStrength = 0
  let guidanceScale = 0
  let inferenceSteps = 0
  
  actionTypes.forEach((type, index) => {
    const config = ACTION_WEIGHT_CONFIGS[type]
    const weight = normalizedWeights[index]
    imageStrength += config.imageStrength * weight
    guidanceScale += config.guidanceScale * weight
    inferenceSteps += config.inferenceSteps * weight
  })
  
  // Determine seed strategy based on dominant action
  const mostDynamicType = actionTypes.reduce((most, current) => {
    const mostIndex = Object.keys(ACTION_WEIGHT_CONFIGS).indexOf(most)
    const currentIndex = Object.keys(ACTION_WEIGHT_CONFIGS).indexOf(current)
    return currentIndex > mostIndex ? current : most
  })
  
  return {
    imageStrength,
    guidanceScale,
    inferenceSteps: Math.round(inferenceSteps),
    seedStrategy: ACTION_WEIGHT_CONFIGS[mostDynamicType].seedStrategy,
    description: `Blended: ${actionTypes.join(', ')}`
  }
}

export default {
  getActionWeights,
  inferActionType,
  blendActionWeights,
  ACTION_WEIGHT_CONFIGS
}
