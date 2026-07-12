import type { FinalCutSelection } from '@/lib/types/finalCut'

export function finalCutSelectionApiPath(projectId: string): string {
  return `/api/projects/${projectId}/final-cut`
}

export function buildFinalCutSelectionRequestBody(finalCut: FinalCutSelection): string {
  return JSON.stringify({ finalCut })
}

/**
 * Persist Screening Room / Assemble version selection without sending full project metadata.
 */
export async function persistFinalCutSelectionApi(
  projectId: string,
  finalCut: FinalCutSelection
): Promise<void> {
  const res = await fetch(finalCutSelectionApiPath(projectId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: buildFinalCutSelectionRequestBody(finalCut),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Failed to save screening version')
  }
}
