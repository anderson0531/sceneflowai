import '@/models'
import { Project } from '@/models/Project'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import type { CastingBriefVoiceConfig } from '@/lib/character/applyCastingBriefUpdate'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import {
  requirementKey,
  readProjectReferenceSources,
  resolveSceneRequiredReferences,
  type SceneReferenceOverrides,
  type SceneReferenceRequirement,
} from '@/lib/vision/sceneReferenceRequirements'
import {
  fingerprintSource,
  referenceExpressItemKey,
  type ReferenceExpressItem,
  type ReferenceExpressKind,
  type ReferenceExpressScope,
} from './types'
import {
  parseLocationVersionRequirementId,
} from '@/lib/vision/locationVersionResolve'

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
    appearanceNotes?: string
    isDefault?: boolean
    headshotUrl?: string
    fullBodyUrl?: string
    combinedCharacterRefUrl?: string
    previewImageUrl?: string
    sceneNumbers?: number[]
    needsImageRegen?: boolean
    generationPrompt?: string
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
  versions?: Array<{
    id?: string
    name?: string
    stateNotes?: string
    imageUrl?: string
    generationPrompt?: string
    needsImageRegen?: boolean
  }>
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
  const firstWardrobe = (character.wardrobes || [])[0]
  return fingerprintSource([
    character.name,
    character.description,
    character.appearance,
    character.appearanceDescription,
    castAgeText(character.age),
    character.personality,
    character.defaultWardrobe ?? firstWardrobe?.description,
    character.wardrobeAccessories ?? firstWardrobe?.accessories,
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

export function locationVersionFingerprint(
  location: LocationSource,
  version: { name?: string; stateNotes?: string }
): string {
  return fingerprintSource([
    location.location,
    location.intExt,
    location.timeOfDay,
    location.description,
    version.name,
    version.stateNotes,
  ])
}

export function wardrobeFingerprint(wardrobe: {
  name?: string
  description?: string
  accessories?: string
  appearanceNotes?: string
}): string {
  return fingerprintSource([
    wardrobe.name,
    wardrobe.description,
    wardrobe.accessories,
    wardrobe.appearanceNotes,
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

function wardrobeImageUrl(wardrobe: {
  headshotUrl?: string
  fullBodyUrl?: string
  previewImageUrl?: string
}): string | undefined {
  for (const field of ['headshotUrl', 'fullBodyUrl', 'previewImageUrl'] as const) {
    const value = wardrobe[field]
    if (hasImage(value)) return value!.trim()
  }
  return undefined
}

function versionNeedsGeneration(
  location: { imageUrl?: string },
  version: { id?: string; stateNotes?: string; imageUrl?: string; needsImageRegen?: boolean }
): boolean {
  if (!version.id) return false
  if (!hasImage(location.imageUrl)) return false
  if (!version.stateNotes?.trim()) return false
  return !hasImage(version.imageUrl) || !!version.needsImageRegen
}

function wardrobeNeedsGeneration(
  character: CastSource,
  wardrobe: NonNullable<CastSource['wardrobes']>[number],
  mode: 'stale' | 'undrawn-or-stale'
): boolean {
  if (!wardrobe.id) return false
  if (!hasImage(character.referenceImage)) return false
  if (!wardrobe.description?.trim()) return false
  if (mode === 'stale') return !!wardrobe.needsImageRegen
  return !wardrobeImageUrl(wardrobe) || !!wardrobe.needsImageRegen
}

export function shouldIncludeNestedStills(scope: ReferenceExpressScope): boolean {
  if (scope.includeNestedStills === true) return true
  if (scope.includeNestedStills === false) return false
  if (scope.sceneIndices?.length) return true
  return (
    scope.kinds?.length === 1 &&
    (scope.kinds[0] === 'location' || scope.kinds[0] === 'cast')
  )
}

/** Project-wide Location Agent: catalog sync runs even when no stills are planned yet. */
export function wantsLocationCatalogSync(scope: ReferenceExpressScope): boolean {
  return scope.kinds?.length === 1 && scope.kinds[0] === 'location' && !scope.sceneIndices?.length
}

export function canStartReferenceExpressJob(
  items: { length: number },
  scope: ReferenceExpressScope
): boolean {
  return items.length > 0 || wantsLocationCatalogSync(scope)
}

const EXPRESS_KINDS: readonly ReferenceExpressKind[] = ['cast', 'location', 'prop']

export function filterExpressItemsByKinds(
  items: ReferenceExpressItem[],
  kinds?: ReferenceExpressKind[]
): ReferenceExpressItem[] {
  if (!kinds?.length) return items
  const wanted = new Set(kinds.filter((kind) => EXPRESS_KINDS.includes(kind)))
  if (wanted.size === 0) return items
  return items.filter((item) => wanted.has(item.kind))
}

/**
 * Plan the batch: every reference still missing an image, cast first so
 * character identity exists before locations and props are drawn around it.
 *
 * Narrators are skipped — they have no on-screen appearance to render.
 * Project Library Agent stays bases-only. Location / Cast Agents pass
 * `includeNestedStills` (or a single kind) so set versions and stale wardrobes
 * join the same job.
 */
export function planReferenceExpressItems(
  input: ReferenceExpressPlanInput,
  kinds?: ReferenceExpressKind[],
  options?: { includeNestedStills?: boolean }
): ReferenceExpressItem[] {
  const items: ReferenceExpressItem[] = []
  const includeNested = options?.includeNestedStills === true

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

  if (includeNested) {
    input.characters.forEach((character, index) => {
      if (character.type === 'narrator') return
      const targetId = resolveCharacterId(character, index)
      const characterName = character.name?.trim() || `Character ${index + 1}`
      for (const wardrobe of character.wardrobes || []) {
        if (!wardrobeNeedsGeneration(character, wardrobe, 'stale')) continue
        items.push({
          kind: 'cast',
          targetId,
          wardrobeId: wardrobe.id,
          label: `${characterName} — ${wardrobe.name?.trim() || 'Wardrobe'}`,
          sourceFingerprint: wardrobeFingerprint(wardrobe),
        })
      }
    })
  }

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

  if (includeNested) {
    input.locations.forEach((location) => {
      if (!location.id) return
      for (const version of location.versions || []) {
        if (!versionNeedsGeneration(location, version)) continue
        items.push(locationVersionItem(location, version))
      }
    })
  }

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

  return filterExpressItemsByKinds(items, kinds)
}

function locationVersionItem(
  location: LocationSource,
  version: NonNullable<LocationSource['versions']>[number]
): ReferenceExpressItem {
  const locationName = location.location?.trim() || location.locationDisplay?.trim() || 'Location'
  const versionName = version.name?.trim() || 'Set version'
  return {
    kind: 'location',
    targetId: location.id,
    versionId: version.id,
    label: `${locationName} — ${versionName}`,
    sourceFingerprint: locationVersionFingerprint(location, version),
  }
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
 * Scene Ref Agent includes set versions and wardrobe looks used here. Versions
 * and wardrobe whose parent still is still missing are skipped here and
 * appended after that parent still lands in the same job.
 */
function planItemsForRequirements(
  input: ReferenceExpressPlanInput,
  requirements: SceneReferenceRequirement[],
  options?: { forceRegenerate?: boolean }
): ReferenceExpressItem[] {
  const items: ReferenceExpressItem[] = []
  const seen = new Set<string>()
  const force = options?.forceRegenerate === true
  const withForce = (item: ReferenceExpressItem): ReferenceExpressItem =>
    force ? { ...item, forceRegenerate: true } : item
  const push = (item: ReferenceExpressItem) => {
    const key = referenceExpressItemKey(item)
    if (seen.has(key)) return
    seen.add(key)
    items.push(withForce(item))
  }

  for (const requirement of requirements) {
    if (requirement.kind !== 'cast') continue
    const index = findCastIndex(input.characters, requirement.id)
    if (index < 0) continue
    const character = input.characters[index]
    if (character.type === 'narrator') continue
    if (hasImage(character.referenceImage) && !requirement.stale && !force) continue
    push({
      kind: 'cast',
      targetId: resolveCharacterId(character, index),
      label: character.name?.trim() || `Character ${index + 1}`,
      sourceFingerprint: castFingerprint(character),
    })
  }

  for (const requirement of requirements) {
    if (requirement.kind !== 'wardrobe') continue
    const characterId = requirement.characterId || ''
    const index = findCastIndex(input.characters, characterId || requirement.id)
    if (index < 0) continue
    const character = input.characters[index]
    const wardrobe = (character.wardrobes || []).find((row) => row.id === requirement.id)
    if (!wardrobe?.id) continue
    if (!hasImage(character.referenceImage)) continue
    if (!wardrobe.description?.trim()) continue
    if (!force && !wardrobeNeedsGeneration(character, wardrobe, 'undrawn-or-stale')) continue
    const characterName = character.name?.trim() || `Character ${index + 1}`
    push({
      kind: 'cast',
      targetId: resolveCharacterId(character, index),
      wardrobeId: wardrobe.id,
      label: `${characterName} — ${wardrobe.name?.trim() || 'Wardrobe'}`,
      sourceFingerprint: wardrobeFingerprint(wardrobe),
    })
  }

  for (const requirement of requirements) {
    if (requirement.kind !== 'location') continue
    const parsed = parseLocationVersionRequirementId(requirement.id)
    if (parsed) {
      const location = input.locations.find((row) => row.id === parsed.locationId)
      const version = (location?.versions || []).find((row) => row.id === parsed.versionId)
      if (!location?.id || !version) continue
      if (!hasImage(location.imageUrl)) continue
      if (!version.stateNotes?.trim()) continue
      if (!force && !versionNeedsGeneration(location, version)) continue
      push(locationVersionItem(location, version))
      continue
    }
    const location = input.locations.find((row) => row.id === requirement.id)
    if (!location?.id) continue
    if (hasImage(location.imageUrl) && !requirement.stale && !force) continue
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
    if (!prop?.id) continue
    if (hasImage(prop.imageUrl) && !force) continue
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
    if (wanted.has(referenceExpressItemKey(item).toLowerCase())) return true
    if (wanted.has(`${item.kind}:${item.targetId}`.toLowerCase())) return true
    if (item.kind !== 'cast') return false
    const name = input.characters
      .find((character, index) => resolveCharacterId(character, index) === item.targetId)
      ?.name?.trim()
      .toLowerCase()
    return !!name && wanted.has(`cast:${name}`)
  })
}

function sceneRequirementVersionIds(
  input: ReferenceExpressPlanInput,
  scope: ReferenceExpressScope,
  locationId: string
): Set<string> | null {
  const sceneIndices = scope.sceneIndices
  if (!sceneIndices?.length || !input.scenes?.length) return null
  const wanted = new Set<string>()
  for (const sceneIndex of sceneIndices) {
    const scene = input.scenes[sceneIndex]
    if (!scene) continue
    const resolved = resolveSceneRequiredReferences({
      scene,
      sceneIndex,
      characters: input.characters,
      locationReferences: input.locations,
      objectReferences: input.props,
      overrides: (scene?.referenceOverrides as SceneReferenceOverrides | undefined) ?? null,
    })
    for (const requirement of resolved) {
      if (requirement.kind !== 'location') continue
      const parsed = parseLocationVersionRequirementId(requirement.id)
      if (parsed?.locationId === locationId) wanted.add(parsed.versionId)
    }
  }
  return wanted
}

function sceneRequirementWardrobeIds(
  input: ReferenceExpressPlanInput,
  scope: ReferenceExpressScope,
  characterId: string
): Set<string> | null {
  const sceneIndices = scope.sceneIndices
  if (!sceneIndices?.length || !input.scenes?.length) return null
  const wanted = new Set<string>()
  for (const sceneIndex of sceneIndices) {
    const scene = input.scenes[sceneIndex]
    if (!scene) continue
    const resolved = resolveSceneRequiredReferences({
      scene,
      sceneIndex,
      characters: input.characters,
      locationReferences: input.locations,
      objectReferences: input.props,
      overrides: (scene?.referenceOverrides as SceneReferenceOverrides | undefined) ?? null,
    })
    for (const requirement of resolved) {
      if (requirement.kind !== 'wardrobe') continue
      if (requirement.characterId === characterId || requirement.id) {
        if (!requirement.characterId || requirement.characterId === characterId) {
          wanted.add(requirement.id)
        }
      }
    }
  }
  return wanted
}

/**
 * After a new base or identity still lands, queue that row's nested stills so
 * Location / Cast / Scene Ref Agent can keep going without a client wait.
 */
export function planFollowOnNestedItems(
  item: ReferenceExpressItem,
  input: ReferenceExpressPlanInput,
  scope: ReferenceExpressScope = {}
): ReferenceExpressItem[] {
  if (!shouldIncludeNestedStills(scope)) return []

  if (item.kind === 'location' && !item.versionId) {
    const location = input.locations.find((row) => row.id === item.targetId)
    if (!location?.id) return []
    const wanted = sceneRequirementVersionIds(input, scope, location.id)
    return (location.versions || [])
      .filter((version) => {
        if (!versionNeedsGeneration(location, version)) return false
        if (wanted && !wanted.has(version.id!)) return false
        return true
      })
      .map((version) => locationVersionItem(location, version))
  }

  if (item.kind === 'cast' && !item.wardrobeId) {
    const index = input.characters.findIndex(
      (character, idx) => resolveCharacterId(character, idx) === item.targetId
    )
    if (index < 0) return []
    const character = input.characters[index]
    const characterName = character.name?.trim() || `Character ${index + 1}`
    const sceneScoped = !!scope.sceneIndices?.length
    const wanted = sceneRequirementWardrobeIds(input, scope, item.targetId)
    return (character.wardrobes || [])
      .filter((wardrobe) => {
        if (
          !wardrobeNeedsGeneration(
            character,
            wardrobe,
            sceneScoped ? 'undrawn-or-stale' : 'stale'
          )
        ) {
          return false
        }
        if (wanted && !wanted.has(wardrobe.id!)) return false
        return true
      })
      .map((wardrobe) => ({
        kind: 'cast' as const,
        targetId: item.targetId,
        wardrobeId: wardrobe.id,
        label: `${characterName} — ${wardrobe.name?.trim() || 'Wardrobe'}`,
        sourceFingerprint: wardrobeFingerprint(wardrobe),
      }))
  }

  return []
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
    return applyItemKeyFilter(
      planReferenceExpressItems(input, scope.kinds, {
        includeNestedStills: shouldIncludeNestedStills(scope),
      }),
      scope.itemKeys,
      input
    )
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

  return filterExpressItemsByKinds(
    planItemsForRequirements(input, [...requirements.values()], {
      forceRegenerate: !!wanted,
    }),
    scope.kinds
  )
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
  const sources = readProjectReferenceSources(project)
  const treatment: Record<string, any> = metadata.filmTreatmentVariant || {}

  return {
    characters: sources.characters,
    locations: sources.locationReferences,
    props: sources.objectReferences,
    scenes: sources.scenes,
    screenplayContext: {
      genre: project.genre,
      tone: project.tone || treatment.tone_description || treatment.tone,
      setting: treatment.setting,
      logline: visionPhase.script?.logline || project.description,
    },
  }
}
