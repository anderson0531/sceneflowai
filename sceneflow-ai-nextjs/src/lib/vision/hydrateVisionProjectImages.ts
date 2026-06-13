/**
 * Merge real image URLs from a full project payload into lite-loaded Vision state.
 * Lite mode replaces base64 blobs with the sentinel 'deferred'; this restores media
 * without clobbering in-memory script/character edits from Phase 1.
 */

import {
  isValidStoryboardMediaUrl,
  mergeScenePreservingMedia,
} from '@/lib/storyboard/mergeSceneMedia'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

function pickImageUrl(lite: unknown, full: unknown): string | undefined {
  const fullUrl = isValidStoryboardMediaUrl(full) ? full.trim() : undefined
  const liteUrl = isValidStoryboardMediaUrl(lite) ? lite.trim() : undefined
  return fullUrl ?? liteUrl
}

function indexById<T extends { id?: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    if (item?.id) map.set(item.id, item)
  }
  return map
}

function mergeWardrobeImages(liteWardrobes: any[] | undefined, fullWardrobes: any[] | undefined): any[] | undefined {
  if (!Array.isArray(liteWardrobes)) return fullWardrobes
  if (!Array.isArray(fullWardrobes) || fullWardrobes.length === 0) return liteWardrobes

  const fullById = indexById(fullWardrobes)
  return liteWardrobes.map((liteW) => {
    const fullW = liteW?.id ? fullById.get(liteW.id) : undefined
    if (!fullW) return liteW
    return {
      ...liteW,
      fullBodyUrl: pickImageUrl(liteW.fullBodyUrl, fullW.fullBodyUrl),
      headshotUrl: pickImageUrl(liteW.headshotUrl, fullW.headshotUrl),
      previewImageUrl: pickImageUrl(liteW.previewImageUrl, fullW.previewImageUrl),
    }
  })
}

export function mergeCharacterImages(liteCharacters: any[], fullCharacters: any[]): any[] {
  if (!Array.isArray(fullCharacters) || fullCharacters.length === 0) return liteCharacters

  const fullById = indexById(fullCharacters)
  const fullByName = new Map(
    fullCharacters.filter((c) => c?.name).map((c) => [String(c.name).toLowerCase(), c])
  )

  return liteCharacters.map((liteChar) => {
    const fullChar =
      (liteChar?.id && fullById.get(liteChar.id)) ||
      (liteChar?.name && fullByName.get(String(liteChar.name).toLowerCase()))
    if (!fullChar) return liteChar

    return {
      ...liteChar,
      referenceImage: pickImageUrl(liteChar.referenceImage, fullChar.referenceImage),
      wardrobes: mergeWardrobeImages(liteChar.wardrobes, fullChar.wardrobes),
    }
  })
}

export function mergeVisualReferences(
  liteRefs: VisualReference[],
  fullRefs: VisualReference[]
): VisualReference[] {
  if (!Array.isArray(fullRefs) || fullRefs.length === 0) return liteRefs
  const fullById = indexById(fullRefs)

  return liteRefs.map((liteRef) => {
    const fullRef = liteRef?.id ? fullById.get(liteRef.id) : undefined
    if (!fullRef) return liteRef
    return {
      ...liteRef,
      imageUrl: pickImageUrl(liteRef.imageUrl, fullRef.imageUrl),
    }
  })
}

export function mergeLocationReferences(
  liteRefs: LocationReference[],
  fullRefs: LocationReference[]
): LocationReference[] {
  if (!Array.isArray(fullRefs) || fullRefs.length === 0) return liteRefs
  const fullById = indexById(fullRefs)

  return liteRefs.map((liteRef) => {
    const fullRef = liteRef?.id ? fullById.get(liteRef.id) : undefined
    if (!fullRef) return liteRef
    return {
      ...liteRef,
      imageUrl: pickImageUrl(liteRef.imageUrl, fullRef.imageUrl),
    }
  })
}

export function hydrateScenesWithImages(liteScenes: any[], fullScenes: any[]): any[] {
  if (!Array.isArray(fullScenes) || fullScenes.length === 0) return liteScenes

  const fullById = new Map<string, any>()
  for (const scene of fullScenes) {
    const id = scene?.id || scene?.sceneId
    if (id) fullById.set(id, scene)
  }

  return liteScenes.map((liteScene, idx) => {
    const sceneId = liteScene?.id || liteScene?.sceneId
    const fullScene = (sceneId && fullById.get(sceneId)) || fullScenes[idx]
    if (!fullScene) return liteScene
    return mergeScenePreservingMedia(fullScene, liteScene)
  })
}

export interface HydratedVisionImageState {
  characters: any[]
  scenes: any[]
  script: any | null
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
  locationReferences: LocationReference[]
  projectMetadata: Record<string, unknown>
}

/**
 * Apply full-project image fields onto current lite-hydrated Vision state.
 */
export function hydrateVisionStateFromFullProject(
  fullProject: { metadata?: Record<string, unknown> },
  current: {
    characters: any[]
    script: any | null
    sceneReferences: VisualReference[]
    objectReferences: VisualReference[]
    locationReferences: LocationReference[]
  }
): HydratedVisionImageState {
  const fullVision = (fullProject.metadata?.visionPhase ?? {}) as Record<string, unknown>
  const fullCharacters = (fullVision.characters as any[]) ?? []
  const fullRefs = (fullVision.references ?? {}) as Record<string, unknown>
  const fullSceneRefs = (fullRefs.sceneReferences as VisualReference[]) ?? []
  const fullObjectRefs = (fullRefs.objectReferences as VisualReference[]) ?? []
  const fullLocationRefs = (fullRefs.locationReferences as LocationReference[]) ?? []
  const fullScenes =
    ((fullVision.script as any)?.script?.scenes as any[]) ??
    (fullVision.scenes as any[]) ??
    []

  const liteScenes =
    current.script?.script?.scenes ??
    current.script?.scenes ??
    []

  const hydratedScenes = hydrateScenesWithImages(liteScenes, fullScenes)
  const hydratedCharacters = mergeCharacterImages(current.characters, fullCharacters)

  let hydratedScript = current.script
  if (current.script?.script?.scenes) {
    hydratedScript = {
      ...current.script,
      script: {
        ...current.script.script,
        scenes: hydratedScenes,
      },
      scenes: hydratedScenes,
    }
  } else if (hydratedScenes.length > 0) {
    hydratedScript = {
      ...(current.script ?? {}),
      script: { scenes: hydratedScenes },
      scenes: hydratedScenes,
    }
  }

  const hydratedMetadata = {
    ...(fullProject.metadata ?? {}),
    visionPhase: {
      ...fullVision,
      characters: hydratedCharacters,
      scenes: hydratedScenes,
      script: hydratedScript ?? fullVision.script,
      references: {
        sceneReferences: mergeVisualReferences(current.sceneReferences, fullSceneRefs),
        objectReferences: mergeVisualReferences(current.objectReferences, fullObjectRefs),
        locationReferences: mergeLocationReferences(current.locationReferences, fullLocationRefs),
      },
    },
  }

  return {
    characters: hydratedCharacters,
    scenes: hydratedScenes,
    script: hydratedScript,
    sceneReferences: mergeVisualReferences(current.sceneReferences, fullSceneRefs),
    objectReferences: mergeVisualReferences(current.objectReferences, fullObjectRefs),
    locationReferences: mergeLocationReferences(current.locationReferences, fullLocationRefs),
    projectMetadata: hydratedMetadata,
  }
}
