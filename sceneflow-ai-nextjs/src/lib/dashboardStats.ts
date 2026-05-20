import {
  normalizeWorkflowStep,
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEPS,
} from '@/constants/workflowSteps'
import type { DashboardProject } from '@/hooks/useDashboardData'

export interface DashboardProjectStats {
  total: number
  active: number
  archived: number
  completed: number
  inProduction: number
  byPhase: Record<string, number>
}

export function computeDashboardProjectStats(
  projects: DashboardProject[],
  totalFromApi?: number
): DashboardProjectStats {
  const archived = projects.filter((p) => p.status === 'archived')
  const active = projects.filter((p) => p.status !== 'archived')

  const byPhase: Record<string, number> = {}
  for (const step of WORKFLOW_STEPS) {
    byPhase[WORKFLOW_STEP_LABELS[step]] = 0
  }

  let inProduction = 0
  let completed = 0

  for (const p of active) {
    const step = normalizeWorkflowStep(p.currentStep)
    const label = WORKFLOW_STEP_LABELS[step]
    byPhase[label] = (byPhase[label] || 0) + 1

    if (step === 'vision' || step === 'creation') {
      inProduction += 1
    }
    if (p.progress >= 100 || p.status === 'completed') {
      completed += 1
    }
  }

  return {
    total: totalFromApi ?? projects.length,
    active: active.length,
    archived: archived.length,
    completed,
    inProduction,
    byPhase,
  }
}

export function getProjectResumeUrl(project: DashboardProject): string {
  const step = normalizeWorkflowStep(project.currentStep)
  switch (step) {
    case 'blueprint':
      return `/dashboard/workflow/vision/${project.id}`
    case 'vision':
      return `/dashboard/workflow/final-cut?projectId=${project.id}`
    case 'creation':
    case 'polish':
      return `/dashboard/workflow/premiere?projectId=${project.id}`
    case 'launch':
      return `/dashboard/projects/${project.id}`
    default:
      return `/dashboard/workflow/vision/${project.id}`
  }
}
