import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
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
import type { LocationReference, VisualReference } from '@/types/visionReferences'

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
        generatedBy: 'user',
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
    promptComposition: args.promptComposition,
  })
}
