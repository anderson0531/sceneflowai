/**
 * Name search and scene filter for production location and object lists.
 */

import { countObjectBeatReferences, normalizeObjectName } from '@/lib/vision/objectBeatUsage'
import type { LocationReference } from '@/types/visionReferences'

export type LibrarySceneFilter = 'all' | 'unassigned' | number

export interface LibrarySceneOption {
  sceneNumber: number
  label: string
}

export interface LookupScene {
  sceneNumber?: number
  scene_number?: number
  heading?: string | { text?: string }
  beats?: unknown
}

function sceneNumberOf(scene: LookupScene, index: number): number {
  return scene.sceneNumber ?? scene.scene_number ?? index + 1
}

function headingText(scene: LookupScene): string {
  if (typeof scene.heading === 'string') return scene.heading.trim()
  return scene.heading?.text?.trim() ?? ''
}

export function librarySceneOptions(scenes: LookupScene[]): LibrarySceneOption[] {
  return scenes.map((scene, index) => {
    const sceneNumber = sceneNumberOf(scene, index)
    const heading = headingText(scene)
    return {
      sceneNumber,
      label: heading ? `Scene ${sceneNumber}: ${heading}` : `Scene ${sceneNumber}`,
    }
  })
}

export function matchesLibraryName(name: string | undefined, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (name ?? '').toLowerCase().includes(needle)
}

export function locationMatchesSceneFilter(
  location: Pick<LocationReference, 'sceneNumbers'>,
  filter: LibrarySceneFilter
): boolean {
  const numbers = location.sceneNumbers ?? []
  if (filter === 'all') return true
  if (filter === 'unassigned') return numbers.length === 0
  return numbers.includes(filter)
}

export interface LookupObject {
  id: string
  name: string
  sceneNumbers?: number[]
}

type ObjectWithScenes = LookupObject

function selectionSceneNumbers(
  objectId: string,
  scenes: LookupScene[]
): number[] {
  const numbers: number[] = []
  scenes.forEach((scene, index) => {
    const beats = Array.isArray(scene.beats) ? scene.beats : []
    const used = beats.some((beat) => {
      if (!beat || typeof beat !== 'object') return false
      const ids = (beat as { referenceSelection?: { objectRefIds?: unknown } }).referenceSelection
        ?.objectRefIds
      return Array.isArray(ids) && ids.includes(objectId)
    })
    if (used) numbers.push(sceneNumberOf(scene, index))
  })
  return numbers
}

/** Scenes that use this object: row assignment, beat tags/prose, or a locked reference. */
export function objectSceneNumbers(object: ObjectWithScenes, scenes: LookupScene[]): number[] {
  const fromRow = Array.isArray(object.sceneNumbers) ? object.sceneNumbers : []
  const usage = countObjectBeatReferences(scenes, [object.name])
  const fromBeats = usage.find((row) => row.key === normalizeObjectName(object.name))?.sceneNumbers ?? []
  return [...new Set([...fromRow, ...fromBeats, ...selectionSceneNumbers(object.id, scenes)])].sort(
    (a, b) => a - b
  )
}

export function objectMatchesSceneFilter(
  object: ObjectWithScenes,
  scenes: LookupScene[],
  filter: LibrarySceneFilter
): boolean {
  const numbers = objectSceneNumbers(object, scenes)
  if (filter === 'all') return true
  if (filter === 'unassigned') return numbers.length === 0
  return numbers.includes(filter)
}

export function filterLocationReferences<
  T extends {
    location?: string
    locationDisplay?: string
    name?: string
    sceneNumbers?: number[]
  },
>(locations: T[], query: string, filter: LibrarySceneFilter): T[] {
  return locations.filter((location) => {
    const name = `${location.location ?? ''} ${location.locationDisplay ?? ''} ${location.name ?? ''}`
    return matchesLibraryName(name, query) && locationMatchesSceneFilter(location, filter)
  })
}

export function filterObjectReferences<T extends LookupObject>(
  objects: T[],
  scenes: LookupScene[],
  query: string,
  filter: LibrarySceneFilter
): T[] {
  return objects.filter(
    (object) =>
      matchesLibraryName(object.name, query) && objectMatchesSceneFilter(object, scenes, filter)
  )
}

export function libraryFilterEmptyMessage(
  kind: 'locations' | 'objects',
  filter: LibrarySceneFilter,
  query: string
): string {
  const noun = kind === 'locations' ? 'locations' : 'objects'
  if (typeof filter === 'number') return `No ${noun} in Scene ${filter}`
  if (filter === 'unassigned') return `No unassigned ${noun}`
  const trimmed = query.trim()
  if (trimmed) return `No ${noun} match “${trimmed}”`
  return `No ${noun} yet`
}
