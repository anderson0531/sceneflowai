import type { ReactNode } from 'react'

/**
 * Workflow phase identifiers matching the production pipeline
 */
export type WorkflowPhase = 'blueprint' | 'production' | 'final-cut' | 'premiere' | 'dashboard' | 'settings'

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
  proTips: boolean
  progress: boolean
  quickActions: boolean
  reviewScores: boolean
  projectStats: boolean
  credits: boolean
}

/**
 * Default sections that are open on initial load
 */
export interface SectionDefaults {
  workflow: boolean
  proTips: boolean
  progress: boolean
  quickActions: boolean
  reviewScores: boolean
  projectStats: boolean
  credits: boolean
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
// BLUEPRINT PHASE CONFIG
// ============================================================================

export const blueprintSidebarConfig: WorkflowSidebarConfig = {
  phase: 'blueprint',
  showWorkflowStepper: true,
  workflowSteps: [
    {
      id: 'blueprint',
      label: 'Blueprint',
      href: (projectId) => `/dashboard/studio/${projectId}`,
      status: 'current',
    },
    {
      id: 'production',
      label: 'Production',
      href: (projectId) => `/dashboard/workflow/vision/${projectId}`,
      status: 'upcoming',
    },
    {
      id: 'final-cut',
      label: 'Final Cut',
      href: (projectId) => `/dashboard/workflow/generation/${projectId}`,
      status: 'locked',
    },
    {
      id: 'premiere',
      label: 'Premiere',
      href: (projectId) => `/dashboard/workflow/premiere/${projectId}`,
      status: 'locked',
    },
  ],
  progressItems: [
    { id: 'concept-analysis', label: 'Concept Analysis', icon: 'CheckCircle2', isComplete: false },
    { id: 'workshop', label: 'Workshop Refinement', icon: 'Wrench', isComplete: false },
    { id: 'ideas', label: 'Ideas Generated', icon: 'Lightbulb', isComplete: false },
    { id: 'core-concept', label: 'Core Concept Ready', icon: 'FileText', isComplete: false },
  ],
  quickActions: [
    { id: 'generate-blueprint', label: 'Generate Blueprint', icon: 'Sparkles', iconColor: 'text-sf-primary', action: 'event', eventName: 'blueprint:generate' },
    { id: 'refine-concept', label: 'Refine Concept', icon: 'Wrench', iconColor: 'text-amber-500', action: 'event', eventName: 'blueprint:refine' },
    { id: 'scorecard', label: 'View Score Card', icon: 'BarChart3', iconColor: 'text-purple-500', action: 'event', eventName: 'blueprint:scorecard' },
    { id: 'save', label: 'Save Progress', icon: 'Save', iconColor: 'text-green-500', action: 'event', eventName: 'blueprint:save' },
    { id: 'export', label: 'Export Ideas', icon: 'Download', iconColor: 'text-blue-500', action: 'event', eventName: 'blueprint:export' },
  ],
  sectionVisibility: {
    workflow: true,
    proTips: true,
    progress: true,
    quickActions: true,
    reviewScores: false,
    projectStats: false,
    credits: true,
  },
  sectionDefaults: {
    workflow: true,
    proTips: false,
    progress: false,
    quickActions: true,
    reviewScores: false,
    projectStats: false,
    credits: true,
  },
}

// ============================================================================
// PRODUCTION PHASE CONFIG
// ============================================================================

export const productionSidebarConfig: WorkflowSidebarConfig = {
  phase: 'production',
  showWorkflowStepper: true,
  workflowSteps: [
    {
      id: 'blueprint',
      label: 'Blueprint',
      href: (projectId) => `/dashboard/studio/${projectId}`,
      status: 'completed',
    },
    {
      id: 'production',
      label: 'Production',
      href: (projectId) => `/dashboard/workflow/vision/${projectId}`,
      status: 'current',
      badge: 'Current',
    },
    {
      id: 'final-cut',
      label: 'Final Cut',
      href: (projectId) => `/dashboard/workflow/generation/${projectId}`,
      status: 'upcoming',
    },
    {
      id: 'premiere',
      label: 'Premiere',
      href: (projectId) => `/dashboard/workflow/premiere/${projectId}`,
      status: 'upcoming',
    },
  ],
  progressItems: [
    { id: 'film-treatment', label: 'Film Treatment', icon: 'CheckCircle2', isComplete: false },
    { id: 'screenplay', label: 'Screenplay', icon: 'CheckCircle2', isComplete: false },
    { id: 'references', label: 'References', icon: 'ImageIcon', isComplete: false },
    { id: 'scene-images', label: 'Scene Images', icon: 'ImageIcon', isComplete: false, progress: 0 },
    { id: 'audio', label: 'Audio', icon: 'Music', isComplete: false, progress: 0 },
    { id: 'video-export', label: 'Video Export', icon: 'Video', isComplete: false, badge: 'Soon' },
  ],
  quickActions: [
    { id: 'goto-bookmark', label: 'Go to Bookmark', icon: 'Bookmark', iconColor: 'text-amber-500', action: 'event', eventName: 'production:goto-bookmark' },
    { id: 'scene-gallery', label: 'Open Scene Gallery', icon: 'ImageIcon', iconColor: 'text-cyan-400', action: 'event', eventName: 'production:scene-gallery' },
    { id: 'screening-room', label: 'Screening Room', icon: 'Play', iconColor: 'text-green-500', action: 'event', eventName: 'production:screening-room' },
    { id: 'update-reviews', label: 'Update Review Scores', icon: 'BarChart3', iconColor: 'text-purple-500', action: 'event', eventName: 'production:update-reviews' },
    { id: 'review-analysis', label: 'Review Analysis', icon: 'FileText', iconColor: 'text-blue-500', action: 'event', eventName: 'production:review-analysis' },
    { id: 'settings', label: 'Settings', icon: 'Settings', iconColor: 'text-gray-400', action: 'navigate', href: '/dashboard/settings/profile' },
  ],
  sectionVisibility: {
    workflow: true,
    proTips: true,
    progress: true,
    quickActions: true,
    reviewScores: true,
    projectStats: true,
    credits: true,
  },
  sectionDefaults: {
    workflow: true,
    proTips: false,
    progress: false,
    quickActions: true,
    reviewScores: true,
    projectStats: false,
    credits: true,
  },
}

// ============================================================================
// FINAL CUT PHASE CONFIG
// ============================================================================

export const finalCutSidebarConfig: WorkflowSidebarConfig = {
  phase: 'final-cut',
  showWorkflowStepper: true,
  workflowSteps: [
    {
      id: 'blueprint',
      label: 'Blueprint',
      href: (projectId) => `/dashboard/studio/${projectId}`,
      status: 'completed',
    },
    {
      id: 'production',
      label: 'Production',
      href: (projectId) => `/dashboard/workflow/vision/${projectId}`,
      status: 'completed',
    },
    {
      id: 'final-cut',
      label: 'Final Cut',
      href: (projectId) => `/dashboard/workflow/generation/${projectId}`,
      status: 'current',
      badge: 'Current',
    },
    {
      id: 'premiere',
      label: 'Premiere',
      href: (projectId) => `/dashboard/workflow/premiere/${projectId}`,
      status: 'upcoming',
    },
  ],
  progressItems: [
    { id: 'video-gen', label: 'Video Generation', icon: 'Video', isComplete: false, progress: 0 },
    { id: 'assembly', label: 'Assembly', icon: 'Film', isComplete: false },
    { id: 'export', label: 'Export', icon: 'Download', isComplete: false },
  ],
  quickActions: [
    { id: 'generate-videos', label: 'Generate All Videos', icon: 'Video', iconColor: 'text-sf-primary', action: 'event', eventName: 'finalcut:generate-all' },
    { id: 'screening-room', label: 'Screening Room', icon: 'Play', iconColor: 'text-green-500', action: 'event', eventName: 'finalcut:screening-room' },
  ],
  sectionVisibility: {
    workflow: true,
    proTips: true,
    progress: true,
    quickActions: true,
    reviewScores: true,
    projectStats: true,
    credits: true,
  },
  sectionDefaults: {
    workflow: true,
    proTips: false,
    progress: false,
    quickActions: true,
    reviewScores: true,
    projectStats: false,
    credits: true,
  },
}

// ============================================================================
// PREMIERE PHASE CONFIG
// ============================================================================

export const premiereSidebarConfig: WorkflowSidebarConfig = {
  phase: 'premiere',
  showWorkflowStepper: true,
  workflowSteps: [
    {
      id: 'blueprint',
      label: 'Blueprint',
      href: (projectId) => `/dashboard/studio/${projectId}`,
      status: 'completed',
    },
    {
      id: 'production',
      label: 'Production',
      href: (projectId) => `/dashboard/workflow/vision/${projectId}`,
      status: 'completed',
    },
    {
      id: 'final-cut',
      label: 'Final Cut',
      href: (projectId) => `/dashboard/workflow/generation/${projectId}`,
      status: 'completed',
    },
    {
      id: 'premiere',
      label: 'Premiere',
      href: (projectId) => `/dashboard/workflow/premiere/${projectId}`,
      status: 'current',
      badge: 'Current',
    },
  ],
  quickActions: [
    { id: 'share', label: 'Share Film', icon: 'Share2', iconColor: 'text-sf-primary', action: 'event', eventName: 'premiere:share' },
    { id: 'download', label: 'Download', icon: 'Download', iconColor: 'text-green-500', action: 'event', eventName: 'premiere:download' },
  ],
  sectionVisibility: {
    workflow: true,
    proTips: true,
    progress: false,
    quickActions: true,
    reviewScores: true,
    projectStats: true,
    credits: true,
  },
  sectionDefaults: {
    workflow: true,
    proTips: false,
    progress: false,
    quickActions: true,
    reviewScores: true,
    projectStats: true,
    credits: true,
  },
}

// ============================================================================
// DASHBOARD CONFIG (default when not in a workflow)
// ============================================================================

export const dashboardSidebarConfig: WorkflowSidebarConfig = {
  phase: 'dashboard',
  showWorkflowStepper: false,
  sectionVisibility: {
    workflow: false,
    proTips: false,
    progress: false,
    quickActions: false,
    reviewScores: false,
    projectStats: false,
    credits: true,
  },
  sectionDefaults: {
    workflow: false,
    proTips: false,
    progress: false,
    quickActions: false,
    reviewScores: false,
    projectStats: false,
    credits: true,
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get sidebar config based on current pathname
 */
export function getSidebarConfigForPath(pathname: string): WorkflowSidebarConfig {
  if (pathname.includes('/dashboard/workflow/vision/')) {
    return productionSidebarConfig
  }
  if (pathname.includes('/dashboard/workflow/generation/')) {
    return finalCutSidebarConfig
  }
  if (pathname.includes('/dashboard/workflow/premiere/')) {
    return premiereSidebarConfig
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
    /\/dashboard\/workflow\/vision\/([^\/]+)/,
    /\/dashboard\/workflow\/generation\/([^\/]+)/,
    /\/dashboard\/workflow\/premiere\/([^\/]+)/,
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
