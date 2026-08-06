/**
 * Attach DetailedSceneDirection onto script scenes at inception.
 *
 * Script LLM calls cannot emit full per-scene direction (output token limits).
 * This helper runs the existing per-scene direction pipeline with bounded
 * concurrency so the first persisted script already has sceneDirection.
 */

import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'

const DEFAULT_CONCURRENCY = 3

export type AttachSceneDirectionsResult = {
  scenes: any[]
  directionsAttached: boolean
  directionFailures: number[]
  attachedCount: number
  skippedCount: number
}

/**
 * For each scene missing `sceneDirection`, call generateSceneDirection.
 * Partial failures keep successful directions and record failed indexes.
 */
export async function attachSceneDirectionsToScript(
  scenes: any[],
  options: {
    concurrency?: number
    onProgress?: (done: number, total: number, sceneIndex: number) => void
  } = {}
): Promise<AttachSceneDirectionsResult> {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return {
      scenes: scenes || [],
      directionsAttached: false,
      directionFailures: [],
      attachedCount: 0,
      skippedCount: 0,
    }
  }

  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const directionFailures: number[] = []
  let attachedCount = 0
  let skippedCount = 0
  let completed = 0
  const totalToGenerate = scenes.filter((s) => !s?.sceneDirection).length

  const nextScenes = await runWithConcurrencyLimit(scenes, concurrency, async (scene, index) => {
    if (scene?.sceneDirection) {
      skippedCount++
      return scene
    }

    try {
      const { sceneDirection } = await generateSceneDirection({
        scene: {
          heading: scene.heading,
          action: scene.action,
          visualDescription: scene.visualDescription,
          narration: scene.narration,
          dialogue: scene.dialogue,
          characters: scene.characters,
        },
        sceneIndex: index,
      })
      attachedCount++
      completed++
      options.onProgress?.(completed, totalToGenerate, index)
      return { ...scene, sceneDirection }
    } catch (err) {
      console.warn(
        `[attachSceneDirectionsToScript] Direction failed for scene ${index + 1}:`,
        err
      )
      directionFailures.push(index)
      completed++
      options.onProgress?.(completed, totalToGenerate, index)
      return scene
    }
  })

  return {
    scenes: nextScenes,
    directionsAttached: attachedCount > 0,
    directionFailures,
    attachedCount,
    skippedCount,
  }
}

/**
 * Write an updated scene list back into the common visionPhase nesting shapes.
 */
export function writeScenesIntoVisionMetadata(metadata: any, scenes: any[]): any {
  const existing = metadata || {}
  const visionPhase = { ...(existing.visionPhase || {}) }
  const script = { ...(visionPhase.script || {}) }

  if (script.script && typeof script.script === 'object') {
    script.script = { ...script.script, scenes }
  } else if (Array.isArray(script.scenes)) {
    script.scenes = scenes
  } else {
    script.script = { scenes }
  }

  visionPhase.script = script
  if (Array.isArray(visionPhase.scenes)) {
    visionPhase.scenes = scenes
  }

  return {
    ...existing,
    visionPhase,
  }
}

/**
 * Read the primary scene list from visionPhase metadata.
 */
export function readScenesFromVisionMetadata(metadata: any): any[] {
  const visionPhase = metadata?.visionPhase || {}
  const script = visionPhase.script || {}
  if (Array.isArray(script.script?.scenes)) return script.script.scenes
  if (Array.isArray(script.scenes)) return script.scenes
  if (Array.isArray(visionPhase.scenes)) return visionPhase.scenes
  return []
}
