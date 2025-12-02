import { VisualReference } from '@/types/visionReferences'

export type SceneSegmentStatus = 'DRAFT' | 'READY' | 'GENERATING' | 'COMPLETE' | 'UPLOADED' | 'ERROR'

export type SceneSegmentAssetType = 'video' | 'image' | null

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

export interface SceneSegmentTake {
  id: string
  createdAt: string
  assetUrl: string
  thumbnailUrl?: string
  durationSec?: number
  status: SceneSegmentStatus
  notes?: string
}

export interface SceneSegmentReferences {
  startFrameUrl?: string | null
  endFrameUrl?: string | null
  characterIds: string[]
  sceneRefIds: string[]
  objectRefIds: string[]
}

export interface SceneSegment {
  segmentId: string
  sequenceIndex: number
  startTime: number
  endTime: number
  status: SceneSegmentStatus
  generatedPrompt?: string
  userEditedPrompt?: string | null
  activeAssetUrl?: string | null
  assetType: SceneSegmentAssetType
  references: SceneSegmentReferences
  takes: SceneSegmentTake[]
  // New Shot Metadata
  shotType?: string
  cameraAngle?: string
  cameraMovement?: string
  subject?: string
  action?: string
  transition?: 'cut' | 'dissolve' | 'fade_out'
  trigger?: string
  visualFrame?: string // e.g. "Shot Frame" url if separate from activeAssetUrl
}

export interface SceneProductionData {
  isSegmented: boolean
  targetSegmentDuration: number
  segments: SceneSegment[]
  lastGeneratedAt?: string | null
}

export interface SceneProductionReferences {
  characters: any[]
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
}

