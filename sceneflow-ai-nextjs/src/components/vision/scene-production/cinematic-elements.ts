/**
 * Cinematic Elements - Shared Types & Configurations
 * 
 * Defines special segment types for cinematic elements like title sequences,
 * match cuts, establishing shots, B-roll, and outros. These are non-keyframe-based
 * segments that add professional film polish to video projects.
 * 
 * Used by:
 * - AddSpecialSegmentDialog (for inserting new cinematic segments)
 * - SegmentPromptBuilder (CIN tab for transforming existing segments)
 * - DirectorConsole (cinematic button on segment cards)
 */

import { Type, Scissors, MapPin, Coffee, CreditCard } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

/** Special segment types - excludes 'standard' and 'extend' which require keyframes */
export type SpecialSegmentType = 'title' | 'match-cut' | 'establishing' | 'broll' | 'outro'

export interface FilmContext {
  title?: string
  logline?: string
  genre?: string[]
  tone?: string
  targetAudience?: string
  visualStyle?: string
}

export interface AdjacentSceneContext {
  previousScene?: {
    heading?: string
    action?: string
    endFrameUrl?: string
    lastSegment?: {
      generatedPrompt?: string
      userEditedPrompt?: string
    }
  }
  currentScene: {
    heading?: string
    action?: string
    narration?: string
  }
  nextScene?: {
    heading?: string
    action?: string
    startFrameUrl?: string
  }
}

export interface SpecialSegmentConfig {
  id: SpecialSegmentType
  name: string
  icon: React.ElementType
  description: string
  shortDescription: string // For compact UI (tabs, buttons)
  defaultDuration: number
  /** Static fallback prompt if AI unavailable */
  fallbackPromptTemplate: string
  presetSettings: {
    shotType?: string
    cameraMovement?: string
    transitionType?: 'CUT' | 'CONTINUE'
    actionType?: string
  }
  /** Keywords for visual style matching */
  styleKeywords: string[]
  /** Generation hint for the AI */
  aiHint: string
}

// ============================================================================
// Cinematic Element Configurations
// ============================================================================

export const CINEMATIC_ELEMENT_TYPES: SpecialSegmentConfig[] = [
  {
    id: 'title',
    name: 'Title Sequence',
    icon: Type,
    description: 'Cinematic title card with bold text overlay. Sets the tone and brands your video.',
    shortDescription: 'Title card with text overlay',
    defaultDuration: 4,
    fallbackPromptTemplate: 'Cinematic title sequence. Bold white text centered on screen. Blurred cinematic background with subtle bokeh lights. Professional film title aesthetic. Slight camera drift or lens flare. 4K, photorealistic.',
    presetSettings: {
      shotType: 'wide',
      cameraMovement: 'slow-drift',
      transitionType: 'CUT',
      actionType: 'static'
    },
    styleKeywords: ['title', 'opening', 'intro', 'brand', 'text overlay'],
    aiHint: 'Generate a high-concept, genre-appropriate title sequence with the film title as text overlay'
  },
  {
    id: 'match-cut',
    name: 'Match Cut Bridge',
    icon: Scissors,
    description: 'Creative transition mimicking a shape or movement between scenes. E.g., spinning wheel → spinning clock.',
    shortDescription: 'Shape/motion transition',
    defaultDuration: 3,
    fallbackPromptTemplate: 'Visual match cut transition. Object or shape transforms smoothly. Matching movement carries across the cut. Seamless visual bridge. 4K, cinematic.',
    presetSettings: {
      cameraMovement: 'static',
      transitionType: 'CUT',
      actionType: 'transformation'
    },
    styleKeywords: ['transition', 'match', 'transform', 'bridge', 'seamless'],
    aiHint: 'Create a match cut transition that finds visual similarity between adjacent scenes - matching shapes, movements, or colors'
  },
  {
    id: 'establishing',
    name: 'Establishing Shot',
    icon: MapPin,
    description: 'Wide drone or crane shot establishing geography, time of day, and mood for a new location.',
    shortDescription: 'Wide location/mood setter',
    defaultDuration: 5,
    fallbackPromptTemplate: 'Wide establishing shot. Drone or crane perspective. Full environment visible. Golden hour lighting. Cinematic depth and scale. 4K, photorealistic.',
    presetSettings: {
      shotType: 'extreme-wide',
      cameraMovement: 'crane',
      transitionType: 'CUT',
      actionType: 'static'
    },
    styleKeywords: ['establishing', 'location', 'wide', 'environment', 'aerial'],
    aiHint: 'Generate a wide establishing shot that sets the scene location, time of day, and atmospheric mood'
  },
  {
    id: 'broll',
    name: 'B-Roll (The Lull)',
    icon: Coffee,
    description: 'Atmospheric visual breather. Close-ups of environmental details that add texture and pacing.',
    shortDescription: 'Atmospheric detail shots',
    defaultDuration: 4,
    fallbackPromptTemplate: 'Atmospheric B-roll shot. Close-up of environmental detail. Soft focus, slow motion. Contemplative mood. Ambient texture. 4K, cinematic.',
    presetSettings: {
      shotType: 'close-up',
      cameraMovement: 'static',
      transitionType: 'CUT',
      actionType: 'subtle'
    },
    styleKeywords: ['b-roll', 'detail', 'atmosphere', 'texture', 'breather'],
    aiHint: 'Generate an atmospheric B-roll shot that provides visual breathing room with close-up environmental details'
  },
  {
    id: 'outro',
    name: 'Outro / Credits',
    icon: CreditCard,
    description: 'Professional closing sequence. Elegant fade or scroll with production credits aesthetic.',
    shortDescription: 'Closing/credits sequence',
    defaultDuration: 6,
    fallbackPromptTemplate: 'Professional outro sequence. Elegant fade to black or slow vertical scroll. Production credits style. Clean typography on dark background. 4K, cinematic.',
    presetSettings: {
      shotType: 'medium',
      cameraMovement: 'tilt-up',
      transitionType: 'CUT',
      actionType: 'static'
    },
    styleKeywords: ['outro', 'credits', 'ending', 'fade', 'close'],
    aiHint: 'Generate a professional outro/credits sequence that provides closure matching the film tone'
  }
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a cinematic element config by ID
 */
export function getCinematicElementConfig(id: SpecialSegmentType): SpecialSegmentConfig {
  return CINEMATIC_ELEMENT_TYPES.find(t => t.id === id) || CINEMATIC_ELEMENT_TYPES[0]
}

/**
 * Generate a fallback prompt using the template and context
 */
export function generateFallbackPrompt(
  type: SpecialSegmentType,
  filmContext?: FilmContext,
  adjacentContext?: AdjacentSceneContext
): string {
  const config = getCinematicElementConfig(type)
  let prompt = config.fallbackPromptTemplate
  
  // Enhance with genre if available
  if (filmContext?.genre?.length) {
    const genreStyle = filmContext.genre.join('/').toLowerCase()
    prompt = prompt.replace('Cinematic', `Cinematic ${genreStyle}`)
  }
  
  // Add location context for establishing shots
  if (type === 'establishing' && adjacentContext?.currentScene?.heading) {
    prompt = `${adjacentContext.currentScene.heading}. ${prompt}`
  }
  
  // Add film title for title sequences
  if (type === 'title' && filmContext?.title) {
    prompt = prompt.replace('Bold white text', `"${filmContext.title}" in bold white text`)
  }
  
  return prompt
}

/**
 * Map segment purpose from our types to cinematic element type
 */
export function segmentPurposeToCinematicType(purpose: string): SpecialSegmentType | null {
  const mapping: Record<string, SpecialSegmentType> = {
    'title-sequence': 'title',
    'match-cut': 'match-cut',
    'establishing-shot': 'establishing',
    'b-roll': 'broll',
    'outro': 'outro',
  }
  return mapping[purpose] || null
}

/**
 * Map cinematic element type to segment purpose
 */
export function cinematicTypeToSegmentPurpose(type: SpecialSegmentType): string {
  const mapping: Record<SpecialSegmentType, string> = {
    'title': 'title-sequence',
    'match-cut': 'match-cut',
    'establishing': 'establishing-shot',
    'broll': 'b-roll',
    'outro': 'outro',
  }
  return mapping[type]
}
