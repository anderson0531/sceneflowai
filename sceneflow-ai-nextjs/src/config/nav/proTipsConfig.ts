import type { WorkflowPhase } from './sidebarConfig'

/**
 * Pro Tip status
 */
export type ProTipStatus = 'pending' | 'in-progress' | 'complete' | 'skipped'

/**
 * Auto-complete condition for a pro tip
 */
export interface ProTipAutoComplete {
  condition: 'score_exists' | 'score_threshold' | 'characters_defined' | 'scenes_generated' | 'treatment_exists' | 'style_configured' | 'runtime_estimated'
  threshold?: number
}

/**
 * Individual pro tip configuration
 */
export interface ProTip {
  id: string
  phase: WorkflowPhase
  title: string
  description?: string
  actionLabel?: string
  actionEventName?: string // Custom event to dispatch
  actionHref?: string // URL to navigate
  autoComplete?: ProTipAutoComplete
  priority: number // Lower = higher priority, displayed first
}

/**
 * Pro tips grouped by workflow phase
 */
export const proTipsConfig: Record<WorkflowPhase, ProTip[]> = {
  // ============================================================================
  // BLUEPRINT PHASE TIPS
  // ============================================================================
  blueprint: [
    {
      id: 'get-treatment-score',
      phase: 'blueprint',
      title: 'Run Audience Resonance',
      description: 'Analyze how your Blueprint fits your target audience',
      actionLabel: 'Open Resonance',
      actionEventName: 'blueprint:analyze-resonance',
      autoComplete: { condition: 'score_exists' },
      priority: 1,
    },
    {
      id: 'review-recommendations',
      phase: 'blueprint',
      title: 'Review AI recommendations',
      description: 'Address deductions and apply quick fixes',
      actionLabel: 'Edit Blueprint',
      actionEventName: 'blueprint:edit-sections',
      priority: 2,
    },
    {
      id: 'validate-characters',
      phase: 'blueprint',
      title: 'Validate characters',
      description: 'Ensure protagonist has clear arc',
      actionLabel: 'Open Characters',
      actionEventName: 'blueprint:characters',
      autoComplete: { condition: 'characters_defined' },
      priority: 3,
    },
    {
      id: 'confirm-tone-style',
      phase: 'blueprint',
      title: 'Confirm tone & style',
      description: 'Match visual style to genre',
      actionLabel: 'Set Style',
      actionEventName: 'blueprint:style',
      autoComplete: { condition: 'style_configured' },
      priority: 4,
    },
    {
      id: 'check-runtime',
      phase: 'blueprint',
      title: 'Check runtime estimate',
      description: 'Verify beats fit target length',
      actionLabel: 'View Beats',
      actionEventName: 'blueprint:beats',
      autoComplete: { condition: 'runtime_estimated' },
      priority: 5,
    },
  ],

  // ============================================================================
  // PRODUCTION PHASE TIPS
  // ============================================================================
  production: [
    {
      id: 'review-scene-breakdowns',
      phase: 'production',
      title: 'Review scene breakdowns',
      description: 'Verify all beats are visualized',
      actionLabel: 'View Scenes',
      actionEventName: 'vision:scenes',
      priority: 1,
    },
    {
      id: 'check-character-consistency',
      phase: 'production',
      title: 'Check character consistency',
      description: 'Same look across all scenes',
      actionLabel: 'Character Library',
      actionEventName: 'vision:characters',
      autoComplete: { condition: 'characters_defined' },
      priority: 2,
    },
    {
      id: 'validate-dialogue-flow',
      phase: 'production',
      title: 'Validate dialogue flow',
      description: 'Read aloud for natural pacing',
      actionLabel: 'Preview Script',
      actionEventName: 'vision:script-preview',
      priority: 3,
    },
    {
      id: 'preview-key-frames',
      phase: 'production',
      title: 'Preview key frames',
      description: 'Ensure visual continuity',
      actionLabel: 'Open Gallery',
      actionEventName: 'vision:gallery',
      priority: 4,
    },
    {
      id: 'estimate-credits',
      phase: 'production',
      title: 'Estimate credit usage',
      description: 'Stay within budget',
      actionLabel: 'Cost Estimate',
      actionEventName: 'vision:cost-estimate',
      priority: 5,
    },
  ],

  // ============================================================================
  // FINAL CUT PHASE TIPS
  // ============================================================================
  'final-cut': [
    {
      id: 'apply-preset',
      phase: 'final-cut',
      title: 'Start with a preset',
      description: 'All Video, Hybrid, or Custom mix per scene',
      actionLabel: 'Open Assembly',
      actionEventName: 'final-cut:open-assembly',
      priority: 1,
    },
    {
      id: 'preview-assembly',
      phase: 'final-cut',
      title: 'Preview the full program',
      description: 'Scenes play in script order — read-only',
      actionLabel: 'Play Preview',
      actionEventName: 'finalcut:preview-all',
      priority: 2,
    },
    {
      id: 'missing-streams',
      phase: 'final-cut',
      title: 'Missing a stream?',
      description: 'Render in Production Mixer, then return',
      actionLabel: 'Go to Production',
      actionEventName: 'final-cut:open-production',
      priority: 3,
    },
    {
      id: 'render-master',
      phase: 'final-cut',
      title: 'Render master MP4',
      description: 'Stitch selected streams for Premiere',
      actionLabel: 'Render Final Cut',
      actionEventName: 'final-cut:render',
      priority: 4,
    },
    {
      id: 'premiere-handoff',
      phase: 'final-cut',
      title: 'Continue to Premiere',
      description: 'Screenings and share after export',
      actionLabel: 'Open Premiere',
      actionEventName: 'final-cut:open-premiere',
      priority: 5,
    },
  ],

  // ============================================================================
  // PREMIERE PHASE TIPS
  // ============================================================================
  premiere: [
    {
      id: 'create-screening',
      phase: 'premiere',
      title: 'Create a screening',
      description: 'Share /s/ link with reviewers',
      actionLabel: 'Create screening',
      actionEventName: 'premiere:create-screening',
      priority: 1,
    },
    {
      id: 'review-insights',
      phase: 'premiere',
      title: 'Review insights',
      description: 'Scoring, biometric, and visual tabs',
      actionLabel: 'Open insights',
      actionEventName: 'premiere:review-insights',
      priority: 2,
    },
    {
      id: 'publish-youtube',
      phase: 'premiere',
      title: 'Publish to YouTube',
      description: 'Localized metadata + SceneFlow CTA',
      actionLabel: 'Open publish',
      actionEventName: 'premiere:open-publish',
      priority: 3,
    },
    {
      id: 'short-form',
      phase: 'premiere',
      title: 'Short-form cuts',
      description: '9:16 for Shorts, Reels, TikTok',
      actionLabel: 'Generate clips',
      actionEventName: 'premiere:export-settings',
      priority: 4,
    },
    {
      id: 'export-bundle',
      phase: 'premiere',
      title: 'Export bundle',
      description: 'ZIP with master, thumbnail, metadata',
      actionLabel: 'Export bundle',
      actionEventName: 'premiere:export-settings',
      priority: 5,
    },
  ],

  // Dashboard and settings don't have pro tips
  dashboard: [],
  settings: [],
}

/**
 * Get pro tips for a specific workflow phase
 */
export function getProTipsForPhase(phase: WorkflowPhase): ProTip[] {
  return (proTipsConfig[phase] || []).sort((a, b) => a.priority - b.priority)
}
