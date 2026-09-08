/** A recommendation is high-impact when priority is high or it deducts 10+ points. */
export function recommendationIsHighImpact(rec: unknown): boolean {
  if (!rec || typeof rec !== 'object') return false
  const item = rec as { priority?: string; pointsDeducted?: number }
  if (item.priority === 'high') return true
  return typeof item.pointsDeducted === 'number' && item.pointsDeducted >= 10
}

export function sceneHasHighImpactIssue(scene: {
  recommendations?: unknown[]
} | null | undefined): boolean {
  const recs = scene?.recommendations
  if (!Array.isArray(recs) || recs.length === 0) return false
  return recs.some(recommendationIsHighImpact)
}

/** 0-based scene index of the first high-impact scene, or null. */
export function firstHighImpactSceneIndex(
  scenes: Array<{ sceneNumber?: number; recommendations?: unknown[] }>
): number | null {
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    if (!sceneHasHighImpactIssue(scene)) continue
    const n = scene.sceneNumber
    if (typeof n === 'number' && n > 0) return n - 1
    return i
  }
  return null
}
