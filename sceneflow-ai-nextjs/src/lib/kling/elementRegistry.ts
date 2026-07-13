/**
 * Map Reference Library assets to Kling element_list IDs with registration caching.
 */

import Project from '@/models/Project'
import { registerKlingElement, registerKlingElementMulti } from './klingDirectClient'
import { getKlingCapabilities } from './config'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

export type KlingElementSource = {
  id: string
  name: string
  imageUrl: string
  /** Identity / primary frontal image for multi-image bind */
  frontalImageUrl?: string
  /** Wardrobe or additional angle images (1-3) */
  referImageUrls?: string[]
  description?: string
  tagId?: string
  klingElementId?: string
  type: 'character' | 'prop' | 'location'
  wardrobeId?: string
}

export type ResolvedKlingElements = {
  elementIds: string[]
  promptTags: string[]
  warnings: string[]
  newRegistrations: KlingElementRegistration[]
}

export type KlingElementRegistration = {
  sourceId: string
  type: 'character' | 'prop' | 'location'
  klingElementId: string
  wardrobeId?: string
}

async function ensureElementRegistered(
  source: KlingElementSource
): Promise<{ elementId: string | null; registration?: KlingElementRegistration }> {
  if (source.klingElementId?.trim()) {
    return { elementId: source.klingElementId.trim() }
  }

  const frontal = source.frontalImageUrl?.trim() || source.imageUrl?.trim()
  if (!frontal) return { elementId: null }

  try {
    const referUrls = (source.referImageUrls || []).filter((u) => u?.trim())
    let elementId: string

    if (referUrls.length >= 1) {
      elementId = await registerKlingElementMulti({
        name: source.name,
        description: source.description,
        frontalImageUrl: frontal,
        referImageUrls: referUrls,
        tagId: source.tagId,
      })
    } else {
      elementId = await registerKlingElement(frontal, source.name)
    }

    return {
      elementId,
      registration: {
        sourceId: source.id,
        type: source.type,
        klingElementId: elementId,
        wardrobeId: source.wardrobeId,
      },
    }
  } catch (e) {
    console.warn(`[Kling Elements] Failed to register ${source.name}:`, e)
    return { elementId: null }
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
      newRegistrations: [],
    }
  }

  const elementIds: string[] = []
  const newRegistrations: KlingElementRegistration[] = []
  const limited = sources.slice(0, caps.maxElements)

  for (const source of limited) {
    const { elementId, registration } = await ensureElementRegistered(source)
    if (elementId) {
      elementIds.push(elementId)
      if (registration) newRegistrations.push(registration)
    } else {
      warnings.push(`Could not register element for ${source.name}`)
    }
  }

  return {
    elementIds,
    promptTags: buildElementPromptTags(elementIds),
    warnings,
    newRegistrations,
  }
}

export function collectKlingElementSources(args: {
  characters?: Array<{
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

    const identityUrl = char.referenceImage?.trim()
    const referCandidates = [wardrobe?.headshotUrl, wardrobe?.fullBodyUrl].filter(
      (u): u is string => !!u?.trim()
    )

    let frontalImageUrl = identityUrl
    let referImageUrls = referCandidates

    if (!frontalImageUrl && referCandidates.length > 0) {
      frontalImageUrl = referCandidates[0]
      referImageUrls = referCandidates.slice(1)
    }

    const imageUrl = frontalImageUrl || referImageUrls[0]
    if (!imageUrl) continue

    sources.push({
      id: char.id || char.name,
      name: char.name,
      imageUrl,
      frontalImageUrl,
      referImageUrls: referImageUrls.length ? referImageUrls : undefined,
      description: wardrobe ? `${char.name} in ${wardrobe.name}` : char.name,
      tagId: 'o_102',
      klingElementId: wardrobe?.klingElementId || char.klingElementId,
      type: 'character',
      wardrobeId: wardrobe?.id,
    })
  }

  for (const refId of objectRefIds) {
    const prop = objectReferences.find((o) => o.id === refId)
    if (!prop?.imageUrl) continue
    sources.push({
      id: prop.id,
      name: prop.name,
      imageUrl: prop.imageUrl,
      frontalImageUrl: prop.imageUrl,
      description: prop.description || prop.name,
      tagId: 'o_104',
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
        frontalImageUrl: loc.imageUrl,
        description: loc.description || loc.locationDisplay || loc.location,
        tagId: 'o_106',
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

/** Persist newly registered Kling element IDs back onto project reference metadata. */
export async function persistKlingElementIdsToProject(
  projectId: string,
  registrations: KlingElementRegistration[]
): Promise<void> {
  if (!registrations.length) return

  const project = await Project.findByPk(projectId)
  if (!project) return

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const references = visionPhase.references || {}
  const characters = [...(visionPhase.characters || [])]
  const objectReferences = [...(references.objectReferences || [])]
  const locationReferences = [...(references.locationReferences || [])]

  for (const reg of registrations) {
    if (reg.type === 'character') {
      const charIndex = characters.findIndex(
        (c: { id?: string; name?: string }) =>
          c.id === reg.sourceId || c.name === reg.sourceId
      )
      if (charIndex < 0) continue

      const char = { ...characters[charIndex] }
      if (reg.wardrobeId && Array.isArray(char.wardrobes)) {
        const wardrobes = char.wardrobes.map((w: { id?: string; klingElementId?: string }) =>
          w.id === reg.wardrobeId ? { ...w, klingElementId: reg.klingElementId } : w
        )
        char.wardrobes = wardrobes
      } else {
        char.klingElementId = reg.klingElementId
      }
      characters[charIndex] = char
    } else if (reg.type === 'prop') {
      const propIndex = objectReferences.findIndex(
        (p: { id?: string }) => p.id === reg.sourceId
      )
      if (propIndex >= 0) {
        objectReferences[propIndex] = {
          ...objectReferences[propIndex],
          klingElementId: reg.klingElementId,
        }
      }
    } else if (reg.type === 'location') {
      const locIndex = locationReferences.findIndex(
        (l: { id?: string }) => l.id === reg.sourceId
      )
      if (locIndex >= 0) {
        locationReferences[locIndex] = {
          ...locationReferences[locIndex],
          klingElementId: reg.klingElementId,
        }
      }
    }
  }

  const newMetadata = {
    ...metadata,
    visionPhase: {
      ...visionPhase,
      characters,
      references: {
        ...references,
        objectReferences,
        locationReferences,
      },
    },
  }

  project.set('metadata', newMetadata)
  project.changed('metadata', true)
  await project.save()
}
