import {
  auditStoryboardSceneMedia,
  isValidStoryboardMediaUrl,
  mergeScenePreservingMedia,
} from '@/lib/storyboard/mergeSceneMedia'

export { auditStoryboardSceneMedia }

function sceneKey(scene: any, index: number): string {
  const id = scene?.id || scene?.sceneId
  if (typeof id === 'string' && id.trim()) return id.trim()
  if (typeof scene?.sceneNumber === 'number') return `num-${scene.sceneNumber}`
  return `idx-${index}`
}

function mediaRichnessScore(scene: any): number {
  if (!scene || typeof scene !== 'object') return 0
  let score = 0
  if (isValidStoryboardMediaUrl(scene.imageUrl)) score += 10
  for (const line of scene.dialogue || []) {
    if (isValidStoryboardMediaUrl(line?.storyboardImageUrl)) score += 2
  }
  for (const seg of scene.segments || []) {
    for (const line of seg?.dialogue || []) {
      if (isValidStoryboardMediaUrl(line?.storyboardImageUrl)) score += 2
    }
  }
  for (const frame of scene.storyboardFrames || []) {
    if (isValidStoryboardMediaUrl(frame?.imageUrl)) score += 1
  }
  return score
}

function collectSceneArrays(project: {
  script?: any
  visionPhaseScenes?: any[]
}): any[][] {
  const script = project.script
  const arrays: any[][] = []

  const nested = script?.script?.scenes
  if (Array.isArray(nested) && nested.length > 0) arrays.push(nested)

  const wrapper = script?.scenes
  if (Array.isArray(wrapper) && wrapper.length > 0) arrays.push(wrapper)

  const legacy = project.visionPhaseScenes
  if (Array.isArray(legacy) && legacy.length > 0) arrays.push(legacy)

  return arrays
}

/**
 * Merge scene arrays from script.script.scenes, script.scenes, and visionPhase.scenes.
 * Prefers the richest storyboard media per scene (by id/sceneNumber/index).
 */
export function resolveStoryboardScenes(project: {
  script?: any
  visionPhaseScenes?: any[]
  /** Pre-merged scenes from shared API (optional). */
  scenes?: any[]
}): any[] {
  if (Array.isArray(project.scenes) && project.scenes.length > 0) {
    return project.scenes
  }

  const arrays = collectSceneArrays(project)
  if (arrays.length === 0) return []

  const mergedByKey = new Map<string, { scene: any; score: number; order: number }>()
  let orderCounter = 0

  for (const arr of arrays) {
    arr.forEach((scene, index) => {
      const key = sceneKey(scene, index)
      const score = mediaRichnessScore(scene)
      const existing = mergedByKey.get(key)

      if (!existing) {
        mergedByKey.set(key, { scene: { ...scene }, score, order: orderCounter++ })
        return
      }

      if (score > existing.score) {
        existing.scene = mergeScenePreservingMedia(scene, existing.scene)
        existing.score = mediaRichnessScore(existing.scene)
      } else {
        existing.scene = mergeScenePreservingMedia(existing.scene, scene)
        existing.score = mediaRichnessScore(existing.scene)
      }
    })
  }

  return Array.from(mergedByKey.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.scene)
}
