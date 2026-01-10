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
    id: 'review-script',
    title: 'Review & Refine Script',
    icon: 'FileText',
    iconColor: 'text-blue-500',
    steps: [
      { id: 'update-review-score', label: 'Update Review Score', actionEventName: 'production:update-reviews' },
      { id: 'edit-script-iterate', label: 'Edit Script (Iterate)', actionEventName: 'production:edit-script' },
      { id: 'obtain-target-score', label: 'Obtain Target Score (85+)', description: 'Aim for green scores' },
    ],
  },
  {
    id: 'create-characters',
    title: 'Create Characters',
    icon: 'Users',
    iconColor: 'text-purple-500',
    steps: [
      { id: 'create-character-images', label: 'Create Character Images', actionEventName: 'production:generate-characters' },
      { id: 'assign-voices', label: 'Assign Voices', actionEventName: 'production:assign-voices' },
      { id: 'create-wardrobe', label: 'Create Wardrobe (with scenes)', actionEventName: 'production:create-wardrobe' },
    ],
  },
  {
    id: 'create-objects',
    title: 'Create Key Objects',
    icon: 'Box',
    iconColor: 'text-orange-500',
    steps: [
      { id: 'create-suggested-objects', label: 'Create Suggested Objects', actionEventName: 'production:create-objects' },
      { id: 'add-additional-objects', label: 'Add Additional Objects', actionEventName: 'production:add-objects' },
    ],
  },
  {
    id: 'scene-audio',
    title: 'Audio (by Scene)',
    icon: 'Volume2',
    iconColor: 'text-cyan-500',
    steps: [
      { id: 'create-scene-audio', label: 'Create Audio', actionEventName: 'production:generate-audio' },
      { id: 'review-audio-timeline', label: 'Review & Adjust Timeline', actionEventName: 'production:audio-timeline' },
      { id: 'create-multilanguage', label: 'Create Multilanguage (optional)', actionEventName: 'production:multilanguage' },
    ],
  },
  {
    id: 'scene-direction',
    title: 'Direction (by Scene)',
    icon: 'Clapperboard',
    iconColor: 'text-pink-500',
    steps: [
      { id: 'create-scene-references', label: 'Create Scene References', actionEventName: 'production:generate-references' },
      { id: 'iterate-direction', label: 'Iterate as Needed', actionEventName: 'production:edit-direction' },
    ],
  },
  {
    id: 'scene-frames',
    title: 'Frames (by Scene)',
    icon: 'Image',
    iconColor: 'text-emerald-500',
    steps: [
      { id: 'generate-key-frames', label: 'Generate Key Frames', actionEventName: 'production:generate-frames' },
      { id: 'iterate-frames', label: 'Iterate as Necessary', actionEventName: 'production:edit-frames' },
      { id: 'select-screening-frames', label: 'Select Screening Room Frames', actionEventName: 'production:select-frames' },
    ],
  },
  {
    id: 'screening-room',
    title: 'Screening Room',
    icon: 'Play',
    iconColor: 'text-green-500',
    steps: [
      { id: 'review-animatic', label: 'Review Script Animatic', actionEventName: 'production:screening-room' },
      { id: 'collaborate-share', label: 'Collaborate (Share Link)', actionEventName: 'production:share-link' },
      { id: 'create-revision-notes', label: 'Create Revision Notes', actionEventName: 'production:revision-notes' },
    ],
  },
  {
    id: 'revisions',
    title: 'Revisions',
    icon: 'RefreshCw',
    iconColor: 'text-amber-500',
    collapsed: true,
    steps: [
      { id: 'revise-script', label: 'Revise Script as Needed', actionEventName: 'production:edit-script' },
      { id: 'revise-frames', label: 'Revise Frames', actionEventName: 'production:edit-frames' },
      { id: 'revise-audio', label: 'Revise Audio', actionEventName: 'production:audio-timeline' },
    ],
  },
  {
    id: 'video-production',
    title: 'Action! (by Scene)',
    icon: 'Video',
    iconColor: 'text-red-500',
    steps: [
      { id: 'create-video', label: 'Create Video', actionEventName: 'production:generate-video' },
      { id: 'edit-video', label: 'Edit Video (if needed)', actionEventName: 'production:edit-video' },
      { id: 'mark-scene-complete', label: 'Mark Scene Video Complete', actionEventName: 'production:mark-complete' },
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
  'final-cut': [], // TODO: Add Final Cut workflow
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
