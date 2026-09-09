/**
 * Project library rows ↔ reference_assets projection.
 * Preserves klingElementId, blob URLs, and lockedPromptTokens.
 */

import type { LocationReference, VisualReference } from '@/types/visionReferences'
import type { VisionCharacter } from '@/types/vision'
import type {
  ReferenceAssetKind,
  ReferenceAssetRecord,
  ReferenceAssetAttributes,
  ReferenceCatalog,
  ReferenceCatalogEntry,
} from '@/types/referenceLibrary'
import {
  toSeriesCharacter,
  seriesLocationToReference,
  seriesPropToObject,
} from '@/lib/series/referenceTransfer'
import type { SeriesCharacter, SeriesLocation, SeriesProp } from '@/types/series'

/** visionPhase character with optional library back-reference */
export type ProjectCharacter = VisionCharacter & {
  libraryAssetId?: string
  referenceUrl?: string
  appearance?: string
  voiceId?: string
  lockedPromptTokens?: string[]
}

export function libraryAssetToCharacter(asset: ReferenceAssetRecord): ProjectCharacter {
  const attrs = asset.attributes || {}
  return {
    id: (attrs.legacyId as string) || asset.id,
    libraryAssetId: asset.id,
    name: asset.name,
    description: asset.description || '',
    role: (attrs.role as ProjectCharacter['role']) || 'supporting',
    referenceImage: asset.referenceImageUrl || undefined,
    referenceUrl: asset.referenceImageUrl || undefined,
    klingElementId: attrs.klingElementId,
    appearanceDescription: attrs.appearance,
    appearance: attrs.appearance,
    voiceConfig: attrs.voiceId ? { voiceId: attrs.voiceId } : undefined,
    voiceId: attrs.voiceId,
    lockedPromptTokens: attrs.lockedPromptTokens,
    wardrobes: Array.isArray(attrs.wardrobes) ? (attrs.wardrobes as ProjectCharacter['wardrobes']) : undefined,
  }
}

export function libraryAssetToLocation(asset: ReferenceAssetRecord): LocationReference {
  const attrs = asset.attributes || {}
  const now = new Date().toISOString()
  return {
    id: (attrs.legacyId as string) || asset.id,
    location: asset.name,
    locationDisplay: attrs.locationDisplay || asset.name,
    imageUrl: asset.referenceImageUrl || '',
    sourceSceneIndex: 0,
    sourceSceneHeading: asset.name,
    pinnedAt: now,
    description: asset.description || undefined,
    klingElementId: attrs.klingElementId,
    generationPrompt: attrs.generationPrompt,
    libraryAssetId: asset.id,
  } as LocationReference & { libraryAssetId?: string }
}

export function libraryAssetToProp(asset: ReferenceAssetRecord): VisualReference {
  const attrs = asset.attributes || {}
  return {
    id: (attrs.legacyId as string) || asset.id,
    type: 'object',
    name: asset.name,
    description: asset.description,
    imageUrl: asset.referenceImageUrl,
    category: attrs.category || 'prop',
    importance: attrs.importance,
    alwaysInclude: attrs.alwaysInclude,
    klingElementId: attrs.klingElementId,
    libraryAssetId: asset.id,
  } as VisualReference & { libraryAssetId?: string }
}

export function characterToLibraryAttributes(char: ProjectCharacter): ReferenceAssetAttributes {
  return {
    legacyId: char.libraryAssetId ? undefined : char.id,
    appearance: char.appearance || char.appearanceDescription,
    voiceId: char.voiceId || char.voiceConfig?.voiceId,
    lockedPromptTokens: char.lockedPromptTokens,
    klingElementId: char.klingElementId,
    role: char.role,
    wardrobes: char.wardrobes,
  }
}

export function locationToLibraryAttributes(loc: LocationReference): ReferenceAssetAttributes {
  return {
    legacyId: (loc as LocationReference & { libraryAssetId?: string }).libraryAssetId
      ? undefined
      : loc.id,
    locationDisplay: loc.locationDisplay,
    klingElementId: loc.klingElementId,
    generationPrompt: loc.generationPrompt,
  }
}

export function propToLibraryAttributes(prop: VisualReference): ReferenceAssetAttributes {
  return {
    legacyId: (prop as VisualReference & { libraryAssetId?: string }).libraryAssetId
      ? undefined
      : prop.id,
    category: prop.category,
    importance: prop.importance,
    alwaysInclude: prop.alwaysInclude,
    klingElementId: prop.klingElementId,
  }
}

export function seriesCharacterToCreateInput(
  char: SeriesCharacter & { wardrobes?: unknown[] },
  userId: string,
  seriesId: string
) {
  const seriesChar = toSeriesCharacter(char)
  return {
    userId,
    kind: 'character' as ReferenceAssetKind,
    name: seriesChar.name,
    description: seriesChar.description,
    referenceImageUrl: seriesChar.referenceImageUrl,
    originSeriesId: seriesId,
    attributes: {
      legacyId: char.id,
      appearance: seriesChar.appearance,
      voiceId: seriesChar.voiceId,
      lockedPromptTokens: seriesChar.lockedPromptTokens,
      role: seriesChar.role,
      wardrobes: seriesChar.wardrobes,
    },
  }
}

export function projectCharacterToCreateInput(
  char: ProjectCharacter,
  userId: string,
  projectId: string
) {
  return {
    userId,
    kind: 'character' as ReferenceAssetKind,
    name: char.name,
    description: char.description,
    referenceImageUrl: char.referenceUrl || char.referenceImage,
    originProjectId: projectId,
    attributes: characterToLibraryAttributes(char),
  }
}

export function seriesLocationToCreateInput(loc: SeriesLocation, userId: string, seriesId: string) {
  return {
    userId,
    kind: 'location' as ReferenceAssetKind,
    name: loc.name,
    description: loc.description || loc.visualDescription,
    referenceImageUrl: loc.referenceImageUrl,
    originSeriesId: seriesId,
    attributes: {
      legacyId: loc.id,
      locationDisplay: loc.name,
      lockedPromptTokens: loc.lockedPromptTokens,
    },
  }
}

export function seriesPropToCreateInput(prop: SeriesProp, userId: string, seriesId: string) {
  return {
    userId,
    kind: 'prop' as ReferenceAssetKind,
    name: prop.name,
    description: prop.description,
    referenceImageUrl: prop.referenceImageUrl,
    originSeriesId: seriesId,
    attributes: {
      legacyId: prop.id,
      lockedPromptTokens: prop.lockedPromptTokens,
      category: 'prop',
    },
  }
}

/** Apply linked library assets into visionPhase shape */
export function projectVisionFromLibraryAssets(
  assets: ReferenceAssetRecord[]
): {
  characters: ProjectCharacter[]
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
} {
  const characters: ProjectCharacter[] = []
  const locationReferences: LocationReference[] = []
  const objectReferences: VisualReference[] = []
  const wardrobesByParent = new Map<string, ReferenceAssetRecord[]>()

  for (const asset of assets) {
    if (asset.archivedAt) continue
    switch (asset.kind) {
      case 'character':
        characters.push(libraryAssetToCharacter(asset))
        break
      case 'wardrobe':
        if (asset.parentAssetId) {
          const list = wardrobesByParent.get(asset.parentAssetId) || []
          list.push(asset)
          wardrobesByParent.set(asset.parentAssetId, list)
        }
        break
      case 'location':
        locationReferences.push(libraryAssetToLocation(asset))
        break
      case 'prop':
        objectReferences.push(libraryAssetToProp(asset))
        break
    }
  }

  for (const char of characters) {
    const libId = char.libraryAssetId
    if (!libId) continue
    const wardrobes = wardrobesByParent.get(libId)
    if (wardrobes?.length) {
      char.wardrobes = wardrobes.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        previewImageUrl: w.referenceImageUrl,
        headshotUrl: w.attributes.headshotUrl,
        fullBodyUrl: w.attributes.fullBodyUrl,
        isDefault: w.attributes.isDefault as boolean | undefined,
      }))
    }
  }

  return { characters, locationReferences, objectReferences }
}

export function buildReferenceCatalog(assets: ReferenceAssetRecord[]): ReferenceCatalog {
  const catalog: ReferenceCatalog = {
    characters: [],
    locations: [],
    props: [],
    wardrobes: [],
  }

  for (const asset of assets) {
    if (asset.archivedAt) continue
    const entry: ReferenceCatalogEntry = {
      id: asset.id,
      kind: asset.kind,
      name: asset.name,
      description: asset.description || undefined,
      parentAssetId: asset.parentAssetId || undefined,
      referenceImageUrl: asset.referenceImageUrl || undefined,
      attributes: asset.attributes,
    }
    switch (asset.kind) {
      case 'character':
        catalog.characters.push(entry)
        break
      case 'location':
        catalog.locations.push(entry)
        break
      case 'prop':
        catalog.props.push(entry)
        break
      case 'wardrobe':
        catalog.wardrobes.push(entry)
        break
    }
  }

  return catalog
}

export const MAX_ROSTER_ENTRIES = 40

/** Format catalog for LLM prompts with a cap */
export function formatReferenceCatalogForPrompt(
  catalog: ReferenceCatalog,
  maxEntries = MAX_ROSTER_ENTRIES
): string {
  const lines: string[] = ['=== REFERENCE ASSET CATALOG (reuse verbatim when applicable) ===']
  let count = 0

  const append = (kind: string, id: string, name: string, desc?: string) => {
    if (count >= maxEntries) return false
    lines.push(`  [${kind}] id=${id} name="${name}"${desc ? ` — ${desc.slice(0, 120)}` : ''}`)
    count++
    return true
  }

  for (const c of catalog.characters) {
    if (!append('CHARACTER', c.id, c.name, c.description)) break
  }
  for (const l of catalog.locations) {
    if (count >= maxEntries) break
    append('LOCATION', l.id, l.name, l.description)
  }
  for (const p of catalog.props) {
    if (count >= maxEntries) break
    append('PROP', p.id, p.name, p.description)
  }

  if (count >= maxEntries) {
    lines.push(`  ... (${catalog.characters.length + catalog.locations.length + catalog.props.length - maxEntries} more omitted)`)
  }

  lines.push('Use catalog IDs in output. Tag genuinely new assets with isNew: true.')
  lines.push('=== END REFERENCE CATALOG ===')
  lines.push('')
  return lines.join('\n')
}

/** Re-export series converters for round-trip tests */
export { seriesLocationToReference, seriesPropToObject }
