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
 * Wardrobe is the one kind Reference Express cannot draw — a wardrobe image
 * comes from the character's own wardrobe pass. Listing it on the scene card
 * is useful; waiting on it is not, because nothing in the batch will ever
 * fill it.
 */
const EXPRESS_KIND_BY_REQUIREMENT: Partial<
  Record<SceneReferenceRequirementKind, ReferenceExpressKind>
> = {
  cast: 'cast',
  location: 'location',
  prop: 'prop',
}

export function expressKindForRequirement(
  kind: SceneReferenceRequirementKind
): ReferenceExpressKind | null {
  return EXPRESS_KIND_BY_REQUIREMENT[kind] ?? null
}

/** The rows an Express References run would actually draw for this scene. */
export function selectUndrawnExpressableRequirements(
  requirements: SceneReferenceRequirement[]
): SceneReferenceRequirement[] {
  return requirements.filter(
    (requirement) =>
      !hasImage(requirement.imageUrl) && !!expressKindForRequirement(requirement.kind)
  )
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
  const wardrobes = new Map<string, string>()
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
    for (const id of selection.objectRefIds ?? []) {
      if (typeof id === 'string' && id.trim()) objectRefIds.add(id.trim())
    }
    for (const entry of selection.characterWardrobes ?? []) {
      if (entry?.characterId && entry?.wardrobeId) {
        wardrobes.set(String(entry.characterId), String(entry.wardrobeId))
      }
    }
  }

  return {
    characterIds: [...characterIds],
    locationRefIds: [...locationRefIds],
    objectRefIds: [...objectRefIds],
    characterWardrobes: [...wardrobes].map(([characterId, wardrobeId]) => ({
      characterId,
      wardrobeId,
    })),
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
  // when one of its explicit branches can hit. Its last resort logs a warning
  // per call, and "this character wears their default outfit" is not a warning.
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

  const fallback = wardrobes.find((w) => w.isDefault === true)
  return fallback ? { wardrobe: fallback, source: 'detected' } : null
}

function wardrobeImageUrl(wardrobe: Record<string, unknown>): string | undefined {
  for (const field of ['headshotUrl', 'fullBodyUrl', 'previewImageUrl'] as const) {
    const value = wardrobe[field]
    if (hasImage(value)) return (value as string).trim()
  }
  return undefined
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
  // after the cast rather than alongside it.
  const castIds = [...collected.values()]
    .filter((requirement) => requirement.kind === 'cast')
    .map((requirement) => requirement.id)
  for (const castId of castIds) {
    const character = findCharacter(characters, castId)
    if (!character) continue
    const pick = pickSceneWardrobe(character, scene, sceneIndex, plan.characterWardrobes)
    if (!pick) continue
    const wardrobeId = typeof pick.wardrobe.id === 'string' ? pick.wardrobe.id : ''
    if (!wardrobeId) continue
    const characterName = character.name?.trim() || castId
    const wardrobeName =
      typeof pick.wardrobe.name === 'string' && pick.wardrobe.name.trim()
        ? pick.wardrobe.name.trim()
        : 'Wardrobe'
    add({
      kind: 'wardrobe',
      id: wardrobeId,
      name: `${characterName} — ${wardrobeName}`,
      imageUrl: wardrobeImageUrl(pick.wardrobe),
      source: pick.source,
      stale: pick.wardrobe.needsImageRegen === true || undefined,
      characterId: castId,
      characterName,
    })
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

  for (const refId of plan.locationRefIds) {
    const ref = locationRefs.find((candidate) => candidate.id === refId)
    if (ref) addLocation(ref, 'beat-plan')
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
      (requirement) => requirement.kind === 'location'
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
  return [...collected.values()].sort(
    (a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)
  )
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
