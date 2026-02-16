export type VisualReferenceType = 'scene' | 'object'

export type BackdropModeType = 'atmospheric' | 'portrait' | 'master' | 'animatic'

/** Object category for organization and prompt optimization */
export type ObjectCategory = 'prop' | 'vehicle' | 'set-piece' | 'costume' | 'technology' | 'other'

/** Importance level for prioritizing object references */
export type ObjectImportance = 'critical' | 'important' | 'background'

export interface VisualReference {
  id: string
  type: VisualReferenceType
  name: string
  description?: string
  imageUrl?: string
  createdAt?: string
  /** Source scene number for generated backdrops */
  sourceSceneNumber?: number
  /** Backdrop mode used for generation */
  backdropMode?: BackdropModeType
  /** Object category for organization (objects only) */
  category?: ObjectCategory
  /** Importance level for production (objects only) */
  importance?: ObjectImportance
  /** The prompt used to generate the reference image */
  generationPrompt?: string
  /** URL of the source reference image used for generation (if any) */
  sourceReferenceUrl?: string
  /** Whether the image was AI-generated vs uploaded */
  aiGenerated?: boolean
  /** 
   * When true, this prop is ALWAYS included in scene generation if mentioned,
   * regardless of budget constraints. Use for signature items like hero vehicles,
   * iconic props, or brand-critical objects.
   */
  alwaysInclude?: boolean
}

/** Suggested object from script analysis */
export interface ObjectSuggestion {
  id: string
  name: string
  description: string
  category: ObjectCategory
  importance: ObjectImportance
  suggestedPrompt: string
  /** Scene numbers where this object appears */
  sceneNumbers: number[]
  /** Confidence score 0-1 */
  confidence: number
}

/**
 * Location reference for maintaining visual consistency across scenes at the same location.
 * Users can "pin" a storyboard image as the reference for a specific location,
 * and it will automatically be used when generating new images at that location.
 */
export interface LocationReference {
  /** Unique identifier */
  id: string
  /** Normalized location name (e.g., "LIVING ROOM", "BEACH") */
  location: string
  /** Original location display from scene heading (e.g., "INT. LIVING ROOM - DAY") */
  locationDisplay: string
  /** URL of the pinned storyboard image */
  imageUrl: string
  /** Scene index where the image was pinned from */
  sourceSceneIndex: number
  /** Full scene heading for reference */
  sourceSceneHeading: string
  /** ISO timestamp when this was pinned */
  pinnedAt: string
}

export interface VisionReferencesPayload {
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
  /** Location references for environment/setting consistency */
  locationReferences?: LocationReference[]
}

