import { applyBeatsToScene, getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type {
  BeatDirection,
  BeatReferenceSelection,
  SceneBeat,
} from '@/lib/script/segmentTypes'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  composeBeatAudioDirection,
  syncBeatAudioDirectionToDirection,
  syncSceneAudioDirectionForBeat,
} from '@/lib/audio/syncBeatAudioDirection'
import { refreshSceneSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import { restampPreVisHashIfScriptCurrent } from '@/lib/storyboard/preVisSync'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import { resolveBeatElementSelection } from '@/lib/vision/resolveBeatVideoReferences'
import {
  directedCastForBeat,
  shouldUseExplicitBeatReferences,
} from '@/lib/vision/beatFrameGenerationContext'
import { detectCharactersInText } from '@/lib/scene/characterDetection'
import { alignDirectionToConnectedObjects } from '@/lib/vision/beatReferenceConnections'
import { matchObjectsBySelectedNames } from '@/lib/character/matching'
import { extractLocationCanonicalScale } from '@/lib/imagen/locationScaleClause'
import { extractPropScalePhrase } from '@/lib/imagen/propScaleClause'
import {
  findLocationReferencesAssignedToScene,
  findMatchingLocationReferences,
  resolveSceneNumberForLocationMatch,
} from '@/lib/vision/frameGenerationContext'
import { isLocationResidentInstrumentName } from '@/lib/vision/locationResidentInstruments'
import {
  appendDirectedLocationVersion,
  dedupeStateNoteClauses,
  notesCoverState,
  stampLocationVersionAppliesFrom,
} from '@/lib/vision/locationScriptSync'
import {
  extractLocationStateHitsFromScene,
  type LocationAnalysisSceneInput,
} from '@/lib/vision/locationStateAnalysis'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

export interface BeatPromptComposition {
  artStyleAnchor?: string
  lookbook?: ProjectLookbook
}

export type BeatPromptRefresh = 'recompute' | 'keep' | 'rebuild'

export function stripPromptOverrides(direction: BeatDirection | undefined): BeatDirection | undefined {
  if (!direction) return undefined
  const next = { ...direction }
  delete next.audioDirection
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

/**
 * Plates for the direction this shot has now.
 * A saved user selection is ignored so Update references and a new Direct
 * Shot optimize can replace the previous wardrobe, location, and props.
 */
export function freshBeatReferenceSelection(args: {
  scene: Record<string, unknown> | undefined
  beat: SceneBeat
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: Array<{ id: string }>
  objectReferences: Array<{ id: string; name: string }>
  resolvedAt?: string
}): BeatReferenceSelection {
  const unlocked: SceneBeat = { ...args.beat }
  delete unlocked.referenceSelection
  const resolved = resolveBeatElementSelection({
    scene: args.scene ?? {},
    beat: unlocked,
    sceneIndex: args.sceneIdx,
    projectCharacters: args.characters,
    locationReferences: args.locationReferences as LocationReference[],
    objectReferences: args.objectReferences as VisualReference[],
  })
  return {
    characterIds: resolved.characterIds,
    objectRefIds: resolved.objectRefIds,
    locationRefId: resolved.locationRefId ?? null,
    locationVersionId: resolved.locationVersionId ?? null,
    characterWardrobes: resolved.characterWardrobes,
    source: 'user',
    resolvedAt: args.resolvedAt ?? new Date().toISOString(),
  }
}

/** Rewrite every shootable shot's plates from the current scene and shot direction. */
export function syncSceneReferenceSelections(args: {
  scenes: any[]
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: Array<{ id: string }>
  objectReferences: Array<{ id: string; name: string }>
  resolvedAt?: string
}): any[] {
  if (!Array.isArray(args.scenes) || !args.scenes[args.sceneIdx]) return args.scenes
  const scene = args.scenes[args.sceneIdx]
  const beats = getSceneBeats(scene).map((beat) => {
    if (isBeatExcluded(beat)) return beat
    return {
      ...beat,
      referenceSelection: freshBeatReferenceSelection({
        scene,
        beat,
        sceneIdx: args.sceneIdx,
        characters: args.characters,
        locationReferences: args.locationReferences,
        objectReferences: args.objectReferences,
        resolvedAt: args.resolvedAt,
      }),
    }
  })
  const updated = [...args.scenes]
  updated[args.sceneIdx] = applyBeatsToScene({ ...scene }, beats)
  return updated
}

export interface SyncSceneDirectionToContinuityResult {
  scenes: any[]
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  locationsChanged: boolean
  objectsChanged: boolean
}

/**
 * Syncs scene direction and shot direction into the project's Continuity Library
 * (creating/updating setting-change LocationVersions, extracting canonical scale
 * anchors, and creating missing directed keyProps) before re-resolving beat
 * reference selections for the scene.
 */
export function syncSceneDirectionToContinuityCatalog(args: {
  scenes: any[]
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  resolvedAt?: string
}): SyncSceneDirectionToContinuityResult {
  const now = args.resolvedAt ?? new Date().toISOString()
  if (!Array.isArray(args.scenes) || !args.scenes[args.sceneIdx]) {
    return {
      scenes: args.scenes,
      locationReferences: args.locationReferences,
      objectReferences: args.objectReferences,
      locationsChanged: false,
      objectsChanged: false,
    }
  }

  const scene = args.scenes[args.sceneIdx]
  const sceneNumber = resolveSceneNumberForLocationMatch(scene, args.sceneIdx)
  let nextLocations = [...args.locationReferences]
  let nextObjects = [...args.objectReferences]
  let locationsChanged = false
  let objectsChanged = false

  // 1. Sync location scale & setting-change versions from Scene Direction + Shot Direction
  const assignedLocs = findLocationReferencesAssignedToScene(nextLocations, sceneNumber, {
    includeWithoutImages: true,
  })
  const matchedLocs =
    assignedLocs.length > 0
      ? assignedLocs
      : findMatchingLocationReferences(
          typeof scene.heading === 'string'
            ? scene.heading
            : (scene.heading as { text?: string } | undefined)?.text || '',
          nextLocations
        )
  const primaryLoc = matchedLocs[0]
  if (primaryLoc) {
    const locIdx = nextLocations.findIndex((l) => l.id === primaryLoc.id)
    if (locIdx >= 0) {
      let updatedLoc: LocationReference = { ...nextLocations[locIdx] }

      const sceneDir = scene.sceneDirection as Record<string, any> | undefined
      const dirSettingText = [
        typeof scene.locationDescription === 'string' ? scene.locationDescription : '',
        typeof scene.visualDescription === 'string' ? scene.visualDescription : '',
        typeof sceneDir?.scene?.locationDescription === 'string'
          ? sceneDir.scene.locationDescription
          : '',
        typeof sceneDir?.scene?.setting === 'string' ? sceneDir.scene.setting : '',
        typeof sceneDir?.locationDescription === 'string' ? sceneDir.locationDescription : '',
      ]
        .filter(Boolean)
        .join(' ')

      if (dirSettingText.trim()) {
        const extractedScale = extractLocationCanonicalScale(
          [updatedLoc.description, dirSettingText].filter(Boolean).join(' '),
          updatedLoc.location || updatedLoc.locationDisplay,
          updatedLoc.canonicalScale
        )
        const prevScale = updatedLoc.canonicalScale
        if (
          (extractedScale.ceilingHeightFt && !prevScale?.ceilingHeightFt) ||
          (extractedScale.doorHeightFt && !prevScale?.doorHeightFt) ||
          (extractedScale.fixtureHeights && !prevScale?.fixtureHeights)
        ) {
          updatedLoc = {
            ...updatedLoc,
            canonicalScale: {
              ...prevScale,
              ...(extractedScale.ceilingHeightFt ? { ceilingHeightFt: extractedScale.ceilingHeightFt } : {}),
              ...(extractedScale.doorHeightFt ? { doorHeightFt: extractedScale.doorHeightFt } : {}),
              ...(extractedScale.fixtureHeights ? { fixtureHeights: extractedScale.fixtureHeights } : {}),
            },
          }
          locationsChanged = true
        }
      }

      const shootableBeats = getSceneBeats(scene).filter((b) => !isBeatExcluded(b))
      const analysisInput: LocationAnalysisSceneInput = {
        sceneNumber,
        heading:
          typeof scene.heading === 'string'
            ? scene.heading
            : (scene.heading as { text?: string } | undefined)?.text,
        action: typeof scene.action === 'string' ? scene.action : undefined,
        visualDescription:
          typeof scene.visualDescription === 'string' ? scene.visualDescription : undefined,
        locationDescription: dirSettingText || updatedLoc.description,
        beats: shootableBeats.map((b) => ({
          beatId: b.beatId,
          kind: b.kind,
          actionDescription: b.actionDescription,
          description: b.description,
          action: b.action,
          line: b.line,
          frozenMoment: b.beatDirection?.frozenMoment,
          propInteraction: b.beatDirection?.propInteraction,
          lightingAccent: b.beatDirection?.lightingAccent,
          blocking: b.beatDirection?.blocking,
        })),
      }

      const hits = extractLocationStateHitsFromScene(analysisInput)
      for (const hit of hits) {
        const versions = updatedLoc.versions ?? []
        const exactBeatVer = versions.find(
          (v) =>
            v.appliesFrom?.sceneNumber === hit.sceneNumber &&
            v.appliesFrom?.beatIndex === hit.beatIndex
        )
        const sceneCoveringVer = versions.find(
          (v) =>
            (v.sceneNumbers?.includes(hit.sceneNumber) ||
              v.appliesFrom?.sceneNumber === hit.sceneNumber) &&
            notesCoverState(v.stateNotes || '', hit.notes)
        )

        if (sceneCoveringVer) {
          if (!sceneCoveringVer.appliesFrom) {
            updatedLoc = stampLocationVersionAppliesFrom(updatedLoc, sceneCoveringVer.id, {
              sceneNumber: hit.sceneNumber,
              beatIndex: hit.beatIndex,
              beatId: hit.beatId,
            })
            locationsChanged = true
          }
          continue
        }

        if (exactBeatVer) {
          if (
            !exactBeatVer.imageUrl?.trim() &&
            !notesCoverState(exactBeatVer.stateNotes || '', hit.notes)
          ) {
            const mergedNotes = exactBeatVer.stateNotes?.trim()
              ? dedupeStateNoteClauses(`${exactBeatVer.stateNotes}; ${hit.notes}`)
              : dedupeStateNoteClauses(hit.notes)
            updatedLoc = {
              ...updatedLoc,
              versions: (updatedLoc.versions ?? []).map((v) =>
                v.id === exactBeatVer.id
                  ? { ...v, stateNotes: mergedNotes, needsImageRegen: true }
                  : v
              ),
            }
            locationsChanged = true
          }
          continue
        }

        const appended = appendDirectedLocationVersion(
          updatedLoc,
          {
            name: `Scene ${hit.sceneNumber}, Shot ${hit.beatIndex + 1} — Set change`,
            stateNotes: hit.notes,
            appliesFrom: {
              sceneNumber: hit.sceneNumber,
              beatIndex: hit.beatIndex,
              beatId: hit.beatId,
            },
          },
          { now, versionId: `loc-ver-dir-${Date.now()}-${hit.beatIndex}` }
        )
        updatedLoc = appended.location
        locationsChanged = true
      }

      if (locationsChanged) {
        nextLocations[locIdx] = updatedLoc
      }
    }
  }

  // 2. Sync directed keyProps from Scene Direction into objectReferences
  // (Only fall back to beatDirection.keyProps when Scene Direction has no keyProps yet,
  // so re-running Shot Direction Agent does not invent duplicate un-drawn prop rows.)
  const sceneDir = scene.sceneDirection as Record<string, any> | undefined
  const scenePropCandidates: string[] = [
    ...(Array.isArray(sceneDir?.scene?.keyProps) ? sceneDir.scene.keyProps : []),
    ...(Array.isArray(sceneDir?.keyProps) ? sceneDir.keyProps : []),
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
  const rawPropCandidates: string[] =
    scenePropCandidates.length > 0
      ? scenePropCandidates
      : getSceneBeats(scene)
          .filter((b) => !isBeatExcluded(b))
          .flatMap((b) => (Array.isArray(b.beatDirection?.keyProps) ? b.beatDirection.keyProps : []))
          .map((p) => (typeof p === 'string' ? p.trim() : ''))
          .filter(Boolean)

  const filteredProps = primaryLoc
    ? rawPropCandidates.filter((p) => !isLocationResidentInstrumentName(p))
    : rawPropCandidates

  for (let i = 0; i < filteredProps.length; i++) {
    const propName = filteredProps[i]
    if (!propName) continue
    const existingMatch = matchObjectsBySelectedNames([propName], nextObjects)
    if (existingMatch.length > 0) continue

    const extractedScale = extractPropScalePhrase(propName)
    const newObj: VisualReference = {
      id: `obj-dir-${Date.now()}-${i}`,
      type: 'object',
      name: propName,
      description: propName,
      ...(extractedScale ? { dimensions: extractedScale } : {}),
      imageUrl: '',
      category: 'prop',
      importance: 'important',
      sceneNumbers: [sceneNumber],
      createdAt: now,
    }
    nextObjects.push(newObj)
    objectsChanged = true
  }

  // 3. Re-resolve all shootable beat referenceSelections against the updated catalog
  const updatedScenes = syncSceneReferenceSelections({
    scenes: args.scenes,
    sceneIdx: args.sceneIdx,
    characters: args.characters,
    locationReferences: nextLocations,
    objectReferences: nextObjects,
    resolvedAt: now,
  })

  return {
    scenes: updatedScenes,
    locationReferences: nextLocations,
    objectReferences: nextObjects,
    locationsChanged,
    objectsChanged,
  }
}

/** Merges a Direct Shot preview patch over the beat's saved direction. */
export function directionFromDirectorPatch(
  direction: BeatDirection | undefined,
  patch: StillDirectorPatch,
  characters?: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
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

  // If the new patch explicitly names a second library character in its visual
  // staging (frozenMoment / actionFraming / blocking / gaze) on a non-empty-cast
  // shot, include that character in castInFrame so their reference plate attaches.
  const explicitEmptyCast =
    (Array.isArray(patch.castInFrame) && patch.castInFrame.length === 0) ||
    (Array.isArray(next.castInFrame) && next.castInFrame.length === 0 && !patch.castInFrame)
  if (!explicitEmptyCast && characters && characters.length > 0) {
    const patchStagingText = [
      patch.frozenMoment,
      patch.actionFraming,
      patch.blocking,
      patch.gaze,
    ]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
    if (patchStagingText.trim()) {
      const detected = detectCharactersInText(
        patchStagingText,
        characters.filter((c) => c.type !== 'narrator')
      )
      if (detected.length > 0) {
        const currentCast = Array.isArray(next.castInFrame) ? [...next.castInFrame] : []
        for (const char of detected) {
          const name = char.name?.trim()
          if (!name) continue
          const alreadyListed = currentCast.some(
            (existing) => existing.trim().toLowerCase() === name.toLowerCase()
          )
          if (!alreadyListed) {
            currentCast.push(name)
          }
        }
        if (currentCast.length > 0) {
          next.castInFrame = currentCast
        }
      }
    }
  }

  return next
}

function applyBeatDirectionToOneScene(args: {
  scenes: any[]
  sceneIdx: number
  beatId: string
  direction: BeatDirection | undefined
  refreshPrompts?: BeatPromptRefresh
  referenceSelection?: BeatReferenceSelection | null
  actionDescription?: string
  voiceDirection?: string
  promptComposition?: BeatPromptComposition
  generatedBy?: 'user' | 'director'
}): any[] {
  const { scenes, sceneIdx, beatId, direction: next, promptComposition } = args
  if (!scenes[sceneIdx]) return scenes
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
    const withAudio = syncBeatAudioDirectionToDirection(patched, {
      previousBeat: entry,
      voiceDirection: args.voiceDirection,
      force: refreshPrompts === 'recompute' || refreshPrompts === 'rebuild',
    })
    return syncBeatStillPromptToDirection(withAudio, {
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
    withBeats = syncSceneAudioDirectionForBeat(withBeats, edited, scene)
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
    const audioDirection =
      edited.beatDirection.audioDirection?.trim() || composeBeatAudioDirection(edited).trim()
    const framePrompt = edited.storyboardImagePrompt?.trim()
    const videoPrompt = segment?.videoPrompt?.trim()
    if (audioDirection || framePrompt || videoPrompt) {
      const storedBeats = getSceneBeats(withBeats).map((entry) => {
        if (entry.beatId !== beatId || !entry.beatDirection) return entry
        return {
          ...entry,
          beatDirection: {
            ...entry.beatDirection,
            ...(audioDirection ? { audioDirection } : {}),
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

/**
 * Writes one beat's direction and refreshes its audio, still, and clip directions.
 * When the beat is a shared Promo shot (or is referenced by a Promo scene),
 * synchronizes both the source scene beat and the Promo scene beat.
 */
export function applyBeatDirectionToScenes(args: {
  scenes: any[]
  sceneIdx: number
  beatId: string
  direction: BeatDirection | undefined
  refreshPrompts?: BeatPromptRefresh
  referenceSelection?: BeatReferenceSelection | null
  actionDescription?: string
  voiceDirection?: string
  promptComposition?: BeatPromptComposition
  /** Direct Shot saves as the user. The shot-direction pass stamps the director. */
  generatedBy?: 'user' | 'director'
}): any[] {
  const targetBeat = getSceneBeats(args.scenes[args.sceneIdx] ?? {}).find(
    (entry) => entry.beatId === args.beatId
  ) as (SceneBeat & { sourceSceneIndex?: number; sourceBeatId?: string }) | undefined

  let updatedScenes = applyBeatDirectionToOneScene(args)

  const canonicalSourceSceneIdx =
    typeof targetBeat?.sourceSceneIndex === 'number' &&
    targetBeat.sourceSceneIndex >= 0 &&
    Boolean(targetBeat.sourceBeatId)
      ? targetBeat.sourceSceneIndex
      : args.sceneIdx
  const canonicalSourceBeatId =
    typeof targetBeat?.sourceSceneIndex === 'number' &&
    targetBeat.sourceSceneIndex >= 0 &&
    targetBeat.sourceBeatId
      ? targetBeat.sourceBeatId
      : args.beatId

  // 1. If we saved on a Promo scene beat, also write to the canonical source scene beat (e.g. Scene 2 Shot 3)
  if (
    canonicalSourceSceneIdx !== args.sceneIdx ||
    canonicalSourceBeatId !== args.beatId
  ) {
    updatedScenes = applyBeatDirectionToOneScene({
      ...args,
      scenes: updatedScenes,
      sceneIdx: canonicalSourceSceneIdx,
      beatId: canonicalSourceBeatId,
    })
  }

  // 2. Also sync any Promo scene beat that references (canonicalSourceSceneIdx, canonicalSourceBeatId)
  updatedScenes.forEach((sceneEntry, idx) => {
    if (!sceneEntry || typeof sceneEntry !== 'object') return
    for (const candidate of getSceneBeats(sceneEntry)) {
      const promoBeat = candidate as SceneBeat & {
        sourceSceneIndex?: number
        sourceBeatId?: string
      }
      if (
        promoBeat.sourceSceneIndex === canonicalSourceSceneIdx &&
        promoBeat.sourceBeatId === canonicalSourceBeatId &&
        !(idx === args.sceneIdx && promoBeat.beatId === args.beatId)
      ) {
        updatedScenes = applyBeatDirectionToOneScene({
          ...args,
          scenes: updatedScenes,
          sceneIdx: idx,
          beatId: promoBeat.beatId,
        })
      }
    }
  })

  return updatedScenes
}

/** The Direct Shot save: merge the patch, align to connected objects, recompute prompts. */
export function saveDirectorPatchToScenes(args: {
  scenes: any[]
  sceneIdx: number
  beatId: string
  patch: StillDirectorPatch
  referenceSelection: BeatReferenceSelection
  characters?: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  objectReferences: Array<{ id: string; name: string }>
  promptComposition?: BeatPromptComposition
  generatedBy?: 'user' | 'director'
}): any[] {
  const beat = getSceneBeats(args.scenes[args.sceneIdx] ?? {}).find(
    (entry) => entry.beatId === args.beatId
  )
  if (!beat) return args.scenes
  const merged = directionFromDirectorPatch(beat.beatDirection, args.patch, args.characters)
  let nextReferenceSelection = args.referenceSelection
  if (args.characters && args.characters.length > 0 && Array.isArray(merged.castInFrame)) {
    const directedCast =
      directedCastForBeat({ ...beat, beatDirection: merged }, args.characters) ?? []
    const nextCharacterIds = directedCast
      .map((char) => char.id || char.name)
      .filter((id): id is string => Boolean(id))
    nextReferenceSelection = {
      ...args.referenceSelection,
      characterIds: nextCharacterIds,
    }
  }
  const objectNames = nextReferenceSelection.objectRefIds
    .map((id) => args.objectReferences.find((object) => object.id === id)?.name?.trim())
    .filter((name): name is string => !!name)
  return applyBeatDirectionToScenes({
    scenes: args.scenes,
    sceneIdx: args.sceneIdx,
    beatId: args.beatId,
    direction: alignDirectionToConnectedObjects(merged, objectNames) ?? merged,
    refreshPrompts: 'recompute',
    actionDescription: args.patch.actionDescription,
    voiceDirection: args.patch.voiceDirection,
    referenceSelection: nextReferenceSelection,
    promptComposition: args.promptComposition,
    generatedBy: args.generatedBy,
  })
}
