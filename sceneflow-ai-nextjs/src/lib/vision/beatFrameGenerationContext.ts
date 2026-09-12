/**
 * Resolve auto-selected references for Pre-Vis beat storyboard frames.
 */

import { findSceneObjects, matchObjectsBySelectedNames } from '@/lib/character/matching'
import {
  collectEntityMaskPhrases,
  detectCharactersInText,
  intersectDetectedCharactersWithDirectionText,
  resolveBeatSpeaker,
  type DetectCharactersOptions,
} from '@/lib/scene/characterDetection'
import { getSceneBeats, isNarratorBeat } from '@/lib/script/beatMigration'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'

export function toBeatReferenceSelection(
  ctx: Pick<
    BeatReferenceSelection,
    'characterIds' | 'locationRefId' | 'objectRefIds' | 'characterWardrobes'
  > & { source?: BeatReferenceSelection['source'] }
): BeatReferenceSelection {
  return {
    characterIds: ctx.characterIds,
    locationRefId: ctx.locationRefId,
    objectRefIds: ctx.objectRefIds,
    characterWardrobes: ctx.characterWardrobes ?? [],
    resolvedAt: new Date().toISOString(),
    source: ctx.source ?? 'auto',
  }
}
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  buildSceneStagingText,
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

/**
 * Text that decides which props are on camera for THIS beat.
 *
 * Scene-level text (heading, scene action, scene key props) is deliberately
 * excluded: scene direction is the catalog of props present in the scene, and
 * the beat decides which of them the frame actually shows. Attaching a prop
 * the beat never mentions gives the image model a reference with no direction,
 * which it resolves by inventing the prop into the frame.
 */
function buildBeatPropMatchText(beat: SceneBeat): string {
  return [
    beat.actionDescription || '',
    beat.line || '',
    beat.character || '',
    ...(beat.beatDirection?.keyProps ?? []),
    beat.beatDirection?.propInteraction || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

/**
 * Text that decides which cast are on camera for THIS beat.
 *
 * Beat-scoped for the same reason props are: the scene's cast list is who is
 * in the scene, not who is in the frame. Direction facets are included because
 * blocking, gaze and prop handling are where the beat says who is standing
 * where — and they are carried into the composed prompt verbatim.
 */
function buildBeatCastMatchText(beat: SceneBeat): string {
  return [
    beat.actionDescription || '',
    beat.beatDirection?.blocking || '',
    beat.beatDirection?.gaze || '',
    beat.beatDirection?.propInteraction || '',
    beat.beatDirection?.frozenMoment || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

/**
 * Anyone in shot at all? Pronouns, body parts, and unnamed-person nouns all
 * say yes without naming a character.
 *
 * A beat whose text has none of these is framing a prop, a room, or a title
 * card. Handing it the scene's cast attaches identity references the
 * composition never directs, and the image model resolves an undirected
 * portrait by putting that face in the frame — which is how an insert of a
 * pneumatic hatch collar came back with two characters standing in it.
 */
function beatTextImpliesPerson(text: string): boolean {
  if (!text.trim()) return false
  return /\b(he|him|his|she|her|hers|they|them|their|theirs|i|me|my|we|us|our|you|your|himself|herself|themselves|someone|somebody|anyone|man|men|woman|women|boy|girl|kid|child|children|person|people|figure|figures|silhouette|crowd|guard|guards|officer|worker|workers|soldier|passenger|bystander|body|face|faces|head|hand|hands|finger|fingers|fist|palm|wrist|arm|arms|shoulder|shoulders|eye|eyes|gaze|mouth|jaw|knee|knees|leg|legs|foot|feet|back|chest|profile|portrait)\b/i.test(
    text
  )
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

function uniqueProjectCharacters<
  T extends { id?: string; name?: string },
>(chars: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const char of chars) {
    const key = (char.id || char.name || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(char)
  }
  return out
}

function characterDetectionOptions(
  filmTitle: string | undefined,
  objectReferences: VisualReference[] | undefined,
  locationReferences: LocationReference[] | undefined
): DetectCharactersOptions {
  return {
    excludeTexts: filmTitle ? [filmTitle] : [],
    maskPhrases: collectEntityMaskPhrases({
      objectNames: (objectReferences || []).map((obj) => obj.name),
      locationNames: (locationReferences || []).map((loc) => loc.location || loc.locationDisplay),
    }),
  }
}

function uniqueObjects<T extends { id?: string; name?: string }>(objects: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const obj of objects) {
    const key = String(obj.id || obj.name || '').toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(obj)
  }
  return out
}

/**
 * When beat-scoped name detect misses (pronouns, "the man"), pull talent from
 * other beats, scene dialogue, and remaining scene text rather than generating
 * a people frame with no identity references.
 */
function resolveSceneCastFallback(
  scene: Record<string, unknown>,
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters'],
  filmTitle: string | undefined,
  objectReferences: VisualReference[],
  locationReferences: LocationReference[]
): ResolveBeatFrameGenerationContextArgs['projectCharacters'] {
  const detectOptions = characterDetectionOptions(filmTitle, objectReferences, locationReferences)
  const beats = getSceneBeats(scene)
  const found: ResolveBeatFrameGenerationContextArgs['projectCharacters'] = []

  for (const other of beats) {
    if (isNarratorBeat(other) || other.kind === 'narration') continue
    const speaker = resolveBeatSpeaker(other, projectCharacters)
    if (speaker) found.push(speaker)
    found.push(
      ...detectCharactersInText(
        [other.actionDescription || '', other.line || '', other.character || ''].join(' '),
        projectCharacters,
        detectOptions
      )
    )
  }

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  for (const line of dialogue) {
    if (!line || typeof line !== 'object') continue
    const row = line as { character?: string; characterId?: string | null; kind?: string }
    if (row.kind === 'narration') continue
    const speaker = resolveBeatSpeaker(
      { character: row.character, characterId: row.characterId },
      projectCharacters
    )
    if (speaker) found.push(speaker)
  }

  const sceneText = [
    sceneHeadingText(scene),
    String(scene.action || ''),
    ...beats.map((b) => `${b.actionDescription || ''} ${b.line || ''} ${b.character || ''}`),
  ].join(' ')
  found.push(...detectCharactersInText(sceneText, projectCharacters, detectOptions))

  return uniqueProjectCharacters(found)
}

function resolveBeatCharacters(
  scene: Record<string, unknown>,
  beat: SceneBeat,
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters'],
  filmTitle: string | undefined,
  objectReferences: VisualReference[],
  locationReferences: LocationReference[]
): Array<{ id?: string; name?: string; referenceImage?: string }> {
  if (isNoTalentSceneForFrames(scene)) return []

  if (isNarratorBeat(beat) || beat.kind === 'narration') {
    return []
  }

  const detectOptions = characterDetectionOptions(filmTitle, objectReferences, locationReferences)
  let matched: ResolveBeatFrameGenerationContextArgs['projectCharacters'] = []

  if (beat.kind === 'action') {
    const beatCastText = buildBeatCastMatchText(beat)
    const actionContext = [sceneHeadingText(scene), beatCastText].join(' ')
    matched = detectCharactersInText(actionContext, projectCharacters, detectOptions)
    // Guessing at who is on camera is only warranted when the beat says there
    // is someone on camera. An object or environment beat resolves to no cast.
    if (matched.length === 0 && beatTextImpliesPerson(beatCastText)) {
      const nonNarrators = projectCharacters.filter(
        (c) => c.type !== 'narrator' && (c.referenceImage || c.id || c.name)
      )
      if (nonNarrators.length === 1) {
        matched = [nonNarrators[0]]
      } else {
        matched = resolveSceneCastFallback(
          scene,
          projectCharacters,
          filmTitle,
          objectReferences,
          locationReferences
        )
      }
    }
  } else {
    const speaker = resolveBeatSpeaker(beat, projectCharacters)
    matched = speaker
      ? [speaker]
      : resolveSceneCastFallback(
          scene,
          projectCharacters,
          filmTitle,
          objectReferences,
          locationReferences
        )
  }

  return intersectDetectedCharactersWithDirectionText(
    matched,
    buildSceneStagingText(scene),
    projectCharacters,
    detectOptions
  )
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

  const matchedChars = resolveBeatCharacters(
    scene,
    beat,
    projectCharacters,
    filmTitle,
    objectReferences,
    locationReferences
  )
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

  const matchText = buildBeatPropMatchText(beat)
  const beatDirectionKeyProps = beat.beatDirection?.keyProps ?? []
  const detectedObjects = uniqueObjects([
    ...matchObjectsBySelectedNames(beatDirectionKeyProps, objectReferences as any[]),
    ...findSceneObjects(matchText, objectReferences as any[], undefined, {
      matchDescriptions: false,
    }),
  ])
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
    beat.referenceSelection.resolvedAt &&
    beat.referenceSelection.source === 'user'
  )
}

/**
 * Cast this beat names in its own text.
 *
 * Deliberately stricter than `resolveBeatFrameGenerationContext`, which falls
 * back to the scene cast — and, for a one-character project, to that lone
 * character — when a beat names nobody. That fallback is right for an ordinary
 * scene and wrong for a title sequence, where it would put a face on a card
 * that should only carry typography.
 */
export function detectCharactersNamedInBeat(args: {
  beat: SceneBeat
  promptText?: string
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters']
  filmTitle?: string
  objectReferences?: VisualReference[]
  locationReferences?: LocationReference[]
}): Array<{ id?: string; name?: string }> {
  const { beat, promptText, projectCharacters } = args
  if (projectCharacters.length === 0) return []
  if (isNarratorBeat(beat) || beat.kind === 'narration') return []

  const text = [beat.actionDescription, beat.line, beat.character, promptText]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
  if (!text) return []

  return detectCharactersInText(
    text,
    projectCharacters,
    characterDetectionOptions(args.filmTitle, args.objectReferences, args.locationReferences)
  )
}

/**
 * Object references the prompt names outright.
 *
 * A planned prompt is free to name any prop in the reference catalog, and the
 * beat's own text is what auto-resolve matched against — so a prop the planner
 * staged but the beat never mentioned arrived with no reference image, and the
 * image model invented its appearance. Only references that have an image are
 * candidates; naming one without an image adds nothing to attach.
 */
function detectObjectsNamedInText(
  text: string,
  objectReferences: VisualReference[]
): VisualReference[] {
  if (!text.trim()) return []
  return objectReferences.filter((ref) => {
    if (!ref.imageUrl?.trim()) return false
    const name = ref.name?.trim()
    if (!name || name.length < 3) return false
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
  })
}

/** Add characters and props named in prompt text to an existing beat selection. */
export function unionBeatSelectionWithPromptText(
  selection: BeatReferenceSelection,
  promptText: string | undefined,
  projectCharacters: ResolveBeatFrameGenerationContextArgs['projectCharacters'],
  scene: Record<string, unknown>,
  sceneIndex?: number,
  filmTitle?: string,
  objectReferences: VisualReference[] = [],
  locationReferences: LocationReference[] = []
): BeatReferenceSelection {
  if (!promptText?.trim()) return selection

  const characterIds = [...selection.characterIds]
  if (projectCharacters.length > 0) {
    const extra = detectCharactersInText(
      promptText,
      projectCharacters,
      characterDetectionOptions(filmTitle, objectReferences, locationReferences)
    )
    const seen = new Set(characterIds.map((id) => id.toLowerCase()))
    for (const char of extra) {
      const id = char.id || char.name
      if (!id) continue
      if (seen.has(id.toLowerCase()) || seen.has((char.name || '').toLowerCase())) continue
      seen.add(id.toLowerCase())
      characterIds.push(id)
    }
  }

  const objectRefIds = [...selection.objectRefIds]
  const seenObjects = new Set(objectRefIds.map((id) => id.toLowerCase()))
  for (const ref of detectObjectsNamedInText(promptText, objectReferences)) {
    const id = ref.id || ref.name
    if (!id || seenObjects.has(id.toLowerCase())) continue
    seenObjects.add(id.toLowerCase())
    objectRefIds.push(id)
  }

  const castChanged = characterIds.length !== selection.characterIds.length
  const propsChanged = objectRefIds.length !== selection.objectRefIds.length
  if (!castChanged && !propsChanged) return selection

  return {
    ...selection,
    characterIds,
    objectRefIds,
    ...(castChanged
      ? {
          characterWardrobes: buildCharacterWardrobes(
            scene,
            characterIds,
            projectCharacters,
            sceneIndex
          ),
        }
      : {}),
  }
}
