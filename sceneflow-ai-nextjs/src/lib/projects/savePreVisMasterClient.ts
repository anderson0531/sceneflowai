import type { PreVisMasterAsset } from '@/types/publishingAssets'

export const PREVIS_MASTER_SAVED_EVENT = 'sceneflow:previs-master-saved'

export function dispatchSavedPreVisMaster(
  projectId: string | undefined,
  asset: PreVisMasterAsset
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PREVIS_MASTER_SAVED_EVENT, {
      detail: { projectId, asset },
    })
  )
}

/**
 * Persist a stitched combined Pre-Vis render (`previsByLanguage[language]`) on the project
 * via the lightweight production PATCH route without sending full project metadata.
 */
export async function savePreVisMasterClient(
  projectId: string,
  asset: PreVisMasterAsset
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/production`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ previsMaster: asset }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Failed to save combined Pre-Vis render (${response.status})`)
  }
}
