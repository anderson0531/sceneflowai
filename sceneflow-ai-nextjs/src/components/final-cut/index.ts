/**
 * Final Cut Components
 * 
 * Components for the Final Cut timeline assembly phase:
 * - FinalCutTimeline: Main multi-track timeline editor
 * - StreamSelector: Language/format stream picker
 * - OverlayEditor: Text/image overlay configuration
 * - TransitionPanel: Scene transition settings
 * - ExportPanel: Export settings and progress
 */

export { FinalCutTimeline } from './FinalCutTimeline'
export { StreamSelector } from './StreamSelector'
export { OverlayEditor } from './OverlayEditor'
export { TransitionPanel } from './TransitionPanel'
export { SceneBlock } from './SceneBlock'
export { TimelineRuler } from './TimelineRuler'
export { TimelinePlayhead } from './TimelinePlayhead'

// Re-export types
export type {
  FinalCutStream,
  StreamScene,
  StreamSegment,
  Overlay,
  TransitionEffect,
  TimelineState,
  StreamSettings,
  StreamExport
} from '@/lib/types/finalCut'
