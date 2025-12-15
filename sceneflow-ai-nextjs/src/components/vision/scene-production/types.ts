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
  // Veo video reference for extension - stores the Gemini Files API reference (e.g., "files/xxx")
  // This is needed for Veo video extension which only works with Veo-generated videos still in Gemini's system
  veoVideoRef?: string
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

// ============================================================================
// V2 Audio Timeline Types - Multi-Language Support & Single Source of Truth
// ============================================================================

/**
 * Supported audio track types in the timeline
 */
export type AudioTrackType = 'voiceover' | 'dialogue' | 'music' | 'sfx'

/**
 * Source of an audio clip - used for debugging and cleanup
 */
export type AudioClipSource = 'scene' | 'upload' | 'generated'

/**
 * Base audio clip definition (extends V1 AudioTrackClip for compatibility)
 */
export interface AudioTrackClipV2 {
  id: string
  url: string | null  // null = no audio, avoids stale URL references
  startTime: number   // In seconds, relative to scene start
  duration: number    // In seconds
  label?: string
  volume?: number     // 0-1
  trimStart?: number  // Offset from start of source
  trimEnd?: number    // Offset from end of source
  // V2 additions
  language: string    // 'en', 'es', 'th', etc.
  source: AudioClipSource
  scenePropertyPath?: string  // e.g., 'narrationAudio.en.url' for debugging
  characterName?: string      // For dialogue clips
  dialogueIndex?: number      // Index in scene.dialogue array
}

/**
 * Multi-language audio tracks - stores all languages, keyed by language code
 */
export interface MultiLanguageAudioTracks {
  [language: string]: AudioTracksDataV2
}

/**
 * Audio tracks for a single language
 */
export interface AudioTracksDataV2 {
  voiceover: AudioTrackClipV2 | null
  description: AudioTrackClipV2 | null
  dialogue: AudioTrackClipV2[]
  music: AudioTrackClipV2 | null
  sfx: AudioTrackClipV2[]
}

/**
 * Complete timeline audio state - tracks selected language and available options
 */
export interface TimelineAudioState {
  selectedLanguage: string
  availableLanguages: string[]
  tracks: MultiLanguageAudioTracks
  audioHash: string  // Hash of all URLs for change detection
}

/**
 * Props for SceneTimelineV2 component
 */
export interface SceneTimelineV2Props {
  segments: SceneSegment[]
  scene: any  // Scene object from script.script.scenes[idx]
  selectedSegmentId?: string
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  onSegmentSelect: (segmentId: string) => void
  onPlayheadChange?: (time: number, segmentId?: string) => void
  onGenerateSceneMp4?: () => void
  onVisualClipChange?: (clipId: string, changes: { startTime?: number; duration?: number; trimStart?: number; trimEnd?: number }) => void
  onAudioClipChange?: (trackType: AudioTrackType, clipId: string, changes: { startTime?: number; duration?: number }) => void
  onAddSegment?: (afterSegmentId: string | null, duration: number) => void
  onDeleteSegment?: (segmentId: string) => void
  onReorderSegments?: (oldIndex: number, newIndex: number) => void
  onAddEstablishingShot?: () => void
  onAudioError?: (clipId: string, url: string) => void  // Handle 404s
  sceneFrameUrl?: string | null
  // Phase 2: Dialogue coverage indicators
  dialogueAssignments?: Record<string, Set<string>>
}

