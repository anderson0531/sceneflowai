import { composeBeatActionFraming, STILL_DIRECTOR_BEAT_CHUNK } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { BeatSequenceReferenceCatalog } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  buildStillDirectorSceneContext,
  shouldSkipStillDirectorAuto,
  type DirectBeatStillRequest,
  type StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  directionFromDirectorPatch,
  freshBeatReferenceSelection,
  saveDirectorPatchToScenes,
} from '@/lib/vision/saveBeatDirection'

/** Beats per Still Director call. Same size Express already uses. */
export const SHOT_DIRECTION_BEAT_CHUNK = STILL_DIRECTOR_BEAT_CHUNK

/**
 * Parallel Still Director calls for one scene.
 * Wider than stills and clips (those stay at 2) because this is text generation.
 * Override with SHOT_DIRECTION_TEXT_CONCURRENCY.
 */
export const DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY = 4

export function getShotDirectionTextConcurrency(): number {
  const raw = Number(process.env.SHOT_DIRECTION_TEXT_CONCURRENCY)
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY
  return Math.floor(raw)
}

export interface ShotDirectionTarget {
  beat: SceneBeat
  beatIndex: number
}

/** Shootable shots. Inception leaves user and director stamps alone unless forced. */
export function shotDirectionTargets(
  scene: unknown,
  options?: { force?: boolean }
): ShotDirectionTarget[] {
  return getSceneBeats((scene ?? {}) as Record<string, unknown>)
    .map((beat, beatIndex) => ({ beat, beatIndex }))
    .filter(({ beat }) => {
      if (isBeatExcluded(beat)) return false
      if (!options?.force && shouldSkipStillDirectorAuto(beat)) return false
      return true
    })
}

export function chunkShotDirectionTargets<T>(
  targets: T[],
  chunkSize: number = SHOT_DIRECTION_BEAT_CHUNK
): T[][] {
  const size = Math.max(1, Math.floor(chunkSize))
  const chunks: T[][] = []
  for (let offset = 0; offset < targets.length; offset += size) {
    chunks.push(targets.slice(offset, offset + size))
  }
  return chunks
}

export function shotDirectionCatalogFromPhase(visionPhase: {
  characters?: Array<{ name?: string }>
  references?: {
    objectReferences?: Array<{ name?: string }>
    locationReferences?: Array<{ location?: string; name?: string }>
  }
} | null | undefined): BeatSequenceReferenceCatalog {
  const characters = Array.isArray(visionPhase?.characters) ? visionPhase.characters : []
  const objectReferences = Array.isArray(visionPhase?.references?.objectReferences)
    ? visionPhase.references.objectReferences
    : []
  const locationReferences = Array.isArray(visionPhase?.references?.locationReferences)
    ? visionPhase.references.locationReferences
    : []
  return {
    characterNames: characters
      .map((character) => String(character?.name ?? '').trim())
      .filter(Boolean),
    propNames: objectReferences
      .map((object) => String(object?.name ?? '').trim())
      .filter(Boolean),
    locationNames: locationReferences
      .map((location) => String(location?.location || location?.name || '').trim())
      .filter(Boolean),
  }
}

const PATCH_FIELDS = [
  'actionFraming',
  'actionDescription',
  'shotType',
  'cameraAngle',
  'frozenMoment',
  'blocking',
  'gaze',
  'emotion',
  'propInteraction',
  'lightingAccent',
  'cameraMovement',
  'audioCue',
] as const

export function shotPatchHasDirection(patch: StillDirectorPatch | undefined): boolean {
  if (!patch) return false
  return (
    PATCH_FIELDS.some((key) => typeof patch[key] === 'string' && patch[key]!.trim().length > 0) ||
    (Array.isArray(patch.castInFrame) && patch.castInFrame.length > 0) ||
    (patch.keyProps?.length ?? 0) > 0
  )
}

export interface ShotDirectionChunkResult {
  usedAI: boolean
  patches: Array<{
    beatIndex: number
    beatId?: string
    patch: StillDirectorPatch
  }>
  fallbackReason?: string
}

/**
 * Ask the Still Director for every eligible shot in a scene, a few beats per
 * call and several calls at once. One scene at a time is the caller's job.
 */
export async function runShotDirectionChunks(args: {
  scene: Record<string, unknown>
  catalog?: BeatSequenceReferenceCatalog
  concurrency?: number
  chunkSize?: number
  force?: boolean
  signal?: AbortSignal
  direct: (request: DirectBeatStillRequest) => Promise<ShotDirectionChunkResult>
}): Promise<{
  patches: Array<{ beatIndex: number; beatId?: string; patch: StillDirectorPatch }>
  failed: number
  requested: number
}> {
  const targets = shotDirectionTargets(args.scene, { force: args.force })
  const chunks = chunkShotDirectionTargets(targets, args.chunkSize)
  const beats = getSceneBeats(args.scene)
  const sceneContext = buildStillDirectorSceneContext(args.scene, beats)
  const concurrency = Math.max(1, args.concurrency ?? getShotDirectionTextConcurrency())
  const collected: Array<{ beatIndex: number; beatId?: string; patch: StillDirectorPatch }> = []
  let failed = 0

  await runWithConcurrencyLimit(chunks, concurrency, async (chunk) => {
    if (args.signal?.aborted) return
    const request: DirectBeatStillRequest = {
      mode: 'optimize',
      catalog: args.catalog,
      ...(sceneContext ? { sceneContext } : {}),
      beats: chunk.map(({ beat, beatIndex }) => ({
        beatIndex,
        beat,
        previousMoment:
          beatIndex > 0 ? composeBeatActionFraming(beats[beatIndex - 1]) : undefined,
        nextMoment:
          beatIndex + 1 < beats.length
            ? composeBeatActionFraming(beats[beatIndex + 1])
            : undefined,
      })),
    }
    try {
      const result = await args.direct(request)
      if (!result.usedAI) {
        if (!args.signal?.aborted) failed += chunk.length
        return
      }
      for (const target of chunk) {
        const match =
          result.patches.find((entry) => entry.beatId && entry.beatId === target.beat.beatId) ??
          result.patches.find((entry) => entry.beatIndex === target.beatIndex)
        if (match && shotPatchHasDirection(match.patch)) {
          collected.push({
            beatIndex: target.beatIndex,
            beatId: target.beat.beatId,
            patch: match.patch,
          })
        } else if (!args.signal?.aborted) {
          failed += 1
        }
      }
    } catch {
      if (!args.signal?.aborted) failed += chunk.length
    }
  })

  return { patches: collected, failed, requested: targets.length }
}

export function applyOptimizedShotPatches(args: {
  scenes: any[]
  sceneIdx: number
  patches: Array<{ beatId?: string; beatIndex: number; patch: StillDirectorPatch }>
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: Array<{ id: string }>
  objectReferences: Array<{ id: string; name: string }>
  promptComposition?: { artStyleAnchor?: string; lookbook?: ProjectLookbook }
  force?: boolean
}): { scenes: any[]; optimized: number; skipped: number } {
  let scenes = Array.isArray(args.scenes) ? args.scenes : []
  let optimized = 0
  let skipped = 0
  if (!scenes[args.sceneIdx]) return { scenes, optimized, skipped }

  for (const entry of args.patches) {
    const scene = scenes[args.sceneIdx]
    const beats = getSceneBeats(scene)
    const current =
      (entry.beatId ? beats.find((beat) => beat.beatId === entry.beatId) : undefined) ??
      (Number.isInteger(entry.beatIndex) ? beats[entry.beatIndex] : undefined)
    if (!current?.beatId || isBeatExcluded(current)) {
      skipped += 1
      continue
    }
    if (!args.force && shouldSkipStillDirectorAuto(current)) {
      skipped += 1
      continue
    }
    if (!shotPatchHasDirection(entry.patch)) {
      skipped += 1
      continue
    }
    const directed = {
      ...current,
      actionDescription: entry.patch.actionDescription?.trim() || current.actionDescription,
      beatDirection: directionFromDirectorPatch(current.beatDirection, entry.patch),
    }
    scenes = saveDirectorPatchToScenes({
      scenes,
      sceneIdx: args.sceneIdx,
      beatId: current.beatId,
      patch: entry.patch,
      generatedBy: 'director',
      referenceSelection: freshBeatReferenceSelection({
        scene,
        beat: directed,
        sceneIdx: args.sceneIdx,
        characters: args.characters,
        locationReferences: args.locationReferences,
        objectReferences: args.objectReferences,
      }),
      objectReferences: args.objectReferences,
      promptComposition: args.promptComposition,
    })
    optimized += 1
  }

  return { scenes, optimized, skipped }
}
