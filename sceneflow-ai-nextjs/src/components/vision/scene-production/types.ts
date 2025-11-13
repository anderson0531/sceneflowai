import { VisualReference } from '@/types/visionReferences'

export type SceneSegmentStatus = 'DRAFT' | 'READY' | 'GENERATING' | 'COMPLETE' | 'UPLOADED' | 'ERROR'

export type SceneSegmentAssetType = 'video' | 'image' | null

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

