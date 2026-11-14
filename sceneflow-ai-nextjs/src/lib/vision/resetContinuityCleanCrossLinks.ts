import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import { matchCharacterRecord } from '@/lib/character/canonical'
import { normalizeCharacterName } from '@/lib/character/detection'
import { syncSceneDirectionToContinuityCatalog } from '@/lib/vision/saveBeatDirection'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

export interface CleanAndRebindContinuityInput {
  scenes: Array<Record<string, any>>
  production?: Record<string, any> | null
  characters: Array<Record<string, any>>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  preservePortraitsAndVoices?: boolean
  resolvedAt?: string
}

export interface CleanAndRebindContinuityResult {
  scenes: Array<Record<string, any>>
  production?: Record<string, any> | null
  characters: Array<Record<string, any>>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
}

/**
 * Scrubs all stale Continuity IDs from scenes, beats, and production segments
 * (dialogue.characterId, beat.characterId, beat.referenceSelection, scene.characterWardrobes,
 * scene.referenceOverrides, segment.references) and re-binds them strictly against the
 * freshly rebuilt Continuity catalog.
 */
export function cleanAndRebindContinuityCrossLinks(
  input: CleanAndRebindContinuityInput
): CleanAndRebindContinuityResult {
  const now = input.resolvedAt ?? new Date().toISOString()
  const preserveImages = input.preservePortraitsAndVoices === true

  let nextCharacters = input.characters.map((c) => ({ ...c }))
  let nextLocations = input.locationReferences.map((l) => ({ ...l }))
  let nextObjects = input.objectReferences.map((o) => ({ ...o }))

  const charByNormName = new Map<string, Record<string, any>>()
  for (const char of nextCharacters) {
    const norm = normalizeCharacterName(String(char?.name || ''))
    if (norm && !charByNormName.has(norm)) {
      charByNormName.set(norm, char)
    }
  }

  const resolveCharIdForName = (rawName: unknown): string | undefined => {
    const nameStr = typeof rawName === 'string' ? rawName.trim() : ''
    if (!nameStr) return undefined
    const norm = normalizeCharacterName(nameStr)
    const exact = norm ? charByNormName.get(norm) : undefined
    if (exact?.id) return String(exact.id)
    const matched = matchCharacterRecord(
      nextCharacters as Array<{ id?: string; name?: string; aliases?: string[] }>,
      { characterName: nameStr }
    )
    return matched?.id ? String(matched.id) : undefined
  }

  // Step 1: Scrub stale overrides, scene wardrobe assignments, and stale beat/dialogue IDs
  let nextScenes = (input.scenes ?? []).map((rawScene) => {
    const scene: Record<string, any> = { ...rawScene }
    delete scene.referenceOverrides
    delete scene.characterWardrobes

    if (Array.isArray(scene.dialogue)) {
      scene.dialogue = scene.dialogue.map((line: Record<string, any>) => {
        if (!line || typeof line !== 'object') return line
        const nextLine = { ...line }
        const matchedId = resolveCharIdForName(line.character)
        if (matchedId) {
          nextLine.characterId = matchedId
        } else {
          delete nextLine.characterId
        }
        return nextLine
      })
    }

    const rawBeats = getSceneBeats(scene)
    if (rawBeats.length > 0) {
      const cleanedBeats = rawBeats.map((beat) => {
        const nextBeat: Record<string, any> = { ...beat }
        delete nextBeat.referenceSelection
        delete nextBeat.characterIds
        delete nextBeat.locationId
        delete nextBeat.propIds
        delete nextBeat.objectRefIds
        if (typeof nextBeat.character === 'string' && nextBeat.character.trim()) {
          const matchedId = resolveCharIdForName(nextBeat.character)
          if (matchedId) {
            nextBeat.characterId = matchedId
          } else {
            delete nextBeat.characterId
          }
        } else {
          delete nextBeat.characterId
        }
        return nextBeat
      })
      return applyBeatsToScene(scene, cleanedBeats as any)
    }

    return scene
  })

  // Step 2: Re-sync sceneDirection/beatDirection into catalog & re-stamp fresh beat.referenceSelection
  const preexistingLocIds = new Set(nextLocations.map((l) => l.id))
  for (let sceneIdx = 0; sceneIdx < nextScenes.length; sceneIdx++) {
    const synced = syncSceneDirectionToContinuityCatalog({
      scenes: nextScenes,
      sceneIdx,
      characters: nextCharacters as any,
      locationReferences: nextLocations,
      objectReferences: nextObjects,
      resolvedAt: now,
    })
    nextScenes = synced.scenes
    nextCharacters = synced.characters
    nextLocations = preserveImages
      ? synced.locationReferences
      : synced.locationReferences.map((loc) =>
          preexistingLocIds.has(loc.id) ? loc : { ...loc, imageUrl: '' }
        )
    nextObjects = synced.objectReferences
  }

  // Step 3: Scrub stale continuity asset IDs from production video segments
  let nextProduction = input.production
  if (
    input.production &&
    typeof input.production === 'object' &&
    input.production.scenes &&
    typeof input.production.scenes === 'object'
  ) {
    const cleanedProdScenes: Record<string, any> = {}
    for (const [sceneKey, prodScene] of Object.entries(input.production.scenes)) {
      if (!prodScene || typeof prodScene !== 'object') {
        cleanedProdScenes[sceneKey] = prodScene
        continue
      }
      const segments = Array.isArray((prodScene as Record<string, any>).segments)
        ? ((prodScene as Record<string, any>).segments as Array<Record<string, any>>).map(
            (seg) => {
              if (!seg || typeof seg !== 'object' || !seg.references) return seg
              return {
                ...seg,
                references: {
                  ...seg.references,
                  characterIds: [],
                  sceneRefIds: [],
                  objectRefIds: [],
                  characterRefs: [],
                  sceneRefs: [],
                  objectRefs: [],
                },
              }
            }
          )
        : (prodScene as Record<string, any>).segments
      cleanedProdScenes[sceneKey] = {
        ...(prodScene as Record<string, any>),
        ...(segments ? { segments } : {}),
      }
    }
    nextProduction = {
      ...input.production,
      scenes: cleanedProdScenes,
    }
  }

  return {
    scenes: nextScenes,
    production: nextProduction,
    characters: nextCharacters,
    locationReferences: nextLocations,
    objectReferences: nextObjects,
  }
}
