export type VisualReferenceType = 'scene' | 'object'

export interface VisualReference {
  id: string
  type: VisualReferenceType
  name: string
  description?: string
  imageUrl?: string
  createdAt?: string
}

export interface VisionReferencesPayload {
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
}

