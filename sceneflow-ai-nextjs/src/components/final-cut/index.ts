/**
 * Final Cut Components (preview-only)
 *
 * Final Cut is a viewer over Production renders. It selects format /
 * language / per-scene version, plays back the resolved scene videos, and
 * offers a single Render Final Cut button. All editing happens in the
 * Production Scene Mixer.
 */

export { FinalCutTimeline } from './FinalCutTimeline'
export type { FinalCutTimelineProps } from './FinalCutTimeline'
export { FinalCutEditorWorkspace } from './FinalCutEditorWorkspace'
export type { FinalCutEditorWorkspaceProps } from './FinalCutEditorWorkspace'
export { FinalCutMediaBrowser } from './FinalCutMediaBrowser'
export type { FinalCutMediaBrowserProps } from './FinalCutMediaBrowser'
export { FinalCutStreamsPanel } from './FinalCutStreamsPanel'
export type { FinalCutStreamsPanelProps } from './FinalCutStreamsPanel'
export { FinalCutInspectorPanel } from './FinalCutInspectorPanel'
export type { FinalCutInspectorPanelProps } from './FinalCutInspectorPanel'
export { FinalCutPreviewMonitor, findPreviewClipAtTime } from './FinalCutPreviewMonitor'
export type { FinalCutPreviewMonitorProps, PreviewClip } from './FinalCutPreviewMonitor'
export { FinalCutTransportBar } from './FinalCutTransportBar'
export type { FinalCutTransportBarProps } from './FinalCutTransportBar'
export { FinalCutTimelineTracks } from './FinalCutTimelineTracks'
export type { FinalCutTimelineTracksProps } from './FinalCutTimelineTracks'
export { RenderFinalCutButton } from './RenderFinalCutButton'
export type { RenderFinalCutButtonProps } from './RenderFinalCutButton'
export { SceneBlock } from './SceneBlock'
export type { SceneBlockProps } from './SceneBlock'
export { TimelineRuler } from './TimelineRuler'
export { TimelinePlayhead } from './TimelinePlayhead'

// Selection / clip types
export type {
  FinalCutSelection,
  FinalCutSceneClip,
  FinalCutSceneOverride,
  ProductionFormat,
  ProductionLanguage,
} from '@/lib/types/finalCut'
