/**
 * Resolve prioritized reference images for Omni REF video generation on a beat.
 */

import {
  buildIdentityReferenceLabel,
  buildWardrobeDiptychReferenceLabel,
  buildWardrobeReferenceLabel,
  resolveCharacterReferencePair,
} from '@/lib/character/characterReferenceAssembly'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  resolveBeatFrameGenerationContext,
  shouldUseExplicitBeatReferences,
} from '@/lib/vision/beatFrameGenerationContext'
import {
  buildCharacterReferenceEntries,
  buildLocationReferenceEntry,
  buildPropReferenceEntries,
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  prioritizeReferenceImages,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'

export type LabeledVideoReference = {
  url: string
  type: 'character' | 'style'
  name: string
  role?: PrioritizedReferenceImage['role']
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
        objectRefIds: beatContext.objectRefIds,
        characterWardrobes: beatContext.characterWardrobes,
      }

  const characterWardrobes = selection.characterWardrobes ?? beatContext.characterWardrobes

  const imageReferences: Array<{
    imageUrl: string
    refRole: 'identity' | 'wardrobe' | 'wardrobe-diptych'
    characterName: string
  }> = []

  const characterMeta: Array<{ name: string; hasDualReferences?: boolean; hasWardrobeDiptych?: boolean }> =
    []

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

    characterMeta.push({
      name: char.name,
      hasDualReferences: refPair.hasDualReferences,
      hasWardrobeDiptych: refPair.hasWardrobeDiptych,
    })

    if (refPair.hasWardrobeDiptych && refPair.wardrobeDiptychUrl) {
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
    }))

  const locationRef = selection.locationRefId
    ? locationReferences.find((l) => l.id === selection.locationRefId)
    : undefined

  const characterRefEntries = buildCharacterReferenceEntries(
    imageReferences,
    characterMeta,
    buildIdentityReferenceLabel,
    buildWardrobeReferenceLabel,
    0,
    buildWardrobeDiptychReferenceLabel
  )
  const propRefEntries = buildPropReferenceEntries(objectImageReferences, characterRefEntries.length)
  const locationRefEntry = buildLocationReferenceEntry(
    locationRef,
    characterRefEntries.length + propRefEntries.length
  )

  const allPrioritized = [
    ...characterRefEntries,
    ...propRefEntries,
    ...(locationRefEntry ? [locationRefEntry] : []),
  ]

  const { selected, dropped } = prioritizeReferenceImages(
    allPrioritized,
    MAX_VERTEX_GEMINI_REFERENCE_IMAGES
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
  }))

  return {
    refs: selected,
    labeledRefs,
    urlList: selected.map((r) => r.imageUrl),
    warnings,
  }
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
