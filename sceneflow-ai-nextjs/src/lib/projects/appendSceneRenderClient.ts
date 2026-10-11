import type { ProductionStream } from '@/components/vision/scene-production/types'

export const SCENE_RENDER_APPENDED_EVENT = 'sceneflow:scene-render-appended'

export function dispatchAppendedSceneRender(sceneId: string, stream: ProductionStream): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(SCENE_RENDER_APPENDED_EVENT, {
      detail: { sceneId, stream },
    })
  )
}

/** Persist one finished render. The body is the stream, not the scene. */
export async function appendSceneRenderClient(
  projectId: string,
  sceneId: string,
  stream: ProductionStream
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/production`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneId, appendStream: stream }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Failed to save the scene render (${response.status})`)
  }
}
