import { VisualReference } from '@/types/visionReferences'

export type SceneSegmentStatus = 'DRAFT' | 'READY' | 'GENERATING' | 'COMPLETE' | 'UPLOADED' | 'ERROR'

// Establishing Shot Types - Video-focused modes for narration backdrops
// DEPRECATED: 'scale-switch' | 'living-painting' | 'b-roll-cutaway' (photo-based tricks)
// NEW: Video generation modes that work with AI video clips
export type EstablishingShotType = 
  | 'single-shot'    // One continuous video for entire narration (loops if needed)
  | 'beat-matched'   // AI splits narration into visual beats, generates multiple segments
  | 'manual-cuts'    // User defines cut points manually
  // Legacy support (deprecated but still valid for existing projects)
  | 'scale-switch' 
  | 'living-painting' 
  | 'b-roll-cutaway' 
  | 'none'

// Beat metadata for beat-matched establishing shots
export interface EstablishingShotBeat {
  beatNumber: number
  startPercent: number
  endPercent: number
  narrationText: string
  visualFocus: string
  shotType: 'wide' | 'medium' | 'close-up' | 'detail' | 'tracking'
  cameraMotion: string
  videoPrompt: string
}

export interface EstablishingShotSettings {
  enabled: boolean
  type: EstablishingShotType
  duration: number // 4-12 seconds
  useExistingFrame: boolean // Use scene's pre-generated frame
  // Beat-matched specific settings
  beats?: EstablishingShotBeat[]
  narrationDuration?: number
}

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
  dialogueLineIds?: string[]  // Phase 6: IDs of assigned dialogue lines (persisted to DB)
  // Phase 3: Keyframe settings for Ken Burns animation
  keyframeSettings?: SegmentKeyframeSettings
  // Establishing Shot metadata
  isEstablishingShot?: boolean
  establishingShotType?: EstablishingShotType
  shotNumber?: number // For B-Roll multi-shot sequences (1, 2, etc.)
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

