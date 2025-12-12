import { VisualReference } from '@/types/visionReferences'

export type SceneSegmentStatus = 'DRAFT' | 'READY' | 'GENERATING' | 'COMPLETE' | 'UPLOADED' | 'ERROR'

export type SceneSegmentAssetType = 'video' | 'image' | null

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

// Veo 3.1 generation methods
export type VideoGenerationMethod = 'T2V' | 'I2V' | 'EXT' | 'FTV' | 'REF'

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
  // Enhanced reference data
  useSceneFrame?: boolean
  characterRefs?: string[] // Character names to use as references
  startFrameDescription?: string | null
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
  // Shot Metadata
  shotType?: string
  cameraAngle?: string
  cameraMovement?: string
  subject?: string
  action?: string
  transition?: 'cut' | 'dissolve' | 'fade_out'
  trigger?: string
  visualFrame?: string // e.g. "Shot Frame" url if separate from activeAssetUrl
  // Enhanced Veo 3.1 metadata
  generationMethod?: VideoGenerationMethod
  triggerReason?: string // Why we cut here (speaker change, action change, etc.)
  endFrameDescription?: string // Lookahead for next segment
  emotionalBeat?: string // The emotional intent of this segment
  // Phase 1: Character and Dialogue mapping for scene coverage
  characters?: SegmentCharacter[]  // Characters present in this segment
  dialogueLines?: SegmentDialogueLine[]  // Dialogue lines assigned to this segment
  // Phase 3: Keyframe settings for Ken Burns animation
  keyframeSettings?: SegmentKeyframeSettings
}

// Character presence in a segment
export interface SegmentCharacter {
  name: string
  role: 'speaking' | 'present' | 'background'
}

// Dialogue line assigned to a segment
export interface SegmentDialogueLine {
  id: string
  character: string
  line: string
  covered: boolean  // User confirms this dialogue is covered by the segment
}

// Ken Burns keyframe settings for manual animation control
export type KeyframeEasingType = 'smooth' | 'drift' | 'push' | 'dramatic'
export type KeyframePanDirection = 'none' | 'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'down-left' | 'down-right'

export interface SegmentKeyframeSettings {
  // Zoom keyframes (1.0 = no zoom, 1.2 = 20% zoom in)
  zoomStart: number  // 0.8 - 1.5
  zoomEnd: number    // 0.8 - 1.5
  // Pan keyframes (percentage offset from center, -50 to 50)
  panStartX: number
  panStartY: number
  panEndX: number
  panEndY: number
  // Easing for the transition
  easingType: KeyframeEasingType
  // Preset direction (overrides individual pan values)
  direction?: KeyframePanDirection
  // Whether to use auto-detected values or manual settings
  useAutoDetect: boolean
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

