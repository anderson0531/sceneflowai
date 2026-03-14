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
// NOTE: DirectorDialog, SceneVideoPlayer are imported directly by DirectorConsole, not via barrel
// NOTE: DirectorConsole MUST be imported dynamically to avoid TDZ errors:
//   const DirectorConsole = dynamic(() => import('./scene-production/DirectorConsole').then(mod => ({ default: mod.DirectorConsole })), { ssr: false })
export { GuidePromptEditor } from './GuidePromptEditor'

// LML Elastic Segment Components
export { SegmentSyncStatusBar, SegmentSyncBadge } from './SegmentSyncStatusBar'
export type { SceneAudioData, GuidePromptEditorProps } from './GuidePromptEditor'

// Segment Builder Components (Intelligent Segmentation)
// NOTE: SegmentBuilder MUST be imported dynamically to avoid TDZ errors:
//   const SegmentBuilder = dynamic(() => import('./scene-production/SegmentBuilder').then(mod => ({ default: mod.SegmentBuilder })), { ssr: false })
// Types moved to types.ts to break circular dependency with SegmentValidation
export type { SceneBible, ProposedSegment, BuilderPhase, ValidationResult } from './types'
export { SegmentPreviewTimeline } from './SegmentPreviewTimeline'
export { SegmentPromptEditor } from './SegmentPromptEditor'

// Add Segment Dialogs
// NOTE: SegmentPurpose and AdjacentSceneContext are exported from types.ts
export { AddSegmentTypeDialog } from './AddSegmentTypeDialog'
export type { AddSegmentTypeDialogProps } from './AddSegmentTypeDialog'
// NOTE: AddSpecialSegmentDialog is imported directly by DirectorConsole, not via barrel
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
// NOTE: ProductionStreamsPanel is imported directly by DirectorConsole, not via barrel
// NOTE: SceneProductionMixer MUST be imported dynamically to avoid TDZ errors (uses LocalRenderService chain):
//   const SceneProductionMixer = dynamic(() => import('./scene-production/SceneProductionMixer').then(mod => ({ default: mod.SceneProductionMixer })), { ssr: false })

// Runtime values (functions, consts) - re-exported from defaults.ts (NOT types.ts)
// types.ts is now purely type definitions that TypeScript erases at compile time
export {
  prioritizeCharacterReferences,
  isAnimaticStream,
  isVideoStream,
  DEFAULT_ANIMATIC_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  createDefaultSmartPromptSettings,
} from './defaults'

// Prompt utilities - explicit exports only (no `export *` to avoid TDZ module graph issues)
// Import directly from './methodPromptBuilder' or './promptSyncService' if needed
export { compileVideoPrompt, formatPayloadForDisplay, extractSettingsFromSegment } from './videoPromptCompiler'