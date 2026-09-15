/**
 * Map SceneFlow still prompts + reference images to Direct Kling Omni Image
 * element_list / image_list. Uses official <<<elementId>>> / <<<image_N>>> tags.
 *
 * Not Fal. Do not import @/lib/fal from this module.
 */

import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'
import type { KlingElementSource } from './elementRegistry'

export const MAX_KLING_OMNI_REFERENCE_SLOTS = 10

export interface CharacterOrdinalRef {
  name: string
  subjectOrdinal?: number
}

export interface MapSceneImageToKlingOmniInput {
  scenePrompt: string
  selectedReferences: PrioritizedReferenceImage[]
  characterOrdinals?: CharacterOrdinalRef[]
  /** Character name → registered Kling element_id */
  characterElementIds: Map<string, string>
  instructionPrefix?: string
  maxTotalRefs?: number
}

export interface KlingOmniImageListEntry {
  image: string
}

export interface KlingOmniElementListEntry {
  element_id: string
}

export interface MapSceneImageToKlingOmniResult {
  prompt: string
  elementList: KlingOmniElementListEntry[]
  imageList: KlingOmniImageListEntry[]
  elementIdByCharacter: Map<string, string>
  imageIndexByUrl: Map<string, number>
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rewritePersonTokensToElements(
  prompt: string,
  ordinalToElementId: Map<number, string>
): string {
  let result = prompt
  for (const [ordinal, elementId] of ordinalToElementId.entries()) {
    const pattern = new RegExp(`person\\s*\\[\\s*${ordinal}\\s*\\]`, 'gi')
    result = result.replace(pattern, `<<<${elementId}>>>`)
  }
  return result
}

function rewriteReferenceImageTokens(
  prompt: string,
  sendIndexToImageIndex: Map<number, number>
): string {
  let result = prompt
  for (const [sendIndex, imageIndex] of sendIndexToImageIndex.entries()) {
    const patterns = [
      new RegExp(`Reference image\\s*${sendIndex}`, 'gi'),
      new RegExp(`Ref\\s*image\\s*${sendIndex}`, 'gi'),
      new RegExp(`identity reference\\s*${sendIndex}`, 'gi'),
      new RegExp(`wardrobe reference\\s*${sendIndex}`, 'gi'),
      new RegExp(`location reference\\s*${sendIndex}`, 'gi'),
      new RegExp(`prop reference\\s*${sendIndex}`, 'gi'),
    ]
    for (const pattern of patterns) {
      result = result.replace(pattern, `<<<image_${imageIndex}>>>`)
    }
  }
  return result
}

/**
 * Map capped scene references + person [N] tokens to Kling Omni element_list + image_list.
 * Characters become registered elements; location/props go in image_list.
 */
export function mapSceneImageToKlingOmni(
  input: MapSceneImageToKlingOmniInput
): MapSceneImageToKlingOmniResult {
  const maxTotal = input.maxTotalRefs ?? MAX_KLING_OMNI_REFERENCE_SLOTS
  const cappedRefs = input.selectedReferences.slice(0, maxTotal)

  const characterRefs = cappedRefs.filter(
    (ref) =>
      ref.refRole === 'identity' ||
      ref.refRole === 'wardrobe' ||
      ref.refRole === 'wardrobe-diptych'
  )
  const sceneRefs = cappedRefs.filter(
    (ref) => ref.role === 'location' || ref.role.startsWith('prop')
  )

  const charactersInOrder = [
    ...new Map(
      characterRefs
        .filter((ref) => ref.characterName)
        .map((ref) => [ref.characterName!, ref])
    ).keys(),
  ]

  const ordinalByName = new Map(
    (input.characterOrdinals ?? []).map((entry) => [entry.name, entry.subjectOrdinal])
  )

  const elementList: KlingOmniElementListEntry[] = []
  const elementIdByCharacter = new Map<string, string>()
  const ordinalToElementId = new Map<number, string>()

  for (const characterName of charactersInOrder) {
    if (elementList.length >= maxTotal) break
    const elementId = input.characterElementIds.get(characterName)?.trim()
    if (!elementId) continue

    elementList.push({ element_id: elementId })
    elementIdByCharacter.set(characterName, elementId)

    const ordinal =
      ordinalByName.get(characterName) ??
      characterRefs.find((ref) => ref.characterName === characterName)?.subjectOrdinal
    if (typeof ordinal === 'number') {
      ordinalToElementId.set(ordinal, elementId)
    }
  }

  const imageList: KlingOmniImageListEntry[] = []
  const imageIndexByUrl = new Map<string, number>()
  const sendIndexToImageIndex = new Map<number, number>()

  for (const ref of sceneRefs) {
    if (elementList.length + imageList.length >= maxTotal) break
    if (!ref.imageUrl || imageIndexByUrl.has(ref.imageUrl)) continue
    imageList.push({ image: ref.imageUrl })
    const imageIndex = imageList.length
    imageIndexByUrl.set(ref.imageUrl, imageIndex)
    if (ref.sendIndex != null) {
      sendIndexToImageIndex.set(ref.sendIndex, imageIndex)
    }
  }

  let rewrittenPrompt = rewritePersonTokensToElements(input.scenePrompt, ordinalToElementId)
  rewrittenPrompt = rewriteReferenceImageTokens(rewrittenPrompt, sendIndexToImageIndex)

  for (const ref of sceneRefs) {
    const token = ref.promptToken?.trim()
    const imageIndex = ref.imageUrl ? imageIndexByUrl.get(ref.imageUrl) : undefined
    if (!token || imageIndex == null) continue
    rewrittenPrompt = rewrittenPrompt.replace(
      new RegExp(escapeRegExp(token), 'gi'),
      `<<<image_${imageIndex}>>>`
    )
  }

  const prefix = input.instructionPrefix?.trim()
  const prompt = prefix ? `${prefix}\n\n${rewrittenPrompt.trim()}` : rewrittenPrompt.trim()

  return {
    prompt,
    elementList,
    imageList,
    elementIdByCharacter,
    imageIndexByUrl,
  }
}

export function buildKlingCharacterSourcesFromRefs(args: {
  selectedReferences: PrioritizedReferenceImage[]
  characterObjects?: Array<{
    id?: string
    name?: string
    referenceImage?: string
    klingElementId?: string
    wardrobes?: Array<{
      id?: string
      name?: string
      headshotUrl?: string
      fullBodyUrl?: string
      klingElementId?: string
    }>
  }>
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
}): KlingElementSource[] {
  const { selectedReferences, characterObjects = [], characterWardrobes = [] } = args
  const characterRefs = selectedReferences.filter(
    (ref) =>
      ref.refRole === 'identity' ||
      ref.refRole === 'wardrobe' ||
      ref.refRole === 'wardrobe-diptych'
  )

  const names = [
    ...new Map(
      characterRefs
        .filter((ref) => ref.characterName)
        .map((ref) => [ref.characterName!, ref])
    ).keys(),
  ]

  const sources: KlingElementSource[] = []

  for (const name of names) {
    const identityRef = characterRefs.find(
      (ref) =>
        ref.characterName === name &&
        (ref.refRole === 'identity' || ref.refRole === 'wardrobe-diptych')
    )
    const wardrobeRefs = characterRefs.filter(
      (ref) => ref.characterName === name && ref.refRole === 'wardrobe'
    )
    const char = characterObjects.find((c) => c.name === name)
    const wardrobePick = characterWardrobes.find(
      (w) => w.characterId === char?.id || w.characterId === name
    )
    const wardrobe = wardrobePick
      ? char?.wardrobes?.find((w) => w.id === wardrobePick.wardrobeId)
      : undefined

    const frontal =
      identityRef?.imageUrl?.trim() ||
      char?.referenceImage?.trim() ||
      wardrobeRefs[0]?.imageUrl?.trim()
    if (!frontal) continue

    const referImageUrls = wardrobeRefs
      .map((ref) => ref.imageUrl)
      .filter((url) => url && url !== frontal)

    sources.push({
      id: char?.id || name,
      name,
      imageUrl: frontal,
      frontalImageUrl: frontal,
      referImageUrls: referImageUrls.length ? referImageUrls : undefined,
      description: wardrobe ? `${name} in ${wardrobe.name}` : name,
      klingElementId: wardrobe?.klingElementId || char?.klingElementId,
      type: 'character',
      wardrobeId: wardrobe?.id,
    })
  }

  return sources
}
