import type { WorkflowStep } from '@/types/enhanced-project'

export const WORKFLOW_STEPS: WorkflowStep[] = [
  'blueprint',
  'vision',
  'creation',
  'polish',
  'launch',
]

export const WORKFLOW_STEP_LABELS: Record<WorkflowStep, string> = {
  blueprint: 'Blueprint',
  vision: 'Production',
  creation: 'Production',
  polish: 'Production',
  launch: 'Production',
}

const LEGACY_STEP_ALIASES: Record<string, WorkflowStep> = {
  blueprint: 'blueprint',
  'the-blueprint': 'blueprint',
  ideation: 'blueprint',
  start: 'blueprint',
  'project-start': 'blueprint',
  vision: 'vision',
  storyboard: 'vision',
  'scene-direction': 'vision',
  direction: 'vision',
  'action-plan': 'vision',
  'director-chair': 'vision',
  creation: 'vision',
  'creation-hub': 'vision',
  'video-generation': 'vision',
  generation: 'vision',
  review: 'vision',
  polish: 'vision',
  refinement: 'vision',
  optimization: 'vision',
  launch: 'vision',
  launchpad: 'vision',
  golive: 'vision',
  'final-cut': 'vision',
  premiere: 'vision',
}

export const normalizeWorkflowStep = (step?: string | null): WorkflowStep => {
  if (!step) {
    return 'blueprint'
  }

  const lower = step.toLowerCase()
  if ((WORKFLOW_STEPS as readonly string[]).includes(lower)) {
    return lower as WorkflowStep
  }

  return LEGACY_STEP_ALIASES[lower] ?? 'blueprint'
}

export const isWorkflowStep = (value: string): value is WorkflowStep =>
  (WORKFLOW_STEPS as readonly string[]).includes(value as WorkflowStep)

export const getWorkflowStepIndex = (step: WorkflowStep): number =>
  WORKFLOW_STEPS.indexOf(step)

export const getNextWorkflowStep = (step: WorkflowStep): WorkflowStep | null => {
  const index = getWorkflowStepIndex(step)
  if (index === -1 || index >= WORKFLOW_STEPS.length - 1) {
    return null
  }
  return WORKFLOW_STEPS[index + 1]
}

export const createEmptyWorkflowProgress = (): Record<WorkflowStep, number> =>
  WORKFLOW_STEPS.reduce((acc, step) => {
    acc[step] = 0
    return acc
  }, {} as Record<WorkflowStep, number>)

export const normalizeWorkflowProgress = (
  progress?: Partial<Record<string, number>>
): Record<WorkflowStep, number> => {
  const normalized = createEmptyWorkflowProgress()

  if (!progress) {
    return normalized
  }

  Object.entries(progress).forEach(([rawKey, rawValue]) => {
    const step = normalizeWorkflowStep(rawKey)
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      normalized[step] = Math.max(0, Math.min(100, rawValue))
    }
  })

  return normalized
}

export const normalizeCompletedWorkflowSteps = (steps: string[] = []): WorkflowStep[] => {
  const normalized = new Set<WorkflowStep>()
  steps.forEach((step) => normalized.add(normalizeWorkflowStep(step)))
  return Array.from(normalized)
}


