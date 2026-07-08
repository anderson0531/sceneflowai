/**
 * Resolve auto-selected references for Pre-Vis beat storyboard frames.
 */

import { findSceneObjects } from '@/lib/character/matching'
import { detectCharactersInText, resolveBeatSpeaker } from '@/lib/scene/characterDetection'
import { isNarratorBeat } from '@/lib/script/beatMigration'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  findLocationReferencesAssignedToScene,
  findMatchingLocationReferences,
  isNoTalentSceneForFrames,
  resolveSceneNumberForLocationMatch,
} from '@/lib/vision/frameGenerationContext'
import { resolveWardrobeIdForCharacterInScene } from '@/lib/character/characterReferenceAssembly'

export type LocationMatchConfidence = 'assigned' | 'heading' | 'direction' | 'weak' | 'none'

export type ResolvedBeatFrameContext = BeatReferenceSelection & {
  locationMatchConfidence: LocationMatchConfidence
  warnings: string[]
  /** Character display names for UI summary. */
  characterNames: string[]
  locationName?: string
  objectNames: string[]
}

export type ResolveBeatFrameGenerationContextArgs = {
  scene: Record<string, unknown>
  beat: SceneBeat
  sceneIndex?: number
  projectCharacters: Array<{ id?: string; name?: string; type?: string; referenceImage?: string; wardrobes?: unknown[] }>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
}

function sceneHeadingText(scene: Record<string, unknown>): string {
  const heading = scene?.heading
  if (typeof heading === 'string') return heading
  if (heading && typeof heading === 'object' && 'text' in heading) {
    return String((heading as { text?: string }).text || '')
  }
  return ''
}

function buildBeatPropMatchText(scene: Record<string, unknown>, beat: SceneBeat): string {
  return [
    sceneHeadingText(scene),
    beat.actionDescription || '',
    beat.line || '',
    beat.character || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function pickBestLocationRef(
  scene: Record<string, unknown>,
  locationRefs: LocationReference[],
  sceneIndex?: number
): {
  id: string | null
  confidence: LocationMatchConfidence
  name?: string
  warnings: string[]
} {
  const warnings: string[] = []
  const withImages = locationRefs.filter((r) => r.imageUrl)
  if (!withImages.length) return { id: null, confidence: 'none', warnings }

  const sceneNumber = resolveSceneNumberForLocationMatch(scene, sceneIndex)
  if (sceneNumber !== undefined) {
    const assigned = findLocationReferencesAssignedToScene(withImages, sceneNumber)
    if (assigned.length === 1) {
      return {
        id: assigned[0].id,
        confidence: 'assigned',
        name: assigned[0].location,
        warnings,
      }
    }
    if (assigned.length > 1) {
      warnings.push(
        `Multiple location references are assigned to Scene ${sceneNumber} — using the first match.`
      )
      return {
        id: assigned[0].id,
        confidence: 'assigned',
        name: assigned[0].location,
        warnings,
      }
    }
  }

  const headingLoc = (extractLocation(sceneHeadingText(scene)) || '').toUpperCase()

  if (headingLoc) {
    for (const ref of withImages) {
      const loc = (ref.location || '').toUpperCase()
      const display = (ref.locationDisplay || '').toUpperCase()
      if (loc === headingLoc || loc.includes(headingLoc) || headingLoc.includes(loc)) {
        return { id: ref.id, confidence: 'heading', name: ref.location, warnings }
      }
      if (display.includes(headingLoc)) {
        return { id: ref.id, confidence: 'heading', name: ref.location, warnings }
      }
    }
  }

  const matches = findMatchingLocationReferences(scene, locationRefs, sceneIndex)
  if (matches.length > 0) {
    const first = matches[0]
    const ref = withImages.find((r) => r.id === first.id)
    const confidence: LocationMatchConfidence = headingLoc ? 'direction' : 'weak'
    return { id: first.id, confidence, name: first.name ?? ref?.location, warnings }
  }

  return { id: null, confidence: 'none', warnings }
}

function resolveBeatCharacters(
  scene: Record<string, unknown>,
  beat: SceneBeat,
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters'],
  filmTitle?: string
): Array<{ id?: string; name?: string; referenceImage?: string }> {
  if (isNoTalentSceneForFrames(scene)) return []

  if (beat.kind === 'action') {
    // Beat-scoped only: do not scan full scene.action (other beats' characters leak in)
    const actionContext = [
      sceneHeadingText(scene),
      beat.actionDescription || '',
    ].join(' ')
    return detectCharactersInText(actionContext, projectCharacters, {
      excludeTexts: filmTitle ? [filmTitle] : [],
    })
  }

  if (isNarratorBeat(beat) || beat.kind === 'narration') {
    return []
  }

  const speaker = resolveBeatSpeaker(beat, projectCharacters)
  return speaker ? [speaker] : []
}

function buildCharacterWardrobes(
  scene: Record<string, unknown>,
  characterIds: string[],
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters'],
  sceneIndex?: number
): Array<{ characterId: string; wardrobeId: string }> {
  const result: Array<{ characterId: string; wardrobeId: string }> = []
  for (const charId of characterIds) {
    const char = projectCharacters.find((c) => c.id === charId || c.name === charId)
    if (!char) continue
    const wardrobeId = resolveWardrobeIdForCharacterInScene(
      char as Record<string, unknown>,
      scene,
      sceneIndex
    )
    if (wardrobeId) {
      result.push({ characterId: charId, wardrobeId })
    }
  }
  return result
}

export function resolveBeatFrameGenerationContext(
  args: ResolveBeatFrameGenerationContextArgs
): ResolvedBeatFrameContext {
  const { scene, beat, sceneIndex, projectCharacters, locationReferences, objectReferences, filmTitle } = args
  const warnings: string[] = []

  const matchedChars = resolveBeatCharacters(scene, beat, projectCharacters, filmTitle)
  const characterIds = matchedChars
    .map((c) => c.id || c.name)
    .filter((id): id is string => !!id)

  for (const char of matchedChars) {
    if (!char.referenceImage) {
      warnings.push(`${char.name} has no reference image — generation may drift.`)
    }
  }

  const locationPick = pickBestLocationRef(scene, locationReferences, sceneIndex)
  warnings.push(...locationPick.warnings)
  if (locationPick.confidence === 'weak') {
    warnings.push('Location match is uncertain — verify the selected environment reference.')
  }
  if (locationPick.confidence === 'none' && locationReferences.some((l) => l.imageUrl)) {
    warnings.push('No location auto-matched — pick one manually if needed.')
  }
  if (locationPick.id) {
    const locRef = locationReferences.find((l) => l.id === locationPick.id)
    if (locRef && !locRef.imageUrl) {
      warnings.push(`Location "${locRef.location}" has no reference image yet.`)
    }
  }

  const matchText = buildBeatPropMatchText(scene, beat)
  const detectedObjects = findSceneObjects(matchText, objectReferences as any[])
  const objectRefIds = detectedObjects.map((o) => o.id).filter(Boolean) as string[]

  const characterWardrobes = buildCharacterWardrobes(scene, characterIds, projectCharacters, sceneIndex)

  return {
    characterIds,
    locationRefId: locationPick.id,
    objectRefIds,
    characterWardrobes,
    locationMatchConfidence: locationPick.confidence,
    warnings,
    characterNames: matchedChars.map((c) => c.name || '').filter(Boolean),
    locationName: locationPick.name,
    objectNames: detectedObjects.map((o) => o.name),
  }
}

export function mapBeatReferenceSelectionForApi(
  selection: BeatReferenceSelection,
  projectCharacters: any[],
  locationReferences: LocationReference[],
  objectReferences: VisualReference[]
): {
  selectedCharacters: string[]
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  characterWardrobes: Array<{ characterId: string; wardrobeId: string }>
  characterSelectionExplicit: boolean
  skipObjectAutoDetection: boolean
} {
  const selectedCharacters = selection.characterIds
    .map((id) => {
      const byId = projectCharacters.find((c) => c.id === id)
      if (byId) return byId.id || byId.name
      const byName = projectCharacters.find(
        (c) => c.name === id || c.name?.toLowerCase() === id.toLowerCase()
      )
      return byName?.id || byName?.name || id
    })
    .filter(Boolean) as string[]

  const locationRef = selection.locationRefId
    ? locationReferences.find((l) => l.id === selection.locationRefId)
    : undefined

  const objects = selection.objectRefIds
    .map((id) => objectReferences.find((o) => o.id === id))
    .filter((o): o is VisualReference => !!o)

  return {
    selectedCharacters,
    locationReferences: locationRef ? [locationRef] : [],
    objectReferences: objects,
    characterWardrobes: selection.characterWardrobes || [],
    characterSelectionExplicit: true,
    skipObjectAutoDetection: true,
  }
}

export function shouldUseExplicitBeatReferences(
  beat: SceneBeat | undefined | null
): beat is SceneBeat & { referenceSelection: BeatReferenceSelection } {
  return !!(
    beat?.referenceSelection &&
    Array.isArray(beat.referenceSelection.characterIds) &&
    beat.referenceSelection.resolvedAt
  )
}
