/**
 * Resolve per-scene Production data from project metadata.
 *
 * Vision / Production Mixer persists to `visionPhase.production.scenes[sceneId]`.
 * Older paths used top-level `sceneProductionState`. Final Cut and export must read both.
 */
export function getSceneProductionStateFromMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {}
  const m = metadata as Record<string, unknown>

  const legacyRaw = m.sceneProductionState
  const legacy =
    legacyRaw && typeof legacyRaw === 'object' && !Array.isArray(legacyRaw)
      ? (legacyRaw as Record<string, unknown>)
      : {}

  const visionPhase = m.visionPhase as Record<string, unknown> | undefined
  const production = visionPhase?.production as { scenes?: unknown } | undefined
  const scenesRaw = production?.scenes
  const visionScenes =
    scenesRaw && typeof scenesRaw === 'object' && !Array.isArray(scenesRaw)
      ? (scenesRaw as Record<string, unknown>)
      : {}

  return { ...legacy, ...visionScenes }
}
