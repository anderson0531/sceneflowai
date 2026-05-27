import type { WorkflowPhase } from './sidebarConfig'

/**
 * Workflow Guide Configuration
 * 
 * Grouped checklist items for each workflow phase to guide users through
 * the production process without requiring extensive training.
 */

export type WorkflowStepStatus = 'pending' | 'in-progress' | 'complete' | 'skipped'

/**
 * Individual workflow step within a group
 */
export interface WorkflowStep {
  id: string
  label: string
  description?: string
  actionEventName?: string
  actionHref?: string
}

/**
 * Workflow group containing related steps
 */
export interface WorkflowGroup {
  id: string
  title: string
  icon: string
  iconColor: string
  steps: WorkflowStep[]
  collapsed?: boolean // Default collapsed state
}

/**
 * Phase-specific workflow guide configuration
 */
export interface WorkflowGuidePhaseConfig {
  phase: WorkflowPhase
  groups: WorkflowGroup[]
}

// =============================================================================
// VIRTUAL PRODUCTION (Production Phase) WORKFLOW GUIDE
// =============================================================================

export const productionWorkflowGroups: WorkflowGroup[] = [
  {
    id: 'foundation-script',
    title: 'Foundation — Script tab',
    icon: 'FileText',
    iconColor: 'text-blue-500',
    steps: [
      { id: 'update-review-score', label: 'Run Audience Resonance', actionEventName: 'production:update-reviews' },
      { id: 'review-analysis', label: 'Revise script (Script tab)', actionEventName: 'production:review-analysis' },
      { id: 'lock-script', label: 'Lock script for production', description: 'Draft → Reviewed → Locked' },
      { id: 'assign-voices', label: 'Assign voices (Reference Library)', actionEventName: 'production:assign-voices' },
      { id: 'create-scene-audio', label: 'Generate scene audio', actionEventName: 'production:generate-audio' },
    ],
  },
  {
    id: 'foundation-refs',
    title: 'Foundation — References',
    icon: 'Users',
    iconColor: 'text-purple-500',
    collapsed: true,
    steps: [
      { id: 'create-character-images', label: 'Character references', actionEventName: 'production:generate-characters' },
      { id: 'create-suggested-objects', label: 'Key props', actionEventName: 'production:create-objects' },
      { id: 'create-scene-references', label: 'Location references', actionEventName: 'production:generate-references' },
    ],
  },
  {
    id: 'storyboard-express',
    title: 'Storyboard — Express & gallery',
    icon: 'Image',
    iconColor: 'text-emerald-500',
    steps: [
      { id: 'run-express', label: 'Build Storyboard (Express)', actionEventName: 'production:scene-gallery' },
      { id: 'review-storyboard', label: 'Review storyboard gallery', actionEventName: 'production:scene-gallery' },
      { id: 'collaborate-share', label: 'Share for review', actionEventName: 'production:share-link' },
      { id: 'review-animatic', label: 'Screening Room — Preview (live)', actionEventName: 'production:screening-room' },
    ],
  },
  {
    id: 'production-action',
    title: 'Production — Action tab',
    icon: 'Video',
    iconColor: 'text-red-500',
    steps: [
      { id: 'generate-beat-frames', label: 'Build Beat Frames (start/end)', actionEventName: 'production:generate-frames' },
      { id: 'create-video', label: 'Generate beat video (Director Console)', actionEventName: 'production:generate-video' },
      { id: 'mix-scene', label: 'Preview in Production Mixer', actionEventName: 'production:edit-video' },
      { id: 'render-stream', label: 'Render Stream (export dialog)', actionEventName: 'production:mark-complete' },
    ],
  },
  {
    id: 'production-streams',
    title: 'Production Streams — Export (MP4)',
    icon: 'Play',
    iconColor: 'text-green-500',
    steps: [
      { id: 'review-streams', label: 'Review finished MP4s', actionEventName: 'production:edit-video' },
      { id: 'rerender-stale', label: 'Re-render when beats change', description: 'Update available badge' },
      { id: 'send-final-cut', label: 'Send to Final Cut', actionEventName: 'production:mark-complete' },
    ],
  },
  {
    id: 'revisions',
    title: 'Revisions',
    icon: 'RefreshCw',
    iconColor: 'text-amber-500',
    collapsed: true,
    steps: [
      { id: 'revise-script', label: 'Unlock script & revise', actionEventName: 'production:review-analysis' },
      { id: 'revise-frames', label: 'Re-run Express or edit Beat Frames', actionEventName: 'production:edit-frames' },
      { id: 'revise-audio', label: 'Revise audio timeline', actionEventName: 'production:audio-timeline' },
    ],
  },
]

export const finalCutWorkflowGroups: WorkflowGroup[] = [
  {
    id: 'pick-streams',
    title: 'Pick stream versions',
    icon: 'Film',
    iconColor: 'text-purple-500',
    steps: [
      { id: 'select-stream-type', label: 'Choose Animatic or Video per scene', description: 'Match stakeholder-approved storyboard vs full motion' },
      { id: 'select-language', label: 'Pick language stream version', description: 'One stream per scene × language × version' },
      { id: 'review-duration', label: 'Review elastic timing vs baseline', description: 'Non-English streams may run longer — holds extend automatically' },
    ],
  },
  {
    id: 'assemble',
    title: 'Assemble in Final Cut',
    icon: 'Clapperboard',
    iconColor: 'text-cyan-500',
    steps: [
      { id: 'order-scenes', label: 'Order scenes on timeline', actionEventName: 'final-cut:order-scenes' },
      { id: 'transitions', label: 'Add transitions & titles', actionEventName: 'final-cut:transitions' },
      { id: 'captions-export', label: 'Captions for export (burn-in)', description: 'Configure in Mixer before render — Screening Room captions are preview only' },
    ],
  },
  {
    id: 'premiere-export',
    title: 'The Premiere',
    icon: 'Sparkles',
    iconColor: 'text-amber-500',
    steps: [
      { id: 'preview-full', label: 'Preview full assembly', actionEventName: 'premiere:preview' },
      { id: 'export-master', label: 'Export master MP4', actionEventName: 'premiere:export' },
      { id: 'share-premiere', label: 'Share premiere link', actionEventName: 'premiere:share' },
    ],
  },
]

// =============================================================================
// BLUEPRINT PHASE WORKFLOW GUIDE
// =============================================================================

/**
 * Blueprint Guide: Streamlined 4-phase workflow
 * 
 * Design principles:
 * - Action-oriented labels (verbs)
 * - Progressive disclosure (expand current group)
 * - Minimal text, clear next steps
 * - Tooltips/help for details (not inline)
 */
export const blueprintWorkflowGroups: WorkflowGroup[] = [
  {
    id: 'create-story',
    title: 'Create Your Story',
    icon: 'Lightbulb',
    iconColor: 'text-yellow-500',
    steps: [
      { 
        id: 'enter-idea', 
        label: 'Enter your idea or topic', 
        description: 'Describe your video concept, story, or topic',
        actionEventName: 'blueprint:enter-concept' 
      },
      { 
        id: 'generate-blueprint', 
        label: 'Generate Blueprint', 
        description: 'AI creates title, logline, beats, characters',
        actionEventName: 'blueprint:generate-treatment' 
      },
    ],
  },
  {
    id: 'refine-blueprint',
    title: 'Refine Your Blueprint',
    icon: 'Target',
    iconColor: 'text-cyan-500',
    collapsed: true,
    steps: [
      { 
        id: 'review-sections', 
        label: 'Review & edit sections', 
        description: 'Fine-tune story, tone, beats, characters',
        actionEventName: 'blueprint:edit-sections' 
      },
      { 
        id: 'run-resonance', 
        label: 'Run Audience Resonance', 
        description: 'Get score and recommendations',
        actionEventName: 'blueprint:analyze-resonance' 
      },
      { 
        id: 'apply-fixes', 
        label: 'Apply quick fixes', 
        description: 'Target 80+ score (2-3 iterations max)',
        actionEventName: 'blueprint:apply-fixes' 
      },
    ],
  },
  {
    id: 'enhance-experience',
    title: 'Enhance Experience',
    icon: 'Sparkles',
    iconColor: 'text-purple-500',
    collapsed: true,
    steps: [
      { 
        id: 'regenerate-hero', 
        label: 'Regenerate hero image', 
        description: 'Update visual to match narrative',
        actionEventName: 'blueprint:regenerate-hero' 
      },
      { 
        id: 'preview-audio', 
        label: 'Preview with audio', 
        description: 'Listen in multiple languages',
        actionEventName: 'blueprint:preview-audio' 
      },
      { 
        id: 'collaborate-export', 
        label: 'Collaborate & export', 
        description: 'Share link, export PDF/Doc/PPTX',
        actionEventName: 'blueprint:collaborate' 
      },
    ],
  },
  {
    id: 'start-production',
    title: 'Ready for Production',
    icon: 'ArrowRight',
    iconColor: 'text-green-500',
    collapsed: true,
    steps: [
      { 
        id: 'start-production', 
        label: 'Start Production', 
        description: 'Generate script and begin production',
        actionEventName: 'blueprint:start-production' 
      },
    ],
  },
]

// =============================================================================
// WORKFLOW GUIDE CONFIG BY PHASE
// =============================================================================

export const workflowGuideConfig: Record<WorkflowPhase, WorkflowGroup[]> = {
  blueprint: blueprintWorkflowGroups,
  production: productionWorkflowGroups,
  'final-cut': finalCutWorkflowGroups,
  premiere: [], // TODO: Add Premiere workflow
  dashboard: [],
  settings: [],
}

/**
 * Get workflow groups for a specific phase
 */
export function getWorkflowGroupsForPhase(phase: WorkflowPhase): WorkflowGroup[] {
  return workflowGuideConfig[phase] || []
}

/**
 * Calculate total steps across all groups
 */
export function getTotalSteps(groups: WorkflowGroup[]): number {
  return groups.reduce((total, group) => total + group.steps.length, 0)
}

/**
 * Calculate completed steps from status record
 */
export function getCompletedSteps(
  groups: WorkflowGroup[], 
  statusRecord: Record<string, WorkflowStepStatus>
): number {
  let completed = 0
  groups.forEach(group => {
    group.steps.forEach(step => {
      if (statusRecord[step.id] === 'complete') {
        completed++
      }
    })
  })
  return completed
}
