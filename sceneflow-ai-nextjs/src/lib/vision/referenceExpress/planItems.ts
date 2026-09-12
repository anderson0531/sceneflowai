import '@/models'
import { Project } from '@/models/Project'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import type { CastingBriefVoiceConfig } from '@/lib/character/applyCastingBriefUpdate'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import {
  requirementKey,
  resolveSceneRequiredReferences,
  type SceneReferenceOverrides,
  type SceneReferenceRequirement,
} from '@/lib/vision/sceneReferenceRequirements'
import {
  fingerprintSource,
  type ReferenceExpressItem,
  type ReferenceExpressScope,
} from './types'

export type CastSource = {
  id?: string
  name?: string
  type?: string
  role?: string
  gender?: string
  ethnicity?: string
  referenceImage?: string
  description?: string
  appearance?: string
  appearanceDescription?: string
  age?: string | number
  personality?: string
  defaultWardrobe?: string
  wardrobeAccessories?: string
  voiceDescription?: string
  voiceConfig?: CastingBriefVoiceConfig
  wardrobes?: Array<{
    id?: string
    name?: string
    description?: string
    accessories?: string
    isDefault?: boolean
    headshotUrl?: string
    fullBodyUrl?: string
    previewImageUrl?: string
    sceneNumbers?: number[]
    needsImageRegen?: boolean
  }>
  [key: string]: unknown
}

export type LocationSource = {
  id: string
  location?: string
  locationDisplay?: string
  imageUrl?: string
  intExt?: string
  timeOfDay?: string
  description?: string
  /** 1-based scenes this location was assigned to by the library. */
  sceneNumbers?: number[]
  [key: string]: unknown
}

export type PropSource = {
  id: string
  name?: string
  imageUrl?: string
  description?: string
  generationPrompt?: string
  category?: string
  importance?: string
  sceneNumbers?: number[]
  [key: string]: unknown
}

export type ReferenceExpressPlanInput = {
  characters: CastSource[]
  locations: LocationSource[]
  props: PropSource[]
  /** Script scenes, so a run can be planned against particular scenes. */
  scenes?: Array<Record<string, any>>
}

/** Age arrives as either a band ("late 50s") or a number, depending on the source. */
export function castAgeText(age?: string | number): string | undefined {
  return age == null || age === '' ? undefined : String(age)
}

/** Prompt inputs for a cast item, in the order `buildCharacterReferencePrompt` reads them. */
export function castFingerprint(character: CastSource): string {
  const defaultWardrobe = (character.wardrobes || []).find((w) => w?.isDefault)
  return fingerprintSource([
    character.name,
    character.description,
    character.appearance,
    character.appearanceDescription,
    castAgeText(character.age),
    character.personality,
    character.defaultWardrobe ?? defaultWardrobe?.description,
    character.wardrobeAccessories ?? defaultWardrobe?.accessories,
  ])
}

export function locationFingerprint(location: LocationSource): string {
  return fingerprintSource([
    location.location,
    location.intExt,
    location.timeOfDay,
    location.description,
  ])
}

export function propFingerprint(prop: PropSource): string {
  return fingerprintSource([
    prop.name,
    prop.description,
    prop.generationPrompt,
    prop.category,
  ])
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

/**
 * Plan the batch: every reference still missing an image, cast first so
 * character identity exists before locations and props are drawn around it.
 *
 * Narrators are skipped — they have no on-screen appearance to render.
 */
export function planReferenceExpressItems(
  input: ReferenceExpressPlanInput
): ReferenceExpressItem[] {
  const items: ReferenceExpressItem[] = []

  input.characters.forEach((character, index) => {
    if (character.type === 'narrator') return
    if (hasImage(character.referenceImage)) return
    items.push({
      kind: 'cast',
      targetId: resolveCharacterId(character, index),
      label: character.name?.trim() || `Character ${index + 1}`,
      sourceFingerprint: castFingerprint(character),
    })
  })

  input.locations.forEach((location) => {
    if (hasImage(location.imageUrl)) return
    if (!location.id) return
    items.push({
      kind: 'location',
      targetId: location.id,
      label: location.location?.trim() || location.locationDisplay?.trim() || 'Location',
      sourceFingerprint: locationFingerprint(location),
    })
  })

  input.props.forEach((prop) => {
    if (hasImage(prop.imageUrl)) return
    if (!prop.id) return
    items.push({
      kind: 'prop',
      targetId: prop.id,
      label: prop.name?.trim() || 'Prop',
      sourceFingerprint: propFingerprint(prop),
    })
  })

  return items
}

/** Requirement cast ids fall back to the character name, so match on either. */
function findCastIndex(characters: CastSource[], idOrName: string): number {
  const needle = idOrName.trim().toLowerCase()
  if (!needle) return -1
  const byId = characters.findIndex(
    (character) => String(character.id ?? '').toLowerCase() === needle
  )
  if (byId >= 0) return byId
  return characters.findIndex(
    (character) => String(character.name ?? '').trim().toLowerCase() === needle
  )
}

/**
 * Emit the items these requirements call for, cast first so character identity
 * exists before locations and props are drawn around it — the same ordering the
 * project-wide plan uses.
 *
 * Wardrobe requirements are dropped: Reference Express draws cast, locations
 * and props, and wardrobe images come from the character's own wardrobe pass.
 */
function planItemsForRequirements(
  input: ReferenceExpressPlanInput,
  requirements: SceneReferenceRequirement[]
): ReferenceExpressItem[] {
  const items: ReferenceExpressItem[] = []
  const seen = new Set<string>()
  const push = (item: ReferenceExpressItem) => {
    const key = `${item.kind}:${item.targetId}`
    if (seen.has(key)) return
    seen.add(key)
    items.push(item)
  }

  for (const requirement of requirements) {
    if (requirement.kind !== 'cast') continue
    const index = findCastIndex(input.characters, requirement.id)
    if (index < 0) continue
    const character = input.characters[index]
    if (character.type === 'narrator') continue
    if (hasImage(character.referenceImage)) continue
    push({
      kind: 'cast',
      targetId: resolveCharacterId(character, index),
      label: character.name?.trim() || `Character ${index + 1}`,
      sourceFingerprint: castFingerprint(character),
    })
  }

  for (const requirement of requirements) {
    if (requirement.kind !== 'location') continue
    const location = input.locations.find((row) => row.id === requirement.id)
    if (!location?.id || hasImage(location.imageUrl)) continue
    push({
      kind: 'location',
      targetId: location.id,
      label: location.location?.trim() || location.locationDisplay?.trim() || 'Location',
      sourceFingerprint: locationFingerprint(location),
    })
  }

  for (const requirement of requirements) {
    if (requirement.kind !== 'prop') continue
    const prop = input.props.find((row) => row.id === requirement.id)
    if (!prop?.id || hasImage(prop.imageUrl)) continue
    push({
      kind: 'prop',
      targetId: prop.id,
      label: prop.name?.trim() || 'Prop',
      sourceFingerprint: propFingerprint(prop),
    })
  }

  return items
}

/** Narrow a plan to the rows the caller named, by requirement key. */
function applyItemKeyFilter(
  items: ReferenceExpressItem[],
  itemKeys: string[] | undefined,
  input: ReferenceExpressPlanInput
): ReferenceExpressItem[] {
  if (!itemKeys?.length) return items
  const wanted = new Set(itemKeys.map((key) => key.trim().toLowerCase()))
  return items.filter((item) => {
    if (wanted.has(`${item.kind}:${item.targetId}`.toLowerCase())) return true
    if (item.kind !== 'cast') return false
    const name = input.characters
      .find((character, index) => resolveCharacterId(character, index) === item.targetId)
      ?.name?.trim()
      .toLowerCase()
    return !!name && wanted.has(`cast:${name}`)
  })
}

/**
 * Plan only what the given scenes need.
 *
 * A scene typically needs two characters, one location and a prop or two, so
 * this is the difference between four items and the whole library — and
 * between starting production at the scene card and detouring through the
 * Reference Library first.
 *
 * Deliberately a planning change and nothing else: the worker, the lease
 * guard, the `generation_jobs` row, Inngest dispatch and the browser's
 * rehydration all behave identically on a shorter `payload.items`.
 */
export function planSceneReferenceExpressItems(
  input: ReferenceExpressPlanInput,
  scope: ReferenceExpressScope = {}
): ReferenceExpressItem[] {
  const scenes = input.scenes ?? []
  const sceneIndices = [...new Set(scope.sceneIndices ?? [])]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < scenes.length)
    .sort((a, b) => a - b)

  // No usable scene scope — the project-wide plan is the honest answer.
  if (sceneIndices.length === 0) {
    return applyItemKeyFilter(planReferenceExpressItems(input), scope.itemKeys, input)
  }

  const wanted = scope.itemKeys?.length
    ? new Set(scope.itemKeys.map((key) => key.trim().toLowerCase()))
    : null

  const requirements = new Map<string, SceneReferenceRequirement>()
  for (const sceneIndex of sceneIndices) {
    const scene = scenes[sceneIndex]
    const resolved = resolveSceneRequiredReferences({
      scene,
      sceneIndex,
      characters: input.characters,
      locationReferences: input.locations,
      objectReferences: input.props,
      overrides: (scene?.referenceOverrides as SceneReferenceOverrides | undefined) ?? null,
    })
    for (const requirement of resolved) {
      const key = requirementKey(requirement)
      if (wanted && !wanted.has(key.toLowerCase())) continue
      if (!requirements.has(key)) requirements.set(key, requirement)
    }
  }

  return planItemsForRequirements(input, [...requirements.values()])
}

export type ReferenceExpressContext = ReferenceExpressPlanInput & {
  /** Same shape the vision page passes to the Casting Brief generator. */
  screenplayContext: ScreenplayContext
}

/** Read the reference slices of a project's metadata. */
export async function loadReferenceExpressContext(
  projectId: string
): Promise<ReferenceExpressContext | null> {
  const project = await Project.findByPk(projectId)
  if (!project) return null

  const metadata: Record<string, any> = project.metadata || {}
  const visionPhase: Record<string, any> = metadata.visionPhase || {}
  const references: Record<string, any> = visionPhase.references || {}
  const treatment: Record<string, any> = metadata.filmTreatmentVariant || {}

  return {
    characters: Array.isArray(visionPhase.characters) ? visionPhase.characters : [],
    locations: Array.isArray(references.locationReferences)
      ? references.locationReferences
      : [],
    props: Array.isArray(references.objectReferences) ? references.objectReferences : [],
    scenes: Array.isArray(visionPhase.script?.script?.scenes)
      ? visionPhase.script.script.scenes
      : [],
    screenplayContext: {
      genre: project.genre,
      tone: project.tone || treatment.tone_description || treatment.tone,
      setting: treatment.setting,
      logline: visionPhase.script?.logline || project.description,
    },
  }
}
