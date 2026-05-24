/** Read script scenes from visionPhase metadata (nested or flat). */
export function getVisionScriptScenes(
  visionPhase: Record<string, unknown> | null | undefined
): Record<string, unknown>[] {
  if (!visionPhase) return []

  const scriptRoot = visionPhase.script as Record<string, unknown> | undefined
  const nested = scriptRoot?.script as Record<string, unknown> | undefined
  const scenes = nested?.scenes ?? scriptRoot?.scenes ?? visionPhase.scenes ?? []

  return Array.isArray(scenes) ? (scenes as Record<string, unknown>[]) : []
}

/**
 * Resolve a scene by route param id.
 * Supports direct ids, scene-{sceneNumber}, scene-{arrayIndex}, and bare array index.
 */
export function findSceneById(
  scenes: Record<string, unknown>[],
  sceneId: string
): { scene: Record<string, unknown> | null; index: number } {
  const id = String(sceneId)

  const directIndex = scenes.findIndex((scene) => {
    const candidates = [scene?.sceneId, scene?.id, scene?.metadataId, scene?.slug]
    return candidates.some((value) => value != null && String(value) === id)
  })
  if (directIndex >= 0) {
    return { scene: scenes[directIndex], index: directIndex }
  }

  const sceneIndexMatch = /^scene-(\d+)$/.exec(id)
  if (sceneIndexMatch) {
    const idx = Number.parseInt(sceneIndexMatch[1], 10)
    if (Number.isFinite(idx) && idx >= 0 && idx < scenes.length) {
      return { scene: scenes[idx], index: idx }
    }
  }

  const prefixedIndex = scenes.findIndex((scene) => {
    const candidates = [scene?.sceneId, scene?.id, scene?.sceneNumber]
    return candidates.some((value) => value != null && `scene-${value}` === id)
  })
  if (prefixedIndex >= 0) {
    return { scene: scenes[prefixedIndex], index: prefixedIndex }
  }

  if (/^\d+$/.test(id)) {
    const idx = Number.parseInt(id, 10)
    if (idx >= 0 && idx < scenes.length) {
      return { scene: scenes[idx], index: idx }
    }
  }

  return { scene: null, index: -1 }
}
