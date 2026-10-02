/**
 * Asset-level reference library transfer between Series production_bible and Project visionPhase.
 */

import type { LocationReference, VisualReference } from '@/types/visionReferences'
import type {
  SeriesCharacter,
  SeriesLocation,
  SeriesProp,
  SeriesProductionBible,
  SeriesAesthetic,
} from '@/types/series'

export type TransferDirection = 'project_to_series' | 'series_to_project'
export type TransferMergeStrategy = 'add_new_only' | 'merge' | 'replace'

export interface SeriesCharacterWardrobe {
  id: string
  name: string
  description?: string
  previewImageUrl?: string
  headshotUrl?: string
  fullBodyUrl?: string
  isDefault?: boolean
  sceneNumbers?: number[]
}

export interface ReferenceAssetSelection {
  characterIds?: string[]
  locationIds?: string[]
  propIds?: string[]
  /** Composite keys: `${characterId}:${wardrobeId}` */
  wardrobeKeys?: string[]
  includeSettings?: boolean
}

export interface TransferCatalogCharacter {
  id: string
  name: string
  role?: string
  referenceImageUrl?: string
  voiceId?: string
  voiceLabel?: string
  wardrobes: Array<{ key: string; id: string; name: string }>
  provenance: 'series' | 'episode'
}

export interface TransferCatalogLocation {
  id: string
  name: string
  referenceImageUrl?: string
  provenance: 'series' | 'episode'
}

export interface TransferCatalogProp {
  id: string
  name: string
  referenceImageUrl?: string
  category?: string
  provenance: 'series' | 'episode'
}

export interface ReferenceTransferCatalog {
  seriesVersion: string
  projectBibleRefVersion?: string
  seriesOutOfSync: boolean
  characters: TransferCatalogCharacter[]
  locations: TransferCatalogLocation[]
  props: TransferCatalogProp[]
  hasSettings: boolean
  episodeCharacterIds: string[]
}

export interface ReferenceTransferDiff {
  characters: {
    added: SeriesCharacter[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  locations: {
    added: SeriesLocation[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  props: {
    added: SeriesProp[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  aesthetic?: { before: SeriesAesthetic; after: SeriesAesthetic }
  summary: {
    addedCount: number
    updatedCount: number
    skippedCount: number
  }
}

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number)
  if (parts.length >= 3 && !parts.some(Number.isNaN)) {
    parts[2] = (parts[2] || 0) + 1
    return parts.join('.')
  }
  return '1.0.1'
}

function getProjectReferences(metadata: Record<string, any>) {
  const visionPhase = metadata?.visionPhase || {}
  const refs = visionPhase.references || {}
  return {
    visionPhase,
    characters: (visionPhase.characters || []) as any[],
    locationReferences: (refs.locationReferences || []) as LocationReference[],
    objectReferences: (refs.objectReferences || []) as VisualReference[],
    sceneReferences: (refs.sceneReferences || []) as VisualReference[],
    generationSettings: visionPhase.generationSettings || {},
  }
}

function locationToSeries(loc: LocationReference): SeriesLocation {
  const now = new Date().toISOString()
  return {
    id: loc.id,
    name: loc.location || loc.locationDisplay || 'Location',
    description: loc.description || loc.locationDisplay || '',
    visualDescription: loc.description,
    referenceImageUrl: loc.imageUrl,
    createdAt: loc.pinnedAt || now,
    updatedAt: now,
  }
}

function seriesLocationToReference(loc: SeriesLocation): LocationReference {
  const now = new Date().toISOString()
  return {
    id: loc.id,
    location: loc.name,
    locationDisplay: loc.name,
    imageUrl: loc.referenceImageUrl || '',
    sourceSceneIndex: 0,
    sourceSceneHeading: loc.name,
    pinnedAt: now,
    description: loc.description || loc.visualDescription,
    autoExtracted: false,
  }
}

function propToSeries(obj: VisualReference): SeriesProp {
  const now = new Date().toISOString()
  return {
    id: obj.id,
    name: obj.name,
    description: obj.description || '',
    referenceImageUrl: obj.imageUrl,
    lockedPromptTokens: undefined,
    createdAt: obj.createdAt || now,
    updatedAt: now,
  }
}

function seriesPropToObject(prop: SeriesProp): VisualReference {
  return {
    id: prop.id,
    type: 'object',
    name: prop.name,
    description: prop.description,
    imageUrl: prop.referenceImageUrl,
    createdAt: prop.createdAt,
    category: 'prop',
  }
}

export function toSeriesCharacter(pc: any): SeriesCharacter & { wardrobes?: SeriesCharacterWardrobe[] } {
  const now = new Date().toISOString()
  return {
    id: pc.id,
    name: pc.name,
    role: pc.role || 'supporting',
    description: pc.description || '',
    appearance: pc.appearance || pc.appearanceDescription || '',
    backstory: pc.backstory,
    personality: pc.personality,
    voiceId: pc.voiceId || pc.voiceConfig?.voiceId,
    referenceImageUrl: pc.referenceUrl || pc.referenceImage,
    lockedPromptTokens: pc.lockedPromptTokens,
    wardrobes: Array.isArray(pc.wardrobes) ? pc.wardrobes : undefined,
    createdAt: pc.createdAt || now,
    updatedAt: now,
  }
}

function projectCharacterFromSeries(
  char: SeriesCharacter & { wardrobes?: SeriesCharacterWardrobe[] }
): any {
  return {
    id: char.id,
    name: char.name,
    role: char.role,
    description: char.description,
    appearance: char.appearance,
    appearanceDescription: char.appearance,
    referenceUrl: char.referenceImageUrl,
    referenceImage: char.referenceImageUrl,
    voiceId: char.voiceId,
    lockedPromptTokens: char.lockedPromptTokens,
    wardrobes: char.wardrobes,
  }
}

export function extractLocationsFromProject(metadata: Record<string, any>): SeriesLocation[] {
  const { locationReferences } = getProjectReferences(metadata)
  const fromRefs = locationReferences
    .filter((l) => l.imageUrl || l.location)
    .map(locationToSeries)

  if (fromRefs.length > 0) return fromRefs

  const locations: SeriesLocation[] = []
  const scenes = metadata?.visionPhase?.scenes || metadata?.visionPhase?.script?.script?.scenes || []
  for (const scene of scenes) {
    const heading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
    if (!heading) continue
    const match = heading.match(/^(?:INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-\s*.+)?$/i)
    const locName = match?.[1]?.trim() || heading
    if (locName && !locations.find((l) => l.name === locName)) {
      const now = new Date().toISOString()
      locations.push({
        id: `loc_${locName.toLowerCase().replace(/\s+/g, '_')}`,
        name: locName,
        description: scene.visualDescription || '',
        visualDescription: scene.visualDescription,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  return locations
}

export type ProductionReferenceImages = {
  characters: Record<string, string>
  locations: Record<string, string>
  props: Record<string, string>
}

export function normalizeReferenceName(name: string | undefined | null): string {
  return (name || '').trim().toLowerCase()
}

function rememberImage(bucket: Record<string, string>, name: string | undefined, url: string | undefined) {
  const key = normalizeReferenceName(name)
  const picture = url?.trim()
  if (!key || !picture) return
  bucket[key] = picture
}

/** Pictures stored on Production Stage projects, keyed by normalized asset name. Later projects win. */
export function collectProductionReferenceImages(
  projectMetadatas: Array<Record<string, any> | null | undefined>
): ProductionReferenceImages {
  const characters: Record<string, string> = {}
  const locations: Record<string, string> = {}
  const props: Record<string, string> = {}

  for (const metadata of projectMetadatas) {
    if (!metadata) continue
    const proj = getProjectReferences(metadata)
    for (const character of proj.characters) {
      rememberImage(characters, character.name, character.referenceUrl || character.referenceImage)
    }
    for (const location of extractLocationsFromProject(metadata)) {
      rememberImage(locations, location.name, location.referenceImageUrl)
    }
    for (const object of proj.objectReferences) {
      rememberImage(props, object.name, object.imageUrl)
    }
  }

  return { characters, locations, props }
}

export type DisplayReference = {
  id: string
  name: string
  role?: string
  description?: string
  imageUrl?: string
  libraryAssetId?: string
}

export type ReferenceGroups = {
  characters: DisplayReference[]
  locations: DisplayReference[]
  props: DisplayReference[]
}

export function referencesFromProjectMetadata(
  metadata: Record<string, any> | null | undefined
): ReferenceGroups {
  if (!metadata) return { characters: [], locations: [], props: [] }
  const proj = getProjectReferences(metadata)
  return {
    characters: proj.characters.map((character: any) => ({
      id: String(character.id || character.name || ''),
      name: character.name || 'Character',
      role: character.role,
      description: character.description || character.appearance || '',
      imageUrl: character.referenceUrl || character.referenceImage || undefined,
      libraryAssetId: character.libraryAssetId,
    })),
    locations: extractLocationsFromProject(metadata).map((location) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      imageUrl: location.referenceImageUrl,
    })),
    props: proj.objectReferences.map((object) => ({
      id: object.id,
      name: object.name,
      description: object.description,
      imageUrl: object.imageUrl,
      libraryAssetId: object.libraryAssetId,
    })),
  }
}

function hasReferenceImage(groups: ReferenceGroups): boolean {
  return [...groups.characters, ...groups.locations, ...groups.props].some((asset) =>
    Boolean(asset.imageUrl?.trim())
  )
}

function findSharedImage(
  asset: DisplayReference,
  library: DisplayReference[]
): string | undefined {
  const byId = asset.libraryAssetId
    ? library.find((item) => item.id === asset.libraryAssetId || item.libraryAssetId === asset.libraryAssetId)
    : undefined
  const byName = library.find(
    (item) => normalizeReferenceName(item.name) === normalizeReferenceName(asset.name)
  )
  return byId?.imageUrl?.trim() || byName?.imageUrl?.trim() || undefined
}

function withPictureFallback(
  asset: DisplayReference,
  library: DisplayReference[],
  series: DisplayReference[]
): DisplayReference {
  const seriesMatch = series.find(
    (item) => normalizeReferenceName(item.name) === normalizeReferenceName(asset.name)
  )
  return {
    ...asset,
    imageUrl: asset.imageUrl?.trim() || findSharedImage(asset, library) || seriesMatch?.imageUrl?.trim(),
  }
}

/**
 * Production assets with pictures replace the series list.
 * A recurring character still inherits the shared library picture when this episode has none.
 * Series bible assets are the last fallback.
 */
export function selectEpisodeReferences(input: {
  production: ReferenceGroups
  library: ReferenceGroups
  series: ReferenceGroups
  episodeCharacterIds?: string[]
}): { source: 'production' | 'series' } & ReferenceGroups {
  const { production, library, series } = input
  if (hasReferenceImage(production)) {
    return {
      source: 'production',
      characters: production.characters.map((asset) =>
        withPictureFallback(asset, library.characters, series.characters)
      ),
      locations: production.locations.map((asset) =>
        withPictureFallback(asset, library.locations, series.locations)
      ),
      props: production.props.map((asset) => withPictureFallback(asset, library.props, series.props)),
    }
  }

  const ids = new Set((input.episodeCharacterIds || []).filter(Boolean))
  const matched = series.characters.filter((character) => ids.has(character.id))
  const preferLibrary = (asset: DisplayReference, libraryAssets: DisplayReference[]) => ({
    ...asset,
    imageUrl: findSharedImage(asset, libraryAssets) || asset.imageUrl?.trim(),
  })
  const characters = (matched.length > 0 ? matched : series.characters).map((asset) =>
    preferLibrary(asset, library.characters)
  )
  return {
    source: 'series',
    characters,
    locations: series.locations.map((asset) => preferLibrary(asset, library.locations)),
    props: series.props.map((asset) => preferLibrary(asset, library.props)),
  }
}

/** Production pictures are the bible. Fall back to the series copy only when Production has none. */
export function resolveLibraryImage(
  name: string | undefined,
  seriesUrl: string | undefined,
  production: Record<string, string> | undefined
): string | undefined {
  const fromProduction = production?.[normalizeReferenceName(name)]
  if (fromProduction) return fromProduction
  const stored = seriesUrl?.trim()
  return stored || undefined
}

export function buildTransferCatalog(
  bible: SeriesProductionBible,
  projectMetadata: Record<string, any>,
  episodeCharacterIds: string[] = [],
  projectBibleRefVersion?: string
): ReferenceTransferCatalog {
  const seriesVersion = bible.version || '1.0.0'
  const proj = getProjectReferences(projectMetadata)
  const seriesCharIds = new Set((bible.characters || []).map((c) => c.id))
  const seriesLocIds = new Set((bible.locations || []).map((l) => l.id))
  const seriesPropIds = new Set((bible.props || []).map((p) => p.id))

  const characters: TransferCatalogCharacter[] = []

  for (const c of bible.characters || []) {
    const wardrobes = ((c as any).wardrobes || []).map((w: SeriesCharacterWardrobe) => ({
      key: `${c.id}:${w.id}`,
      id: w.id,
      name: w.name,
    }))
    const productionMatch = proj.characters.find(
      (pc: any) =>
        pc.id === c.id || normalizeReferenceName(pc.name) === normalizeReferenceName(c.name)
    )
    characters.push({
      id: c.id,
      name: c.name,
      role: c.role,
      referenceImageUrl: resolveLibraryImage(
        c.name,
        c.referenceImageUrl,
        productionMatch
          ? {
              [normalizeReferenceName(c.name)]:
                productionMatch.referenceUrl || productionMatch.referenceImage || '',
            }
          : undefined
      ),
      voiceId: c.voiceId,
      wardrobes,
      provenance: 'series',
    })
  }

  for (const pc of proj.characters) {
    if (
      seriesCharIds.has(pc.id) ||
      (bible.characters || []).some(
        (c) => normalizeReferenceName(c.name) === normalizeReferenceName(pc.name)
      )
    ) {
      continue
    }
    const wardrobes = (pc.wardrobes || []).map((w: SeriesCharacterWardrobe) => ({
      key: `${pc.id}:${w.id}`,
      id: w.id,
      name: w.name,
    }))
    characters.push({
      id: pc.id,
      name: pc.name,
      role: pc.role,
      referenceImageUrl: pc.referenceUrl || pc.referenceImage,
      voiceId: pc.voiceId || pc.voiceConfig?.voiceId,
      wardrobes,
      provenance: 'episode',
    })
  }

  const locations: TransferCatalogLocation[] = []
  const projectLocations = extractLocationsFromProject(projectMetadata)
  for (const l of bible.locations || []) {
    const productionMatch = projectLocations.find(
      (item) =>
        item.id === l.id || normalizeReferenceName(item.name) === normalizeReferenceName(l.name)
    )
    locations.push({
      id: l.id,
      name: l.name,
      referenceImageUrl: resolveLibraryImage(
        l.name,
        l.referenceImageUrl,
        productionMatch?.referenceImageUrl
          ? { [normalizeReferenceName(l.name)]: productionMatch.referenceImageUrl }
          : undefined
      ),
      provenance: 'series',
    })
  }
  for (const l of projectLocations) {
    if (
      seriesLocIds.has(l.id) ||
      (bible.locations || []).some(
        (item) => normalizeReferenceName(item.name) === normalizeReferenceName(l.name)
      )
    ) {
      continue
    }
    locations.push({
      id: l.id,
      name: l.name,
      referenceImageUrl: l.referenceImageUrl,
      provenance: 'episode',
    })
  }

  const props: TransferCatalogProp[] = []
  for (const p of bible.props || []) {
    const productionMatch = proj.objectReferences.find(
      (item) =>
        item.id === p.id || normalizeReferenceName(item.name) === normalizeReferenceName(p.name)
    )
    props.push({
      id: p.id,
      name: p.name,
      referenceImageUrl: resolveLibraryImage(
        p.name,
        p.referenceImageUrl,
        productionMatch?.imageUrl
          ? { [normalizeReferenceName(p.name)]: productionMatch.imageUrl }
          : undefined
      ),
      provenance: 'series',
    })
  }
  for (const o of proj.objectReferences) {
    if (
      seriesPropIds.has(o.id) ||
      (bible.props || []).some(
        (item) => normalizeReferenceName(item.name) === normalizeReferenceName(o.name)
      )
    ) {
      continue
    }
    props.push({
      id: o.id,
      name: o.name,
      referenceImageUrl: o.imageUrl,
      category: o.category,
      provenance: 'episode',
    })
  }

  return {
    seriesVersion,
    projectBibleRefVersion: projectBibleRefVersion,
    seriesOutOfSync: !!projectBibleRefVersion && projectBibleRefVersion !== seriesVersion,
    characters,
    locations,
    props,
    hasSettings: true,
    episodeCharacterIds,
  }
}

/**
 * Catalog of all reference assets in a project (for importing into a series library).
 */
export function buildProjectImportCatalog(
  projectMetadata: Record<string, any>
): ReferenceTransferCatalog {
  const proj = getProjectReferences(projectMetadata)
  const gs = proj.generationSettings || {}

  const characters: TransferCatalogCharacter[] = proj.characters.map((pc: any) => {
    const wardrobes = (pc.wardrobes || []).map((w: SeriesCharacterWardrobe) => ({
      key: `${pc.id}:${w.id}`,
      id: w.id,
      name: w.name,
    }))
    return {
      id: pc.id,
      name: pc.name || 'Character',
      role: pc.role,
      referenceImageUrl: pc.referenceUrl || pc.referenceImage,
      voiceId: pc.voiceId || pc.voiceConfig?.voiceId,
      voiceLabel: pc.voiceLabel || pc.voiceConfig?.voiceName,
      wardrobes,
      provenance: 'episode' as const,
    }
  })

  const locations: TransferCatalogLocation[] = extractLocationsFromProject(projectMetadata).map(
    (l) => ({
      id: l.id,
      name: l.name,
      referenceImageUrl: l.referenceImageUrl,
      provenance: 'episode' as const,
    })
  )

  const props: TransferCatalogProp[] = proj.objectReferences.map((o) => ({
    id: o.id,
    name: o.name,
    referenceImageUrl: o.imageUrl,
    category: o.category,
    provenance: 'episode' as const,
  }))

  const hasSettings = !!(
    gs.aspectRatio ||
    gs.imageStyle ||
    gs.visualStyle ||
    gs.colorPalette ||
    proj.visionPhase?.visualStyle
  )

  return {
    seriesVersion: '1.0.0',
    seriesOutOfSync: false,
    characters,
    locations,
    props,
    hasSettings,
    episodeCharacterIds: characters.map((c) => c.id),
  }
}

function mergeCharacters(
  bibleChars: (SeriesCharacter & { wardrobes?: SeriesCharacterWardrobe[] })[],
  projectChars: any[],
  selectedIds: string[],
  wardrobeKeys: string[],
  strategy: TransferMergeStrategy
): { merged: (SeriesCharacter & { wardrobes?: SeriesCharacterWardrobe[] })[]; diff: ReferenceTransferDiff['characters'] } {
  const changes: ReferenceTransferDiff['characters'] = { added: [], updated: [], removed: [] }
  const selectedSet = new Set(selectedIds)
  const wardrobeByChar = new Map<string, string[]>()
  for (const key of wardrobeKeys) {
    const [cid, wid] = key.split(':')
    if (!cid || !wid) continue
    if (!wardrobeByChar.has(cid)) wardrobeByChar.set(cid, [])
    wardrobeByChar.get(cid)!.push(wid)
  }

  const toMerge = projectChars.filter((c) => selectedSet.has(c.id))
  let merged = strategy === 'replace' ? [] : [...bibleChars]
  const bibleMap = new Map(merged.map((c) => [c.id, c]))

  if (strategy === 'replace') {
    for (const pc of toMerge) {
      const sc = toSeriesCharacter(pc)
      const wids = wardrobeByChar.get(pc.id)
      if (wids?.length && sc.wardrobes) {
        sc.wardrobes = sc.wardrobes.filter((w) => wids.includes(w.id))
      }
      merged.push(sc)
      if (!bibleMap.has(sc.id)) changes.added.push(sc)
    }
    changes.removed = bibleChars.filter((c) => !selectedSet.has(c.id)).map((c) => c.id)
    return { merged, diff: changes }
  }

  for (const pc of toMerge) {
    const incoming = toSeriesCharacter(pc)
    const wids = wardrobeByChar.get(pc.id)
    if (wids?.length && incoming.wardrobes) {
      incoming.wardrobes = incoming.wardrobes.filter((w) => wids.includes(w.id))
    }

    const existing = bibleMap.get(pc.id)
    if (!existing) {
      merged.push(incoming)
      changes.added.push(incoming)
    } else if (strategy === 'add_new_only') {
      continue
    } else {
      const updatedFields: string[] = []
      const next = { ...existing }
      if (incoming.appearance && incoming.appearance !== existing.appearance) {
        next.appearance = incoming.appearance
        updatedFields.push('appearance')
      }
      if (incoming.referenceImageUrl && incoming.referenceImageUrl !== existing.referenceImageUrl) {
        next.referenceImageUrl = incoming.referenceImageUrl
        updatedFields.push('referenceImageUrl')
      }
      if (incoming.voiceId && incoming.voiceId !== existing.voiceId) {
        next.voiceId = incoming.voiceId
        updatedFields.push('voiceId')
      }
      if (incoming.description && incoming.description !== existing.description) {
        next.description = incoming.description
        updatedFields.push('description')
      }
      if (incoming.wardrobes?.length) {
        const existingW = existing.wardrobes || []
        const mergedW = [...existingW]
        for (const w of incoming.wardrobes) {
          const idx = mergedW.findIndex((x) => x.id === w.id)
          if (idx >= 0) mergedW[idx] = { ...mergedW[idx], ...w }
          else mergedW.push(w)
        }
        next.wardrobes = mergedW
        updatedFields.push('wardrobes')
      }
      if (updatedFields.length > 0) {
        next.updatedAt = new Date().toISOString()
        const idx = merged.findIndex((c) => c.id === pc.id)
        merged[idx] = next
        changes.updated.push({ id: pc.id, fields: updatedFields })
      }
    }
  }

  return { merged, diff: changes }
}

function mergeLocations(
  bibleLocs: SeriesLocation[],
  projectLocs: SeriesLocation[],
  selectedIds: string[],
  strategy: TransferMergeStrategy
): { merged: SeriesLocation[]; diff: ReferenceTransferDiff['locations'] } {
  const changes: ReferenceTransferDiff['locations'] = { added: [], updated: [], removed: [] }
  const selectedSet = new Set(selectedIds)
  const toMerge = projectLocs.filter((l) => selectedSet.has(l.id))
  let merged = strategy === 'replace' ? [] : [...bibleLocs]
  const bibleMap = new Map(merged.map((l) => [l.id, l]))

  for (const pl of toMerge) {
    const existing = bibleMap.get(pl.id)
    if (!existing) {
      merged.push(pl)
      changes.added.push(pl)
    } else if (strategy === 'merge') {
      const updatedFields: string[] = []
      const next = { ...existing }
      if (pl.referenceImageUrl && pl.referenceImageUrl !== existing.referenceImageUrl) {
        next.referenceImageUrl = pl.referenceImageUrl
        updatedFields.push('referenceImageUrl')
      }
      if (pl.description && pl.description !== existing.description) {
        next.description = pl.description
        updatedFields.push('description')
      }
      if (updatedFields.length > 0) {
        next.updatedAt = new Date().toISOString()
        const idx = merged.findIndex((l) => l.id === pl.id)
        merged[idx] = next
        changes.updated.push({ id: pl.id, fields: updatedFields })
      }
    }
  }
  return { merged, diff: changes }
}

function mergeProps(
  bibleProps: SeriesProp[],
  projectProps: SeriesProp[],
  selectedIds: string[],
  strategy: TransferMergeStrategy
): { merged: SeriesProp[]; diff: ReferenceTransferDiff['props'] } {
  const changes: ReferenceTransferDiff['props'] = { added: [], updated: [], removed: [] }
  const selectedSet = new Set(selectedIds)
  const toMerge = projectProps.filter((p) => selectedSet.has(p.id))
  let merged = strategy === 'replace' ? [] : [...bibleProps]
  const bibleMap = new Map(merged.map((p) => [p.id, p]))

  for (const pp of toMerge) {
    if (!bibleMap.has(pp.id)) {
      merged.push(pp)
      changes.added.push(pp)
    } else if (strategy === 'merge') {
      const existing = bibleMap.get(pp.id)!
      const updatedFields: string[] = []
      const next = { ...existing }
      if (pp.referenceImageUrl && pp.referenceImageUrl !== existing.referenceImageUrl) {
        next.referenceImageUrl = pp.referenceImageUrl
        updatedFields.push('referenceImageUrl')
      }
      if (updatedFields.length > 0) {
        next.updatedAt = new Date().toISOString()
        const idx = merged.findIndex((p) => p.id === pp.id)
        merged[idx] = next
        changes.updated.push({ id: pp.id, fields: updatedFields })
      }
    }
  }
  return { merged, diff: changes }
}

export function applyProjectToSeriesTransfer(
  bible: SeriesProductionBible,
  projectMetadata: Record<string, any>,
  selection: ReferenceAssetSelection,
  strategy: TransferMergeStrategy
): { updatedBible: SeriesProductionBible; diff: ReferenceTransferDiff } {
  const proj = getProjectReferences(projectMetadata)
  const projectLocs = extractLocationsFromProject(projectMetadata)
  const projectProps = proj.objectReferences.map(propToSeries)

  const charIds = selection.characterIds || []
  const locIds = selection.locationIds || []
  const propIds = selection.propIds || []
  const wardrobeKeys = selection.wardrobeKeys || []

  const charResult = charIds.length
    ? mergeCharacters(bible.characters || [], proj.characters, charIds, wardrobeKeys, strategy)
    : { merged: bible.characters || [], diff: { added: [], updated: [], removed: [] } }

  const locResult = locIds.length
    ? mergeLocations(bible.locations || [], projectLocs, locIds, strategy)
    : { merged: bible.locations || [], diff: { added: [], updated: [], removed: [] } }

  const propResult = propIds.length
    ? mergeProps(bible.props || [], projectProps, propIds, strategy)
    : { merged: bible.props || [], diff: { added: [], updated: [], removed: [] } }

  let aesthetic = bible.aesthetic || {}
  if (selection.includeSettings) {
    aesthetic = {
      ...aesthetic,
      visualStyle: proj.generationSettings.imageStyle || aesthetic.visualStyle,
      aspectRatio: proj.generationSettings.aspectRatio || aesthetic.aspectRatio,
      colorPalette: proj.generationSettings.colorPalette || aesthetic.colorPalette,
    }
  }

  const diff: ReferenceTransferDiff = {
    characters: charResult.diff,
    locations: locResult.diff,
    props: propResult.diff,
    aesthetic: selection.includeSettings
      ? { before: bible.aesthetic || {}, after: aesthetic }
      : undefined,
    summary: {
      addedCount:
        charResult.diff.added.length +
        locResult.diff.added.length +
        propResult.diff.added.length,
      updatedCount:
        charResult.diff.updated.length +
        locResult.diff.updated.length +
        propResult.diff.updated.length,
      skippedCount: 0,
    },
  }

  const updatedBible: SeriesProductionBible = {
    ...bible,
    characters: charResult.merged,
    locations: locResult.merged,
    props: propResult.merged,
    aesthetic,
    version: incrementVersion(bible.version || '1.0.0'),
    lastUpdated: new Date().toISOString(),
  }

  return { updatedBible, diff }
}

export function applySeriesToProjectTransfer(
  bible: SeriesProductionBible,
  projectMetadata: Record<string, any>,
  selection: ReferenceAssetSelection,
  strategy: TransferMergeStrategy,
  episodeCharacterIds: string[] = []
): { updatedMetadata: Record<string, any>; diff: ReferenceTransferDiff } {
  const proj = getProjectReferences(projectMetadata)
  const metadata = { ...projectMetadata }
  const visionPhase = { ...proj.visionPhase }
  const references = { ...(visionPhase.references || {}) }

  let characters = [...proj.characters]
  let locationReferences = [...proj.locationReferences]
  let objectReferences = [...proj.objectReferences]

  const charIds = selection.characterIds?.length
    ? selection.characterIds
    : episodeCharacterIds.length
      ? episodeCharacterIds
      : (bible.characters || []).map((c) => c.id)

  const seriesChars = (bible.characters || []).filter((c) => charIds.includes(c.id))
  const charMap = new Map(characters.map((c: any) => [c.id, c]))

  if (strategy === 'replace' && charIds.length) {
    characters = seriesChars.map(projectCharacterFromSeries)
  } else {
    for (const sc of seriesChars) {
      const incoming = projectCharacterFromSeries(sc)
      if (!charMap.has(sc.id)) {
        characters.push(incoming)
      } else if (strategy === 'merge') {
        const idx = characters.findIndex((c: any) => c.id === sc.id)
        characters[idx] = {
          ...characters[idx],
          ...incoming,
          wardrobes: incoming.wardrobes?.length
            ? incoming.wardrobes
            : characters[idx].wardrobes,
        }
      }
    }
  }

  const locIds = selection.locationIds || []
  const seriesLocs = (bible.locations || []).filter((l) =>
    locIds.length ? locIds.includes(l.id) : true
  )
  const locMap = new Map(locationReferences.map((l) => [l.id, l]))
  for (const sl of seriesLocs) {
    const ref = seriesLocationToReference(sl)
    if (!locMap.has(sl.id)) locationReferences.push(ref)
    else if (strategy === 'merge') {
      const idx = locationReferences.findIndex((l) => l.id === sl.id)
      locationReferences[idx] = { ...locationReferences[idx], ...ref, imageUrl: ref.imageUrl || locationReferences[idx].imageUrl }
    }
  }

  const propIds = selection.propIds || []
  const seriesProps = (bible.props || []).filter((p) => (propIds.length ? propIds.includes(p.id) : false))
  const objMap = new Map(objectReferences.map((o) => [o.id, o]))
  for (const sp of seriesProps) {
    const obj = seriesPropToObject(sp)
    if (!objMap.has(sp.id)) objectReferences.push(obj)
    else if (strategy === 'merge') {
      const idx = objectReferences.findIndex((o) => o.id === sp.id)
      objectReferences[idx] = { ...objectReferences[idx], ...obj }
    }
  }

  if (selection.includeSettings && bible.aesthetic) {
    visionPhase.generationSettings = {
      ...visionPhase.generationSettings,
      imageStyle: bible.aesthetic.visualStyle,
      aspectRatio: bible.aesthetic.aspectRatio,
      colorPalette: bible.aesthetic.colorPalette,
    }
  }

  visionPhase.characters = characters
  visionPhase.references = {
    ...references,
    locationReferences,
    objectReferences,
    sceneReferences: references.sceneReferences || proj.sceneReferences,
  }

  metadata.visionPhase = visionPhase
  metadata.seriesBibleRef = {
    version: bible.version,
    syncedAt: new Date().toISOString(),
    direction: 'pull_from_series',
  }

  const diff: ReferenceTransferDiff = {
    characters: {
      added: seriesChars.filter((c) => !charMap.has(c.id)).map((c) => toSeriesCharacter(projectCharacterFromSeries(c))),
      updated: [],
      removed: [],
    },
    locations: {
      added: seriesLocs.filter((l) => !locMap.has(l.id)).map((l) => l),
      updated: [],
      removed: [],
    },
    props: {
      added: seriesProps.filter((p) => !objMap.has(p.id)),
      updated: [],
      removed: [],
    },
    summary: {
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    },
  }
  diff.summary.addedCount =
    diff.characters.added.length + diff.locations.added.length + diff.props.added.length

  return { updatedMetadata: metadata, diff }
}
