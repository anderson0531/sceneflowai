/**
 * Attach DetailedSceneDirection onto script scenes at inception.
 *
 * Script LLM calls cannot emit full per-scene direction (output token limits).
 * This helper runs the existing per-scene direction pipeline with bounded
 * concurrency so the first persisted script already has sceneDirection.
 */

import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'

const DEFAULT_CONCURRENCY = 4

export type AttachSceneDirectionsResult = {
  scenes: any[]
  directionsAttached: boolean
  directionFailures: number[]
  attachedCount: number
  skippedCount: number
  /** Scenes left without direction because the deadline passed. */
  deferredCount: number
}

/**
 * For each scene missing `sceneDirection`, call generateSceneDirection.
 * Partial failures keep successful directions and record failed indexes.
 *
 * `deadlineMs` bounds the whole pass: this runs one LLM call per scene, so a
 * longform script can outlast the caller's request budget. Scenes past the
 * deadline are left alone — `migrateProjectBeatDirection` and the client's
 * direction pass backfill them later.
 */
export async function attachSceneDirectionsToScript(
  scenes: any[],
  options: {
    concurrency?: number
    deadlineMs?: number
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
      deferredCount: 0,
    }
  }

  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const deadline =
    typeof options.deadlineMs === 'number' && options.deadlineMs > 0
      ? Date.now() + options.deadlineMs
      : null
  const directionFailures: number[] = []
  let attachedCount = 0
  let skippedCount = 0
  let deferredCount = 0
  let completed = 0
  const totalToGenerate = scenes.filter((s) => !s?.sceneDirection).length

  const nextScenes = await runWithConcurrencyLimit(scenes, concurrency, async (scene, index) => {
    if (scene?.sceneDirection) {
      skippedCount++
      return scene
    }

    if (deadline !== null && Date.now() >= deadline) {
      deferredCount++
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

  if (deferredCount > 0) {
    console.warn(
      `[attachSceneDirectionsToScript] Deadline reached; deferred direction for ${deferredCount} scene(s)`
    )
  }

  return {
    scenes: nextScenes,
    directionsAttached: attachedCount > 0,
    directionFailures,
    attachedCount,
    skippedCount,
    deferredCount,
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
