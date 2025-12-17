/**
 * Intelligent Method Selection for Veo Video Generation
 * 
 * Automatically selects the optimal Veo 3.1 generation method based on:
 * - Segment position (first vs continuation)
 * - Available references (scene image, character refs)
 * - Camera/shot type changes
 * - Previous segment video availability (for EXT mode)
 * 
 * Veo 3.1 Method Constraints:
 * - REF (referenceImages): T2V only, CANNOT combine with startFrame
 * - I2V (image): Uses startFrame to animate
 * - FTV: Uses both startFrame and lastFrame for interpolation
 * - EXT: Requires veoVideoRef from previous Veo generation
 */

export type VideoGenerationMethod = 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF' | 'AUTO'

export interface MethodSelectionContext {
  segmentIndex: number
  totalSegments: number
  hasSceneImage: boolean
  hasCharacterRefs: boolean
  hasPreviousLastFrame: boolean
  hasPreviousVeoRef: boolean  // For EXT mode
  isEstablishingShot: boolean
  shotType?: 'wide' | 'medium' | 'close-up' | 'extreme-close-up' | 'unknown'
  previousShotType?: 'wide' | 'medium' | 'close-up' | 'extreme-close-up' | 'unknown'
  hasDialogue: boolean
  hasSignificantMotion: boolean
}

export interface MethodSelectionResult {
  method: Exclude<VideoGenerationMethod, 'AUTO'>
  confidence: number  // 0-1 scale
  reasoning: string
  warnings?: string[]
  fallbackMethod?: Exclude<VideoGenerationMethod, 'AUTO'>
}

/**
 * Analyzes prompt text to detect shot type
 */
export function detectShotType(prompt: string): MethodSelectionContext['shotType'] {
  const text = prompt.toLowerCase()
  
  if (/\b(extreme close[- ]?up|ecu|macro|detail shot)\b/.test(text)) {
    return 'extreme-close-up'
  }
  if (/\b(close[- ]?up|cu|tight shot|face|eyes|hands)\b/.test(text)) {
    return 'close-up'
  }
  if (/\b(medium|mid[- ]?shot|waist|ms|mcu|mcl)\b/.test(text)) {
    return 'medium'
  }
  if (/\b(wide|establishing|master|long shot|full shot|ws|els)\b/.test(text)) {
    return 'wide'
  }
  
  return 'unknown'
}

/**
 * Detects if prompt contains dialogue
 */
export function hasDialogueInPrompt(prompt: string): boolean {
  const text = prompt.toLowerCase()
  return /\b(says?|speaks?|talks?|dialogue|conversation|asks?|replies?|whispers?|shouts?|yells?)\b/.test(text) ||
    /"[^"]+"/i.test(prompt) ||  // Quoted speech
    /\b(lines?|delivery|monologue)\b/.test(text)
}

/**
 * Detects significant motion in prompt
 */
export function hasMotionInPrompt(prompt: string): boolean {
  const text = prompt.toLowerCase()
  return /\b(runs?|fights?|chases?|explosion|crash|falls?|jumps?|attacks?|escapes?|action|moves?|walks?|drives?|flies?)\b/.test(text)
}

/**
 * Main method selection function
 * Analyzes context and returns the optimal Veo generation method
 */
export function selectOptimalMethod(context: MethodSelectionContext): MethodSelectionResult {
  const {
    segmentIndex,
    hasSceneImage,
    hasCharacterRefs,
    hasPreviousLastFrame,
    hasPreviousVeoRef,
    isEstablishingShot,
    shotType,
    previousShotType,
    hasDialogue,
  } = context
  
  const isFirstSegment = segmentIndex === 0
  const hasReferences = hasCharacterRefs
  const shotTypeChanged = previousShotType && shotType && previousShotType !== shotType
  const isCloseUp = shotType === 'close-up' || shotType === 'extreme-close-up'
  
  // Decision Tree
  
  // Rule 1: Establishing shot with scene image → I2V (animate the scene image)
  if (isEstablishingShot && hasSceneImage) {
    return {
      method: 'I2V',
      confidence: 0.95,
      reasoning: 'Establishing shot with scene image - I2V animates the composed scene frame',
    }
  }
  
  // Rule 2: First segment with scene image → I2V
  if (isFirstSegment && hasSceneImage) {
    return {
      method: 'I2V',
      confidence: 0.90,
      reasoning: 'First segment with scene image - I2V provides precise control over opening frame',
      fallbackMethod: hasReferences ? 'REF' : 'T2V',
    }
  }
  
  // Rule 3: First segment without scene image but has character refs → REF
  if (isFirstSegment && !hasSceneImage && hasReferences) {
    return {
      method: 'REF',
      confidence: 0.85,
      reasoning: 'First segment with character references - REF maintains character consistency',
      warnings: ['Consider generating a scene image for better visual consistency'],
    }
  }
  
  // Rule 4: First segment without any references → T2V
  if (isFirstSegment && !hasSceneImage && !hasReferences) {
    return {
      method: 'T2V',
      confidence: 0.60,
      reasoning: 'First segment without references - basic T2V generation',
      warnings: [
        'No scene image available - visual consistency may vary',
        'Consider adding character reference images',
      ],
    }
  }
  
  // Rule 5: Close-up with dialogue and previous Veo ref → EXT (seamless continuation)
  if (isCloseUp && hasDialogue && hasPreviousVeoRef) {
    return {
      method: 'EXT',
      confidence: 0.95,
      reasoning: 'Close-up with dialogue - EXT provides seamless lip sync and expression continuity',
    }
  }
  
  // Rule 6: Close-up with previous Veo ref (no dialogue) → EXT
  if (isCloseUp && hasPreviousVeoRef && !shotTypeChanged) {
    return {
      method: 'EXT',
      confidence: 0.85,
      reasoning: 'Close-up continuation - EXT maintains visual continuity',
    }
  }
  
  // Rule 7: Shot type changed with character refs → REF (allows model creative freedom)
  if (shotTypeChanged && hasReferences) {
    return {
      method: 'REF',
      confidence: 0.85,
      reasoning: 'Shot type changed - REF allows creative camera repositioning while maintaining character consistency',
    }
  }
  
  // Rule 8: Same shot type with previous Veo ref → EXT
  if (!shotTypeChanged && hasPreviousVeoRef) {
    return {
      method: 'EXT',
      confidence: 0.80,
      reasoning: 'Continuation of same shot type - EXT provides seamless transition',
    }
  }
  
  // Rule 9: Has previous last frame but no Veo ref → I2V with last frame
  if (hasPreviousLastFrame && !hasPreviousVeoRef) {
    return {
      method: 'I2V',
      confidence: 0.75,
      reasoning: 'Previous frame available but no Veo reference - I2V with last frame as start',
      warnings: ['Video was regenerated - using I2V instead of EXT'],
    }
  }
  
  // Rule 10: Has character refs but no other context → REF
  if (hasReferences) {
    return {
      method: 'REF',
      confidence: 0.70,
      reasoning: 'Default with character references - REF maintains consistency',
    }
  }
  
  // Default fallback → T2V
  return {
    method: 'T2V',
    confidence: 0.50,
    reasoning: 'Fallback - basic text-to-video generation',
    warnings: [
      'Consider adding reference images for better quality',
      'Generate a scene image for visual consistency',
    ],
  }
}

/**
 * Validates if a method can be used with given context
 */
export function validateMethodForContext(
  method: Exclude<VideoGenerationMethod, 'AUTO'>,
  context: MethodSelectionContext
): { valid: boolean; error?: string; suggestion?: Exclude<VideoGenerationMethod, 'AUTO'> } {
  switch (method) {
    case 'I2V':
      if (!context.hasSceneImage && !context.hasPreviousLastFrame) {
        return {
          valid: false,
          error: 'I2V requires a start frame (scene image or previous frame)',
          suggestion: context.hasCharacterRefs ? 'REF' : 'T2V',
        }
      }
      break
      
    case 'EXT':
      if (!context.hasPreviousVeoRef) {
        return {
          valid: false,
          error: 'EXT requires a previous Veo-generated video reference',
          suggestion: context.hasPreviousLastFrame ? 'I2V' : 'REF',
        }
      }
      break
      
    case 'FTV':
      if (!context.hasSceneImage && !context.hasPreviousLastFrame) {
        return {
          valid: false,
          error: 'FTV requires both start and end frames',
          suggestion: 'I2V',
        }
      }
      break
      
    case 'REF':
      if (!context.hasCharacterRefs) {
        return {
          valid: false,
          error: 'REF requires at least one reference image',
          suggestion: context.hasSceneImage ? 'I2V' : 'T2V',
        }
      }
      break
  }
  
  return { valid: true }
}

/**
 * Gets the method with fallback if primary is invalid
 */
export function getMethodWithFallback(
  requestedMethod: VideoGenerationMethod,
  context: MethodSelectionContext
): MethodSelectionResult {
  // If AUTO, use intelligent selection
  if (requestedMethod === 'AUTO') {
    return selectOptimalMethod(context)
  }
  
  // Validate requested method
  const validation = validateMethodForContext(requestedMethod, context)
  
  if (validation.valid) {
    return {
      method: requestedMethod,
      confidence: 1.0,
      reasoning: 'User-selected method is valid for context',
    }
  }
  
  // Method invalid, use suggestion or fall back to AUTO
  if (validation.suggestion) {
    const fallbackResult = selectOptimalMethod(context)
    return {
      method: validation.suggestion,
      confidence: fallbackResult.confidence * 0.9,
      reasoning: `${validation.error}. Using ${validation.suggestion} instead.`,
      warnings: [validation.error!],
    }
  }
  
  // Ultimate fallback
  return selectOptimalMethod(context)
}

/**
 * Builds context from segment and scene data
 */
export function buildMethodSelectionContext(
  segment: {
    segmentId: string
    sequenceIndex: number
    generatedPrompt?: string
    isEstablishingShot?: boolean
    references?: {
      startFrameUrl?: string | null
      characterIds?: string[]
    }
  },
  scene: {
    imageUrl?: string
  },
  previousSegment?: {
    activeAssetUrl?: string | null
    takes?: Array<{ veoVideoRef?: string }>
  },
  totalSegments: number = 1,
  allCharacterRefs: string[] = []
): MethodSelectionContext {
  const prompt = segment.generatedPrompt || ''
  const shotType = detectShotType(prompt)
  
  // Check if previous segment has a Veo reference
  const hasPreviousVeoRef = previousSegment?.takes?.some(t => t.veoVideoRef) || false
  const hasPreviousLastFrame = !!previousSegment?.activeAssetUrl
  
  // Check character references
  const hasCharacterRefs = (segment.references?.characterIds?.length || 0) > 0 || allCharacterRefs.length > 0
  
  // hasSceneImage is true if:
  // 1. Scene has an imageUrl, OR
  // 2. Segment has a startFrameUrl explicitly set (user selected a start frame)
  const hasStartFrame = !!segment.references?.startFrameUrl
  const hasSceneImage = !!scene.imageUrl || hasStartFrame
  
  return {
    segmentIndex: segment.sequenceIndex,
    totalSegments,
    hasSceneImage,
    hasCharacterRefs,
    hasPreviousLastFrame: hasPreviousLastFrame || hasStartFrame,  // Also consider explicit startFrameUrl
    hasPreviousVeoRef,
    isEstablishingShot: segment.isEstablishingShot || false,
    shotType,
    previousShotType: previousSegment ? detectShotType(prompt) : undefined,
    hasDialogue: hasDialogueInPrompt(prompt),
    hasSignificantMotion: hasMotionInPrompt(prompt),
  }
}
