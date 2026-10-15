/**
 * Bind a generated Blueprint to the series reference library.
 * Library names, roles, and descriptions win. A generated asset survives only
 * when it matches the library or is explicitly marked new.
 */

import { toCanonicalName } from '@/lib/character/canonical'

export type LibraryCharacterLock = {
  id: string
  name: string
  role: string
  description: string
}

export type LibraryAssetLock = {
  id: string
  name: string
  description: string
}

export type SeriesLibraryLock = {
  characters: LibraryCharacterLock[]
  locations: LibraryAssetLock[]
  props: LibraryAssetLock[]
}

function namesMatch(left: string, right: string): boolean {
  const a = toCanonicalName(left).toLowerCase()
  const b = toCanonicalName(right).toLowerCase()
  return Boolean(a) && a === b
}

function isMarkedNew(entry: Record<string, unknown>): boolean {
  if (entry.isNew === true || entry.newAsset === true) return true
  return /^\s*new\b/i.test(String(entry.description || ''))
}

function bindCharacters(
  generated: Array<Record<string, unknown>>,
  library: LibraryCharacterLock[]
): Array<Record<string, unknown>> {
  const used = new Set<number>()
  const locked = library.map((character) => {
    const index = generated.findIndex(
      (entry, i) => !used.has(i) && namesMatch(String(entry.name || ''), character.name)
    )
    const match = index >= 0 ? generated[index] : undefined
    if (index >= 0) used.add(index)
    return {
      ...(match || {}),
      name: character.name,
      role: character.role || String(match?.role || 'supporting'),
      description: character.description || String(match?.description || ''),
      subject: character.name,
      libraryCharacterId: character.id,
      isNew: false,
    }
  })

  const created = generated
    .filter((entry, index) => !used.has(index) && isMarkedNew(entry))
    .map((entry) => ({ ...entry, isNew: true }))

  return [...locked, ...created]
}

function bindScenes(
  generated: Array<Record<string, unknown>>,
  locations: LibraryAssetLock[]
): Array<Record<string, unknown>> {
  const bound: Array<Record<string, unknown>> = []
  for (const scene of generated) {
    const location = locations.find(
      (entry) =>
        namesMatch(entry.name, String(scene.name || '')) ||
        namesMatch(entry.name, String(scene.location || ''))
    )
    if (location) {
      bound.push({
        ...scene,
        name: location.name,
        libraryLocationId: location.id,
        isNew: false,
      })
      continue
    }
    if (isMarkedNew(scene)) {
      bound.push({ ...scene, isNew: true })
    }
  }
  return bound
}

export function bindTreatmentToLibrary<T extends {
  character_descriptions?: Array<Record<string, unknown>>
  scene_descriptions?: Array<Record<string, unknown>>
}>(treatment: T, lock: SeriesLibraryLock): T {
  const hasCharacters = lock.characters.length > 0
  const hasLocations = lock.locations.length > 0
  if (!hasCharacters && !hasLocations) return treatment
  return {
    ...treatment,
    ...(hasCharacters
      ? { character_descriptions: bindCharacters(treatment.character_descriptions || [], lock.characters) }
      : {}),
    ...(hasLocations
      ? { scene_descriptions: bindScenes(treatment.scene_descriptions || [], lock.locations) }
      : {}),
  }
}
