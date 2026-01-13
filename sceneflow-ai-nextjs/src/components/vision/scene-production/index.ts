export * from './SceneProductionManager'
export * from './SegmentTimeline'
export { SegmentStudio } from './SegmentStudio'
export type { GenerationType } from './SegmentStudio'
export { SegmentPromptBuilder } from './SegmentPromptBuilder'
export type { GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
export { AudioTimeline } from './AudioTimeline'
export type { AudioTracksData as LegacyAudioTracksData, AudioTrackClip as LegacyAudioTrackClip } from './AudioTimeline'
export { SceneTimeline } from './SceneTimeline'
export type { AudioTracksData, AudioTrackClip } from './SceneTimeline'
export { VerticalSegmentSelector } from './VerticalSegmentSelector'
export * from './types'

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
export type { SceneBible, ProposedSegment, BuilderPhase } from './SegmentBuilder'
export { SegmentPreviewTimeline } from './SegmentPreviewTimeline'
export { SegmentPromptEditor } from './SegmentPromptEditor'

// Prompt utilities
export * from './methodPromptBuilder'
export * from './promptSyncService'
export { compileVideoPrompt, formatPayloadForDisplay, extractSettingsFromSegment } from './videoPromptCompiler'

