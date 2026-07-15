import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'
import type { KlingImageElement } from './klingImageClient'

export const MAX_FAL_KLING_REFERENCE_SLOTS = 10

export interface CharacterOrdinalRef {
  name: string
  subjectOrdinal?: number
}

export interface MapSceneImageToKlingO3Input {
  scenePrompt: string
  selectedReferences: PrioritizedReferenceImage[]
  characterOrdinals?: CharacterOrdinalRef[]
  instructionPrefix?: string
  maxTotalRefs?: number
}

export interface MapSceneImageToKlingO3Result {
  prompt: string
  elements: KlingImageElement[]
  imageUrls: string[]
  elementIndexByCharacter: Map<string, number>
  imageIndexByUrl: Map<string, number>
}

function rewritePersonTokensToElements(
  prompt: string,
  ordinalToElementIndex: Map<number, number>
): string {
  let result = prompt
  for (const [ordinal, elementIndex] of ordinalToElementIndex.entries()) {
    const pattern = new RegExp(`person\\s*\\[\\s*${ordinal}\\s*\\]`, 'gi')
    result = result.replace(pattern, `@Element${elementIndex}`)
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
      result = result.replace(pattern, `@Image${imageIndex}`)
    }
  }
  return result
}

/**
 * Map capped scene references + person [N] tokens to Fal O3 elements/image_urls.
 */
export function mapSceneImageToKlingO3(
  input: MapSceneImageToKlingO3Input
): MapSceneImageToKlingO3Result {
  const maxTotal = input.maxTotalRefs ?? MAX_FAL_KLING_REFERENCE_SLOTS
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

  const elements: KlingImageElement[] = []
  const elementIndexByCharacter = new Map<string, number>()
  const ordinalToElementIndex = new Map<number, number>()

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

  for (const characterName of charactersInOrder) {
    const identityRef = characterRefs.find(
      (ref) =>
        ref.characterName === characterName &&
        (ref.refRole === 'identity' || ref.refRole === 'wardrobe-diptych')
    )
    if (!identityRef?.imageUrl) continue

    const wardrobeRefs = characterRefs
      .filter(
        (ref) => ref.characterName === characterName && ref.refRole === 'wardrobe'
      )
      .map((ref) => ref.imageUrl)

    const elementIndex = elements.length + 1
    elements.push({
      frontal_image_url: identityRef.imageUrl,
      ...(wardrobeRefs.length ? { reference_image_urls: wardrobeRefs } : {}),
    })
    elementIndexByCharacter.set(characterName, elementIndex)

    const ordinal = ordinalByName.get(characterName)
    if (typeof ordinal === 'number') {
      ordinalToElementIndex.set(ordinal, elementIndex)
    }
  }

  const imageUrls: string[] = []
  const imageIndexByUrl = new Map<string, number>()
  const sendIndexToImageIndex = new Map<number, number>()

  for (const ref of sceneRefs) {
    if (!ref.imageUrl || imageIndexByUrl.has(ref.imageUrl)) continue
    imageUrls.push(ref.imageUrl)
    const imageIndex = imageUrls.length
    imageIndexByUrl.set(ref.imageUrl, imageIndex)
    if (ref.sendIndex != null) {
      sendIndexToImageIndex.set(ref.sendIndex, imageIndex)
    }
  }

  let rewrittenPrompt = rewritePersonTokensToElements(input.scenePrompt, ordinalToElementIndex)
  rewrittenPrompt = rewriteReferenceImageTokens(rewrittenPrompt, sendIndexToImageIndex)

  const prefix = input.instructionPrefix?.trim()
  const prompt = prefix ? `${prefix}\n\n${rewrittenPrompt.trim()}` : rewrittenPrompt.trim()

  return {
    prompt,
    elements,
    imageUrls,
    elementIndexByCharacter,
    imageIndexByUrl,
  }
}

/**
 * Simple mapper for studio/imagen shims: refs as elements or scene image_urls.
 */
export function mapSimpleRefsToKlingO3(
  prompt: string,
  refs: Array<{ imageUrl?: string; base64Image?: string; name?: string }>
): MapSceneImageToKlingO3Result {
  const elements: KlingImageElement[] = []
  const imageUrls: string[] = []

  for (const ref of refs) {
    const url = ref.imageUrl?.trim()
    if (!url) continue
    const name = (ref.name ?? '').toLowerCase()
    if (name.includes('location') || name.includes('prop')) {
      imageUrls.push(url)
    } else {
      elements.push({ frontal_image_url: url })
    }
  }

  return {
    prompt: prompt.trim(),
    elements,
    imageUrls,
    elementIndexByCharacter: new Map(),
    imageIndexByUrl: new Map(imageUrls.map((url, idx) => [url, idx + 1])),
  }
}
