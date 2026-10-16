/**
 * Blueprint Continuity helpers — unifies Cast, Locations, and Props across:
 * 1. Standalone Blueprint generation (`character_descriptions`, `scene_descriptions`, `prop_descriptions`)
 * 2. Series Episode shared Continuity Library (`SeriesProductionBible`, `production-references`, `visionPhase`)
 * 3. Handoff from Blueprint Studio to Production Stage (`visionPhase.characters`, `visionPhase.references`)
 */

import { toCanonicalName } from '@/lib/character/canonical'
import type { LocationReference, ObjectCategory, ObjectImportance, VisualReference } from '@/types/visionReferences'

export type BlueprintContinuitySubSection = 'all' | 'cast' | 'locations' | 'props'

export interface BlueprintCastItem {
  id?: string
  name: string
  role: string
  subject?: string
  ethnicity?: string
  keyFeature?: string
  hairStyle?: string
  hairColor?: string
  eyeColor?: string
  expression?: string
  build?: string
  defaultWardrobe?: string
  wardrobeAccessories?: string
  appearance?: string
  description: string
  externalGoal?: string
  internalNeed?: string
  fatalFlaw?: string
  arcStartingState?: string
  arcShift?: string
  arcEndingState?: string
  referenceImage?: string | null
  libraryCharacterId?: string
  libraryAssetId?: string
  isSharedFromSeries?: boolean
  isNew?: boolean
  /** Original index in `variant.character_descriptions` for content-MT path resolution */
  variantIndex?: number
}

export interface BlueprintLocationItem {
  id?: string
  name: string
  type?: string
  location: string
  atmosphere?: string
  furniture_props?: string
  description?: string
  referenceImage?: string | null
  libraryLocationId?: string
  libraryAssetId?: string
  isSharedFromSeries?: boolean
  isNew?: boolean
  /** Original index in `variant.scene_descriptions` for content-MT path resolution */
  variantIndex?: number
}

export interface BlueprintPropItem {
  id?: string
  name: string
  category?: string
  description: string
  significance?: string
  importance?: string
  referenceImage?: string | null
  libraryPropId?: string
  libraryAssetId?: string
  isSharedFromSeries?: boolean
  isNew?: boolean
  /** Original index in `variant.prop_descriptions` for content-MT path resolution */
  variantIndex?: number
}

export interface SharedContinuitySource {
  seriesId?: string | null
  seriesTitle?: string | null
  episodeNumber?: number | null
  bibleCharacters?: Array<Record<string, any>>
  bibleLocations?: Array<Record<string, any>>
  bibleProps?: Array<Record<string, any>>
  visionCharacters?: Array<Record<string, any>>
  visionLocations?: Array<Record<string, any>>
  visionProps?: Array<Record<string, any>>
}

export interface ResolvedBlueprintContinuity {
  cast: BlueprintCastItem[]
  locations: BlueprintLocationItem[]
  props: BlueprintPropItem[]
  counts: {
    cast: number
    locations: number
    props: number
    total: number
  }
  isSeriesShared: boolean
  seriesId?: string | null
  seriesTitle?: string | null
}

function normalizeKey(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  return toCanonicalName(raw).toLowerCase()
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

/**
 * Extract fallback prop entries from `scene_descriptions[].furniture_props`
 * when a generated or legacy Blueprint variant does not yet have `prop_descriptions`.
 */
export function extractFallbackPropsFromSceneDescriptions(
  sceneDescriptions: unknown
): BlueprintPropItem[] {
  if (!Array.isArray(sceneDescriptions) || sceneDescriptions.length === 0) return []
  const seen = new Set<string>()
  const props: BlueprintPropItem[] = []

  for (const rawScene of sceneDescriptions) {
    if (!rawScene || typeof rawScene !== 'object') continue
    const scene = rawScene as Record<string, unknown>
    const sceneName = asString(scene.name)
    const rawProps = asString(scene.furniture_props)
    if (!rawProps) continue

    const parts = rawProps
      .split(/[,;•\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && s.length <= 80)

    for (const part of parts) {
      const key = normalizeKey(part)
      if (!key || seen.has(key)) continue
      seen.add(key)
      props.push({
        name: part.charAt(0).toUpperCase() + part.slice(1),
        category: 'prop',
        description: sceneName ? `Set dressing / prop in ${sceneName}.` : 'Key scene prop.',
        significance: sceneName ? `Featured in ${sceneName}` : undefined,
        importance: 'medium',
      })
      if (props.length >= 12) return props
    }
  }

  return props
}

/**
 * Resolve unified Cast, Locations, and Props for a Blueprint variant,
 * merging with the shared Series / Project Continuity Library when present.
 */
export function resolveBlueprintContinuity(
  variant: Record<string, any> | null | undefined,
  sharedSource?: SharedContinuitySource | null
): ResolvedBlueprintContinuity {
  const isSeriesShared = Boolean(
    sharedSource?.seriesId ||
      (sharedSource?.bibleCharacters && sharedSource.bibleCharacters.length > 0) ||
      (sharedSource?.bibleLocations && sharedSource.bibleLocations.length > 0) ||
      (sharedSource?.bibleProps && sharedSource.bibleProps.length > 0)
  )

  // ── 1. Build shared lookup maps ──────────────────────────────────────────
  const sharedCharMap = new Map<string, Record<string, any>>()
  const sharedCharOrder: Record<string, any>[] = []
  for (const list of [sharedSource?.bibleCharacters, sharedSource?.visionCharacters]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object' || item.type === 'narrator' || item.type === 'description') {
        continue
      }
      const key = normalizeKey(item.name)
      if (!key) continue
      const prev = sharedCharMap.get(key)
      const merged = prev
        ? {
            ...prev,
            ...item,
            referenceImage: item.referenceImage || item.imageUrl || prev.referenceImage || prev.imageUrl || null,
            description: item.description || prev.description || '',
            appearance: item.appearance || item.appearanceDescription || prev.appearance || '',
            role: item.role || prev.role || 'supporting',
          }
        : {
            ...item,
            referenceImage: item.referenceImage || item.imageUrl || null,
          }
      if (!prev) sharedCharOrder.push(merged)
      sharedCharMap.set(key, merged)
    }
  }

  const sharedLocMap = new Map<string, Record<string, any>>()
  const sharedLocOrder: Record<string, any>[] = []
  for (const list of [sharedSource?.bibleLocations, sharedSource?.visionLocations]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const locName = asString(item.name || item.location || item.locationDisplay)
      const key = normalizeKey(locName)
      if (!key) continue
      const prev = sharedLocMap.get(key)
      const merged = prev
        ? {
            ...prev,
            ...item,
            name: prev.name || locName,
            referenceImage: item.referenceImage || item.imageUrl || prev.referenceImage || prev.imageUrl || null,
            description:
              item.description ||
              item.visualDescription ||
              prev.description ||
              prev.visualDescription ||
              '',
          }
        : {
            ...item,
            name: locName,
            referenceImage: item.referenceImage || item.imageUrl || null,
            description: item.description || item.visualDescription || '',
          }
      if (!prev) sharedLocOrder.push(merged)
      sharedLocMap.set(key, merged)
    }
  }

  const sharedPropMap = new Map<string, Record<string, any>>()
  const sharedPropOrder: Record<string, any>[] = []
  for (const list of [sharedSource?.bibleProps, sharedSource?.visionProps]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const propName = asString(item.name)
      const key = normalizeKey(propName)
      if (!key) continue
      const prev = sharedPropMap.get(key)
      const merged = prev
        ? {
            ...prev,
            ...item,
            name: prev.name || propName,
            referenceImage: item.referenceImage || item.imageUrl || prev.referenceImage || prev.imageUrl || null,
            description: item.description || prev.description || '',
          }
        : {
            ...item,
            name: propName,
            referenceImage: item.referenceImage || item.imageUrl || null,
            description: item.description || '',
          }
      if (!prev) sharedPropOrder.push(merged)
      sharedPropMap.set(key, merged)
    }
  }

  // ── 2. Resolve Cast ──────────────────────────────────────────────────────
  const cast: BlueprintCastItem[] = []
  const seenCastKeys = new Set<string>()
  const rawVariantChars = Array.isArray(variant?.character_descriptions)
    ? variant.character_descriptions
    : []

  rawVariantChars.forEach((c: any, idx: number) => {
    if (!c || typeof c !== 'object') return
    const name = asString(c.name)
    const key = normalizeKey(name)
    if (key) seenCastKeys.add(key)
    const shared = key ? sharedCharMap.get(key) : undefined
    const fromSeries = Boolean(
      c.libraryCharacterId ||
        c.bibleCharacterId ||
        (isSeriesShared && shared && !c.isNew)
    )
    cast.push({
      id: c.id || shared?.id || c.libraryCharacterId,
      name: shared?.name || name || `Character ${idx + 1}`,
      role: asString(c.role || shared?.role, 'supporting'),
      subject: asString(c.subject || shared?.name || name),
      ethnicity: asString(c.ethnicity || shared?.ethnicity),
      keyFeature: asString(c.keyFeature),
      hairStyle: asString(c.hairStyle),
      hairColor: asString(c.hairColor),
      eyeColor: asString(c.eyeColor),
      expression: asString(c.expression),
      build: asString(c.build),
      defaultWardrobe: asString(c.defaultWardrobe || shared?.defaultWardrobe),
      wardrobeAccessories: asString(c.wardrobeAccessories),
      appearance: asString(c.appearance || shared?.appearance || shared?.appearanceDescription),
      description: asString(c.description || shared?.description),
      externalGoal: asString(c.externalGoal),
      internalNeed: asString(c.internalNeed),
      fatalFlaw: asString(c.fatalFlaw),
      arcStartingState: asString(c.arcStartingState),
      arcShift: asString(c.arcShift),
      arcEndingState: asString(c.arcEndingState),
      referenceImage: c.referenceImage || shared?.referenceImage || shared?.imageUrl || null,
      libraryCharacterId: c.libraryCharacterId || shared?.bibleCharacterId || shared?.id,
      libraryAssetId: c.libraryAssetId || shared?.libraryAssetId,
      isSharedFromSeries: fromSeries,
      isNew: Boolean(c.isNew),
      variantIndex: idx,
    })
  })

  for (const shared of sharedCharOrder) {
    const key = normalizeKey(shared.name)
    if (!key || seenCastKeys.has(key)) continue
    seenCastKeys.add(key)
    const item = sharedCharMap.get(key) || shared
    cast.push({
      id: item.id,
      name: asString(item.name),
      role: asString(item.role, 'supporting'),
      appearance: asString(item.appearance || item.appearanceDescription),
      description: asString(item.description || item.appearance),
      referenceImage: item.referenceImage || item.imageUrl || null,
      libraryCharacterId: item.bibleCharacterId || item.id,
      libraryAssetId: item.libraryAssetId,
      isSharedFromSeries: isSeriesShared,
      isNew: false,
    })
  }

  // ── 3. Resolve Locations ─────────────────────────────────────────────────
  const locations: BlueprintLocationItem[] = []
  const seenLocKeys = new Set<string>()
  const rawVariantLocations = Array.isArray(variant?.scene_descriptions)
    ? variant.scene_descriptions
    : []

  rawVariantLocations.forEach((s: any, idx: number) => {
    if (!s || typeof s !== 'object') return
    const name = asString(s.name || s.location)
    const key = normalizeKey(name)
    if (key) seenLocKeys.add(key)
    const shared = key ? sharedLocMap.get(key) : undefined
    const fromSeries = Boolean(
      s.libraryLocationId ||
        s.bibleLocationId ||
        (isSeriesShared && shared && !s.isNew)
    )
    locations.push({
      id: s.id || shared?.id || s.libraryLocationId,
      name: shared?.name || name || `Location ${idx + 1}`,
      type: asString(s.type || shared?.intExt, 'INT'),
      location: asString(s.location || s.description || shared?.description),
      atmosphere: asString(s.atmosphere),
      furniture_props: asString(s.furniture_props),
      description: asString(s.description || shared?.description),
      referenceImage: s.referenceImage || shared?.referenceImage || shared?.imageUrl || null,
      libraryLocationId: s.libraryLocationId || shared?.bibleLocationId || shared?.id,
      libraryAssetId: s.libraryAssetId || shared?.libraryAssetId,
      isSharedFromSeries: fromSeries,
      isNew: Boolean(s.isNew),
      variantIndex: idx,
    })
  })

  for (const shared of sharedLocOrder) {
    const key = normalizeKey(shared.name)
    if (!key || seenLocKeys.has(key)) continue
    seenLocKeys.add(key)
    const item = sharedLocMap.get(key) || shared
    locations.push({
      id: item.id,
      name: asString(item.name),
      type: asString(item.intExt || item.type, 'INT'),
      location: asString(item.description || item.visualDescription),
      atmosphere: asString(item.atmosphere),
      furniture_props: asString(item.furniture_props),
      description: asString(item.description || item.visualDescription),
      referenceImage: item.referenceImage || item.imageUrl || null,
      libraryLocationId: item.bibleLocationId || item.id,
      libraryAssetId: item.libraryAssetId,
      isSharedFromSeries: isSeriesShared,
      isNew: false,
    })
  }

  // ── 4. Resolve Props ─────────────────────────────────────────────────────
  const props: BlueprintPropItem[] = []
  const seenPropKeys = new Set<string>()
  const explicitVariantProps = Array.isArray(variant?.prop_descriptions)
    ? variant.prop_descriptions
    : Array.isArray(variant?.props)
      ? variant.props
      : []

  const rawVariantProps =
    explicitVariantProps.length > 0
      ? explicitVariantProps
      : sharedPropOrder.length === 0
        ? extractFallbackPropsFromSceneDescriptions(rawVariantLocations)
        : []

  rawVariantProps.forEach((p: any, idx: number) => {
    if (!p || typeof p !== 'object') return
    const name = asString(p.name)
    const key = normalizeKey(name)
    if (key) seenPropKeys.add(key)
    const shared = key ? sharedPropMap.get(key) : undefined
    const fromSeries = Boolean(
      p.libraryPropId ||
        p.biblePropId ||
        (isSeriesShared && shared && !p.isNew)
    )
    props.push({
      id: p.id || shared?.id || p.libraryPropId,
      name: shared?.name || name || `Prop ${idx + 1}`,
      category: asString(p.category || shared?.category, 'prop'),
      description: asString(p.description || shared?.description),
      significance: asString(p.significance || shared?.significance),
      importance: asString(p.importance || shared?.importance, 'medium'),
      referenceImage: p.referenceImage || shared?.referenceImage || shared?.imageUrl || null,
      libraryPropId: p.libraryPropId || shared?.biblePropId || shared?.id,
      libraryAssetId: p.libraryAssetId || shared?.libraryAssetId,
      isSharedFromSeries: fromSeries,
      isNew: Boolean(p.isNew),
      variantIndex: explicitVariantProps.length > 0 ? idx : undefined,
    })
  })

  for (const shared of sharedPropOrder) {
    const key = normalizeKey(shared.name)
    if (!key || seenPropKeys.has(key)) continue
    seenPropKeys.add(key)
    const item = sharedPropMap.get(key) || shared
    props.push({
      id: item.id,
      name: asString(item.name),
      category: asString(item.category, 'prop'),
      description: asString(item.description),
      significance: asString(item.significance),
      importance: asString(item.importance, 'medium'),
      referenceImage: item.referenceImage || item.imageUrl || null,
      libraryPropId: item.biblePropId || item.id,
      libraryAssetId: item.libraryAssetId,
      isSharedFromSeries: isSeriesShared,
      isNew: false,
    })
  }

  return {
    cast,
    locations,
    props,
    counts: {
      cast: cast.length,
      locations: locations.length,
      props: props.length,
      total: cast.length + locations.length + props.length,
    },
    isSeriesShared,
    seriesId: sharedSource?.seriesId ?? null,
    seriesTitle: sharedSource?.seriesTitle ?? null,
  }
}

function mapObjectCategory(raw?: string): ObjectCategory {
  const c = (raw || '').toLowerCase().trim()
  if (c === 'vehicle') return 'vehicle'
  if (c === 'set_piece' || c === 'set-piece') return 'set-piece'
  if (c === 'costume' || c === 'wardrobe_item') return 'costume'
  if (c === 'technology') return 'technology'
  if (c === 'prop' || c === 'document') return 'prop'
  return 'other'
}

function mapObjectImportance(raw?: string): ObjectImportance {
  const imp = (raw || '').toLowerCase().trim()
  if (imp === 'critical') return 'critical'
  if (imp === 'high' || imp === 'important') return 'important'
  return 'background'
}

/**
 * Convert Blueprint Continuity (`character_descriptions`, `scene_descriptions`, `prop_descriptions`)
 * into Production `visionPhase` structures (`characters`, `references.locationReferences`, `references.objectReferences`),
 * preserving any existing reference images, IDs, and voice configs on `existingVisionPhase`.
 */
export function buildVisionPhaseContinuityFromVariant(
  variant: Record<string, any> | null | undefined,
  existingVisionPhase?: Record<string, any> | null
): {
  characters: Array<Record<string, any>>
  references: {
    sceneReferences: VisualReference[]
    locationReferences: LocationReference[]
    objectReferences: VisualReference[]
    [key: string]: unknown
  }
} {
  const existingChars = Array.isArray(existingVisionPhase?.characters)
    ? existingVisionPhase!.characters
    : []
  const existingRefs = (existingVisionPhase?.references || {}) as Record<string, any>
  const existingSceneRefs: VisualReference[] = Array.isArray(existingRefs.sceneReferences)
    ? existingRefs.sceneReferences
    : []
  const existingLocRefs: LocationReference[] = Array.isArray(existingRefs.locationReferences)
    ? existingRefs.locationReferences
    : []
  const existingObjRefs: VisualReference[] = Array.isArray(existingRefs.objectReferences)
    ? existingRefs.objectReferences
    : []

  const continuity = resolveBlueprintContinuity(variant, {
    visionCharacters: existingChars,
    visionLocations: existingLocRefs,
    visionProps: existingObjRefs,
  })

  // 1. Merge Cast -> visionPhase.characters
  const existingCharByKey = new Map<string, Record<string, any>>()
  for (const ch of existingChars) {
    const key = normalizeKey(ch?.name)
    if (key) existingCharByKey.set(key, ch)
  }

  const characters = continuity.cast.map((c, idx) => {
    const key = normalizeKey(c.name)
    const prev = key ? existingCharByKey.get(key) : undefined
    return {
      ...(prev || {}),
      id: prev?.id || c.id || `char-bp-${idx + 1}`,
      name: c.name,
      role: c.role || prev?.role || 'supporting',
      subject: c.subject || prev?.subject || c.name,
      ethnicity: c.ethnicity || prev?.ethnicity || '',
      keyFeature: c.keyFeature || prev?.keyFeature || '',
      hairStyle: c.hairStyle || prev?.hairStyle || '',
      hairColor: c.hairColor || prev?.hairColor || '',
      eyeColor: c.eyeColor || prev?.eyeColor || '',
      expression: c.expression || prev?.expression || '',
      build: c.build || prev?.build || '',
      defaultWardrobe: c.defaultWardrobe || prev?.defaultWardrobe || '',
      wardrobeAccessories: c.wardrobeAccessories || prev?.wardrobeAccessories || '',
      appearance: c.appearance || prev?.appearance || '',
      appearanceDescription:
        prev?.appearanceDescription || c.appearance || prev?.appearance || '',
      description: c.description || prev?.description || '',
      externalGoal: c.externalGoal || prev?.externalGoal,
      internalNeed: c.internalNeed || prev?.internalNeed,
      fatalFlaw: c.fatalFlaw || prev?.fatalFlaw,
      arcStartingState: c.arcStartingState || prev?.arcStartingState,
      arcShift: c.arcShift || prev?.arcShift,
      arcEndingState: c.arcEndingState || prev?.arcEndingState,
      referenceImage: prev?.referenceImage || c.referenceImage || null,
      voiceConfig: prev?.voiceConfig,
      bibleCharacterId: prev?.bibleCharacterId || c.libraryCharacterId,
      libraryAssetId: prev?.libraryAssetId || c.libraryAssetId || c.libraryCharacterId,
    }
  })

  // Preserve narrator/description pseudo-characters if already in existingChars
  for (const ch of existingChars) {
    if (ch?.type === 'narrator' || ch?.type === 'description') {
      characters.push(ch)
    }
  }

  // 2. Merge Locations -> visionPhase.references.locationReferences
  const existingLocByKey = new Map<string, LocationReference>()
  for (const loc of existingLocRefs) {
    const key = normalizeKey(loc?.location || loc?.locationDisplay)
    if (key) existingLocByKey.set(key, loc)
  }

  const nowIso = new Date().toISOString()
  const locationReferences: LocationReference[] = continuity.locations.map((loc, idx) => {
    const key = normalizeKey(loc.name)
    const prev = key ? existingLocByKey.get(key) : undefined
    const intExtRaw = (loc.type || prev?.intExt || 'INT').toUpperCase()
    const intExt: LocationReference['intExt'] =
      intExtRaw === 'EXT' || intExtRaw === 'INT/EXT' || intExtRaw === 'EXT/INT'
        ? (intExtRaw as LocationReference['intExt'])
        : 'INT'
    const descParts = [
      loc.location,
      loc.atmosphere ? `Atmosphere: ${loc.atmosphere}` : '',
      loc.furniture_props ? `Props/Set dressing: ${loc.furniture_props}` : '',
    ].filter(Boolean)

    const resolvedLibraryAssetId =
      prev?.libraryAssetId || loc.libraryAssetId || loc.libraryLocationId

    return {
      ...(prev || {}),
      id: prev?.id || loc.id || `loc-bp-${idx + 1}`,
      location: prev?.location || loc.name,
      locationDisplay: prev?.locationDisplay || `${intExt}. ${loc.name.toUpperCase()}`,
      imageUrl: prev?.imageUrl || loc.referenceImage || '',
      sourceSceneIndex: prev?.sourceSceneIndex ?? 0,
      sourceSceneHeading: prev?.sourceSceneHeading || `${intExt}. ${loc.name.toUpperCase()}`,
      pinnedAt: prev?.pinnedAt || nowIso,
      intExt,
      description: prev?.description || descParts.join('. ') || loc.description || '',
      autoExtracted: prev?.autoExtracted ?? true,
      ...(resolvedLibraryAssetId ? { libraryAssetId: resolvedLibraryAssetId } : {}),
      ...(loc.libraryLocationId || (prev as any)?.bibleLocationId
        ? { bibleLocationId: (prev as any)?.bibleLocationId || loc.libraryLocationId }
        : {}),
    } as LocationReference
  })

  // 3. Merge Props -> visionPhase.references.objectReferences
  const existingPropByKey = new Map<string, VisualReference>()
  for (const obj of existingObjRefs) {
    const key = normalizeKey(obj?.name)
    if (key) existingPropByKey.set(key, obj)
  }

  const objectReferences: VisualReference[] = continuity.props.map((prop, idx) => {
    const key = normalizeKey(prop.name)
    const prev = key ? existingPropByKey.get(key) : undefined
    const descParts = [
      prop.description,
      prop.significance ? `Significance: ${prop.significance}` : '',
    ].filter(Boolean)

    const resolvedLibraryAssetId =
      prev?.libraryAssetId || prop.libraryAssetId || prop.libraryPropId

    return {
      ...(prev || {}),
      id: prev?.id || prop.id || `prop-bp-${idx + 1}`,
      type: 'object',
      name: prev?.name || prop.name,
      description: prev?.description || descParts.join(' — ') || '',
      imageUrl: prev?.imageUrl || prop.referenceImage || '',
      createdAt: prev?.createdAt || nowIso,
      category: prev?.category || mapObjectCategory(prop.category),
      importance: prev?.importance || mapObjectImportance(prop.importance),
      aiGenerated: prev?.aiGenerated ?? false,
      ...(resolvedLibraryAssetId ? { libraryAssetId: resolvedLibraryAssetId } : {}),
      ...(prop.libraryPropId || (prev as any)?.biblePropId
        ? { biblePropId: (prev as any)?.biblePropId || prop.libraryPropId }
        : {}),
    } as VisualReference
  })

  return {
    characters,
    references: {
      ...existingRefs,
      sceneReferences: existingSceneRefs,
      locationReferences,
      objectReferences,
    },
  }
}
