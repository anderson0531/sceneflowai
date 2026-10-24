import { applyBeatsToScene, getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type {
  BeatDirection,
  BeatReferenceSelection,
  SceneBeat,
} from '@/lib/script/segmentTypes'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import { refreshSceneSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import { restampPreVisHashIfScriptCurrent } from '@/lib/storyboard/preVisSync'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import { resolveBeatElementSelection } from '@/lib/vision/resolveBeatVideoReferences'
import { shouldUseExplicitBeatReferences } from '@/lib/vision/beatFrameGenerationContext'
import { alignDirectionToConnectedObjects } from '@/lib/vision/beatReferenceConnections'
import {
  findMatchingLocationReferences,
  resolveSceneNumberForLocationMatch,
  type LocationReferenceMatchable,
} from '@/lib/vision/frameGenerationContext'
import { resolveLocationVersionForBeat } from '@/lib/vision/locationVersionResolve'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

type ContinuityLocationReference = LocationReferenceMatchable & {
  versions?: LocationReference['versions']
}

export interface BeatPromptComposition {
  artStyleAnchor?: string
  lookbook?: ProjectLookbook
}

export type BeatPromptRefresh = 'recompute' | 'keep' | 'rebuild'

export function stripPromptOverrides(direction: BeatDirection | undefined): BeatDirection | undefined {
  if (!direction) return undefined
  const next = { ...direction }
  delete next.framePrompt
  delete next.videoPrompt
  return next
}

export function selectionFromBeat(
  beat: SceneBeat,
  resolved: ReturnType<typeof resolveBeatElementSelection>
): BeatReferenceSelection {
  if (shouldUseExplicitBeatReferences(beat)) return beat.referenceSelection
  return {
    characterIds: resolved.characterIds,
    objectRefIds: resolved.objectRefIds,
    locationRefId: resolved.locationRefId ?? null,
    locationVersionId: resolved.locationVersionId ?? null,
    characterWardrobes: resolved.characterWardrobes,
    source: 'auto',
  }
}

export function resolveBeatReferenceSelection(args: {
  scene: Record<string, unknown> | undefined
  beat: SceneBeat
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: Array<{ id: string }>
  objectReferences: Array<{ id: string; name: string }>
}): BeatReferenceSelection {
  const resolved = resolveBeatElementSelection({
    scene: args.scene ?? {},
    beat: args.beat,
    sceneIndex: args.sceneIdx,
    projectCharacters: args.characters,
    locationReferences: args.locationReferences as LocationReference[],
    objectReferences: args.objectReferences as VisualReference[],
  })
  return selectionFromBeat(args.beat, resolved)
}

function trimmedId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const trimmed = trimmedId(id)
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

/**
 * Location plate for this shot, including a library row that has no image yet.
 * Frame generation still ignores undrawn files. The Continuity list must not:
 * storing `null` here later marks the plan complete and drops the row.
 */
function continuityLocationSelection(args: {
  scene: Record<string, unknown>
  beat: SceneBeat
  sceneIdx: number
  locationReferences: ContinuityLocationReference[]
  resolvedLocationRefId?: string | null
  resolvedLocationVersionId?: string | null
}): { locationRefId: string | null; locationVersionId: string | null } {
  const matches = findMatchingLocationReferences(
    args.scene,
    args.locationReferences,
    args.sceneIdx,
    { includeWithoutImages: true }
  )
  const matchedId = trimmedId(matches[0]?.id)
  const resolvedId = trimmedId(args.resolvedLocationRefId)
  const locationRefId = matchedId || resolvedId || null
  if (!locationRefId) return { locationRefId: null, locationVersionId: null }
  if (locationRefId === resolvedId) {
    return {
      locationRefId,
      locationVersionId: args.resolvedLocationVersionId ?? null,
    }
  }

  const ref = args.locationReferences.find((entry) => entry.id === locationRefId)
  const beats = getSceneBeats(args.scene)
  const beatIndex = Math.max(
    0,
    beats.findIndex((entry) => entry.beatId === args.beat.beatId)
  )
  const sceneNumber =
    resolveSceneNumberForLocationMatch(args.scene, args.sceneIdx) ?? args.sceneIdx + 1
  const version = ref
    ? resolveLocationVersionForBeat(ref, {
        sceneNumber,
        beatIndex,
        beatId: args.beat.beatId,
      })
    : null
  return { locationRefId, locationVersionId: version?.id ?? null }
}

/**
 * Plates the current scene and shot direction ask for.
 * A saved selection is ignored so Direct Shot can replace that shot's list.
 * Location matching includes plates that have not been drawn yet.
 */
export function freshBeatReferenceSelection(args: {
  scene: Record<string, unknown> | undefined
  beat: SceneBeat
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: ContinuityLocationReference[]
  objectReferences: Array<{ id: string; name: string }>
  resolvedAt?: string
}): BeatReferenceSelection {
  const scene = args.scene ?? {}
  const unlocked: SceneBeat = { ...args.beat }
  delete unlocked.referenceSelection
  const resolved = resolveBeatElementSelection({
    scene,
    beat: unlocked,
    sceneIndex: args.sceneIdx,
    projectCharacters: args.characters,
    locationReferences: args.locationReferences as LocationReference[],
    objectReferences: args.objectReferences as VisualReference[],
  })
  const location = continuityLocationSelection({
    scene,
    beat: unlocked,
    sceneIdx: args.sceneIdx,
    locationReferences: args.locationReferences,
    resolvedLocationRefId: resolved.locationRefId,
    resolvedLocationVersionId: resolved.locationVersionId,
  })
  return {
    characterIds: resolved.characterIds,
    objectRefIds: resolved.objectRefIds,
    locationRefId: location.locationRefId,
    locationVersionId: location.locationVersionId,
    characterWardrobes: resolved.characterWardrobes,
    source: 'user',
    resolvedAt: args.resolvedAt ?? new Date().toISOString(),
  }
}

/** Keep plates already on the shot and add the ones the current direction names. */
function unionBeatReferenceSelection(
  previous: BeatReferenceSelection | undefined,
  fresh: BeatReferenceSelection
): BeatReferenceSelection {
  const freshLocation = trimmedId(fresh.locationRefId)
  const previousLocation = trimmedId(previous?.locationRefId)
  const wardrobeSeen = new Set<string>()
  const characterWardrobes: Array<{ characterId: string; wardrobeId: string }> = []
  for (const entry of [...(previous?.characterWardrobes ?? []), ...(fresh.characterWardrobes ?? [])]) {
    const characterId = trimmedId(entry?.characterId)
    const wardrobeId = trimmedId(entry?.wardrobeId)
    if (!characterId || !wardrobeId) continue
    const key = `${characterId}::${wardrobeId}`
    if (wardrobeSeen.has(key)) continue
    wardrobeSeen.add(key)
    characterWardrobes.push({ characterId, wardrobeId })
  }
  return {
    characterIds: uniqueIds([...(previous?.characterIds ?? []), ...fresh.characterIds]),
    objectRefIds: uniqueIds([...(previous?.objectRefIds ?? []), ...fresh.objectRefIds]),
    characterWardrobes,
    locationRefId: freshLocation || previousLocation || null,
    locationVersionId: freshLocation
      ? (fresh.locationVersionId ?? null)
      : (previous?.locationVersionId ?? null),
    source: 'user',
    resolvedAt: fresh.resolvedAt,
  }
}

/** Add the plates the current direction needs. Plates already on a shot stay. */
export function syncSceneReferenceSelections(args: {
  scenes: any[]
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: ContinuityLocationReference[]
  objectReferences: Array<{ id: string; name: string }>
  resolvedAt?: string
}): any[] {
  if (!Array.isArray(args.scenes) || !args.scenes[args.sceneIdx]) return args.scenes
  const scene = args.scenes[args.sceneIdx]
  const beats = getSceneBeats(scene).map((beat) => {
    if (isBeatExcluded(beat)) return beat
    return {
      ...beat,
      referenceSelection: unionBeatReferenceSelection(
        beat.referenceSelection,
        freshBeatReferenceSelection({
          scene,
          beat,
          sceneIdx: args.sceneIdx,
          characters: args.characters,
          locationReferences: args.locationReferences,
          objectReferences: args.objectReferences,
          resolvedAt: args.resolvedAt,
        })
      ),
    }
  })
  const updated = [...args.scenes]
  updated[args.sceneIdx] = applyBeatsToScene({ ...scene }, beats)
  return updated
}

/** Merges a Direct Shot preview patch over the beat's saved direction. */
export function directionFromDirectorPatch(
  direction: BeatDirection | undefined,
  patch: StillDirectorPatch
): BeatDirection {
  const next: BeatDirection = { ...(direction ?? {}) }
  const textKeys = [
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
  for (const key of textKeys) {
    const value = patch[key]?.trim()
    if (value) next[key] = value
  }
  if (!next.frozenMoment?.trim() && patch.actionFraming?.trim()) {
    next.frozenMoment = patch.actionFraming.trim()
  }
  if (Array.isArray(patch.castInFrame)) next.castInFrame = patch.castInFrame
  if (patch.keyProps && patch.keyProps.length > 0) next.keyProps = patch.keyProps
  if (patch.transition) next.transition = patch.transition
  return next
}

/** Writes one beat's direction and refreshes its still and clip prompts. Returns the new scenes array. */
export function applyBeatDirectionToScenes(args: {
  scenes: any[]
  sceneIdx: number
  beatId: string
  direction: BeatDirection | undefined
  refreshPrompts?: BeatPromptRefresh
  referenceSelection?: BeatReferenceSelection | null
  actionDescription?: string
  promptComposition?: BeatPromptComposition
  /** Direct Shot saves as the user. The shot-direction pass stamps the director. */
  generatedBy?: 'user' | 'director'
}): any[] {
  const { scenes, sceneIdx, beatId, direction: next, promptComposition } = args
  const refreshPrompts = args.refreshPrompts ?? 'keep'
  const keptFrame = refreshPrompts === 'keep' ? next?.framePrompt?.trim() : ''
  const updatedScenes = [...scenes]
  const scene = { ...updatedScenes[sceneIdx] }
  const beats = getSceneBeats(scene).map((entry) => {
    if (entry.beatId !== beatId) return entry
    const patched: SceneBeat = { ...entry }
    const actionDescription = args.actionDescription?.trim()
    if (actionDescription) patched.actionDescription = actionDescription
    const directionForSave = refreshPrompts === 'keep' ? next : stripPromptOverrides(next)
    if (directionForSave && Object.keys(directionForSave).length > 0) {
      patched.beatDirection = {
        ...directionForSave,
        generatedBy: args.generatedBy ?? 'user',
        updatedAt: new Date().toISOString(),
      }
    } else {
      delete patched.beatDirection
    }
    if (args.referenceSelection !== undefined) {
      if (args.referenceSelection) patched.referenceSelection = args.referenceSelection
      else delete patched.referenceSelection
    }
    return syncBeatStillPromptToDirection(patched, {
      sceneIndex: sceneIdx,
      artStyleAnchor: promptComposition?.artStyleAnchor,
      lookbook: promptComposition?.lookbook,
      force: refreshPrompts === 'recompute' || refreshPrompts === 'rebuild',
    })
  })
  const edited = beats.find((entry) => entry.beatId === beatId)
  let withBeats = applyBeatsToScene(scene, beats)
  if (edited) {
    withBeats = refreshSceneSegmentVideoPrompts(withBeats, edited, {
      artStyleId: promptComposition?.artStyleAnchor,
    })
  }
  if (keptFrame) {
    const restored = getSceneBeats(withBeats).map((entry) => {
      if (entry.beatId !== beatId) return entry
      const beatDirection = entry.beatDirection
        ? { ...entry.beatDirection, framePrompt: keptFrame }
        : entry.beatDirection
      return {
        ...entry,
        beatDirection,
        storyboardImagePrompt: keptFrame,
        storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(beatDirection),
      }
    })
    withBeats = applyBeatsToScene(withBeats, restored)
  }
  if (refreshPrompts === 'recompute' && edited?.beatDirection) {
    const segments = Array.isArray(withBeats.segments)
      ? (withBeats.segments as Array<{
          beatId?: string
          videoPrompt?: string | null
          userEditedPrompt?: string | null
        }>)
      : []
    const segment = segments.find(
      (row) =>
        row.beatId === beatId &&
        !(typeof row.userEditedPrompt === 'string' && row.userEditedPrompt.trim())
    )
    const framePrompt = edited.storyboardImagePrompt?.trim()
    const videoPrompt = segment?.videoPrompt?.trim()
    if (framePrompt || videoPrompt) {
      const storedBeats = getSceneBeats(withBeats).map((entry) => {
        if (entry.beatId !== beatId || !entry.beatDirection) return entry
        return {
          ...entry,
          beatDirection: {
            ...entry.beatDirection,
            ...(framePrompt ? { framePrompt } : {}),
            ...(videoPrompt ? { videoPrompt } : {}),
          },
        }
      })
      withBeats = applyBeatsToScene(withBeats, storedBeats)
    }
  }
  updatedScenes[sceneIdx] = restampPreVisHashIfScriptCurrent(scene, withBeats)
  return updatedScenes
}

/** The Direct Shot save: merge the patch, align to connected objects, recompute prompts. */
export function saveDirectorPatchToScenes(args: {
  scenes: any[]
  sceneIdx: number
  beatId: string
  patch: StillDirectorPatch
  referenceSelection: BeatReferenceSelection
  objectReferences: Array<{ id: string; name: string }>
  promptComposition?: BeatPromptComposition
  generatedBy?: 'user' | 'director'
}): any[] {
  const beat = getSceneBeats(args.scenes[args.sceneIdx] ?? {}).find(
    (entry) => entry.beatId === args.beatId
  )
  if (!beat) return args.scenes
  const merged = directionFromDirectorPatch(beat.beatDirection, args.patch)
  const objectNames = args.referenceSelection.objectRefIds
    .map((id) => args.objectReferences.find((object) => object.id === id)?.name?.trim())
    .filter((name): name is string => !!name)
  return applyBeatDirectionToScenes({
    scenes: args.scenes,
    sceneIdx: args.sceneIdx,
    beatId: args.beatId,
    direction: alignDirectionToConnectedObjects(merged, objectNames) ?? merged,
    refreshPrompts: 'recompute',
    actionDescription: args.patch.actionDescription,
    referenceSelection: args.referenceSelection,
    promptComposition: args.promptComposition,
    generatedBy: args.generatedBy,
  })
}
