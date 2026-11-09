import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { BeatSequenceReferenceCatalog } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  buildStillDirectorSceneContext,
  shouldSkipStillDirectorAuto,
  type DirectBeatStillRequest,
  type StillDirectorBoundContinuity,
  type StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  boundBeatReferenceSelection,
  directionFromDirectorPatch,
  freshBeatReferenceSelection,
  saveDirectorPatchToScenes,
} from '@/lib/vision/saveBeatDirection'
import { resolveBeatElementSelection } from '@/lib/vision/resolveBeatVideoReferences'
import { resolveWardrobeForCharacter } from '@/lib/character/characterReferenceAssembly'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

/**
 * Single-shot focus per Still Director call (`1` beat per request).
 * Focusing on a single shot at a time allows the model to richly describe the
 * shot's setting, blocking, and emotional tells, which produces superior
 * Stills (`framePrompt`) and Clips (`videoPrompt`) prompts for one-take Agent processing.
 */
export const SHOT_DIRECTION_BEAT_CHUNK = 1
export const SHOT_DIRECTION_CONTINUITY_BOUND_DEFAULT = true

/**
 * Parallel single-shot optimizations for one scene.
 * Wider than stills and clips because this is text generation.
 * Override with SHOT_DIRECTION_TEXT_CONCURRENCY.
 */
export const DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY = 8

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
  'startFrame',
  'clipAction',
  'endFrame',
  'blocking',
  'gaze',
  'emotion',
  'propInteraction',
  'lightingAccent',
  'cameraMovement',
  'audioCue',
  'voiceDirection',
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
 * Builds the bound continuity snapshot for a beat so the Still Director aligns
 * its direction with the shot's existing Cast, Wardrobes, Location/Set Version,
 * and Props by default rather than inventing unbound continuity changes.
 */
export function buildBeatBoundContinuity(args: {
  scene: Record<string, unknown> | undefined
  beat: SceneBeat
  sceneIdx?: number
  characters?: Array<Record<string, any>>
  locationReferences?: Array<Record<string, any>>
  objectReferences?: Array<Record<string, any>>
}): StillDirectorBoundContinuity | undefined {
  const characters = Array.isArray(args.characters) ? args.characters : []
  const locationReferences = Array.isArray(args.locationReferences)
    ? (args.locationReferences as LocationReference[])
    : []
  const objectReferences = Array.isArray(args.objectReferences)
    ? (args.objectReferences as VisualReference[])
    : []
  if (
    characters.length === 0 &&
    locationReferences.length === 0 &&
    objectReferences.length === 0
  ) {
    return undefined
  }
  const sceneObj = args.scene ?? {}
  const resolved = resolveBeatElementSelection({
    scene: sceneObj,
    beat: args.beat,
    sceneIndex: args.sceneIdx,
    projectCharacters: characters as any,
    locationReferences,
    objectReferences,
  })
  const castNames: string[] = []
  const wardrobes: NonNullable<StillDirectorBoundContinuity['wardrobes']> = []
  for (const charId of resolved.characterIds) {
    const charObj = characters.find(
      (c) => (c.id || c.name) === charId || String(c.name || '').trim() === charId
    )
    if (!charObj) continue
    const charName = String(charObj.name || '').trim()
    if (!charName) continue
    castNames.push(charName)
    const w = resolveWardrobeForCharacter(
      charObj,
      sceneObj,
      resolved.characterWardrobes,
      args.sceneIdx
    )
    if (w) {
      const wName = typeof w.name === 'string' && w.name.trim() ? w.name.trim() : 'Wardrobe'
      const wDesc = [
        typeof w.description === 'string' ? w.description.trim() : '',
        typeof w.accessories === 'string' ? w.accessories.trim() : '',
        typeof w.appearanceNotes === 'string' ? w.appearanceNotes.trim() : '',
      ]
        .filter(Boolean)
        .join('; ')
      wardrobes.push({
        characterName: charName,
        wardrobeName: wName,
        ...(wDesc ? { description: wDesc } : {}),
      })
    } else if (typeof charObj.defaultWardrobe === 'string' && charObj.defaultWardrobe.trim()) {
      wardrobes.push({
        characterName: charName,
        wardrobeName: 'Default Wardrobe',
        description: charObj.defaultWardrobe.trim(),
      })
    }
  }

  let location: StillDirectorBoundContinuity['location']
  if (resolved.locationRefId) {
    const locObj = locationReferences.find((l) => l.id === resolved.locationRefId)
    if (locObj) {
      const verObj = resolved.locationVersionId
        ? locObj.versions?.find((v) => v.id === resolved.locationVersionId)
        : undefined
      const locName =
        locObj.location?.trim() || locObj.locationDisplay?.trim() || 'Connected Location'
      const locDesc = [
        locObj.description?.trim(),
        verObj?.stateNotes?.trim() || verObj?.description?.trim(),
      ]
        .filter(Boolean)
        .join(' — ')
      location = {
        name: locName,
        ...(verObj?.name?.trim() ? { versionName: verObj.name.trim() } : {}),
        ...(locDesc ? { description: locDesc } : {}),
      }
    }
  }

  const propNames = resolved.objectRefIds
    .map((id) => objectReferences.find((o) => o.id === id)?.name?.trim())
    .filter((name): name is string => Boolean(name))

  return {
    ...(castNames.length > 0 ? { castNames } : {}),
    ...(wardrobes.length > 0 ? { wardrobes } : {}),
    ...(location ? { location } : {}),
    propNames,
  }
}

/**
 * Ask the Still Director for every eligible shot in a scene, a few beats per
 * call and several calls at once. One scene at a time is the caller's job.
 */
export async function runShotDirectionChunks(args: {
  scene: Record<string, unknown>
  sceneIdx?: number
  catalog?: BeatSequenceReferenceCatalog
  characters?: Array<Record<string, any>>
  locationReferences?: Array<Record<string, any>>
  objectReferences?: Array<Record<string, any>>
  allowUnboundReferences?: boolean
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
      ...(args.allowUnboundReferences !== undefined
        ? { allowUnboundReferences: args.allowUnboundReferences }
        : {}),
      ...(sceneContext ? { sceneContext } : {}),
      beats: chunk.map(({ beat, beatIndex }) => {
        const boundContinuity = buildBeatBoundContinuity({
          scene: args.scene,
          beat,
          sceneIdx: args.sceneIdx,
          characters: args.characters,
          locationReferences: args.locationReferences,
          objectReferences: args.objectReferences,
        })
        return {
          beatIndex,
          beat,
          ...(boundContinuity ? { boundContinuity } : {}),
          previousMoment:
            beatIndex > 0 ? composeBeatActionFraming(beats[beatIndex - 1]) : undefined,
          nextMoment:
            beatIndex + 1 < beats.length
              ? composeBeatActionFraming(beats[beatIndex + 1])
              : undefined,
        }
      }),
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

  collected.sort((a, b) => a.beatIndex - b.beatIndex)
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
  /**
   * When false/omitted (default), preserves each beat's bound continuity references
   * (only pruning off-camera characters) rather than wiping `referenceSelection`
   * via `freshBeatReferenceSelection`.
   */
  allowUnboundReferences?: boolean
}): { scenes: any[]; optimized: number; skipped: number } {
  let scenes = Array.isArray(args.scenes) ? args.scenes : []
  let optimized = 0
  let skipped = 0
  if (!scenes[args.sceneIdx]) return { scenes, optimized, skipped }
  const allowUnbound = args.allowUnboundReferences === true

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
      beatDirection: directionFromDirectorPatch(current.beatDirection, entry.patch, args.characters),
    }
    const referenceSelection = allowUnbound
      ? freshBeatReferenceSelection({
          scene,
          beat: directed,
          sceneIdx: args.sceneIdx,
          characters: args.characters,
          locationReferences: args.locationReferences,
          objectReferences: args.objectReferences,
        })
      : boundBeatReferenceSelection({
          scene,
          beat: current,
          directedBeat: directed,
          sceneIdx: args.sceneIdx,
          characters: args.characters,
          locationReferences: args.locationReferences,
          objectReferences: args.objectReferences,
        })
    scenes = saveDirectorPatchToScenes({
      scenes,
      sceneIdx: args.sceneIdx,
      beatId: current.beatId,
      patch: entry.patch,
      generatedBy: 'director',
      referenceSelection,
      characters: args.characters,
      objectReferences: args.objectReferences,
      promptComposition: args.promptComposition,
      allowUnboundReferences: allowUnbound,
    })
    optimized += 1
  }

  return { scenes, optimized, skipped }
}
