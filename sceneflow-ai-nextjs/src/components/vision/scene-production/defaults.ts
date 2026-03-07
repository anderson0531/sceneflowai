/**
 * Runtime values extracted from types.ts to prevent webpack module concatenation TDZ errors.
 * 
 * types.ts should contain ONLY type definitions (interfaces, type aliases, enums)
 * so TypeScript can erase them at compile time. Runtime values (functions, consts)
 * must live here so webpack doesn't reorder const declarations during concatenation.
 * 
 * @module defaults
 */

import type {
  CharacterReference,
  CharacterReferencePrioritization,
  ProductionStream,
  AnimaticRenderSettings,
  VideoRenderSettings,
  SmartPromptSettings,
} from './types'

// ============================================================================
// Character Reference Prioritization
// ============================================================================

/**
 * Prioritize characters for reference images based on context
 * @param characters All characters in scene
 * @param maxRefs Maximum references allowed (e.g., 3 for Veo, 5 for Imagen)
 * @param segmentDialogue Dialogue in current segment (to prioritize speaking characters)
 */
export function prioritizeCharacterReferences(
  characters: CharacterReference[],
  maxRefs: number,
  segmentDialogue?: string[]
): CharacterReferencePrioritization {
  // Filter to characters with reference images
  const withRefs = characters.filter(c => c.referenceImageUrl)
  
  if (withRefs.length <= maxRefs) {
    return {
      included: withRefs,
      excluded: [],
      reason: 'All characters with references included'
    }
  }
  
  // Prioritize by: speaking in segment > protagonist > main > supporting > background
  const priorityOrder = ['protagonist', 'speaking', 'supporting', 'background']
  
  // Mark characters speaking in this segment
  if (segmentDialogue && segmentDialogue.length > 0) {
    const dialogueText = segmentDialogue.join(' ').toLowerCase()
    withRefs.forEach(c => {
      if (dialogueText.includes(c.name.toLowerCase())) {
        c.speakingInSegment = true
        c.priority = 'speaking'
      }
    })
  }
  
  // Sort by priority
  const sorted = [...withRefs].sort((a, b) => {
    // Speaking characters first
    if (a.speakingInSegment && !b.speakingInSegment) return -1
    if (!a.speakingInSegment && b.speakingInSegment) return 1
    
    // Then by priority
    const aIdx = priorityOrder.indexOf(a.priority || 'background')
    const bIdx = priorityOrder.indexOf(b.priority || 'background')
    return aIdx - bIdx
  })
  
  const included = sorted.slice(0, maxRefs)
  const excluded = sorted.slice(maxRefs)
  
  return {
    included,
    excluded,
    reason: excluded.length > 0 
      ? `Prioritized ${included.map(c => c.name).join(', ')} (speaking/protagonist). Excluded: ${excluded.map(c => c.name).join(', ')}`
      : 'Selected by priority'
  }
}

// ============================================================================
// Production Stream Type Guards
// ============================================================================

/**
 * Type guard to check if a stream is an animatic stream
 */
export function isAnimaticStream(stream: ProductionStream): boolean {
  return stream.streamType === 'animatic'
}

/**
 * Type guard to check if a stream is a video stream
 */
export function isVideoStream(stream: ProductionStream): boolean {
  return stream.streamType === 'video'
}

// ============================================================================
// Default Settings Constants
// ============================================================================

/**
 * Default animatic render settings
 */
export const DEFAULT_ANIMATIC_SETTINGS: AnimaticRenderSettings = {
  type: 'animatic',
  kenBurnsIntensity: 'subtle',
  transitionStyle: 'crossfade',
  transitionDuration: 0.5,
  includeSubtitles: false,
}

/**
 * Default video render settings
 */
export const DEFAULT_VIDEO_SETTINGS: VideoRenderSettings = {
  type: 'video',
  upscale: false,
  motionIntensity: 'medium',
  includeSubtitles: false,
}

/**
 * Default settings factory for Smart Prompt
 */
export const createDefaultSmartPromptSettings = (): SmartPromptSettings => ({
  camera: {
    movementType: 'static',
    velocity: 'medium',
    shotFraming: 'medium',
    focusMode: 'locked',
    motionIntensity: 50,
    pacingStyle: 'natural',
  },
  performance: {
    lipSyncEnabled: false,
    lipSyncPriority: 'off',
    expressionIntensity: 50,
    microExpressionsEnabled: true,
    eyeContactMode: 'natural',
    bodyLanguageIntensity: 50,
  },
  visualStyle: {
    stylePreset: 'cinematic',
    lighting: 'natural',
    lightingIntensity: 50,
    colorGrading: 'neutral',
    saturation: 50,
    contrast: 50,
    filmGrainEnabled: false,
    filmGrainIntensity: 0,
    depthOfFieldEnabled: true,
    apertureStyle: 'normal',
  },
  magicEdit: {
    enabled: false,
    selectionMethod: 'auto',
    operationType: 'modify',
    targetDescription: '',
    changeDescription: '',
    preserveFaces: true,
    blendStrength: 80,
  },
})
