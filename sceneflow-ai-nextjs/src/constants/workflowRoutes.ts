import { normalizeWorkflowStep } from '@/constants/workflowSteps'

/** Canonical Production (Vision) route for a project */
export function getProductionRoute(projectId: string, panel?: string): string {
  const base = `/dashboard/workflow/vision/${projectId}`
  if (!panel) return base
  return `${base}?panel=${encodeURIComponent(panel)}`
}

/** Resume route from stored workflow step — all post-blueprint steps land in Production */
export function getResumeRouteForStep(projectId: string, step?: string | null): string {
  const normalized = normalizeWorkflowStep(step)
  if (normalized === 'blueprint') {
    return `/dashboard/studio/${projectId}`
  }
  return getProductionRoute(projectId)
}

/** Legacy Final Cut / Premiere URLs → Production with optional deep-link panel */
export function resolveLegacyWorkflowRedirect(
  projectId: string | null,
  legacyPath: 'final-cut' | 'premiere',
  searchParams?: URLSearchParams
): string {
  const pid = projectId || searchParams?.get('projectId')
  const panel =
    legacyPath === 'premiere'
      ? searchParams?.get('panel') || 'publish'
      : searchParams?.get('panel') || 'render'
  if (pid) return getProductionRoute(pid, panel)
  return '/dashboard'
}
