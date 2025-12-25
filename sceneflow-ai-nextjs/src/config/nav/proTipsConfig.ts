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
      title: 'Get treatment score',
      description: 'Run AI analysis on your concept',
      actionLabel: 'View Score',
      actionEventName: 'blueprint:scorecard',
      autoComplete: { condition: 'score_exists' },
      priority: 1,
    },
    {
      id: 'review-recommendations',
      phase: 'blueprint',
      title: 'Review AI recommendations',
      description: 'Address any yellow/red flags',
      actionLabel: 'View Suggestions',
      actionEventName: 'blueprint:refine',
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
      id: 'review-animatic',
      phase: 'final-cut',
      title: 'Review animatic',
      description: 'Check timing before HD render',
      actionLabel: 'Play Animatic',
      actionEventName: 'finalcut:animatic',
      priority: 1,
    },
    {
      id: 'validate-audio-sync',
      phase: 'final-cut',
      title: 'Validate audio sync',
      description: 'Dialogue matches lip movements',
      actionLabel: 'Check Audio',
      actionEventName: 'finalcut:audio-check',
      priority: 2,
    },
    {
      id: 'check-transitions',
      phase: 'final-cut',
      title: 'Check transitions',
      description: 'Smooth scene-to-scene flow',
      actionLabel: 'Preview All',
      actionEventName: 'finalcut:preview-all',
      priority: 3,
    },
    {
      id: 'preview-low-res',
      phase: 'final-cut',
      title: 'Preview at low-res first',
      description: 'Save credits on test renders',
      actionLabel: 'Quick Preview',
      actionEventName: 'finalcut:quick-preview',
      priority: 4,
    },
    {
      id: 'get-director-score',
      phase: 'final-cut',
      title: 'Get Director score',
      description: 'Aim for 85+ before final export',
      actionLabel: 'Run Analysis',
      actionEventName: 'finalcut:director-score',
      autoComplete: { condition: 'score_threshold', threshold: 85 },
      priority: 5,
    },
  ],

  // ============================================================================
  // PREMIERE PHASE TIPS
  // ============================================================================
  premiere: [
    {
      id: 'run-final-qa',
      phase: 'premiere',
      title: 'Run final QA',
      description: 'Full playback check',
      actionLabel: 'Start QA',
      actionEventName: 'premiere:qa',
      priority: 1,
    },
    {
      id: 'get-audience-score',
      phase: 'premiere',
      title: 'Get Audience score',
      description: 'Validate emotional impact',
      actionLabel: 'Analyze',
      actionEventName: 'premiere:audience-score',
      autoComplete: { condition: 'score_exists' },
      priority: 2,
    },
    {
      id: 'choose-export-quality',
      phase: 'premiere',
      title: 'Choose export quality',
      description: 'Match platform requirements',
      actionLabel: 'Export Settings',
      actionEventName: 'premiere:export-settings',
      priority: 3,
    },
    {
      id: 'add-metadata',
      phase: 'premiere',
      title: 'Add metadata',
      description: 'Title, description, tags',
      actionLabel: 'Edit Metadata',
      actionEventName: 'premiere:metadata',
      priority: 4,
    },
    {
      id: 'create-share-link',
      phase: 'premiere',
      title: 'Create share link',
      description: 'For collaborator review',
      actionLabel: 'Share',
      actionEventName: 'premiere:share',
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
