export * from './SceneProductionManager'
export * from './SegmentTimeline'
export { SegmentStudio } from './SegmentStudio'
export type { GenerationType } from './SegmentStudio'
export { SegmentPromptBuilder } from './SegmentPromptBuilder'
// VideoGenerationMethod is exported from types.ts via export * below
export type { GeneratePromptData } from './SegmentPromptBuilder'
export { AudioTimeline } from './AudioTimeline'
export type { AudioTracksData as LegacyAudioTracksData, AudioTrackClip as LegacyAudioTrackClip } from './AudioTimeline'
export { SceneTimeline } from './SceneTimeline'
export type { AudioTracksData, AudioTrackClip } from './SceneTimeline'
export { VerticalSegmentSelector } from './VerticalSegmentSelector'

// Types - DO NOT re-export * from ./types to avoid circular dependency TDZ errors
// Import types directly from '@/components/vision/scene-production/types' instead
// Common types: SceneProductionData, SceneSegment, VideoGenerationConfig, etc.

// Keyframe State Machine Components
export { SegmentPairCard } from './SegmentPairCard'
export { SegmentFrameTimeline } from './SegmentFrameTimeline'

// Director's Console Components
export { DirectorDialog } from './DirectorDialog'
export { DirectorConsole } from './DirectorConsole'
export { SceneVideoPlayer } from './SceneVideoPlayer'
export { GuidePromptEditor } from './GuidePromptEditor'
export type { SceneAudioData, GuidePromptEditorProps } from './GuidePromptEditor'

// Segment Builder Components (Intelligent Segmentation)
export { SegmentBuilder } from './SegmentBuilder'
// Types moved to types.ts to break circular dependency with SegmentValidation
export type { SceneBible, ProposedSegment, BuilderPhase, ValidationResult } from './types'
export { SegmentPreviewTimeline } from './SegmentPreviewTimeline'
export { SegmentPromptEditor } from './SegmentPromptEditor'

// Add Segment Dialogs
// NOTE: SegmentPurpose and AdjacentSceneContext are exported from types.ts
export { AddSegmentTypeDialog } from './AddSegmentTypeDialog'
export type { AddSegmentTypeDialogProps } from './AddSegmentTypeDialog'
export { AddSpecialSegmentDialog } from './AddSpecialSegmentDialog'
// NOTE: SpecialSegmentType is exported from cinematic-elements below
export type { AddSpecialSegmentDialogProps } from './AddSpecialSegmentDialog'

// Cinematic Elements (shared constants and utilities)
export { 
  CINEMATIC_ELEMENT_TYPES, 
  getCinematicElementConfig,
  generateFallbackPrompt,
  segmentPurposeToCinematicType,
  cinematicTypeToSegmentPurpose
} from './cinematic-elements'
export type { 
  SpecialSegmentType,
  SpecialSegmentConfig,
  FilmContext,
  AdjacentSceneContext as CinematicAdjacentSceneContext 
} from './cinematic-elements'

// Production Streams (Multi-language render outputs)
export { ProductionStreamsPanel } from './ProductionStreamsPanel'
export { SceneProductionMixer } from './SceneProductionMixer'

// Prompt utilities
export * from './methodPromptBuilder'
export * from './promptSyncService'
export { compileVideoPrompt, formatPayloadForDisplay, extractSettingsFromSegment } from './videoPromptCompiler'