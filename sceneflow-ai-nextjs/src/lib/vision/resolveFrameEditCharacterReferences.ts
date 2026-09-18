/**
 * Resolve character identity + wardrobe URLs for the Edit frame dialog.
 */

import { findSceneCharacters } from '@/lib/character/matching'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'
import {
  buildIdentityReferenceLabel,
  buildWardrobeDiptychReferenceLabel,
  buildWardrobeReferenceLabel,
  resolveCharacterReferencePair,
  resolveWardrobeIdForCharacterInScene,
} from '@/lib/character/characterReferenceAssembly'
import { resolveBeatFrameGenerationContext } from '@/lib/vision/beatFrameGenerationContext'
import {
  buildCharacterReferenceEntries,
  buildLocationReferenceEntry,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import { locationVersionRequirementId } from '@/lib/vision/locationVersionResolve'
import { findMatchingLocationReferences } from '@/lib/vision/frameGenerationContext'

export interface FrameEditCharacterReference {
  characterName: string
  identityImageUrl?: string
  wardrobeImageUrl?: string
  wardrobeDiptychUrl?: string
}

export type FrameEditEditingFrame =
  | { kind: 'establishing'; sceneIndex: number; imageUrl: string }
  | { kind: 'beat'; sceneIndex: number; beatId: string; imageUrl: string }
  | { kind: 'dialogue'; sceneIndex: number; dialogueIndex: number; imageUrl: string }
  | { kind: 'custom'; sceneIndex: number; customFrameId: string; imageUrl: string }

function sceneHeadingText(scene: Record<string, unknown>): string {
  const heading = scene?.heading
  if (typeof heading === 'string') return heading
  if (heading && typeof heading === 'object' && 'text' in heading) {
    return String((heading as { text?: string }).text || '')
  }
  return ''
}

function buildSceneWideDetectionText(scene: Record<string, unknown>): string {
  const beatText = getSceneBeats(scene)
    .map((beat) =>
      [beat.actionDescription || '', beat.line || '', beat.character || ''].filter(Boolean).join(' ')
    )
    .join(' ')
  return [
    sceneHeadingText(scene),
    scene.action || '',
    scene.visualDescription || '',
    ...(Array.isArray(scene.dialogue)
      ? scene.dialogue.map((d: { character?: string }) => d.character || '')
      : []),
    beatText,
  ]
    .filter(Boolean)
    .join(' ')
}

function characterHasUsableReference(character: Record<string, unknown>): boolean {
  const refImage = character.referenceImage
  if (typeof refImage === 'string' && refImage.trim()) return true
  const wardrobes = character.wardrobes
  if (!Array.isArray(wardrobes)) return false
  return wardrobes.some((w) => {
    const wardrobe = w as { fullBodyUrl?: string; headshotUrl?: string }
    return (
      (typeof wardrobe.fullBodyUrl === 'string' && wardrobe.fullBodyUrl.trim()) ||
      (typeof wardrobe.headshotUrl === 'string' && wardrobe.headshotUrl.trim())
    )
  })
}

function allProjectCharactersWithUsableReferences(
  projectCharacters: Array<Record<string, unknown>>
): string[] {
  return projectCharacters
    .filter((c) => typeof c.name === 'string' && characterHasUsableReference(c))
    .map((c) => String(c.name))
}

function fillSelectedWardrobesForCharacters(
  characterNames: string[],
  projectCharacters: Array<Record<string, unknown>>,
  scene: Record<string, unknown>,
  sceneIndex: number,
  existing: Record<string, string> = {}
): Record<string, string> {
  const selectedWardrobes = { ...existing }
  for (const name of characterNames) {
    if (selectedWardrobes[name]) continue
    const char = projectCharacters.find((c) => c.name === name)
    if (!char) continue
    const wardrobeId = resolveWardrobeIdForCharacterInScene(char, scene, sceneIndex)
    if (wardrobeId) selectedWardrobes[name] = wardrobeId
  }
  return selectedWardrobes
}

function characterWardrobesFromNames(
  characterNames: string[],
  selectedWardrobes: Record<string, string>,
  projectCharacters: Array<Record<string, unknown>>
): Array<{ characterId: string; wardrobeId: string }> {
  const result: Array<{ characterId: string; wardrobeId: string }> = []
  for (const name of characterNames) {
    const wardrobeId = selectedWardrobes[name]
    if (!wardrobeId) continue
    const char = projectCharacters.find((c) => c.name === name)
    const characterId = (char?.id as string) || name
    if (characterId && wardrobeId) {
      result.push({ characterId, wardrobeId })
    }
  }
  return result
}

function resolveCharacterNamesForBeat(
  beat: SceneBeat,
  scene: Record<string, unknown>,
  sceneIndex: number,
  projectCharacters: Array<Record<string, unknown>>,
  locationReferences: LocationReference[],
  objectReferences: VisualReference[],
  filmTitle?: string
): { characterNames: string[]; characterWardrobes: Array<{ characterId: string; wardrobeId: string }> } {
  const auto = resolveBeatFrameGenerationContext({
    scene,
    beat,
    sceneIndex,
    projectCharacters: projectCharacters as Array<{ id?: string; name?: string; referenceImage?: string }>,
    locationReferences,
    objectReferences,
    filmTitle,
  })
  const saved = beat.referenceSelection
  const characterNames = saved?.resolvedAt
    ? (saved.characterIds
        .map((id) => projectCharacters.find((c) => c.id === id || c.name === id)?.name)
        .filter(Boolean) as string[])
    : auto.characterNames

  const selectedWardrobes: Record<string, string> = {}
  const wardrobeSource = saved?.characterWardrobes?.length
    ? saved.characterWardrobes
    : auto.characterWardrobes
  for (const cw of wardrobeSource || []) {
    const char = projectCharacters.find((c) => c.id === cw.characterId)
    if (char?.name) selectedWardrobes[String(char.name)] = cw.wardrobeId
  }
  const filledWardrobes = fillSelectedWardrobesForCharacters(
    characterNames,
    projectCharacters,
    scene,
    sceneIndex,
    selectedWardrobes
  )

  return {
    characterNames,
    characterWardrobes: characterWardrobesFromNames(
      characterNames,
      filledWardrobes,
      projectCharacters
    ),
  }
}

function buildRefsForCharacter(
  character: Record<string, unknown>,
  characterName: string,
  scene: Record<string, unknown>,
  sceneIndex: number,
  characterWardrobes: Array<{ characterId: string; wardrobeId: string }>
): FrameEditCharacterReference | null {
  const refPair = resolveCharacterReferencePair({
    character,
    scene,
    sceneIndex,
    characterWardrobes,
    includeWardrobeReferenceImages: true,
    includeWardrobeDiptych: false,
  })

  const identityImageUrl = refPair.identityUrl
  const wardrobeImageUrl = refPair.wardrobeUrl
  const wardrobeDiptychUrl = refPair.wardrobeDiptychUrl

  if (!identityImageUrl && !wardrobeImageUrl && !wardrobeDiptychUrl) {
    return null
  }

  return {
    characterName,
    identityImageUrl,
    wardrobeImageUrl,
    wardrobeDiptychUrl,
  }
}

export function resolveFrameEditCharacterReferences(args: {
  editingFrame: FrameEditEditingFrame | null
  scene: Record<string, unknown> | null
  sceneIndex: number
  characters: Array<Record<string, unknown>>
  slot?: StoryboardFrameSlot | null
  locationReferences?: LocationReference[]
  objectReferences?: VisualReference[]
  filmTitle?: string
}): FrameEditCharacterReference[] {
  const {
    editingFrame,
    scene,
    sceneIndex,
    characters,
    slot,
    locationReferences = [],
    objectReferences = [],
    filmTitle,
  } = args

  if (!editingFrame || !scene) return []

  let characterNames: string[] = []
  let characterWardrobes: Array<{ characterId: string; wardrobeId: string }> = []

  if (editingFrame.kind === 'dialogue') {
    const line = Array.isArray(scene.dialogue)
      ? (scene.dialogue[editingFrame.dialogueIndex] as { character?: string } | undefined)
      : undefined
    const speakerName = line?.character?.trim()
    if (speakerName) {
      characterNames = [speakerName]
      const selectedWardrobes = fillSelectedWardrobesForCharacters(
        characterNames,
        characters,
        scene,
        sceneIndex
      )
      characterWardrobes = characterWardrobesFromNames(
        characterNames,
        selectedWardrobes,
        characters
      )
    }
  } else if (editingFrame.kind === 'beat') {
    const beat = getSceneBeats(scene).find((b) => b.beatId === editingFrame.beatId)
    if (beat) {
      const resolved = resolveCharacterNamesForBeat(
        beat,
        scene,
        sceneIndex,
        characters,
        locationReferences,
        objectReferences,
        filmTitle
      )
      characterNames = resolved.characterNames
      characterWardrobes = resolved.characterWardrobes
    }
  } else if (editingFrame.kind === 'custom') {
    const frames = Array.isArray(scene.storyboardFrames)
      ? (scene.storyboardFrames as Array<Record<string, unknown>>)
      : []
    const frame = frames.find((f) => f.id === editingFrame.customFrameId)
    const charName = typeof frame?.character === 'string' ? frame.character.trim() : ''
    if (charName) {
      characterNames = [charName]
      const selectedWardrobes = fillSelectedWardrobesForCharacters(
        characterNames,
        characters,
        scene,
        sceneIndex
      )
      characterWardrobes = characterWardrobesFromNames(
        characterNames,
        selectedWardrobes,
        characters
      )
    }
  } else if (slot?.beatId) {
    const beat = getSceneBeats(scene).find((b) => b.beatId === slot.beatId)
    if (beat) {
      const resolved = resolveCharacterNamesForBeat(
        beat,
        scene,
        sceneIndex,
        characters,
        locationReferences,
        objectReferences,
        filmTitle
      )
      characterNames = resolved.characterNames
      characterWardrobes = resolved.characterWardrobes
    }
  } else if (typeof slot?.dialogueIndex === 'number') {
    const line = Array.isArray(scene.dialogue)
      ? (scene.dialogue[slot.dialogueIndex] as { character?: string } | undefined)
      : undefined
    const speakerName = line?.character?.trim()
    if (speakerName) {
      characterNames = [speakerName]
      const selectedWardrobes = fillSelectedWardrobesForCharacters(
        characterNames,
        characters,
        scene,
        sceneIndex
      )
      characterWardrobes = characterWardrobesFromNames(
        characterNames,
        selectedWardrobes,
        characters
      )
    }
  }

  if (characterNames.length === 0) {
    const sceneText = buildSceneWideDetectionText(scene)
    const detected = findSceneCharacters(
      sceneText,
      characters as Parameters<typeof findSceneCharacters>[1],
      {
        maskPhrases: [
          ...objectReferences.map((obj) => obj.name).filter(Boolean),
          ...locationReferences.map((loc) => loc.location || loc.locationDisplay || '').filter(Boolean),
        ],
      }
    )
    characterNames = detected.map((c) => c.name).filter(Boolean) as string[]
    const selectedWardrobes = fillSelectedWardrobesForCharacters(
      characterNames,
      characters,
      scene,
      sceneIndex
    )
    characterWardrobes = characterWardrobesFromNames(
      characterNames,
      selectedWardrobes,
      characters
    )
  }

  if (characterNames.length === 0) {
    characterNames = allProjectCharactersWithUsableReferences(characters)
    const selectedWardrobes = fillSelectedWardrobesForCharacters(
      characterNames,
      characters,
      scene,
      sceneIndex
    )
    characterWardrobes = characterWardrobesFromNames(
      characterNames,
      selectedWardrobes,
      characters
    )
  }

  const seen = new Set<string>()
  const refs: FrameEditCharacterReference[] = []

  for (const name of characterNames) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    const char = characters.find((c) => c.name === name)
    if (!char) continue
    const entry = buildRefsForCharacter(char, name, scene, sceneIndex, characterWardrobes)
    if (entry) refs.push(entry)
  }

  return refs
}

export function resolveSegmentEditCharacterReferences(args: {
  segment?: {
    dialogueLines?: Array<{ character?: string; covered?: boolean }>
  } | null
  scene: Record<string, unknown>
  sceneIndex: number
  characters: Array<Record<string, unknown>>
}): FrameEditCharacterReference[] {
  const { segment, scene, sceneIndex, characters } = args
  if (!segment?.dialogueLines?.length) return []

  const characterNames = [
    ...new Set(
      segment.dialogueLines
        .filter((d) => d.covered !== false)
        .map((d) => d.character?.trim())
        .filter(Boolean) as string[]
    ),
  ]

  if (!characterNames.length) return []

  const selectedWardrobes = fillSelectedWardrobesForCharacters(
    characterNames,
    characters,
    scene,
    sceneIndex
  )
  const characterWardrobes = characterWardrobesFromNames(
    characterNames,
    selectedWardrobes,
    characters
  )

  const refs: FrameEditCharacterReference[] = []
  for (const name of characterNames) {
    const char = characters.find((c) => c.name === name)
    if (!char) continue
    const entry = buildRefsForCharacter(char, name, scene, sceneIndex, characterWardrobes)
    if (entry) refs.push(entry)
  }
  return refs
}

export type FrameEditReferenceSelectionKey =
  | `identity:${string}`
  | `wardrobe:${string}`
  | `diptych:${string}`

export function frameEditReferenceKeys(
  refs: FrameEditCharacterReference[]
): FrameEditReferenceSelectionKey[] {
  const keys: FrameEditReferenceSelectionKey[] = []
  for (const ref of refs) {
    if (ref.wardrobeDiptychUrl) {
      keys.push(`diptych:${ref.characterName}`)
    } else {
      if (ref.identityImageUrl) keys.push(`identity:${ref.characterName}`)
      if (ref.wardrobeImageUrl) keys.push(`wardrobe:${ref.characterName}`)
    }
  }
  return keys
}

export function listAllFrameEditCharacterReferences(args: {
  scene: Record<string, unknown> | null
  sceneIndex: number
  characters: Array<Record<string, unknown>>
}): FrameEditCharacterReference[] {
  const { scene, sceneIndex, characters } = args
  const characterNames = allProjectCharactersWithUsableReferences(characters)
  const selectedWardrobes = fillSelectedWardrobesForCharacters(
    characterNames,
    characters,
    scene || {},
    sceneIndex
  )
  const characterWardrobes = characterWardrobesFromNames(
    characterNames,
    selectedWardrobes,
    characters
  )

  const refs: FrameEditCharacterReference[] = []
  const seen = new Set<string>()
  for (const name of characterNames) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    const char = characters.find((c) => c.name === name)
    if (!char) continue
    const entry = buildRefsForCharacter(char, name, scene || {}, sceneIndex, characterWardrobes)
    if (entry) refs.push(entry)
  }
  return refs
}

export interface FrameEditLocationStill {
  id: string
  locationId: string
  versionId?: string
  name: string
  imageUrl: string
  kind: 'base' | 'version'
}

export function listFrameEditLocationStills(
  locations: LocationReference[] | undefined
): FrameEditLocationStill[] {
  const out: FrameEditLocationStill[] = []
  for (const loc of locations || []) {
    const locationName = loc.location || loc.locationDisplay || 'Location'
    if (typeof loc.imageUrl === 'string' && loc.imageUrl.trim()) {
      out.push({
        id: loc.id,
        locationId: loc.id,
        name: locationName,
        imageUrl: loc.imageUrl,
        kind: 'base',
      })
    }
    for (const version of loc.versions || []) {
      if (typeof version.imageUrl !== 'string' || !version.imageUrl.trim()) continue
      out.push({
        id: locationVersionRequirementId(loc.id, version.id),
        locationId: loc.id,
        versionId: version.id,
        name: `${locationName} — ${version.name}`,
        imageUrl: version.imageUrl,
        kind: 'version',
      })
    }
  }
  return out
}

function beatIdFromEditContext(
  editingFrame: FrameEditEditingFrame | null,
  slot?: StoryboardFrameSlot | null
): string | undefined {
  if (editingFrame?.kind === 'beat') return editingFrame.beatId
  return slot?.beatId
}

export function resolveDefaultFrameEditLocationStillIds(args: {
  editingFrame: FrameEditEditingFrame | null
  scene: Record<string, unknown> | null
  sceneIndex: number
  locationReferences?: LocationReference[]
  slot?: StoryboardFrameSlot | null
}): string[] {
  const stills = listFrameEditLocationStills(args.locationReferences)
  if (stills.length === 0 || !args.scene) return []

  const beatId = beatIdFromEditContext(args.editingFrame, args.slot)
  const beat = beatId ? getSceneBeats(args.scene).find((b) => b.beatId === beatId) : undefined
  const saved = beat?.referenceSelection

  const pickStill = (locationRefId?: string | null, versionId?: string | null): string | null => {
    if (!locationRefId) return null
    if (versionId) {
      const versionStillId = locationVersionRequirementId(locationRefId, versionId)
      if (stills.some((still) => still.id === versionStillId)) return versionStillId
    }
    if (stills.some((still) => still.id === locationRefId)) return locationRefId
    return null
  }

  if (saved?.locationRefId) {
    const selected = pickStill(saved.locationRefId, saved.locationVersionId)
    if (selected) return [selected]
  }

  if (beat) {
    const auto = resolveBeatFrameGenerationContext({
      scene: args.scene,
      beat,
      sceneIndex: args.sceneIndex,
      projectCharacters: [],
      locationReferences: args.locationReferences || [],
      objectReferences: [],
    })
    const selected = pickStill(auto.locationRefId, auto.locationVersionId)
    if (selected) return [selected]
  }

  const matched = findMatchingLocationReferences(
    args.scene,
    args.locationReferences || [],
    args.sceneIndex
  )
  const first = matched[0]
  if (first?.id) {
    const selected = pickStill(first.id, null)
    if (selected) return [selected]
  }

  return []
}

export function resolveDefaultFrameEditObjectIds(args: {
  editingFrame: FrameEditEditingFrame | null
  scene: Record<string, unknown> | null
  sceneIndex: number
  objectReferences?: Array<{ id: string; name: string; imageUrl?: string }>
  locationReferences?: LocationReference[]
  characters?: Array<Record<string, unknown>>
  slot?: StoryboardFrameSlot | null
}): string[] {
  const objects = (args.objectReferences || []).filter(
    (obj) => obj.id && typeof obj.imageUrl === 'string' && obj.imageUrl.trim()
  )
  if (objects.length === 0 || !args.scene) return []

  const hasId = (id: string) => objects.some((obj) => obj.id === id)
  const beatId = beatIdFromEditContext(args.editingFrame, args.slot)
  const beat = beatId ? getSceneBeats(args.scene).find((b) => b.beatId === beatId) : undefined
  const saved = beat?.referenceSelection

  if (saved?.objectRefIds?.length) {
    const fromSaved = saved.objectRefIds.filter(hasId)
    if (fromSaved.length > 0) return fromSaved
  }

  if (beat) {
    const auto = resolveBeatFrameGenerationContext({
      scene: args.scene,
      beat,
      sceneIndex: args.sceneIndex,
      projectCharacters: args.characters || [],
      locationReferences: args.locationReferences || [],
      objectReferences: objects as VisualReference[],
    })
    const fromAuto = auto.objectRefIds.filter(hasId)
    if (fromAuto.length > 0) return fromAuto
  }

  const keyProps = (beat?.beatDirection?.keyProps || []).map((name) => name.toLowerCase())
  if (keyProps.length === 0) return []
  return objects
    .filter((obj) => {
      const name = obj.name.toLowerCase()
      return keyProps.some((prop) => prop === name || prop.includes(name) || name.includes(prop))
    })
    .map((obj) => obj.id)
}

export function appendUseTheseReferencesClause(
  instruction: string,
  refs: Array<{ name?: string }>
): string {
  const names = refs.map((ref) => ref.name?.trim()).filter((name): name is string => Boolean(name))
  const trimmed = instruction.trim()
  if (names.length === 0) return trimmed
  return `${trimmed}\n\nUse these references: ${names.join('; ')}.`
}

export function buildFrameEditReferenceImages(args: {
  characterReferences: FrameEditCharacterReference[]
  selectedKeys: Set<FrameEditReferenceSelectionKey>
  objectReferences?: Array<{ id: string; name: string; imageUrl: string }>
  selectedPropIds?: string[]
  locationStills?: Array<{ id: string; name: string; imageUrl: string }>
  selectedLocationIds?: string[]
}): PrioritizedReferenceImage[] {
  const {
    characterReferences,
    selectedKeys,
    objectReferences,
    selectedPropIds = [],
    locationStills = [],
    selectedLocationIds = [],
  } = args
  const imageRefs: Array<{
    imageUrl: string
    refRole: 'identity' | 'wardrobe' | 'wardrobe-diptych'
    characterName: string
  }> = []

  for (const ref of characterReferences) {
    if (ref.wardrobeDiptychUrl && selectedKeys.has(`diptych:${ref.characterName}`)) {
      imageRefs.push({
        imageUrl: ref.wardrobeDiptychUrl,
        refRole: 'wardrobe-diptych',
        characterName: ref.characterName,
      })
      continue
    }
    if (ref.identityImageUrl && selectedKeys.has(`identity:${ref.characterName}`)) {
      imageRefs.push({
        imageUrl: ref.identityImageUrl,
        refRole: 'identity',
        characterName: ref.characterName,
      })
    }
    if (ref.wardrobeImageUrl && selectedKeys.has(`wardrobe:${ref.characterName}`)) {
      imageRefs.push({
        imageUrl: ref.wardrobeImageUrl,
        refRole: 'wardrobe',
        characterName: ref.characterName,
      })
    }
  }

  const charMeta = characterReferences.map((ref) => ({
    name: ref.characterName,
    hasDualReferences: !!(ref.identityImageUrl && ref.wardrobeImageUrl),
    hasWardrobeDiptych: !!ref.wardrobeDiptychUrl,
  }))

  const characterEntries = buildCharacterReferenceEntries(
    imageRefs,
    charMeta,
    buildIdentityReferenceLabel,
    buildWardrobeReferenceLabel,
    0,
    buildWardrobeDiptychReferenceLabel
  )

  const locationEntries: PrioritizedReferenceImage[] = []
  let locationIndex = characterEntries.length
  for (const locationId of selectedLocationIds) {
    const still = locationStills.find((entry) => entry.id === locationId)
    if (!still?.imageUrl) continue
    const entry = buildLocationReferenceEntry(
      { imageUrl: still.imageUrl, location: still.name, name: still.name },
      locationIndex
    )
    if (!entry) continue
    locationIndex++
    locationEntries.push(entry)
  }

  const propEntries: PrioritizedReferenceImage[] = []
  let propIndex = characterEntries.length + locationEntries.length
  for (const propId of selectedPropIds) {
    const prop = objectReferences?.find((p) => p.id === propId)
    if (!prop?.imageUrl) continue
    propIndex++
    propEntries.push({
      imageUrl: prop.imageUrl,
      name: `Prop reference ${propIndex}: ${prop.name}`,
      role: 'prop-other',
      provisionalIndex: propIndex,
      propName: prop.name,
    })
  }

  return [...characterEntries, ...locationEntries, ...propEntries]
}

export type FrameEditCorrectionTarget = {
  kind: 'character' | 'location' | 'prop'
  id: string
  label: string
  selectedKeys: FrameEditReferenceSelectionKey[]
  selectedLocationIds: string[]
  selectedPropIds: string[]
}

export function frameEditCorrectionTargetForCharacter(
  ref: FrameEditCharacterReference
): FrameEditCorrectionTarget | null {
  const selectedKeys = frameEditReferenceKeys([ref])
  if (selectedKeys.length === 0) return null
  return {
    kind: 'character',
    id: ref.characterName,
    label: ref.characterName,
    selectedKeys,
    selectedLocationIds: [],
    selectedPropIds: [],
  }
}

export function frameEditCorrectionTargetForLocation(still: {
  id: string
  name: string
  imageUrl?: string
}): FrameEditCorrectionTarget | null {
  if (!still.imageUrl?.trim()) return null
  return {
    kind: 'location',
    id: still.id,
    label: still.name,
    selectedKeys: [],
    selectedLocationIds: [still.id],
    selectedPropIds: [],
  }
}

export function frameEditCorrectionTargetForProp(prop: {
  id: string
  name: string
  imageUrl?: string
}): FrameEditCorrectionTarget | null {
  if (!prop.imageUrl?.trim()) return null
  return {
    kind: 'prop',
    id: prop.id,
    label: prop.name,
    selectedKeys: [],
    selectedLocationIds: [],
    selectedPropIds: [prop.id],
  }
}

/**
 * One Vertex edit per subject. Characters in library order, then locations, then props.
 */
export function listFrameEditCorrectionTargets(args: {
  characterReferences: FrameEditCharacterReference[]
  selectedKeys: Iterable<FrameEditReferenceSelectionKey>
  locationStills?: Array<{ id: string; name: string; imageUrl: string }>
  selectedLocationIds?: string[]
  objectReferences?: Array<{ id: string; name: string; imageUrl: string }>
  selectedPropIds?: string[]
}): FrameEditCorrectionTarget[] {
  const selectedKeySet = new Set(args.selectedKeys)
  const targets: FrameEditCorrectionTarget[] = []

  for (const ref of args.characterReferences) {
    const available = frameEditReferenceKeys([ref])
    const selectedKeys = available.filter((key) => selectedKeySet.has(key))
    if (selectedKeys.length === 0) continue
    targets.push({
      kind: 'character',
      id: ref.characterName,
      label: ref.characterName,
      selectedKeys,
      selectedLocationIds: [],
      selectedPropIds: [],
    })
  }

  for (const locationId of args.selectedLocationIds ?? []) {
    const still = args.locationStills?.find((entry) => entry.id === locationId)
    if (!still) continue
    const target = frameEditCorrectionTargetForLocation(still)
    if (target) targets.push(target)
  }

  for (const propId of args.selectedPropIds ?? []) {
    const prop = args.objectReferences?.find((entry) => entry.id === propId)
    if (!prop) continue
    const target = frameEditCorrectionTargetForProp(prop)
    if (target) targets.push(target)
  }

  return targets
}

export function buildFrameEditCorrectionInstruction(target: FrameEditCorrectionTarget): string {
  if (target.kind === 'character') {
    return `Correct only ${target.label} so face and outfit match the attached identity/wardrobe references. Leave every other person, the location, props, camera, and lighting unchanged.`
  }
  if (target.kind === 'location') {
    return `Correct only the set to match the attached location reference. Leave every person and handheld prop unchanged.`
  }
  return `Correct only ${target.label} to match the attached prop reference. Leave people and the set unchanged.`
}

export function buildFrameEditImagesForCorrectionTarget(
  target: FrameEditCorrectionTarget,
  args: {
    characterReferences: FrameEditCharacterReference[]
    objectReferences?: Array<{ id: string; name: string; imageUrl: string }>
    locationStills?: Array<{ id: string; name: string; imageUrl: string }>
  }
): PrioritizedReferenceImage[] {
  return buildFrameEditReferenceImages({
    characterReferences: args.characterReferences,
    selectedKeys: new Set(target.selectedKeys),
    objectReferences: args.objectReferences,
    selectedPropIds: target.selectedPropIds,
    locationStills: args.locationStills,
    selectedLocationIds: target.selectedLocationIds,
  })
}
