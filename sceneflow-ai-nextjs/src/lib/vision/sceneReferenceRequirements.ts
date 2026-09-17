/**
 * What does *this* scene need drawn before its frames can be generated?
 *
 * The Reference Library is project-wide, so every gate and every batch
 * generate built on it is project-wide too: a scene set in one room waits for
 * the props of a scene it shares nothing with. Resolving requirements per
 * scene is what lets production start at the scene card — typically two
 * characters, one location and a prop or two instead of the whole library.
 *
 * The signals disagree, so they are ranked. A beat's persisted
 * `referenceSelection` was resolved against the real catalog when the beat was
 * planned, which makes it the only non-heuristic answer available; scene
 * assignments (`sceneNumbers`) come from the library's own extraction pass;
 * text matching is the last resort and the only one available before a scene
 * has been planned. Each requirement carries the `source` that found it, so
 * the panel can show how much to trust a row and the user can correct it.
 *
 * Pure and client-safe — no `@/models`, no fetches — because the scene card,
 * the Express planner and the server-side gates all need the same answer.
 */

import { resolveWardrobeForCharacter } from '@/lib/character/characterReferenceAssembly'
import {
  findSceneCharacters,
  findSceneObjects,
  matchObjectsBySelectedNames,
} from '@/lib/character/matching'
import {
  buildSceneDirectionText,
  findLocationReferencesAssignedToScene,
  findMatchingLocationReferences,
  resolveSceneNumberForLocationMatch,
} from '@/lib/vision/frameGenerationContext'
import {
  isLocationVersionRequirementId,
  locationVersionRequirementId,
  parseLocationVersionRequirementId,
  resolveLocationVersionForBeat,
} from '@/lib/vision/locationVersionResolve'
import type { ReferenceExpressKind } from '@/lib/vision/referenceExpress/types'

export type SceneReferenceRequirementKind = 'cast' | 'wardrobe' | 'location' | 'prop'

/**
 * How confident we are that the scene needs this.
 *
 * - `beat-plan` — a beat's saved `referenceSelection` names it. Authoritative.
 * - `scene-assigned` — the library assigned it to this scene number.
 * - `detected` — text matching or a default-wardrobe fallback. Heuristic.
 */
export type SceneReferenceRequirementSource = 'beat-plan' | 'scene-assigned' | 'detected'

/** A shootable beat in this scene that uses the requirement. */
export type SceneReferenceBeatUse = {
  /** 0-based index in `scene.beats`. */
  beatIndex: number
  /** 1-based number shown on the Beats tab (`sequenceIndex + 1`). */
  beatNumber: number
  beatId?: string
}

export type SceneReferenceRequirement = {
  kind: SceneReferenceRequirementKind
  id: string
  name: string
  imageUrl?: string
  source: SceneReferenceRequirementSource
  /** Script changed since the image was drawn (wardrobe `needsImageRegen`). */
  stale?: boolean
  /** Other scenes that also need this — the amortisation signal. */
  alsoUsedInScenes?: number[]
  /** Shootable beats in this scene that attach this still. */
  usedInBeats?: SceneReferenceBeatUse[]
  /** Wardrobe rows only: who wears it, since wardrobes hang off a character. */
  characterId?: string
  characterName?: string
}

export type SceneRequirementCharacter = {
  id?: string
  name?: string
  type?: string
  referenceImage?: string
  referenceImageUrl?: string
  wardrobes?: Array<Record<string, unknown>>
  [key: string]: unknown
}

/**
 * Library rows, kept structural rather than tied to `LocationReference` and
 * `VisualReference`. Half the callers hold a narrower shape of their own, and
 * every one of them needs the same answer.
 */
export type SceneRequirementLocation = {
  id: string
  location?: string
  locationDisplay?: string
  imageUrl?: string
  description?: string
  sceneNumbers?: number[]
  versions?: Array<{
    id: string
    name?: string
    stateNotes?: string
    imageUrl?: string
    needsImageRegen?: boolean
    sceneNumbers?: number[]
    appliesFrom?: { sceneNumber: number; beatIndex: number; beatId?: string }
  }>
}

export type SceneRequirementObject = {
  id: string
  name?: string
  description?: string
  imageUrl?: string
  category?: string
  importance?: string
  /** Present at runtime from the library's script-analysis pass. */
  sceneNumbers?: number[]
}

/**
 * User corrections to the heuristic set, keyed by `requirementKey`. The
 * matchers guess; the user gets the last word in both directions, because an
 * over-detected prop wastes credits and an under-detected one lets a frame
 * invent an appearance.
 */
export type SceneReferenceOverrides = {
  /** Keys to require even though no matcher found them. */
  added?: string[]
  /** Keys to drop even though a matcher found them. */
  removed?: string[]
}

export type SceneReferenceRequirementsInput = {
  scene: Record<string, any> | null | undefined
  /** 0-based position in the script; scene numbers are this plus one. */
  sceneIndex: number
  characters?: SceneRequirementCharacter[] | null
  locationReferences?: SceneRequirementLocation[] | null
  objectReferences?: SceneRequirementObject[] | null
  overrides?: SceneReferenceOverrides | null
  /**
   * Every scene in the script. Supply it to fill `alsoUsedInScenes`; the cost
   * is one resolve pass per scene, so callers rendering a single card can omit
   * it when the cross-scene payoff is not being shown.
   */
  scenes?: Array<Record<string, any>> | null
}

/** Stable identity for a requirement, for overrides and cross-scene grouping. */
export function requirementKey(
  requirement: Pick<SceneReferenceRequirement, 'kind' | 'id'>
): string {
  return `${requirement.kind}:${requirement.id}`
}

const SOURCE_RANK: Record<SceneReferenceRequirementSource, number> = {
  'beat-plan': 0,
  'scene-assigned': 1,
  detected: 2,
}

const hasImage = (url?: unknown): boolean =>
  typeof url === 'string' && url.trim().length > 0

/**
 * Kinds Scene Ref Agent / Frame Agent JIT can draw, including wardrobe looks
 * and location set versions used in this scene.
 */
const EXPRESS_KIND_BY_REQUIREMENT: Partial<
  Record<SceneReferenceRequirementKind, ReferenceExpressKind>
> = {
  cast: 'cast',
  location: 'location',
  prop: 'prop',
  wardrobe: 'cast',
}

export function expressKindForRequirement(
  kind: SceneReferenceRequirementKind
): ReferenceExpressKind | null {
  return EXPRESS_KIND_BY_REQUIREMENT[kind] ?? null
}

/** Quote the same worker windows Scene Ref Agent / Frame Agent JIT will use. */
export function estimateItemForRequirement(
  requirement: Pick<SceneReferenceRequirement, 'kind' | 'id'>
): { kind: ReferenceExpressKind; versionId?: string } | null {
  const kind = expressKindForRequirement(requirement.kind)
  if (!kind) return null
  if (requirement.kind === 'location') {
    const parsed = parseLocationVersionRequirementId(requirement.id)
    if (parsed) return { kind, versionId: parsed.versionId }
  }
  return { kind }
}

/** The rows an Express References run would actually draw for this scene. */
export function selectUndrawnExpressableRequirements(
  requirements: SceneReferenceRequirement[]
): SceneReferenceRequirement[] {
  return requirements.filter((requirement) => {
    if (!expressKindForRequirement(requirement.kind)) return false
    return !hasImage(requirement.imageUrl) || requirement.stale === true
  })
}

/** Mirrors the narrator/voiceover exclusion inside `findSceneCharacters`. */
function isOnScreenCharacter(character: SceneRequirementCharacter): boolean {
  const type = character?.type
  const name = character?.name?.toUpperCase()
  return (
    type !== 'narrator' &&
    type !== 'description' &&
    name !== 'NARRATOR' &&
    name !== 'V.O.' &&
    name !== 'O.S.'
  )
}

function characterKeyOf(character: SceneRequirementCharacter): string {
  return String(character?.id ?? character?.name ?? '')
}

function findCharacter(
  characters: SceneRequirementCharacter[],
  idOrName: string
): SceneRequirementCharacter | null {
  const needle = idOrName?.trim().toLowerCase()
  if (!needle) return null
  return (
    characters.find((c) => String(c?.id ?? '').toLowerCase() === needle) ??
    characters.find((c) => String(c?.name ?? '').trim().toLowerCase() === needle) ??
    null
  )
}

type PlannedSelection = {
  characterIds: string[]
  locationRefIds: string[]
  objectRefIds: string[]
  characterWardrobes: Array<{ characterId: string; wardrobeId: string }>
  locationVersions: Array<{ locationRefId: string; versionId: string }>
  /** True when every beat that will be shot carries a selection. */
  complete: boolean
}

/**
 * Union the beats' saved reference selections.
 *
 * `complete` matters: when every shootable beat has been planned the union is
 * the whole truth and text matching would only add noise. When only some beats
 * are planned the rest still need references, so both signals are unioned.
 */
function collectPlannedSelection(scene: Record<string, any> | null | undefined): PlannedSelection {
  const beats: Array<Record<string, any>> = Array.isArray(scene?.beats) ? scene!.beats : []
  const shootable = beats.filter((beat) => beat?.excluded !== true)

  const characterIds = new Set<string>()
  const locationRefIds = new Set<string>()
  const objectRefIds = new Set<string>()
  const wardrobePairs: Array<{ characterId: string; wardrobeId: string }> = []
  const seenWardrobePairs = new Set<string>()
  const locationVersionPairs: Array<{ locationRefId: string; versionId: string }> = []
  const seenVersionPairs = new Set<string>()
  let planned = 0

  for (const beat of shootable) {
    const selection = beat?.referenceSelection
    if (!selection) continue
    planned += 1
    for (const id of selection.characterIds ?? []) {
      if (typeof id === 'string' && id.trim()) characterIds.add(id.trim())
    }
    if (typeof selection.locationRefId === 'string' && selection.locationRefId.trim()) {
      locationRefIds.add(selection.locationRefId.trim())
    }
    if (
      typeof selection.locationRefId === 'string' &&
      selection.locationRefId.trim() &&
      typeof selection.locationVersionId === 'string' &&
      selection.locationVersionId.trim()
    ) {
      const locationRefId = selection.locationRefId.trim()
      const versionId = selection.locationVersionId.trim()
      const key = `${locationRefId}::${versionId}`
      if (!seenVersionPairs.has(key)) {
        seenVersionPairs.add(key)
        locationVersionPairs.push({ locationRefId, versionId })
      }
    }
    for (const id of selection.objectRefIds ?? []) {
      if (typeof id === 'string' && id.trim()) objectRefIds.add(id.trim())
    }
    for (const entry of selection.characterWardrobes ?? []) {
      if (!entry?.characterId || !entry?.wardrobeId) continue
      const characterId = String(entry.characterId)
      const wardrobeId = String(entry.wardrobeId)
      const key = `${characterId}::${wardrobeId}`
      if (seenWardrobePairs.has(key)) continue
      seenWardrobePairs.add(key)
      wardrobePairs.push({ characterId, wardrobeId })
    }
  }

  return {
    characterIds: [...characterIds],
    locationRefIds: [...locationRefIds],
    objectRefIds: [...objectRefIds],
    characterWardrobes: wardrobePairs,
    locationVersions: locationVersionPairs,
    complete: planned > 0 && planned === shootable.length,
  }
}

/** The script text a scene's matchers should read, beats included. */
function buildSceneMatchText(scene: Record<string, any> | null | undefined): string {
  if (!scene) return ''
  const beats: Array<Record<string, any>> = Array.isArray(scene.beats) ? scene.beats : []
  const heading =
    typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || ''

  return [
    heading,
    scene.action || '',
    scene.visualDescription || '',
    scene.narration || '',
    buildSceneDirectionText(scene),
    ...(Array.isArray(scene.dialogue) ? scene.dialogue : []).map(
      (line: any) => `${line?.character || ''} ${line?.text || line?.line || ''}`
    ),
    ...beats
      .filter((beat) => beat?.excluded !== true)
      .map((beat) =>
        [beat?.character || '', beat?.line || '', beat?.actionDescription || '', beat?.overlayText || '']
          .filter(Boolean)
          .join(' ')
      ),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

/** Prop labels the director named explicitly, at scene and beat level. */
function collectKeyProps(scene: Record<string, any> | null | undefined): string[] {
  if (!scene) return []
  const direction = scene.sceneDirection ?? scene.detailedDirection
  const labels: string[] = []
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const entry of value) if (typeof entry === 'string' && entry.trim()) labels.push(entry.trim())
    }
  }
  push(direction?.scene?.keyProps)
  push(direction?.keyProps)
  for (const beat of Array.isArray(scene.beats) ? scene.beats : []) {
    if (beat?.excluded === true) continue
    push(beat?.beatDirection?.keyProps)
  }
  return [...new Set(labels)]
}

type WardrobePick = {
  wardrobe: Record<string, unknown>
  source: SceneReferenceRequirementSource
}

function pickSceneWardrobe(
  character: SceneRequirementCharacter,
  scene: Record<string, any> | null | undefined,
  sceneIndex: number,
  plannedWardrobes: Array<{ characterId: string; wardrobeId: string }>
): WardrobePick | null {
  const wardrobes = Array.isArray(character.wardrobes) ? character.wardrobes : []
  if (wardrobes.length === 0) return null

  const key = characterKeyOf(character)
  const planned = plannedWardrobes.find((entry) => entry.characterId === key)
  const sceneNumber = sceneIndex + 1
  const assignedByNumber = wardrobes.find(
    (w) => Array.isArray(w.sceneNumbers) && (w.sceneNumbers as number[]).includes(sceneNumber)
  )
  const sceneOverride = (
    Array.isArray(scene?.characterWardrobes)
      ? (scene!.characterWardrobes as Array<{ characterId?: string; wardrobeId?: string }>)
      : []
  ).find((entry) => entry?.characterId === key)

  // `resolveWardrobeForCharacter` owns the priority order, so ask it — but only
  // when one of its explicit branches can hit. Unmatched looks use the first
  // wardrobe without logging a missing-assignment warning.
  if (planned?.wardrobeId || assignedByNumber || sceneOverride?.wardrobeId) {
    const resolved = resolveWardrobeForCharacter(
      character as Record<string, unknown>,
      scene,
      planned ? [planned] : undefined,
      sceneIndex
    )
    if (resolved) {
      const resolvedId = resolved.id
      let source: SceneReferenceRequirementSource = 'detected'
      if (planned?.wardrobeId === resolvedId) {
        source = 'beat-plan'
      } else if (assignedByNumber?.id === resolvedId || sceneOverride?.wardrobeId === resolvedId) {
        source = 'scene-assigned'
      }
      return { wardrobe: resolved, source }
    }
  }

  const fallback = wardrobes[0]
  return fallback ? { wardrobe: fallback, source: 'detected' } : null
}

function wardrobeImageUrl(wardrobe: Record<string, unknown>): string | undefined {
  for (const field of ['headshotUrl', 'fullBodyUrl', 'previewImageUrl'] as const) {
    const value = wardrobe[field]
    if (hasImage(value)) return (value as string).trim()
  }
  return undefined
}

function characterMatches(character: SceneRequirementCharacter, idOrName: string): boolean {
  return findCharacter([character], idOrName) != null
}

function plannedWardrobeIdsForCharacter(
  character: SceneRequirementCharacter,
  plannedWardrobes: Array<{ characterId: string; wardrobeId: string }>
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const entry of plannedWardrobes) {
    if (!characterMatches(character, entry.characterId)) continue
    if (seen.has(entry.wardrobeId)) continue
    seen.add(entry.wardrobeId)
    ids.push(entry.wardrobeId)
  }
  return ids
}

function sceneBeats(scene: Record<string, any> | null | undefined): Array<Record<string, any>> {
  return Array.isArray(scene?.beats) ? scene!.beats : []
}

function beatNumberOf(beat: Record<string, any>, beatIndex: number): number {
  return (typeof beat.sequenceIndex === 'number' ? beat.sequenceIndex : beatIndex) + 1
}

/**
 * Which nested set-state a beat uses.
 *
 * `locationVersionId: null` is an explicit base establishing shot and must not
 * be sticky-overridden. Omitted / unplanned beats fall through to sticky-forward.
 */
function versionForBeat(
  ref: SceneRequirementLocation,
  beat: Record<string, any>,
  beatIndex: number,
  sceneNumber: number
): NonNullable<SceneRequirementLocation['versions']>[number] | null {
  const selection = beat?.referenceSelection as
    | {
        locationRefId?: string | null
        locationVersionId?: string | null
      }
    | undefined

  if (selection) {
    const locationRefId =
      typeof selection.locationRefId === 'string' ? selection.locationRefId.trim() : ''
    if (locationRefId && locationRefId !== ref.id) return null
    if (selection.locationRefId === null) return null
    if (Object.prototype.hasOwnProperty.call(selection, 'locationVersionId')) {
      const versionId = selection.locationVersionId
      if (versionId === null || (typeof versionId === 'string' && !versionId.trim())) {
        return null
      }
      if (typeof versionId === 'string' && versionId.trim()) {
        return (ref.versions ?? []).find((candidate) => candidate.id === versionId.trim()) ?? null
      }
    }
  }

  return resolveLocationVersionForBeat(ref, {
    sceneNumber,
    beatIndex,
    beatId: typeof beat?.beatId === 'string' ? beat.beatId : undefined,
  })
}

function beatUsesLocation(beat: Record<string, any>, locationId: string): boolean | 'unplanned' {
  const selection = beat?.referenceSelection
  if (!selection) return 'unplanned'
  if (typeof selection.locationRefId === 'string' && selection.locationRefId.trim()) {
    return selection.locationRefId.trim() === locationId
  }
  if (selection.locationRefId === null) return false
  return 'unplanned'
}

function characterInBeat(
  beat: Record<string, any>,
  character: SceneRequirementCharacter
): boolean {
  const selection = beat?.referenceSelection
  if (selection) {
    for (const id of selection.characterIds ?? []) {
      if (typeof id === 'string' && characterMatches(character, id)) return true
    }
    return false
  }

  const castInFrame = beat?.beatDirection?.castInFrame
  if (Array.isArray(castInFrame)) {
    for (const name of castInFrame) {
      if (typeof name === 'string' && characterMatches(character, name)) return true
    }
  }
  if (typeof beat?.characterId === 'string' && characterMatches(character, beat.characterId)) {
    return true
  }
  if (typeof beat?.character === 'string' && characterMatches(character, beat.character)) {
    return true
  }
  return false
}

function beatUsesWardrobe(
  beat: Record<string, any>,
  character: SceneRequirementCharacter,
  wardrobeId: string,
  fallbackWardrobeId: string | undefined
): boolean {
  if (!characterInBeat(beat, character)) return false
  const selection = beat?.referenceSelection
  const entries = selection?.characterWardrobes
  if (Array.isArray(entries) && entries.length > 0) {
    const forThisCharacter = entries.filter(
      (entry: { characterId?: string; wardrobeId?: string }) =>
        entry?.characterId && characterMatches(character, String(entry.characterId))
    )
    if (forThisCharacter.length > 0) {
      return forThisCharacter.some(
        (entry: { wardrobeId?: string }) => String(entry.wardrobeId) === wardrobeId
      )
    }
    return false
  }
  return fallbackWardrobeId === wardrobeId
}

function beatUsesProp(beat: Record<string, any>, prop: SceneRequirementObject): boolean {
  const selection = beat?.referenceSelection
  if (selection) {
    return (selection.objectRefIds ?? []).some(
      (id: unknown) => typeof id === 'string' && id === prop.id
    )
  }
  const labels = Array.isArray(beat?.beatDirection?.keyProps) ? beat.beatDirection.keyProps : []
  const names = labels.filter((label: unknown): label is string => typeof label === 'string')
  return matchObjectsBySelectedNames(names, [prop]).length > 0
}

function beatsUsingRequirement(
  scene: Record<string, any> | null | undefined,
  sceneIndex: number,
  requirement: SceneReferenceRequirement,
  characters: SceneRequirementCharacter[],
  locationRefs: SceneRequirementLocation[],
  objectRefs: SceneRequirementObject[],
  fallbackWardrobeByCharacter: Map<string, string>
): SceneReferenceBeatUse[] {
  const beats = sceneBeats(scene)
  if (beats.length === 0) return []
  const sceneNumber = resolveSceneNumberForLocationMatch(scene, sceneIndex) ?? sceneIndex + 1
  const uses: SceneReferenceBeatUse[] = []

  beats.forEach((beat, beatIndex) => {
    if (beat?.excluded === true) return
    let used = false

    if (requirement.kind === 'cast') {
      const character = findCharacter(characters, requirement.id)
      used = character ? characterInBeat(beat, character) : false
    } else if (requirement.kind === 'wardrobe') {
      const character = findCharacter(characters, requirement.characterId || requirement.id)
      const fallback = character
        ? fallbackWardrobeByCharacter.get(characterKeyOf(character))
        : undefined
      used = character
        ? beatUsesWardrobe(beat, character, requirement.id, fallback)
        : false
    } else if (requirement.kind === 'location') {
      const parsed = parseLocationVersionRequirementId(requirement.id)
      const locationId = parsed?.locationId ?? requirement.id
      const locUse = beatUsesLocation(beat, locationId)
      if (locUse === false) {
        used = false
      } else {
        const ref = locationRefs.find((candidate) => candidate.id === locationId)
        const version = ref ? versionForBeat(ref, beat, beatIndex, sceneNumber) : null
        used = parsed ? version?.id === parsed.versionId : version == null
      }
    } else if (requirement.kind === 'prop') {
      const prop = objectRefs.find((candidate) => candidate.id === requirement.id)
      used = prop ? beatUsesProp(beat, prop) : false
    }

    if (!used) return
    uses.push({
      beatIndex,
      beatNumber: beatNumberOf(beat, beatIndex),
      ...(typeof beat.beatId === 'string' && beat.beatId ? { beatId: beat.beatId } : {}),
    })
  })

  return uses
}

/**
 * Resolve the references one scene needs, ignoring cross-scene usage.
 * `resolveSceneRequiredReferences` layers `alsoUsedInScenes` on top.
 */
function resolveOne(input: SceneReferenceRequirementsInput): SceneReferenceRequirement[] {
  const { scene, sceneIndex } = input
  const characters = (input.characters ?? []).filter(Boolean)
  const locationRefs = (input.locationReferences ?? []).filter((ref) => ref?.id)
  const objectRefs = (input.objectReferences ?? []).filter((ref) => ref?.id)

  const collected = new Map<string, SceneReferenceRequirement>()
  const add = (requirement: SceneReferenceRequirement) => {
    if (!requirement.id) return
    const key = requirementKey(requirement)
    const existing = collected.get(key)
    if (!existing) {
      collected.set(key, requirement)
      return
    }
    if (SOURCE_RANK[requirement.source] < SOURCE_RANK[existing.source]) {
      existing.source = requirement.source
    }
  }

  const plan = collectPlannedSelection(scene)
  const useTextMatching = !plan.complete
  const sceneNumber = resolveSceneNumberForLocationMatch(scene, sceneIndex)
  const sceneText = useTextMatching ? buildSceneMatchText(scene) : ''

  const addCast = (
    character: SceneRequirementCharacter,
    source: SceneReferenceRequirementSource
  ) => {
    if (!isOnScreenCharacter(character)) return
    const id = characterKeyOf(character)
    if (!id) return
    const imageUrl = hasImage(character.referenceImage)
      ? character.referenceImage!.trim()
      : hasImage(character.referenceImageUrl)
        ? character.referenceImageUrl!.trim()
        : undefined
    add({
      kind: 'cast',
      id,
      name: character.name?.trim() || id,
      imageUrl,
      source,
    })
  }

  for (const idOrName of plan.characterIds) {
    const character = findCharacter(characters, idOrName)
    if (character) addCast(character, 'beat-plan')
  }

  if (useTextMatching) {
    const maskPhrases = [
      ...objectRefs.map((ref) => ref.name).filter(Boolean),
      ...locationRefs.map((ref) => ref.location || ref.locationDisplay || '').filter(Boolean),
    ] as string[]
    for (const character of findSceneCharacters(sceneText, characters as any[], { maskPhrases })) {
      addCast(character as SceneRequirementCharacter, 'detected')
    }
  }

  // Wardrobe hangs off whoever is actually in the scene, so it is resolved
  // after the cast rather than alongside it. Union every look the beats name;
  // if none are planned, keep the assigned / default pick so unplanned scenes
  // still get a row.
  const fallbackWardrobeByCharacter = new Map<string, string>()
  const addWardrobeRequirement = (
    character: SceneRequirementCharacter,
    wardrobe: Record<string, unknown>,
    source: SceneReferenceRequirementSource,
    castId: string
  ) => {
    const wardrobeId = typeof wardrobe.id === 'string' ? wardrobe.id : ''
    if (!wardrobeId) return
    const characterName = character.name?.trim() || castId
    const wardrobeName =
      typeof wardrobe.name === 'string' && wardrobe.name.trim()
        ? wardrobe.name.trim()
        : 'Wardrobe'
    add({
      kind: 'wardrobe',
      id: wardrobeId,
      name: `${characterName} — ${wardrobeName}`,
      imageUrl: wardrobeImageUrl(wardrobe),
      source,
      stale: wardrobe.needsImageRegen === true || undefined,
      characterId: castId,
      characterName,
    })
  }

  const castIds = [...collected.values()]
    .filter((requirement) => requirement.kind === 'cast')
    .map((requirement) => requirement.id)
  for (const castId of castIds) {
    const character = findCharacter(characters, castId)
    if (!character) continue
    const fallbackPick = pickSceneWardrobe(character, scene, sceneIndex, [])
    const fallbackId =
      fallbackPick && typeof fallbackPick.wardrobe.id === 'string'
        ? fallbackPick.wardrobe.id
        : undefined
    if (fallbackId) fallbackWardrobeByCharacter.set(characterKeyOf(character), fallbackId)

    const plannedIds = plannedWardrobeIdsForCharacter(character, plan.characterWardrobes)
    if (plannedIds.length > 0) {
      const wardrobes = Array.isArray(character.wardrobes) ? character.wardrobes : []
      for (const wardrobeId of plannedIds) {
        const wardrobe = wardrobes.find((candidate) => candidate?.id === wardrobeId)
        if (wardrobe) addWardrobeRequirement(character, wardrobe, 'beat-plan', castId)
      }
      continue
    }
    if (fallbackPick) addWardrobeRequirement(character, fallbackPick.wardrobe, fallbackPick.source, castId)
  }

  const addLocation = (
    ref: SceneRequirementLocation,
    source: SceneReferenceRequirementSource
  ) => {
    add({
      kind: 'location',
      id: ref.id,
      name: ref.location?.trim() || ref.locationDisplay?.trim() || 'Location',
      imageUrl: hasImage(ref.imageUrl) ? ref.imageUrl!.trim() : undefined,
      source,
    })
  }

  const addLocationVersion = (
    ref: SceneRequirementLocation,
    version: NonNullable<SceneRequirementLocation['versions']>[number],
    source: SceneReferenceRequirementSource
  ) => {
    if (!version?.id) return
    const locationName = ref.location?.trim() || ref.locationDisplay?.trim() || 'Location'
    const versionName = version.name?.trim() || 'Set version'
    add({
      kind: 'location',
      id: locationVersionRequirementId(ref.id, version.id),
      name: `${locationName} — ${versionName}`,
      imageUrl: hasImage(version.imageUrl) ? version.imageUrl!.trim() : undefined,
      source,
      stale: version.needsImageRegen === true || undefined,
    })
  }

  for (const refId of plan.locationRefIds) {
    const ref = locationRefs.find((candidate) => candidate.id === refId)
    if (ref) addLocation(ref, 'beat-plan')
  }

  for (const pair of plan.locationVersions) {
    const ref = locationRefs.find((candidate) => candidate.id === pair.locationRefId)
    const version = (ref?.versions ?? []).find((candidate) => candidate.id === pair.versionId)
    if (ref && version) addLocationVersion(ref, version, 'beat-plan')
  }

  if (useTextMatching) {
    if (sceneNumber !== undefined) {
      for (const ref of findLocationReferencesAssignedToScene(locationRefs, sceneNumber, {
        includeWithoutImages: true,
      })) {
        addLocation(ref, 'scene-assigned')
      }
    }
    // The fuzzy pass runs only when nothing was assigned, matching
    // `findMatchingLocationReferences`' own preference for assignments.
    const hasLocation = [...collected.values()].some(
      (requirement) => requirement.kind === 'location' && !isLocationVersionRequirementId(requirement.id)
    )
    if (!hasLocation) {
      for (const match of findMatchingLocationReferences(scene, locationRefs, sceneIndex, {
        includeWithoutImages: true,
      })) {
        const ref = locationRefs.find((candidate) => candidate.id === match.id)
        if (ref) addLocation(ref, 'detected')
      }
    }
  }

  // Set-state versions vs the base establishing shot — including sticky-forward
  // when a complete beat plan omits `locationVersionId`. Explicit `null` stays base.
  {
    const beats = sceneBeats(scene)
    const resolvedSceneNumber = sceneNumber ?? (scene ? sceneIndex + 1 : undefined)
    if (resolvedSceneNumber !== undefined) {
      const locationIdsOnScene = new Set(
        [...collected.values()]
          .filter(
            (requirement) =>
              requirement.kind === 'location' && !isLocationVersionRequirementId(requirement.id)
          )
          .map((requirement) => requirement.id)
      )
      for (const ref of locationRefs) {
        if (!locationIdsOnScene.has(ref.id)) continue
        const versions = ref.versions ?? []
        if (versions.length === 0) continue
        const seen = new Set<string>()
        if (beats.length > 0) {
          beats.forEach((beat, beatIndex) => {
            if (beat?.excluded === true) return
            const locUse = beatUsesLocation(beat, ref.id)
            if (locUse === false) return
            const version = versionForBeat(ref, beat, beatIndex, resolvedSceneNumber)
            if (!version || seen.has(version.id)) return
            seen.add(version.id)
            const explicitId =
              typeof beat?.referenceSelection?.locationVersionId === 'string'
                ? beat.referenceSelection.locationVersionId.trim()
                : ''
            addLocationVersion(
              ref,
              version,
              explicitId === version.id ? 'beat-plan' : locUse === true ? 'beat-plan' : 'detected'
            )
          })
        } else if (useTextMatching) {
          for (const version of versions) {
            if (
              (version.sceneNumbers ?? []).includes(resolvedSceneNumber) ||
              version.appliesFrom?.sceneNumber === resolvedSceneNumber
            ) {
              addLocationVersion(ref, version, 'scene-assigned')
            }
          }
        }
      }
    }
  }

  const addProp = (ref: SceneRequirementObject, source: SceneReferenceRequirementSource) => {
    add({
      kind: 'prop',
      id: ref.id,
      name: ref.name?.trim() || 'Prop',
      imageUrl: hasImage(ref.imageUrl) ? ref.imageUrl!.trim() : undefined,
      source,
    })
  }

  for (const refId of plan.objectRefIds) {
    const ref = objectRefs.find((candidate) => candidate.id === refId)
    if (ref) addProp(ref, 'beat-plan')
  }

  if (useTextMatching) {
    const detectedProps = [
      ...findSceneObjects(sceneText, objectRefs as any[], sceneNumber),
      ...matchObjectsBySelectedNames(collectKeyProps(scene), objectRefs),
    ] as SceneRequirementObject[]
    for (const ref of detectedProps) {
      const assigned =
        sceneNumber !== undefined &&
        Array.isArray(ref.sceneNumbers) &&
        ref.sceneNumbers.includes(sceneNumber)
      addProp(ref, assigned ? 'scene-assigned' : 'detected')
    }
  }

  applyOverrides(collected, input)

  const kindOrder: SceneReferenceRequirementKind[] = ['cast', 'wardrobe', 'location', 'prop']
  return [...collected.values()]
    .map((requirement) => {
      const usedInBeats = beatsUsingRequirement(
        scene,
        sceneIndex,
        requirement,
        characters,
        locationRefs,
        objectRefs,
        fallbackWardrobeByCharacter
      )
      return usedInBeats.length ? { ...requirement, usedInBeats } : requirement
    })
    .sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind))
}

function applyOverrides(
  collected: Map<string, SceneReferenceRequirement>,
  input: SceneReferenceRequirementsInput
): void {
  const overrides = input.overrides
  if (!overrides) return

  for (const key of overrides.removed ?? []) {
    collected.delete(key)
  }

  for (const key of overrides.added ?? []) {
    if (collected.has(key)) continue
    const separator = key.indexOf(':')
    if (separator <= 0) continue
    const kind = key.slice(0, separator) as SceneReferenceRequirementKind
    const id = key.slice(separator + 1)
    if (!id) continue

    if (kind === 'location') {
      const versionRef = parseLocationVersionRequirementId(id)
      if (versionRef) {
        const parent = (input.locationReferences ?? []).find(
          (candidate) => candidate?.id === versionRef.locationId
        )
        const version = (parent?.versions ?? []).find((candidate) => candidate.id === versionRef.versionId)
        if (!parent || !version) continue
        const locationName = parent.location?.trim() || parent.locationDisplay?.trim() || 'Location'
        collected.set(key, {
          kind,
          id,
          name: `${locationName} — ${version.name?.trim() || 'Set version'}`,
          imageUrl: hasImage(version.imageUrl) ? version.imageUrl!.trim() : undefined,
          source: 'scene-assigned',
          stale: version.needsImageRegen === true || undefined,
        })
        continue
      }
      const ref = (input.locationReferences ?? []).find((candidate) => candidate?.id === id)
      if (!ref) continue
      collected.set(key, {
        kind,
        id,
        name: ref.location?.trim() || ref.locationDisplay?.trim() || 'Location',
        imageUrl: hasImage(ref.imageUrl) ? ref.imageUrl!.trim() : undefined,
        source: 'scene-assigned',
      })
      continue
    }

    if (kind === 'prop') {
      const ref = (input.objectReferences ?? []).find((candidate) => candidate?.id === id)
      if (!ref) continue
      collected.set(key, {
        kind,
        id,
        name: ref.name?.trim() || 'Prop',
        imageUrl: hasImage(ref.imageUrl) ? ref.imageUrl!.trim() : undefined,
        source: 'scene-assigned',
      })
      continue
    }

    if (kind === 'cast') {
      const character = findCharacter((input.characters ?? []).filter(Boolean), id)
      if (!character || !isOnScreenCharacter(character)) continue
      collected.set(key, {
        kind,
        id,
        name: character.name?.trim() || id,
        imageUrl: hasImage(character.referenceImage)
          ? character.referenceImage!.trim()
          : hasImage(character.referenceImageUrl)
            ? character.referenceImageUrl!.trim()
            : undefined,
        source: 'scene-assigned',
      })
      continue
    }

    if (kind === 'wardrobe') {
      for (const character of (input.characters ?? []).filter(Boolean)) {
        const wardrobe = (Array.isArray(character.wardrobes) ? character.wardrobes : []).find(
          (candidate) => candidate?.id === id
        )
        if (!wardrobe) continue
        const characterId = characterKeyOf(character)
        const characterName = character.name?.trim() || characterId
        const wardrobeName =
          typeof wardrobe.name === 'string' && wardrobe.name.trim() ? wardrobe.name.trim() : 'Wardrobe'
        collected.set(key, {
          kind,
          id,
          name: `${characterName} — ${wardrobeName}`,
          imageUrl: wardrobeImageUrl(wardrobe),
          source: 'scene-assigned',
          stale: wardrobe.needsImageRegen === true || undefined,
          characterId,
          characterName,
        })
        break
      }
    }
  }
}

/**
 * Resolve every reference this scene needs, most authoritative signal first.
 *
 * Pass `scenes` to fill `alsoUsedInScenes`, which is what turns just-in-time
 * generation from deferred work into visibly amortised work: drawing a
 * character here also unblocks every other scene they appear in.
 */
export function resolveSceneRequiredReferences(
  input: SceneReferenceRequirementsInput
): SceneReferenceRequirement[] {
  const requirements = resolveOne(input)
  const scenes = input.scenes
  if (!scenes?.length || requirements.length === 0) return requirements

  const usage = new Map<string, number[]>()
  scenes.forEach((scene, index) => {
    if (index === input.sceneIndex) return
    const others = resolveOne({
      ...input,
      scene,
      sceneIndex: index,
      scenes: null,
      // Overrides belong to the scene they were made on.
      overrides: null,
    })
    for (const requirement of others) {
      const key = requirementKey(requirement)
      const sceneNumbers = usage.get(key)
      if (sceneNumbers) sceneNumbers.push(index + 1)
      else usage.set(key, [index + 1])
    }
  })

  return requirements.map((requirement) => {
    const alsoUsedInScenes = usage.get(requirementKey(requirement))
    return alsoUsedInScenes?.length ? { ...requirement, alsoUsedInScenes } : requirement
  })
}

/**
 * Requirements for every scene in one pass, so a project-wide view does not
 * pay the quadratic cost of resolving each scene against all the others.
 */
export function resolveAllSceneReferenceRequirements(
  input: Omit<SceneReferenceRequirementsInput, 'scene' | 'sceneIndex' | 'scenes'> & {
    scenes: Array<Record<string, any>>
    /** Per-scene overrides, keyed by 0-based scene index. */
    overridesByScene?: Record<number, SceneReferenceOverrides | undefined> | null
  }
): SceneReferenceRequirement[][] {
  const perScene = input.scenes.map((scene, sceneIndex) =>
    resolveOne({
      ...input,
      scene,
      sceneIndex,
      scenes: null,
      overrides: input.overridesByScene?.[sceneIndex] ?? input.overrides ?? null,
    })
  )

  const usage = new Map<string, number[]>()
  perScene.forEach((requirements, sceneIndex) => {
    for (const requirement of requirements) {
      const key = requirementKey(requirement)
      const sceneNumbers = usage.get(key)
      if (sceneNumbers) sceneNumbers.push(sceneIndex + 1)
      else usage.set(key, [sceneIndex + 1])
    }
  })

  return perScene.map((requirements, sceneIndex) =>
    requirements.map((requirement) => {
      const others = (usage.get(requirementKey(requirement)) ?? []).filter(
        (sceneNumber) => sceneNumber !== sceneIndex + 1
      )
      return others.length ? { ...requirement, alsoUsedInScenes: others } : requirement
    })
  )
}

/** The slices of `project.metadata.visionPhase` every reference gate reads. */
export type ProjectReferenceSources = {
  scenes: Array<Record<string, any>>
  characters: SceneRequirementCharacter[]
  locationReferences: SceneRequirementLocation[]
  objectReferences: SceneRequirementObject[]
}

export function readProjectReferenceSources(project: unknown): ProjectReferenceSources {
  const visionPhase: Record<string, any> =
    (project as { metadata?: Record<string, any> })?.metadata?.visionPhase ?? {}
  const references: Record<string, any> = visionPhase.references ?? {}
  const arrayOf = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
  const firstNonEmpty = <T,>(...values: unknown[]): T[] => {
    for (const value of values) {
      const array = arrayOf<T>(value)
      if (array.length > 0) return array
    }
    return []
  }

  return {
    // Storyboard scenes live in three places depending on the project's age;
    // the gates have to read all of them or a flat-script project silently
    // resolves zero scenes and every gate passes.
    scenes: firstNonEmpty<Record<string, any>>(
      visionPhase.script?.script?.scenes,
      visionPhase.script?.scenes,
      visionPhase.scenes
    ),
    characters: arrayOf(visionPhase.characters),
    locationReferences: arrayOf(references.locationReferences),
    objectReferences: arrayOf(references.objectReferences),
  }
}

/**
 * What the given scenes need, resolved from a project blob — the server-side
 * form of the question the scene card asks. Omit `sceneIndices` to cover every
 * scene, which is what a project-wide run is entitled to check.
 */
export function resolveProjectSceneRequirements(
  project: unknown,
  sceneIndices?: number[] | null
): SceneReferenceRequirement[] {
  const sources = readProjectReferenceSources(project)
  if (sources.scenes.length === 0) return []

  const wanted =
    sceneIndices && sceneIndices.length > 0
      ? [...new Set(sceneIndices)].filter(
          (index) => Number.isInteger(index) && index >= 0 && index < sources.scenes.length
        )
      : sources.scenes.map((_, index) => index)

  // Deduplicated across scenes, because a gate reports what is missing, not
  // how many scenes are waiting on it.
  const byKey = new Map<string, SceneReferenceRequirement>()
  for (const sceneIndex of wanted) {
    const scene = sources.scenes[sceneIndex]
    const resolved = resolveSceneRequiredReferences({
      scene,
      sceneIndex,
      characters: sources.characters,
      locationReferences: sources.locationReferences,
      objectReferences: sources.objectReferences,
      overrides: (scene?.referenceOverrides as SceneReferenceOverrides | undefined) ?? null,
    })
    for (const requirement of resolved) {
      const key = requirementKey(requirement)
      if (!byKey.has(key)) byKey.set(key, requirement)
    }
  }
  return [...byKey.values()]
}

/**
 * What one beat's saved `referenceSelection` names.
 *
 * This is the narrowest scope a gate can have and the only non-heuristic one:
 * the selection was resolved against the real catalog when the beat was
 * planned, so it is exactly the set of images that frame will try to attach.
 */
export function resolveBeatReferenceRequirements(input: {
  beat: Record<string, any> | null | undefined
  scene: Record<string, any> | null | undefined
  sceneIndex: number
  characters?: SceneRequirementCharacter[] | null
  locationReferences?: SceneRequirementLocation[] | null
  objectReferences?: SceneRequirementObject[] | null
}): SceneReferenceRequirement[] | null {
  const selection = input.beat?.referenceSelection as
    | {
        characterIds?: string[]
        locationRefId?: string | null
        objectRefIds?: string[]
        characterWardrobes?: Array<{ characterId?: string; wardrobeId?: string }>
      }
    | undefined
  if (!selection) return null

  // Resolving a synthetic one-beat scene reuses the whole priority ladder
  // rather than restating it, so a beat-scoped gate and a scene-scoped gate
  // cannot drift apart.
  return resolveSceneRequiredReferences({
    scene: {
      ...(input.scene ?? {}),
      beats: [{ beatId: input.beat?.beatId ?? 'beat', referenceSelection: selection }],
    },
    sceneIndex: input.sceneIndex,
    characters: input.characters,
    locationReferences: input.locationReferences,
    objectReferences: input.objectReferences,
    overrides: null,
  })
}
