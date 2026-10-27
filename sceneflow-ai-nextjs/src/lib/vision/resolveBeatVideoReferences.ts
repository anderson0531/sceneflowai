/**
 * Resolve prioritized reference images for Omni REF video generation on a beat.
 */

import { resolveCharacterReferencePair } from '@/lib/character/characterReferenceAssembly'
import { formatNextImageCaption } from '@/lib/vision/referenceImageBinding'
import { formatLocationScaleDescriptor } from '@/lib/imagen/locationScaleClause'
import { extractPropScalePhrase, formatPropScaleDescriptor } from '@/lib/imagen/propScaleClause'
import { extractCharacterHeightPhrase } from '@/lib/imagen/identityTraitsClause'
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
    height?: string
    appearanceDescription?: string
    visionDescription?: string
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
  personTokenIndex?: number,
  heightPhrase?: string
): string {
  const base = formatNextImageCaption({
    role: 'identity',
    token: videoPersonToken(personTokenIndex),
  })
  return heightPhrase ? `${base} Scale: ${heightPhrase}.` : base
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
  personTokenIndex?: number,
  heightPhrase?: string
): string {
  const base = formatNextImageCaption({
    role: 'character',
    token: videoPersonToken(personTokenIndex),
  })
  const scaleSuffix = heightPhrase ? ` (${heightPhrase})` : ''
  return `${base} Extract exact facial identity from the face close-up and outfit from the full-body standing figure${scaleSuffix}; do not render the character-card layout or headshot overlay.`
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
    characterHeight?: string
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

    const sentDiptych = Boolean(refPair.hasWardrobeDiptych && refPair.wardrobeDiptychUrl)
    const heightPhrase = extractCharacterHeightPhrase({
      height: char.height,
      appearanceDescription: char.appearanceDescription,
      visionDescription: char.visionDescription,
    })
    characterMeta.push({
      name: char.name,
      hasDualReferences: sentDiptych ? false : refPair.hasDualReferences,
      hasWardrobeDiptych: sentDiptych,
      subjectOrdinal: characterMeta.length + 1,
      characterHeight: heightPhrase,
    })

    // Prefer the single-slot composite card (full-body wardrobe with top-right
    // face close-up inset) when present so video generation preserves exact facial
    // identity and wardrobe in a single reference slot without exhausting limits.
    if (sentDiptych && refPair.wardrobeDiptychUrl) {
      imageReferences.push({
        imageUrl: refPair.wardrobeDiptychUrl,
        refRole: 'wardrobe-diptych',
        characterName: char.name,
      })
      continue
    }

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
      dimensions: obj.dimensions,
    }))

  const locationRef = selection.locationRefId
    ? locationReferences.find((l) => l.id === selection.locationRefId)
    : undefined
  const mappedLocation = locationRef
    ? locationReferenceForGeneration(locationRef, selection.locationVersionId)
    : undefined

  const buildIdentityWithHeight = (name: string, index: number, personTokenIndex?: number) => {
    const meta = characterMeta.find((c) => c.name === name)
    return videoIdentityLabel(name, index, personTokenIndex, meta?.characterHeight)
  }
  const buildDiptychWithHeight = (name: string, index?: number, personTokenIndex?: number) => {
    const meta = characterMeta.find((c) => c.name === name)
    return videoDiptychLabel(name, index, personTokenIndex, meta?.characterHeight)
  }

  const characterRefEntries = buildCharacterReferenceEntries(
    imageReferences,
    characterMeta,
    buildIdentityWithHeight,
    videoWardrobeLabel,
    0,
    buildDiptychWithHeight
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
      buildIdentityLabel: buildIdentityWithHeight,
      buildWardrobeLabel: videoWardrobeLabel,
      buildDiptychLabel: buildDiptychWithHeight,
      buildPropLabel: (propName, _sendIndex, promptToken) => {
        const base = formatNextImageCaption({ role: 'prop', token: promptToken || 'prop [1]' })
        const matchedObj = objectImageReferences.find((o) => o.name === propName)
        if (
          matchedObj &&
          (matchedObj.dimensions?.trim() ||
            extractPropScalePhrase(matchedObj.description, matchedObj.name, matchedObj.dimensions))
        ) {
          const scale = formatPropScaleDescriptor(
            matchedObj.description,
            matchedObj.name,
            matchedObj.dimensions
          )
          return `${base} Prop scale: ${scale}.`
        }
        return base
      },
      buildLocationLabel: (_locationName, _sendIndex, promptToken) => {
        const base = formatNextImageCaption({ role: 'location', token: promptToken || 'location [1]' })
        if (mappedLocation?.description?.trim() || mappedLocation?.canonicalScale) {
          const scale = formatLocationScaleDescriptor(
            mappedLocation.description,
            mappedLocation.location || mappedLocation.name,
            mappedLocation.canonicalScale
          )
          return `${base} Environment scale: ${scale}.`
        }
        return base
      },
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
