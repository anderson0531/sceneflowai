export type VisualReferenceType = 'scene' | 'object'

export type BackdropModeType = 'atmospheric' | 'portrait' | 'master' | 'animatic'

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
}

export interface VisionReferencesPayload {
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
}

