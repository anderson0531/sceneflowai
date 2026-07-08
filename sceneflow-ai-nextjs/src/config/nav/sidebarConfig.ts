import type { ReactNode } from 'react'

/**
 * Workflow phase identifiers matching the production pipeline
 */
export type WorkflowPhase = 'blueprint' | 'production' | 'screening-room' | 'final-cut' | 'premiere' | 'dashboard' | 'settings'

/**
 * Status of a workflow step
 */
export type WorkflowStepStatus = 'completed' | 'current' | 'upcoming' | 'locked'

/**
 * Progress item displayed in the Progress section
 */
export interface ProgressItem {
  id: string
  label: string
  icon?: string // Lucide icon name
  isComplete: boolean | (() => boolean)
  value?: string | number // Optional value to display (e.g., "12 scenes", "100%")
  progress?: number // 0-100 for progress bar
}

/**
 * Quick action button configuration
 */
export interface QuickAction {
  id: string
  label: string
  icon: string // Lucide icon name
  iconColor?: string // Tailwind color class
  variant?: 'default' | 'outline' | 'ghost'
  action: 'navigate' | 'event' | 'callback'
  href?: string // For navigation actions
  eventName?: string // For custom event dispatch
  disabled?: boolean | (() => boolean)
  badge?: string // Optional badge text
  badgeVariant?: 'default' | 'warning' | 'success'
}

/**
 * Workflow step in the vertical stepper
 */
export interface WorkflowStep {
  id: string
  label: string
  href: string | ((projectId: string) => string)
  status: WorkflowStepStatus | ((projectId: string) => WorkflowStepStatus)
  badge?: string
}

/**
 * Section visibility configuration
 */
export interface SectionVisibility {
  workflow: boolean
  workflowGuide: boolean
  proTips: boolean
  progress: boolean
  quickActions: boolean
  reviewScores: boolean
  screeningRoom: boolean
  projectStats: boolean
  credits: boolean
  voiceSelector?: boolean
}

/**
 * Default sections that are open on initial load
 */
export interface SectionDefaults {
  workflow: boolean
  workflowGuide: boolean
  proTips: boolean
  progress: boolean
  quickActions: boolean
  reviewScores: boolean
  screeningRoom: boolean
  projectStats: boolean
  credits: boolean
  voiceSelector?: boolean
}

/**
 * Complete sidebar configuration for a workflow phase
 */
export interface WorkflowSidebarConfig {
  phase: WorkflowPhase
  showWorkflowStepper: boolean
  workflowSteps?: WorkflowStep[]
  progressItems?: ProgressItem[]
  quickActions?: QuickAction[]
  sectionVisibility: SectionVisibility
  sectionDefaults: SectionDefaults
}

// ============================================================================
// SHARED WORKFLOW STEPPER (canonical 4-phase pipeline)
// ============================================================================

function makeWorkflowSteps(
  currentPhase: 'blueprint' | 'production'
): WorkflowStep[] {
  const phases: { id: string; label: string; href: (pid: string) => string }[] = [
    { id: 'blueprint', label: 'Blueprint', href: (pid) => `/dashboard/studio/${pid}` },
    { id: 'production', label: 'Production', href: (pid) => `/dashboard/workflow/vision/${pid}` },
  ]
  const currentIndex = phases.findIndex((p) => p.id === currentPhase)
  return phases.map((p, i) => ({
    ...p,
    status: (i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'upcoming') as WorkflowStepStatus,
    ...(i === currentIndex ? { badge: 'Current' } : {}),
  }))
}

// ============================================================================
// BLUEPRINT PHASE CONFIG
// ============================================================================

export const blueprintSidebarConfig: WorkflowSidebarConfig = {
  phase: 'blueprint',
  showWorkflowStepper: true,
  workflowSteps: makeWorkflowSteps('blueprint'),
  progressItems: [
    { id: 'blueprint-generated', label: 'Blueprint Generated', icon: 'CheckCircle2', isComplete: false },
    { id: 'audience-saved', label: 'Target Audience Saved', icon: 'Users', isComplete: false },
    { id: 'ar-analyzed', label: 'Audience Resonance', icon: 'Radar', isComplete: false },
    { id: 'ar-target', label: 'Score 80+', icon: 'Target', isComplete: false },
  ],
  quickActions: [
    { id: 'generate-blueprint', label: 'Generate Blueprint', icon: 'Sparkles', iconColor: 'text-sf-primary', action: 'event', eventName: 'blueprint:generate-treatment' },
    { id: 'refine-concept', label: 'Edit Blueprint', icon: 'Wrench', iconColor: 'text-amber-500', action: 'event', eventName: 'blueprint:edit-sections' },
    { id: 'scorecard', label: 'Audience Resonance', icon: 'BarChart3', iconColor: 'text-purple-500', action: 'event', eventName: 'blueprint:analyze-resonance' },
    { id: 'save', label: 'Save Progress', icon: 'Save', iconColor: 'text-green-500', action: 'event', eventName: 'blueprint:save' },
    { id: 'export', label: 'Collaborate', icon: 'Share2', iconColor: 'text-blue-500', action: 'event', eventName: 'blueprint:collaborate' },
  ],
  sectionVisibility: {
    workflow: true,
    workflowGuide: true,
    proTips: true,
    progress: true,
    quickActions: true,
    reviewScores: false,
    screeningRoom: false, // Hidden in blueprint phase
    projectStats: false,
    credits: true,
  },
  sectionDefaults: {
    workflow: false,
    workflowGuide: true,
    proTips: false,
    progress: true,
    quickActions: false,
    reviewScores: false,
    screeningRoom: false,
    projectStats: false,
    credits: false,
  },
}

// ============================================================================
// PRODUCTION PHASE CONFIG
// ============================================================================

export const productionSidebarConfig: WorkflowSidebarConfig = {
  phase: 'production',
  showWorkflowStepper: true,
  workflowSteps: makeWorkflowSteps('production'),
  progressItems: [
    { id: 'film-treatment', label: 'Film Treatment', icon: 'CheckCircle2', isComplete: false },
    { id: 'screenplay', label: 'Screenplay', icon: 'CheckCircle2', isComplete: false },
    { id: 'references', label: 'References', icon: 'ImageIcon', isComplete: false },
    { id: 'scene-images', label: 'Scene Images', icon: 'ImageIcon', isComplete: false, progress: 0 },
    { id: 'audio', label: 'Audio', icon: 'Music', isComplete: false, progress: 0 },
    { id: 'video-export', label: 'Video Export', icon: 'Video', isComplete: false, progress: 0 },
  ],
  quickActions: [
    { id: 'goto-bookmark', label: 'Go to Bookmark', icon: 'Bookmark', iconColor: 'text-amber-500', action: 'event', eventName: 'production:goto-bookmark' },
    { id: 'screening', label: 'Screening Room', icon: 'Play', iconColor: 'text-green-500', action: 'event', eventName: 'production:screening-room' },
    { id: 'update-reviews', label: 'Audience Resonance', icon: 'BarChart3', iconColor: 'text-purple-500', action: 'event', eventName: 'production:update-reviews' },
    { id: 'review-analysis', label: 'Script Review', icon: 'FileText', iconColor: 'text-blue-500', action: 'event', eventName: 'production:review-analysis' },
    { id: 'production-render', label: 'Production Render', icon: 'Film', iconColor: 'text-purple-400', action: 'event', eventName: 'production:render-all' },
    { id: 'publish', label: 'Publish', icon: 'Upload', iconColor: 'text-emerald-400', action: 'event', eventName: 'production:publish' },
  ],
  sectionVisibility: {
    workflow: true,
    workflowGuide: false,
    proTips: true,
    progress: true,
    quickActions: true,
    reviewScores: false,
    voiceSelector: false,
    screeningRoom: false, // Hidden in production phase
    projectStats: true,
    credits: true,
  },
  sectionDefaults: {
    workflow: false,
    workflowGuide: false,
    proTips: false,
    progress: false,
    quickActions: false,
    reviewScores: false,
    voiceSelector: false,
    screeningRoom: false,
    projectStats: false,
    credits: false,
  },
}

export const screeningRoomSidebarConfig: WorkflowSidebarConfig = {
  phase: 'screening-room',
  showWorkflowStepper: true,
  workflowSteps: makeWorkflowSteps('production'),
  progressItems: [
    { id: 'streams-ready', label: 'Scene streams ready', icon: 'Video', isComplete: false, progress: 0 },
    { id: 'assembly', label: 'Assembly configured', icon: 'Film', isComplete: false },
    { id: 'master-export', label: 'Master exported', icon: 'Download', isComplete: false },
    { id: 'screenings', label: 'Screenings', icon: 'Play', isComplete: false },
    { id: 'published', label: 'Published', icon: 'Upload', isComplete: false },
  ],
  quickActions: [
    { id: 'open-preview', label: 'Preview Scenes', icon: 'Play', iconColor: 'text-green-400', action: 'event', eventName: 'screening-room:preview' },
    { id: 'open-assemble', label: 'Assemble Master', icon: 'Layers', iconColor: 'text-violet-400', action: 'event', eventName: 'screening-room:assemble' },
    { id: 'create-screening', label: 'Create Screening', icon: 'Users', iconColor: 'text-cyan-400', action: 'event', eventName: 'screening-room:create-screening' },
    { id: 'publish-youtube', label: 'Publish YouTube', icon: 'Video', iconColor: 'text-red-400', action: 'event', eventName: 'screening-room:publish' },
    { id: 'back-production', label: 'Back to Production', icon: 'ArrowLeft', iconColor: 'text-gray-400', action: 'navigate', href: '/dashboard/workflow/vision' },
  ],
  sectionVisibility: {
    workflow: true,
    workflowGuide: true,
    proTips: true,
    progress: true,
    quickActions: true,
    reviewScores: true,
    screeningRoom: true,
    projectStats: true,
    credits: true,
  },
  sectionDefaults: {
    workflow: false,
    workflowGuide: true,
    proTips: false,
    progress: false,
    quickActions: false,
    reviewScores: false,
    screeningRoom: false,
    projectStats: false,
    credits: false,
  },
}

export const finalCutSidebarConfig: WorkflowSidebarConfig = screeningRoomSidebarConfig
export const premiereSidebarConfig: WorkflowSidebarConfig = screeningRoomSidebarConfig

// ============================================================================
// DASHBOARD CONFIG (default when not in a workflow)
// ============================================================================

export const dashboardSidebarConfig: WorkflowSidebarConfig = {
  phase: 'dashboard',
  showWorkflowStepper: false,
  sectionVisibility: {
    workflow: false,
    workflowGuide: false,
    proTips: false,
    progress: false,
    quickActions: false,
    reviewScores: false,
    screeningRoom: false,
    projectStats: false,
    credits: true,
  },
  sectionDefaults: {
    workflow: false,
    workflowGuide: false,
    proTips: false,
    progress: false,
    quickActions: false,
    reviewScores: false,
    screeningRoom: false,
    projectStats: false,
    credits: true,
  },
}

// ========================================================================
// IDEAS CONFIG (formerly Visionary Engine)
// ========================================================================


// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Get sidebar config based on current pathname
 */
export function getSidebarConfigForPath(pathname: string): WorkflowSidebarConfig {
  if (pathname.includes('/dashboard/workflow/screening-room')) {
    return screeningRoomSidebarConfig
  }
  if (pathname.includes('/dashboard/workflow/vision/')) {
    return productionSidebarConfig
  }
  if (pathname.includes('/dashboard/workflow/premiere') ||
      pathname.includes('/dashboard/workflow/final-cut') ||
      pathname.includes('/dashboard/workflow/generation/')) {
    return screeningRoomSidebarConfig
  }
  if (pathname.includes('/dashboard/studio/') || pathname.includes('/dashboard/workflow/ideation/')) {
    return blueprintSidebarConfig
  }
  return dashboardSidebarConfig
}

/**
 * Extract projectId from pathname
 */
export function getProjectIdFromPath(pathname: string): string | null {
  // Match patterns like /dashboard/workflow/vision/[projectId] or /dashboard/studio/[projectId]
  const patterns = [
    /\/dashboard\/workflow\/screening-room/,
    /\/dashboard\/workflow\/vision\/([^\/]+)/,
    /\/dashboard\/workflow\/generation\/([^\/]+)/,
    /\/dashboard\/workflow\/premiere\/([^\/]+)/,
    /\/dashboard\/workflow\/final-cut/,
    /\/dashboard\/studio\/([^\/]+)/,
    /\/dashboard\/workflow\/ideation\/([^\/]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = pathname.match(pattern)
    if (match && match[1] && match[1] !== 'new-project') {
      return match[1]
    }
  }
  return null
}
