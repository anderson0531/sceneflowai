/**
 * Map Reference Library assets to Kling element_list IDs with registration caching.
 */

import { registerKlingElement } from './klingDirectClient'
import { getKlingCapabilities } from './config'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

export type KlingElementSource = {
  id: string
  name: string
  imageUrl: string
  klingElementId?: string
  type: 'character' | 'prop' | 'location'
}

export type ResolvedKlingElements = {
  elementIds: string[]
  promptTags: string[]
  warnings: string[]
}

async function ensureElementRegistered(source: KlingElementSource): Promise<string | null> {
  if (source.klingElementId?.trim()) return source.klingElementId.trim()
  if (!source.imageUrl?.trim()) return null
  try {
    return await registerKlingElement(source.imageUrl, source.name)
  } catch (e) {
    console.warn(`[Kling Elements] Failed to register ${source.name}:`, e)
    return null
  }
}

export function buildElementPromptTags(elementIds: string[]): string[] {
  return elementIds.map((id) => `<<<${id}>>>`)
}

export async function resolveKlingElementsFromSources(
  sources: KlingElementSource[],
  modelName?: string
): Promise<ResolvedKlingElements> {
  const caps = getKlingCapabilities(modelName)
  const warnings: string[] = []
  if (!caps.elements || caps.maxElements <= 0) {
    return {
      elementIds: [],
      promptTags: [],
      warnings: ['Model does not support Kling element_list'],
    }
  }

  const elementIds: string[] = []
  const limited = sources.slice(0, caps.maxElements)

  for (const source of limited) {
    const id = await ensureElementRegistered(source)
    if (id) {
      elementIds.push(id)
    } else {
      warnings.push(`Could not register element for ${source.name}`)
    }
  }

  return {
    elementIds,
    promptTags: buildElementPromptTags(elementIds),
    warnings,
  }
}

export function collectKlingElementSources(args: {
  characters?: Array<{
    id?: string
    name?: string
    referenceImage?: string
    klingElementId?: string
    wardrobes?: Array<{ id?: string; headshotUrl?: string; klingElementId?: string }>
  }>
  characterIds?: string[]
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
  objectReferences?: VisualReference[]
  objectRefIds?: string[]
  locationReferences?: LocationReference[]
  locationRefId?: string | null
}): KlingElementSource[] {
  const sources: KlingElementSource[] = []
  const {
    characters = [],
    characterIds = [],
    characterWardrobes = [],
    objectReferences = [],
    objectRefIds = [],
    locationReferences = [],
    locationRefId,
  } = args

  for (const charId of characterIds) {
    const char = characters.find((c) => c.id === charId || c.name === charId)
    if (!char?.name) continue

    const wardrobePick = characterWardrobes.find((w) => w.characterId === charId)
    const wardrobe = wardrobePick
      ? char.wardrobes?.find((w) => w.id === wardrobePick.wardrobeId)
      : undefined

    const imageUrl = wardrobe?.headshotUrl || char.referenceImage
    if (!imageUrl) continue

    sources.push({
      id: char.id || char.name,
      name: char.name,
      imageUrl,
      klingElementId: wardrobe?.klingElementId || char.klingElementId,
      type: 'character',
    })
  }

  for (const refId of objectRefIds) {
    const prop = objectReferences.find((o) => o.id === refId)
    if (!prop?.imageUrl) continue
    sources.push({
      id: prop.id,
      name: prop.name,
      imageUrl: prop.imageUrl,
      klingElementId: (prop as VisualReference & { klingElementId?: string }).klingElementId,
      type: 'prop',
    })
  }

  if (locationRefId) {
    const loc = locationReferences.find((l) => l.id === locationRefId)
    if (loc?.imageUrl) {
      sources.push({
        id: loc.id,
        name: loc.locationDisplay || loc.location,
        imageUrl: loc.imageUrl,
        klingElementId: (loc as LocationReference & { klingElementId?: string }).klingElementId,
        type: 'location',
      })
    }
  }

  return sources
}

export function injectElementTagsIntoPrompt(prompt: string, tags: string[]): string {
  if (!tags.length) return prompt
  const unique = [...new Set(tags)]
  const suffix = unique.join(' ')
  return prompt.trim() ? `${prompt.trim()} ${suffix}` : suffix
}
