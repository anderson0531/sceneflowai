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
  buildSceneDirectionText,
  findMatchingLocationReferences,
  isNoTalentSceneForFrames,
} from '@/lib/vision/frameGenerationContext'

export type LocationMatchConfidence = 'heading' | 'direction' | 'weak' | 'none'

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
  projectCharacters: Array<{ id?: string; name?: string; type?: string; referenceImage?: string }>
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

function buildBeatMatchText(scene: Record<string, unknown>, beat: SceneBeat): string {
  const heading = sceneHeadingText(scene)
  const parts = [
    heading,
    scene?.action || '',
    scene?.visualDescription || '',
    buildSceneDirectionText(scene),
    beat.actionDescription || '',
    beat.line || '',
    beat.character || '',
  ]
  return parts.filter(Boolean).join(' ').trim()
}

function pickBestLocationRef(
  scene: Record<string, unknown>,
  locationRefs: LocationReference[]
): { id: string | null; confidence: LocationMatchConfidence; name?: string } {
  const withImages = locationRefs.filter((r) => r.imageUrl)
  if (!withImages.length) return { id: null, confidence: 'none' }

  const headingLoc = (extractLocation(sceneHeadingText(scene)) || '').toUpperCase()

  if (headingLoc) {
    for (const ref of withImages) {
      const loc = (ref.location || '').toUpperCase()
      const display = (ref.locationDisplay || '').toUpperCase()
      if (loc === headingLoc || loc.includes(headingLoc) || headingLoc.includes(loc)) {
        return { id: ref.id, confidence: 'heading', name: ref.location }
      }
      if (display.includes(headingLoc)) {
        return { id: ref.id, confidence: 'heading', name: ref.location }
      }
    }
  }

  const matches = findMatchingLocationReferences(scene, locationRefs)
  if (matches.length > 0) {
    const first = matches[0]
    const ref = withImages.find((r) => r.id === first.id)
    const confidence: LocationMatchConfidence = headingLoc ? 'direction' : 'weak'
    return { id: first.id, confidence, name: first.name }
  }

  return { id: null, confidence: 'none' }
}

function resolveBeatCharacters(
  scene: Record<string, unknown>,
  beat: SceneBeat,
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters'],
  filmTitle?: string
): Array<{ id?: string; name?: string; referenceImage?: string }> {
  if (isNoTalentSceneForFrames(scene)) return []

  if (beat.kind === 'action') {
    const actionContext = [
      sceneHeadingText(scene),
      scene?.action || '',
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
  characterIds: string[]
): Array<{ characterId: string; wardrobeId: string }> {
  const overrides = Array.isArray(scene?.characterWardrobes)
    ? (scene.characterWardrobes as Array<{ characterId: string; wardrobeId: string }>)
    : []
  return overrides.filter((cw) => characterIds.includes(cw.characterId))
}

export function resolveBeatFrameGenerationContext(
  args: ResolveBeatFrameGenerationContextArgs
): ResolvedBeatFrameContext {
  const { scene, beat, projectCharacters, locationReferences, objectReferences, filmTitle } = args
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

  const locationPick = pickBestLocationRef(scene, locationReferences)
  if (locationPick.confidence === 'weak') {
    warnings.push('Location match is uncertain — verify the selected environment reference.')
  }
  if (locationPick.confidence === 'none' && locationReferences.some((l) => l.imageUrl)) {
    warnings.push('No location auto-matched from scene heading — pick one manually if needed.')
  }
  if (locationPick.id) {
    const locRef = locationReferences.find((l) => l.id === locationPick.id)
    if (locRef && !locRef.imageUrl) {
      warnings.push(`Location "${locRef.location}" has no reference image yet.`)
    }
  }

  const sceneNumber = typeof scene?.sceneNumber === 'number' ? scene.sceneNumber : undefined
  const matchText = buildBeatMatchText(scene, beat)
  const detectedObjects = findSceneObjects(matchText, objectReferences as any[], sceneNumber)
  const objectRefIds = detectedObjects.map((o) => o.id).filter(Boolean) as string[]

  const characterWardrobes = buildCharacterWardrobes(scene, characterIds)

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
