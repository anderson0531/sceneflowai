/**
 * Resolve prioritized reference images for Omni REF video generation on a beat.
 */

import { resolveCharacterReferencePair } from '@/lib/character/characterReferenceAssembly'
import { formatNextImageCaption } from '@/lib/vision/referenceImageBinding'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  resolveBeatFrameGenerationContext,
  shouldUseExplicitBeatReferences,
} from '@/lib/vision/beatFrameGenerationContext'
import { shouldRelabelRefs } from '@/lib/video/normalizeReferenceImages'
import {
  locationReferenceForGeneration,
} from '@/lib/vision/locationVersionResolve'
import {
  buildCharacterReferenceEntries,
  buildLocationReferenceEntry,
  buildPropReferenceEntries,
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  selectReferenceImagesInOrder,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'

export type LabeledVideoReference = {
  url: string
  type: 'character' | 'style'
  name: string
  role?: PrioritizedReferenceImage['role']
  characterName?: string
  propName?: string
  locationName?: string
  promptToken?: string
  subjectOrdinal?: number
}

export type ResolvedBeatVideoReferences = {
  refs: PrioritizedReferenceImage[]
  labeledRefs: LabeledVideoReference[]
  urlList: string[]
  warnings: string[]
}

export type ResolveBeatVideoReferencesArgs = {
  scene: Record<string, unknown>
  beat: SceneBeat | null | undefined
  sceneIndex?: number
  projectCharacters: Array<{
    id?: string
    name?: string
    referenceImage?: string
    wardrobes?: unknown[]
  }>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
}

function videoPersonToken(personTokenIndex?: number): string {
  return personTokenIndex != null ? `person [${personTokenIndex}]` : 'person [1]'
}

function videoIdentityLabel(
  _name: string,
  _index: number,
  personTokenIndex?: number
): string {
  return formatNextImageCaption({
    role: 'identity',
    token: videoPersonToken(personTokenIndex),
  })
}

function videoWardrobeLabel(
  _name: string,
  _index: number,
  personTokenIndex?: number
): string {
  return formatNextImageCaption({
    role: 'wardrobe',
    token: videoPersonToken(personTokenIndex),
  })
}

function videoDiptychLabel(
  _name: string,
  _index?: number,
  personTokenIndex?: number
): string {
  return formatNextImageCaption({
    role: 'character',
    token: videoPersonToken(personTokenIndex),
  })
}

/** Cast, location, and key props used for both Omni REF and Kling elements. */
export function resolveBeatElementSelection(args: ResolveBeatVideoReferencesArgs): {
  characterIds: string[]
  characterWardrobes: Array<{ characterId: string; wardrobeId: string }>
  objectRefIds: string[]
  locationRefId?: string | null
  locationVersionId?: string | null
} {
  const { scene, beat, sceneIndex, projectCharacters, locationReferences, objectReferences, filmTitle } =
    args
  if (!beat) {
    return { characterIds: [], characterWardrobes: [], objectRefIds: [] }
  }

  const beatContext = resolveBeatFrameGenerationContext({
    scene,
    beat,
    sceneIndex,
    projectCharacters,
    locationReferences,
    objectReferences,
    filmTitle,
  })
  const selection = shouldUseExplicitBeatReferences(beat)
    ? beat.referenceSelection
    : {
        characterIds: beatContext.characterIds,
        locationRefId: beatContext.locationRefId,
        locationVersionId: beatContext.locationVersionId,
        objectRefIds: beatContext.objectRefIds,
        characterWardrobes: beatContext.characterWardrobes,
      }

  const characterIds = selection.characterIds?.length
    ? [...selection.characterIds]
    : beat.characterId
      ? [beat.characterId]
      : []

  return {
    characterIds,
    characterWardrobes: selection.characterWardrobes ?? beatContext.characterWardrobes ?? [],
    objectRefIds: selection.objectRefIds ?? [],
    locationRefId: selection.locationRefId,
    locationVersionId: selection.locationVersionId,
  }
}

function findCharacterById(
  id: string,
  projectCharacters: ResolveBeatVideoReferencesArgs['projectCharacters']
) {
  return (
    projectCharacters.find((c) => c.id === id) ??
    projectCharacters.find((c) => c.name === id) ??
    projectCharacters.find((c) => c.name?.toLowerCase() === id.toLowerCase())
  )
}

export function resolveBeatVideoReferences(
  args: ResolveBeatVideoReferencesArgs
): ResolvedBeatVideoReferences {
  const { scene, beat, sceneIndex, projectCharacters, locationReferences, objectReferences, filmTitle } =
    args

  if (!beat) {
    return { refs: [], labeledRefs: [], urlList: [], warnings: [] }
  }

  const beatContext = resolveBeatFrameGenerationContext({
    scene,
    beat,
    sceneIndex,
    projectCharacters,
    locationReferences,
    objectReferences,
    filmTitle,
  })

  const selection = shouldUseExplicitBeatReferences(beat)
    ? beat.referenceSelection
    : {
        characterIds: beatContext.characterIds,
        locationRefId: beatContext.locationRefId,
        locationVersionId: beatContext.locationVersionId,
        objectRefIds: beatContext.objectRefIds,
        characterWardrobes: beatContext.characterWardrobes,
      }

  const characterWardrobes = selection.characterWardrobes ?? beatContext.characterWardrobes

  const imageReferences: Array<{
    imageUrl: string
    refRole: 'identity' | 'wardrobe' | 'wardrobe-diptych'
    characterName: string
  }> = []

  const characterMeta: Array<{
    name: string
    hasDualReferences?: boolean
    hasWardrobeDiptych?: boolean
    subjectOrdinal?: number
  }> = []

  for (const charId of selection.characterIds ?? []) {
    const char = findCharacterById(charId, projectCharacters)
    if (!char?.name) continue

    const refPair = resolveCharacterReferencePair({
      character: char as Record<string, unknown>,
      scene,
      sceneIndex,
      characterWardrobes,
      includeWardrobeReferenceImages: true,
      includeWardrobeDiptych: true,
    })

    const sentDiptych = !refPair.identityUrl && !!refPair.wardrobeDiptychUrl
    characterMeta.push({
      name: char.name,
      hasDualReferences: refPair.hasDualReferences,
      hasWardrobeDiptych: sentDiptych,
      subjectOrdinal: characterMeta.length + 1,
    })

    // Identity is the face the library shot. A wardrobe plate or combined sheet
    // never replaces it: the Take dialog works because it sends referenceImage,
    // and automatic takes have to do the same. The combined sheet is only the
    // stand-in when the character has no identity image.
    if (refPair.identityUrl) {
      imageReferences.push({
        imageUrl: refPair.identityUrl,
        refRole: 'identity',
        characterName: char.name,
      })
      if (refPair.wardrobeUrl && refPair.wardrobeUrl !== refPair.identityUrl) {
        imageReferences.push({
          imageUrl: refPair.wardrobeUrl,
          refRole: 'wardrobe',
          characterName: char.name,
        })
      }
      continue
    }

    if (refPair.hasWardrobeDiptych && refPair.wardrobeDiptychUrl) {
      imageReferences.push({
        imageUrl: refPair.wardrobeDiptychUrl,
        refRole: 'wardrobe-diptych',
        characterName: char.name,
      })
      continue
    }

    if (refPair.wardrobeUrl) {
      imageReferences.push({
        imageUrl: refPair.wardrobeUrl,
        refRole: 'wardrobe',
        characterName: char.name,
      })
    }
  }

  const objectImageReferences = (selection.objectRefIds ?? [])
    .map((id) => objectReferences.find((o) => o.id === id))
    .filter((o): o is VisualReference => !!o?.imageUrl)
    .map((obj) => ({
      imageUrl: obj.imageUrl!,
      name: obj.name || 'prop',
      importance: obj.importance,
      description: obj.description,
    }))

  const locationRef = selection.locationRefId
    ? locationReferences.find((l) => l.id === selection.locationRefId)
    : undefined
  const mappedLocation = locationRef
    ? locationReferenceForGeneration(locationRef, selection.locationVersionId)
    : undefined

  const characterRefEntries = buildCharacterReferenceEntries(
    imageReferences,
    characterMeta,
    videoIdentityLabel,
    videoWardrobeLabel,
    0,
    videoDiptychLabel
  )
  const propRefEntries = buildPropReferenceEntries(objectImageReferences, characterRefEntries.length).map(
    (entry, index) => ({
      ...entry,
      promptToken: `prop [${index + 1}]`,
    })
  )
  const locationRefEntry = buildLocationReferenceEntry(
    mappedLocation,
    characterRefEntries.length + propRefEntries.length
  )
  if (locationRefEntry) locationRefEntry.promptToken = 'location [1]'

  const allPrioritized = [
    ...characterRefEntries,
    ...propRefEntries,
    ...(locationRefEntry ? [locationRefEntry] : []),
  ]

  const { selected, dropped } = selectReferenceImagesInOrder(
    allPrioritized,
    MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
    {
      buildIdentityLabel: videoIdentityLabel,
      buildWardrobeLabel: videoWardrobeLabel,
      buildDiptychLabel: videoDiptychLabel,
      buildPropLabel: (_propName, _sendIndex, promptToken) =>
        formatNextImageCaption({ role: 'prop', token: promptToken || 'prop [1]' }),
      buildLocationLabel: (_locationName, _sendIndex, promptToken) =>
        formatNextImageCaption({ role: 'location', token: promptToken || 'location [1]' }),
      preserveLibraryPromptTokens: true,
    }
  )

  const warnings = [...beatContext.warnings]
  if (dropped.length > 0) {
    warnings.push(
      `Dropped ${dropped.length} reference(s) (cap=${MAX_VERTEX_GEMINI_REFERENCE_IMAGES}): ${dropped.map((r) => r.name).join(', ')}`
    )
  }

  const labeledRefs: LabeledVideoReference[] = selected.map((ref) => ({
    url: ref.imageUrl,
    type: ref.role === 'location' || ref.role.startsWith('prop-') ? 'style' : 'character',
    name: ref.name,
    role: ref.role,
    characterName: ref.characterName,
    propName: ref.propName,
    locationName: ref.locationName,
    promptToken: ref.promptToken,
    subjectOrdinal: ref.subjectOrdinal,
  }))

  return {
    refs: selected,
    labeledRefs,
    urlList: selected.map((r) => r.imageUrl),
    warnings,
  }
}

/**
 * User-saved beat references replace whatever the client attached.
 * Otherwise only unlabeled client urls are rebuilt on the server.
 */
export function shouldReplaceClientVideoReferences(
  beat: SceneBeat | null | undefined,
  clientRefs: Parameters<typeof shouldRelabelRefs>[0]
): boolean {
  return shouldUseExplicitBeatReferences(beat) || shouldRelabelRefs(clientRefs)
}

/** Resolve references for a segment using its beatId. */
export function resolveSegmentVideoReferences(
  segment: { beatId?: string | null },
  scene: Record<string, unknown>,
  args: Omit<ResolveBeatVideoReferencesArgs, 'scene' | 'beat'>
): ResolvedBeatVideoReferences {
  const beatId = segment.beatId?.trim()
  const beat = beatId ? getSceneBeats(scene).find((b) => b.beatId === beatId) : undefined
  return resolveBeatVideoReferences({ ...args, scene, beat })
}
