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

export interface VisionReferencesPayload {
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
}

