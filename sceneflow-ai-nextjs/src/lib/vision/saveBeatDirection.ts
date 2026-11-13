import {
  applyBeatsToScene,
  filterCastInFrameByVisualStaging,
  getSceneBeats,
  isBeatExcluded,
  stripSpokenDeliveryClause,
} from '@/lib/script/beatMigration'
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
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { parsePersistedMusicCues, resolveBeatMusicCue } from '@/lib/script/sceneMusicCues'
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
import { resolveWardrobeForCharacter } from '@/lib/character/characterReferenceAssembly'
import { matchObjectsBySelectedNames } from '@/lib/character/matching'
import { extractSceneWardrobeAndAppearanceNotes } from '@/lib/character/wardrobeAnalysis'
import { notesCoverBeat } from '@/lib/character/wardrobeScriptSync'
import { extractLocation } from '@/lib/script/formatSceneHeading'
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
  notesShareSetState,
  stampLocationVersionAppliesFrom,
} from '@/lib/vision/locationScriptSync'
import {
  extractLocationStateHitsFromScene,
  type LocationAnalysisSceneInput,
} from '@/lib/vision/locationStateAnalysis'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

const GENERIC_SCENE_HEADING_LOCATION_RE =
  /^(?:scene\s+\d+(?:\s*:\s*)?)?(?:title\s+sequence|promo|trailer|montage|prologue|epilogue|n\/a|none)$/i

function deriveAutoLocationReferenceName(
  scene: Record<string, any>,
  sceneNumber: number | undefined,
  startFrameNotes?: string
): string | null {
  const sceneDir = scene?.sceneDirection as Record<string, any> | undefined
  const dirLoc =
    typeof sceneDir?.scene?.location === 'string' ? sceneDir.scene.location.trim() : ''
  if (dirLoc && !GENERIC_SCENE_HEADING_LOCATION_RE.test(dirLoc)) {
    return dirLoc.toUpperCase()
  }

  const headingStr =
    typeof scene?.heading === 'string'
      ? scene.heading.trim()
      : typeof (scene?.heading as { text?: unknown } | undefined)?.text === 'string'
        ? ((scene.heading as { text: string }).text || '').trim()
        : ''
  const extracted = extractLocation(headingStr)
  if (extracted && !GENERIC_SCENE_HEADING_LOCATION_RE.test(extracted)) {
    return extracted.toUpperCase()
  }

  if (startFrameNotes?.trim()) {
    const placeMatch = startFrameNotes.match(
      /\b(?:the\s+)?((?:[A-Z][a-zA-Z0-9'-]+\s+){1,3}(?:coastline|shoreline|skyline|grid|corridors?|yards?|blocks?|harbor|lakefront|tunnel|vault|station|laboratory|street|avenue|bridge|plaza|atrium|hall|chamber))\b/
    )
    if (placeMatch?.[1]) {
      return placeMatch[1].trim().toUpperCase()
    }
  }

  if (startFrameNotes?.trim()) {
    return `SCENE ${sceneNumber ?? 1} ENVIRONMENT`
  }

  return null
}

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

function characterWardrobeMatchesIds(
  wardrobeCharId: string,
  allowedCharacterIds: string[],
  characters?: Array<{ id?: string; name: string }>
): boolean {
  const needle = wardrobeCharId.trim().toLowerCase()
  if (!needle) return false
  if (allowedCharacterIds.some((id) => id.trim().toLowerCase() === needle)) {
    return true
  }
  if (!characters || characters.length === 0) return false
  const matchedChar = characters.find(
    (c) =>
      c.id?.trim().toLowerCase() === needle || c.name.trim().toLowerCase() === needle
  )
  if (!matchedChar) return false
  const charIdLower = matchedChar.id?.trim().toLowerCase()
  const charNameLower = matchedChar.name.trim().toLowerCase()
  return allowedCharacterIds.some((id) => {
    const k = id.trim().toLowerCase()
    return (Boolean(charIdLower) && k === charIdLower) || k === charNameLower
  })
}

export function selectionFromBeat(
  beat: SceneBeat,
  resolved: ReturnType<typeof resolveBeatElementSelection>,
  characters?: Array<{ id?: string; name: string }>
): BeatReferenceSelection {
  if (shouldUseExplicitBeatReferences(beat)) {
    const explicitWardrobes = Array.isArray(beat.referenceSelection.characterWardrobes)
      ? resolved.characterIds.length > 0
        ? beat.referenceSelection.characterWardrobes.filter((entry) =>
            characterWardrobeMatchesIds(entry.characterId, resolved.characterIds, characters)
          )
        : []
      : undefined
    return {
      ...beat.referenceSelection,
      characterIds: resolved.characterIds,
      ...(explicitWardrobes !== undefined
        ? { characterWardrobes: explicitWardrobes }
        : resolved.characterWardrobes && resolved.characterWardrobes.length > 0
          ? { characterWardrobes: resolved.characterWardrobes }
          : {}),
    }
  }
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
  return selectionFromBeat(args.beat, resolved, args.characters)
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

/**
 * Preserves a shot's existing bound continuity references (`locationRefId`,
 * `locationVersionId`, `objectRefIds`, `characterWardrobes`, and `source`),
 * resolving from the pre-patch beat only when no `referenceSelection` is saved yet,
 * and allowing a newly directed shot to narrow `characterIds` (pruning off-camera
 * characters) without introducing unbound characters, props, or location changes.
 */
export function boundBeatReferenceSelection(args: {
  scene: Record<string, unknown> | undefined
  beat: SceneBeat
  directedBeat?: SceneBeat
  sceneIdx: number
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: Array<{ id: string }>
  objectReferences: Array<{ id: string; name: string }>
  resolvedAt?: string
}): BeatReferenceSelection {
  const baseSelection = resolveBeatReferenceSelection({
    scene: args.scene,
    beat: args.beat,
    sceneIdx: args.sceneIdx,
    characters: args.characters,
    locationReferences: args.locationReferences,
    objectReferences: args.objectReferences,
  })
  const targetBeat = args.directedBeat ?? args.beat
  if (
    args.characters.length > 0 &&
    Array.isArray(targetBeat.beatDirection?.castInFrame)
  ) {
    const directedCast = directedCastForBeat(targetBeat, args.characters) ?? []
    const directedIds = directedCast
      .map((char) => char.id || char.name)
      .filter((id): id is string => Boolean(id))
    const allowedIds =
      baseSelection.characterIds.length > 0
        ? directedIds.filter((id) => baseSelection.characterIds.includes(id))
        : directedIds
    const nextCharacterIds =
      targetBeat.beatDirection.castInFrame.length === 0
        ? []
        : allowedIds.length > 0
          ? allowedIds
          : baseSelection.characterIds
    const nextCharacterWardrobes = Array.isArray(baseSelection.characterWardrobes)
      ? baseSelection.characterWardrobes.filter((entry) =>
          characterWardrobeMatchesIds(entry.characterId, nextCharacterIds, args.characters)
        )
      : undefined
    return {
      ...baseSelection,
      characterIds: nextCharacterIds,
      ...(nextCharacterWardrobes ? { characterWardrobes: nextCharacterWardrobes } : {}),
      resolvedAt: args.resolvedAt ?? baseSelection.resolvedAt ?? new Date().toISOString(),
    }
  }
  return {
    ...baseSelection,
    resolvedAt: args.resolvedAt ?? baseSelection.resolvedAt ?? new Date().toISOString(),
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
  characters: Array<Record<string, any>>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  charactersChanged: boolean
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
  characters: Array<{
    id?: string
    name: string
    referenceImage?: string
    type?: string
    wardrobes?: Array<Record<string, any>>
    defaultWardrobe?: string
    wardrobeAccessories?: string
    [key: string]: any
  }>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  resolvedAt?: string
}): SyncSceneDirectionToContinuityResult {
  const now = args.resolvedAt ?? new Date().toISOString()
  if (!Array.isArray(args.scenes) || !args.scenes[args.sceneIdx]) {
    return {
      scenes: args.scenes,
      characters: args.characters,
      locationReferences: args.locationReferences,
      objectReferences: args.objectReferences,
      charactersChanged: false,
      locationsChanged: false,
      objectsChanged: false,
    }
  }

  const scene = args.scenes[args.sceneIdx]
  const sceneNumber = resolveSceneNumberForLocationMatch(scene, args.sceneIdx)
  let nextCharacters = [...args.characters]
  let nextLocations = [...args.locationReferences]
  let nextObjects = [...args.objectReferences]
  let charactersChanged = false
  let locationsChanged = false
  let objectsChanged = false

  // 1. Sync location scale & setting-change versions from Scene Direction + Shot Direction
  const headingStr =
    typeof scene.heading === 'string'
      ? scene.heading
      : (scene.heading as { text?: string } | undefined)?.text || ''
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

  const shootableBeats = getSceneBeats(scene).filter((b) => !isBeatExcluded(b))
  const analysisInput: LocationAnalysisSceneInput = {
    sceneNumber: sceneNumber ?? args.sceneIdx + 1,
    heading: headingStr || undefined,
    action: typeof scene.action === 'string' ? scene.action : undefined,
    visualDescription:
      typeof scene.visualDescription === 'string' ? scene.visualDescription : undefined,
    locationDescription: dirSettingText || undefined,
    beats: shootableBeats.map((b) => {
      const dir = b.beatDirection
      const isBoundDirectedBeat =
        (dir?.generatedBy === 'director' || dir?.generatedBy === 'user') &&
        dir?.unboundContinuity !== true
      return {
        beatId: b.beatId,
        kind: b.kind,
        actionDescription: isBoundDirectedBeat ? undefined : b.actionDescription,
        description: b.description,
        action: b.action,
        line: b.line,
        startFrame: isBoundDirectedBeat ? undefined : dir?.startFrame,
        clipAction: isBoundDirectedBeat ? undefined : dir?.clipAction,
        endFrame: isBoundDirectedBeat ? undefined : dir?.endFrame,
        frozenMoment: isBoundDirectedBeat ? undefined : dir?.frozenMoment,
        propInteraction: isBoundDirectedBeat ? undefined : dir?.propInteraction,
        lightingAccent: isBoundDirectedBeat ? undefined : dir?.lightingAccent,
        blocking: isBoundDirectedBeat ? undefined : dir?.blocking,
      }
    }),
  }
  const hits = extractLocationStateHitsFromScene(analysisInput)

  const assignedLocs =
    sceneNumber !== undefined
      ? findLocationReferencesAssignedToScene(nextLocations, sceneNumber, {
          includeWithoutImages: true,
        })
      : []
  const matchedLocs =
    assignedLocs.length > 0
      ? assignedLocs
      : findMatchingLocationReferences(scene, nextLocations, args.sceneIdx, {
          includeWithoutImages: true,
        })
  let primaryLoc = matchedLocs[0]
  let autoCreatedFromBeatZeroStartFrame = false

  if (!primaryLoc) {
    const startHit = hits.find((h) => h.isStartFrameState)
    const canAutoCreate = Boolean(startHit) || Boolean(dirSettingText.trim())
    const derivedLocName = canAutoCreate
      ? deriveAutoLocationReferenceName(scene, sceneNumber, startHit?.notes)
      : null
    if (derivedLocName) {
      const resolvedNum = sceneNumber ?? args.sceneIdx + 1
      const beat0StartNotes =
        hits[0]?.beatIndex === 0 && hits[0]?.isStartFrameState ? hits[0].notes : undefined
      const initialDescription = [beat0StartNotes, dirSettingText.trim()]
        .filter(Boolean)
        .join(' ')
        .trim()
      const beat0 = shootableBeats[0]
      const seedImageUrl = beat0?.storyboardStartImageUrl?.trim() || ''
      const createdLoc: LocationReference = {
        id: `loc-dir-${Date.now()}-${args.sceneIdx}`,
        location: derivedLocName,
        locationDisplay: headingStr.trim() || derivedLocName,
        description: initialDescription || derivedLocName,
        imageUrl: seedImageUrl,
        sourceSceneIndex: args.sceneIdx,
        sourceSceneHeading: headingStr.trim() || derivedLocName,
        pinnedAt: now,
        sceneNumbers: [resolvedNum],
        versions: [],
      }
      nextLocations.push(createdLoc)
      primaryLoc = createdLoc
      locationsChanged = true
      if (beat0StartNotes) {
        autoCreatedFromBeatZeroStartFrame = true
      }
    }
  }

  if (primaryLoc) {
    const locIdx = nextLocations.findIndex((l) => l.id === primaryLoc.id)
    if (locIdx >= 0) {
      let updatedLoc: LocationReference = { ...nextLocations[locIdx] }

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

      for (const hit of hits) {
        // When a brand-new LocationReference was just created from Beat 0's startFrame
        // (or when an undrawn base LocationReference has no versions yet and Beat 0
        // establishes an opening blackout/start-frame state), bake the opening start-frame
        // state directly into the base LocationReference description so the base reference
        // image itself is drawn as the opening t=0s environment.
        if (
          hit.beatIndex === 0 &&
          hit.isStartFrameState &&
          !updatedLoc.imageUrl?.trim() &&
          (!updatedLoc.versions || updatedLoc.versions.length === 0)
        ) {
          if (
            !autoCreatedFromBeatZeroStartFrame &&
            !notesCoverState(updatedLoc.description || '', hit.notes)
          ) {
            updatedLoc = {
              ...updatedLoc,
              description: [hit.notes, updatedLoc.description?.trim()]
                .filter(Boolean)
                .join(' '),
            }
            locationsChanged = true
          }
          continue
        }

        const versions = updatedLoc.versions ?? []
        const exactBeatVer = versions.find(
          (v) =>
            (v.appliesFrom?.sceneNumber === hit.sceneNumber &&
              v.appliesFrom?.beatIndex === hit.beatIndex) ||
            (Boolean(hit.beatId) && v.appliesFrom?.beatId === hit.beatId)
        )
        const sceneCoveringVer = versions.find(
          (v) =>
            (v.sceneNumbers?.includes(hit.sceneNumber) ||
              v.appliesFrom?.sceneNumber === hit.sceneNumber) &&
            (notesCoverState(v.stateNotes || '', hit.notes) ||
              notesShareSetState(v.stateNotes || '', hit.notes))
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

        const versionLabel = hit.isStartFrameState ? 'Start frame' : 'Set change'
        const appended = appendDirectedLocationVersion(
          updatedLoc,
          {
            name: `Scene ${hit.sceneNumber}, Shot ${hit.beatIndex + 1} — ${versionLabel}`,
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
          .filter(
            (b) =>
              !isBeatExcluded(b) &&
              !(
                (b.beatDirection?.generatedBy === 'director' ||
                  b.beatDirection?.generatedBy === 'user') &&
                b.beatDirection?.unboundContinuity !== true
              )
          )
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

  // 2b. Sync character wardrobe/appearance state from Scene Direction + Shot Direction
  const resolvedSceneNum = sceneNumber ?? args.sceneIdx + 1
  nextCharacters = nextCharacters.map((character, charIdx) => {
    if (!character || character.type === 'narrator' || character.type === 'description') {
      return character
    }
    const charName = typeof character.name === 'string' ? character.name.trim() : ''
    if (!charName) return character

    const extracted = extractSceneWardrobeAndAppearanceNotes(scene, charName)
    if (!extracted.combinedNotes) return character

    const resolvedWardrobe = resolveWardrobeForCharacter(
      character as Record<string, unknown>,
      scene,
      undefined,
      args.sceneIdx
    )
    const existingCoverage = [
      typeof resolvedWardrobe?.name === 'string' ? resolvedWardrobe.name : '',
      typeof resolvedWardrobe?.description === 'string' ? resolvedWardrobe.description : '',
      typeof resolvedWardrobe?.accessories === 'string' ? resolvedWardrobe.accessories : '',
      typeof resolvedWardrobe?.appearanceNotes === 'string' ? resolvedWardrobe.appearanceNotes : '',
    ]
      .filter(Boolean)
      .join(' ')

    const outfitCovered =
      !extracted.outfitNotes || notesCoverBeat(existingCoverage, extracted.outfitNotes)
    const appearanceCovered =
      !extracted.appearanceNotes || notesCoverBeat(existingCoverage, extracted.appearanceNotes)
    if (outfitCovered && appearanceCovered) return character

    const existingWardrobes = Array.isArray(character.wardrobes)
      ? character.wardrobes.map((w) => ({ ...w }))
      : []

    const resolvedId = typeof resolvedWardrobe?.id === 'string' ? resolvedWardrobe.id : ''
    const resolvedScenes = Array.isArray(resolvedWardrobe?.sceneNumbers)
      ? (resolvedWardrobe.sceneNumbers as number[])
      : []
    const isSceneExclusive =
      resolvedScenes.length === 1 && resolvedScenes[0] === resolvedSceneNum

    if (resolvedId && isSceneExclusive) {
      const nextWardrobes = existingWardrobes.map((w) => {
        if (w.id !== resolvedId) return w
        const mergedAppearance = extracted.appearanceNotes
          ? w.appearanceNotes?.trim()
            ? dedupeStateNoteClauses(`${w.appearanceNotes}; ${extracted.appearanceNotes}`)
            : extracted.appearanceNotes
          : w.appearanceNotes
        return {
          ...w,
          ...(extracted.outfitNotes && !outfitCovered
            ? { description: extracted.outfitNotes }
            : {}),
          ...(mergedAppearance !== w.appearanceNotes
            ? { appearanceNotes: mergedAppearance }
            : {}),
          needsImageRegen: true,
          combinedCharacterRefUrl: undefined,
        }
      })
      charactersChanged = true
      return { ...character, wardrobes: nextWardrobes }
    }

    const baseDescription =
      typeof resolvedWardrobe?.description === 'string' && resolvedWardrobe.description.trim()
        ? resolvedWardrobe.description.trim()
        : typeof character.defaultWardrobe === 'string' && character.defaultWardrobe.trim()
          ? character.defaultWardrobe.trim()
          : 'Baseline outfit'
    const baseAccessories =
      typeof resolvedWardrobe?.accessories === 'string'
        ? resolvedWardrobe.accessories
        : character.wardrobeAccessories
    const baseAppearance =
      typeof resolvedWardrobe?.appearanceNotes === 'string' &&
      resolvedWardrobe.appearanceNotes.trim()
        ? resolvedWardrobe.appearanceNotes.trim()
        : undefined
    const mergedAppearance = extracted.appearanceNotes
      ? baseAppearance
        ? dedupeStateNoteClauses(`${baseAppearance}; ${extracted.appearanceNotes}`)
        : extracted.appearanceNotes
      : baseAppearance

    const createdWardrobe = {
      id: `wardrobe-dir-${Date.now()}-${args.sceneIdx}-${charIdx}`,
      name: `Scene ${resolvedSceneNum} — ${
        extracted.outfitNotes && !outfitCovered ? 'Directed Outfit' : 'Appearance State'
      }`,
      description:
        extracted.outfitNotes && !outfitCovered ? extracted.outfitNotes : baseDescription,
      ...(baseAccessories ? { accessories: baseAccessories } : {}),
      ...(mergedAppearance ? { appearanceNotes: mergedAppearance } : {}),
      sceneNumbers: [resolvedSceneNum],
      reason: `Synced from Scene ${resolvedSceneNum} direction`,
      isDefault: existingWardrobes.length === 0,
      createdAt: now,
      needsImageRegen: true,
    }

    const updatedExisting = existingWardrobes.map((w) => {
      if (!Array.isArray(w.sceneNumbers) || !w.sceneNumbers.includes(resolvedSceneNum)) return w
      return {
        ...w,
        sceneNumbers: w.sceneNumbers.filter((n: number) => n !== resolvedSceneNum),
      }
    })

    charactersChanged = true
    return {
      ...character,
      wardrobes: [...updatedExisting, createdWardrobe],
    }
  })

  // 3. Re-resolve all shootable beat referenceSelections against the updated catalog
  const updatedScenes = syncSceneReferenceSelections({
    scenes: args.scenes,
    sceneIdx: args.sceneIdx,
    characters: nextCharacters as any,
    locationReferences: nextLocations,
    objectReferences: nextObjects,
    resolvedAt: now,
  })

  return {
    scenes: updatedScenes,
    characters: nextCharacters,
    locationReferences: nextLocations,
    objectReferences: nextObjects,
    charactersChanged,
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
  ] as const
  for (const key of textKeys) {
    const rawValue = patch[key]?.trim()
    const value =
      key === 'frozenMoment' ||
      key === 'startFrame' ||
      key === 'clipAction' ||
      key === 'endFrame'
        ? stripSpokenDeliveryClause(rawValue)
        : rawValue
    if (value) next[key] = value
  }
  if (!next.frozenMoment?.trim() && patch.actionFraming?.trim()) {
    next.frozenMoment =
      stripSpokenDeliveryClause(patch.actionFraming.trim()) ?? patch.actionFraming.trim()
  }
  if (!next.frozenMoment?.trim() && next.startFrame?.trim()) {
    next.frozenMoment = next.startFrame.trim()
  }
  if (Array.isArray(patch.castInFrame)) next.castInFrame = patch.castInFrame
  if (patch.keyProps && patch.keyProps.length > 0) next.keyProps = patch.keyProps
  if (patch.transition) next.transition = patch.transition

  // If the new patch explicitly names a second library character in its visual
  // staging (frozenMoment / actionFraming / blocking) on a non-empty-cast shot
  // without an off-camera listener eyeline, include that character in castInFrame.
  const explicitEmptyCast =
    (Array.isArray(patch.castInFrame) && patch.castInFrame.length === 0) ||
    (Array.isArray(next.castInFrame) && next.castInFrame.length === 0 && !patch.castInFrame)
  const hasOffCameraListenerGaze =
    /\b(?:off[- ]camera|outside\s+the\s+frame|out\s+of\s+frame|unseen\s+listener)\b/i.test(
      next.gaze ?? ''
    )
  if (!explicitEmptyCast && !hasOffCameraListenerGaze && characters && characters.length > 0) {
    const cleanedGaze = patch.gaze
      ? patch.gaze.replace(
          /\b(?:toward|towards|at|to|on)\s+[^.,;]+?\s+(?:off[- ]camera|outside\s+the\s+frame|out\s+of\s+frame)\b/gi,
          ' '
        )
      : undefined
    const patchStagingText = [
      stripSpokenDeliveryClause(patch.frozenMoment),
      stripSpokenDeliveryClause(patch.actionFraming),
      patch.blocking,
      cleanedGaze,
    ]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
      .replace(/"[^"\n]{10,}"/g, ' ')
      .replace(/“[^”\n]{10,}”/g, ' ')
    if (patchStagingText.trim()) {
      const detected = detectCharactersInText(
        patchStagingText,
        characters.filter((c) => c.type !== 'narrator'),
        { excludePhrases: next.keyProps }
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

  if (Array.isArray(next.castInFrame)) {
    next.castInFrame = filterCastInFrameByVisualStaging(next)
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
    const editedIdx = beats.findIndex((b) => b.beatId === beatId)
    const previousBeat = editedIdx > 0 ? beats[editedIdx - 1] : undefined
    const musicCue =
      editedIdx >= 0
        ? resolveBeatMusicCue(parsePersistedMusicCues(withBeats.sceneMusicCues, beats), editedIdx)
        : undefined
    const videoPrompt =
      segment?.videoPrompt?.trim() ||
      compileBeatVideoPromptFromDirection(edited, withBeats.sceneDirection, {
        previousBeat,
        artStyleId: promptComposition?.artStyleAnchor,
        ...(musicCue ? { musicCue } : {}),
      }).prompt.trim()
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
  /**
   * When false/omitted (default), keeps Shot Direction aligned with the beat's
   * bound continuity references (`referenceSelection`), only allowing cast pruning
   * when fewer characters are staged in frame and rejecting unbound library cast/props.
   * When true, allows the patch to introduce new library characters and props.
   */
  allowUnboundReferences?: boolean
}): any[] {
  const beat = getSceneBeats(args.scenes[args.sceneIdx] ?? {}).find(
    (entry) => entry.beatId === args.beatId
  )
  if (!beat) return args.scenes
  const allowUnbound = args.allowUnboundReferences === true
  const merged = directionFromDirectorPatch(beat.beatDirection, args.patch, args.characters)
  if (allowUnbound) {
    merged.unboundContinuity = true
  } else {
    delete merged.unboundContinuity
  }
  let nextReferenceSelection = args.referenceSelection
  if (args.characters && args.characters.length > 0 && Array.isArray(merged.castInFrame)) {
    const directedCast =
      directedCastForBeat({ ...beat, beatDirection: merged }, args.characters) ?? []
    const directedIds = directedCast
      .map((char) => char.id || char.name)
      .filter((id): id is string => Boolean(id))
    const boundIds = args.referenceSelection.characterIds
    const nextCharacterIds = allowUnbound
      ? directedIds
      : merged.castInFrame.length === 0
        ? []
        : boundIds.length > 0
          ? directedIds.filter((id) => boundIds.includes(id))
          : directedIds
    const resolvedCharacterIds =
      !allowUnbound &&
      merged.castInFrame.length > 0 &&
      boundIds.length > 0 &&
      nextCharacterIds.length === 0
        ? boundIds
        : nextCharacterIds
    if (!allowUnbound && boundIds.length > 0 && merged.castInFrame.length > 0) {
      const allowedNamesLower = new Set(
        args.characters
          .filter((c) => resolvedCharacterIds.includes(c.id || c.name))
          .map((c) => c.name.trim().toLowerCase())
      )
      const filteredCastNames = merged.castInFrame.filter((name) =>
        allowedNamesLower.has(name.trim().toLowerCase())
      )
      merged.castInFrame =
        filteredCastNames.length > 0
          ? filteredCastNames
          : args.characters
              .filter((c) => resolvedCharacterIds.includes(c.id || c.name))
              .map((c) => c.name.trim())
    }
    const nextCharacterWardrobes = Array.isArray(nextReferenceSelection.characterWardrobes)
      ? nextReferenceSelection.characterWardrobes.filter((entry) =>
          characterWardrobeMatchesIds(entry.characterId, resolvedCharacterIds, args.characters)
        )
      : undefined
    nextReferenceSelection = {
      ...args.referenceSelection,
      characterIds: resolvedCharacterIds,
      ...(nextCharacterWardrobes ? { characterWardrobes: nextCharacterWardrobes } : {}),
    }
  }
  if (
    Array.isArray(merged.keyProps) &&
    merged.keyProps.length > 0 &&
    args.objectReferences.length > 0
  ) {
    if (allowUnbound) {
      const matchedObjIds = matchObjectsBySelectedNames(
        merged.keyProps,
        args.objectReferences as VisualReference[]
      )
        .map((obj) => obj.id)
        .filter((id): id is string => Boolean(id))
      if (matchedObjIds.length > 0) {
        nextReferenceSelection = {
          ...nextReferenceSelection,
          objectRefIds: Array.from(
            new Set([...nextReferenceSelection.objectRefIds, ...matchedObjIds])
          ),
        }
      }
    } else {
      const boundObjectIdSet = new Set(nextReferenceSelection.objectRefIds)
      const priorPropsLower = new Set(
        (beat.beatDirection?.keyProps ?? []).map((p) => p.trim().toLowerCase())
      )
      merged.keyProps = merged.keyProps.filter((prop) => {
        const trimmed = prop.trim()
        if (!trimmed) return false
        if (priorPropsLower.has(trimmed.toLowerCase())) return true
        const matchedObjs = matchObjectsBySelectedNames(
          [trimmed],
          args.objectReferences as VisualReference[]
        )
        if (matchedObjs.length === 0) return true
        return matchedObjs.some((obj) => boundObjectIdSet.has(obj.id))
      })
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
