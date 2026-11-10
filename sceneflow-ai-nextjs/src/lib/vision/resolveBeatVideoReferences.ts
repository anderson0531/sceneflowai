/**
 * Resolve prioritized reference images for Omni REF video generation on a beat.
 */

import {
  formatConsistentWardrobeDescription,
  resolveCharacterReferencePair,
} from '@/lib/character/characterReferenceAssembly'
import { formatNextImageCaption } from '@/lib/vision/referenceImageBinding'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { formatLocationScaleDescriptor } from '@/lib/imagen/locationScaleClause'
import { extractPropScalePhrase, formatPropScaleDescriptor } from '@/lib/imagen/propScaleClause'
import { extractCharacterHeightPhrase } from '@/lib/imagen/identityTraitsClause'
import { getSceneBeats, hasVisualStagingForCastFilter } from '@/lib/script/beatMigration'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import { beatHasOpeningEnvironmentState } from '@/lib/vision/locationStateAnalysis'
import {
  resolveBeatFrameGenerationContext,
  shouldUseExplicitBeatReferences,
} from '@/lib/vision/beatFrameGenerationContext'
import { shouldRelabelRefs } from '@/lib/video/normalizeReferenceImages'
import {
  locationReferenceForGeneration,
} from '@/lib/vision/locationVersionResolve'
import {
  buildCharacterReferenceEntries,
  buildLocationReferenceEntry,
  buildPropReferenceEntries,
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  selectReferenceImagesInOrder,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'

export type LabeledVideoReference = {
  url: string
  type: 'character' | 'style'
  name: string
  role?: PrioritizedReferenceImage['role']
  refRole?: PrioritizedReferenceImage['refRole']
  characterName?: string
  propName?: string
  locationName?: string
  promptToken?: string
  subjectOrdinal?: number
  wardrobeDescription?: string
}

export type ResolvedBeatVideoReferences = {
  refs: PrioritizedReferenceImage[]
  labeledRefs: LabeledVideoReference[]
  urlList: string[]
  warnings: string[]
}

export type ResolveBeatVideoReferencesArgs = {
  scene: Record<string, unknown>
  beat: SceneBeat | null | undefined
  sceneIndex?: number
  projectCharacters: Array<{
    id?: string
    name?: string
    referenceImage?: string
    height?: string
    appearanceDescription?: string
    visionDescription?: string
    defaultWardrobe?: string
    wardrobeAccessories?: string
    wardrobes?: unknown[]
  }>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
  /** Opt-in: attach full-body wardrobe reference image alongside identity. Defaults to false (identity + wardrobe text). */
  includeWardrobeReferenceImages?: boolean
  /** Opt-in: attach stored PiP combined character card instead of discrete identity portrait. Defaults to false. */
  includeWardrobeDiptych?: boolean
}

function videoPersonToken(personTokenIndex?: number): string {
  return personTokenIndex != null ? `person [${personTokenIndex}]` : 'person [1]'
}

function videoIdentityLabel(
  _name: string,
  _index: number,
  personTokenIndex?: number,
  heightPhrase?: string,
  hasSeparateWardrobeImage?: boolean
): string {
  const base = formatNextImageCaption({
    role: 'identity',
    token: videoPersonToken(personTokenIndex),
  })
  const details: string[] = []
  if (!hasSeparateWardrobeImage) {
    details.push(
      'Match exact facial identity, bone structure, hair, and skin tone from this portrait; ignore studio backdrop and portrait clothing.'
    )
  }
  if (heightPhrase) {
    details.push(`Scale: ${heightPhrase}.`)
  }
  return details.length > 0 ? `${base} ${details.join(' ')}` : base
}

function formatShortWardrobeSummary(
  wardrobe?: {
    name?: string
    description?: string
    accessories?: string
    appearanceNotes?: string
  } | null,
  fallback?: {
    defaultWardrobe?: string
    wardrobeAccessories?: string
  } | null
): string | undefined {
  const formatted = formatConsistentWardrobeDescription(wardrobe, fallback, { wordCap: 36 })
  if (!formatted) return undefined
  const sanitized = autoSanitizePrompt(formatted, { logChanges: false }).sanitizedPrompt
  return sanitized.trim() || undefined
}

function videoWardrobeLabel(
  _name: string,
  _index: number,
  personTokenIndex?: number,
  wardrobeSummary?: string
): string {
  const base = formatNextImageCaption({
    role: 'wardrobe',
    token: videoPersonToken(personTokenIndex),
  })
  return wardrobeSummary ? `${base} Outfit: ${wardrobeSummary}.` : base
}

function videoDiptychLabel(
  _name: string,
  _index?: number,
  personTokenIndex?: number,
  heightPhrase?: string,
  wardrobeSummary?: string
): string {
  const base = formatNextImageCaption({
    role: 'character',
    token: videoPersonToken(personTokenIndex),
  })
  const scaleSuffix = heightPhrase ? ` (${heightPhrase})` : ''
  const outfitClause = wardrobeSummary ? ` (${wardrobeSummary})` : ''
  return `${base} Extract exact facial identity from the face close-up and outfit${outfitClause} from the full-body standing figure${scaleSuffix}; do not render the character-card layout or headshot overlay.`
}

/** Cast, location, and key props used for both Omni REF and Kling elements. */
export function resolveBeatElementSelection(args: ResolveBeatVideoReferencesArgs): {
  characterIds: string[]
  characterWardrobes: Array<{ characterId: string; wardrobeId: string }>
  objectRefIds: string[]
  locationRefId?: string | null
  locationVersionId?: string | null
} {
  const { scene, beat, sceneIndex, projectCharacters, locationReferences, objectReferences, filmTitle } =
    args
  if (!beat) {
    return { characterIds: [], characterWardrobes: [], objectRefIds: [] }
  }

  const beatContext = resolveBeatFrameGenerationContext({
    scene,
    beat,
    sceneIndex,
    projectCharacters,
    locationReferences,
    objectReferences,
    filmTitle,
  })
  const selection = shouldUseExplicitBeatReferences(beat)
    ? beat.referenceSelection
    : {
        characterIds: beatContext.characterIds,
        locationRefId: beatContext.locationRefId,
        locationVersionId: beatContext.locationVersionId,
        objectRefIds: beatContext.objectRefIds,
        characterWardrobes: beatContext.characterWardrobes,
      }

  let characterIds = selection.characterIds?.length
    ? [...selection.characterIds]
    : beat.characterId
      ? [beat.characterId]
      : []

  if (
    shouldUseExplicitBeatReferences(beat) &&
    hasVisualStagingForCastFilter(beat.beatDirection) &&
    Array.isArray(beat.beatDirection?.castInFrame) &&
    beatContext.characterIds.length > 0 &&
    beatContext.characterIds.length < characterIds.length
  ) {
    characterIds = [...beatContext.characterIds]
  }

  const allowedCharSet = new Set(characterIds.map((id) => id.trim().toLowerCase()))
  const baseWardrobes =
    selection.characterWardrobes && selection.characterWardrobes.length > 0
      ? selection.characterWardrobes
      : beatContext.characterWardrobes ?? []
  const characterWardrobes =
    allowedCharSet.size > 0
      ? baseWardrobes.filter((w) => allowedCharSet.has(w.characterId.trim().toLowerCase()))
      : baseWardrobes

  return {
    characterIds,
    characterWardrobes,
    objectRefIds: selection.objectRefIds ?? [],
    locationRefId: selection.locationRefId,
    locationVersionId: selection.locationVersionId,
  }
}

function findCharacterById(
  id: string,
  projectCharacters: ResolveBeatVideoReferencesArgs['projectCharacters']
) {
  return (
    projectCharacters.find((c) => c.id === id) ??
    projectCharacters.find((c) => c.name === id) ??
    projectCharacters.find((c) => c.name?.toLowerCase() === id.toLowerCase())
  )
}

export function resolveBeatVideoReferences(
  args: ResolveBeatVideoReferencesArgs
): ResolvedBeatVideoReferences {
  const { scene, beat, sceneIndex, projectCharacters, locationReferences, objectReferences, filmTitle } =
    args

  if (!beat) {
    return { refs: [], labeledRefs: [], urlList: [], warnings: [] }
  }

  const beatSourceSceneIndex =
    typeof (beat as { sourceSceneIndex?: unknown }).sourceSceneIndex === 'number' &&
    ((beat as { sourceSceneIndex: number }).sourceSceneIndex >= 0)
      ? (beat as { sourceSceneIndex: number }).sourceSceneIndex
      : sceneIndex

  const beatContext = resolveBeatFrameGenerationContext({
    scene,
    beat,
    sceneIndex: beatSourceSceneIndex,
    projectCharacters,
    locationReferences,
    objectReferences,
    filmTitle,
  })

  const selection = shouldUseExplicitBeatReferences(beat)
    ? beat.referenceSelection
    : {
        characterIds: beatContext.characterIds,
        locationRefId: beatContext.locationRefId,
        locationVersionId: beatContext.locationVersionId,
        objectRefIds: beatContext.objectRefIds,
        characterWardrobes: beatContext.characterWardrobes,
      }

  const characterWardrobes =
    selection.characterWardrobes && selection.characterWardrobes.length > 0
      ? selection.characterWardrobes
      : beatContext.characterWardrobes

  const imageReferences: Array<{
    imageUrl: string
    refRole: 'identity' | 'wardrobe' | 'wardrobe-diptych'
    characterName: string
    wardrobeDescription?: string
  }> = []

  const characterMeta: Array<{
    name: string
    hasDualReferences?: boolean
    hasWardrobeDiptych?: boolean
    subjectOrdinal?: number
    characterHeight?: string
    wardrobeSummary?: string
  }> = []

  for (const charId of selection.characterIds ?? []) {
    const char = findCharacterById(charId, projectCharacters)
    if (!char?.name) continue

    const refPair = resolveCharacterReferencePair({
      character: char as Record<string, unknown>,
      scene,
      sceneIndex: beatSourceSceneIndex,
      characterWardrobes,
      includeWardrobeReferenceImages: Boolean(args.includeWardrobeReferenceImages),
      includeWardrobeDiptych: Boolean(args.includeWardrobeDiptych),
    })

    const sentDiptych = Boolean(refPair.hasWardrobeDiptych && refPair.wardrobeDiptychUrl)
    const heightPhrase = extractCharacterHeightPhrase({
      height: char.height,
      appearanceDescription: char.appearanceDescription,
      visionDescription: char.visionDescription,
    })
    const wardrobeSummary = formatShortWardrobeSummary(refPair.resolvedWardrobe, {
      defaultWardrobe: char.defaultWardrobe,
      wardrobeAccessories: char.wardrobeAccessories,
    })
    characterMeta.push({
      name: char.name,
      hasDualReferences: sentDiptych ? false : refPair.hasDualReferences,
      hasWardrobeDiptych: sentDiptych,
      subjectOrdinal: characterMeta.length + 1,
      characterHeight: heightPhrase,
      wardrobeSummary,
    })

    if (sentDiptych && refPair.wardrobeDiptychUrl) {
      imageReferences.push({
        imageUrl: refPair.wardrobeDiptychUrl,
        refRole: 'wardrobe-diptych',
        characterName: char.name,
      })
      continue
    }

    if (refPair.identityUrl) {
      const hasSeparateWardrobe = Boolean(
        refPair.wardrobeUrl && refPair.wardrobeUrl !== refPair.identityUrl
      )
      imageReferences.push({
        imageUrl: refPair.identityUrl,
        refRole: 'identity',
        characterName: char.name,
        ...(!hasSeparateWardrobe && wardrobeSummary
          ? { wardrobeDescription: wardrobeSummary }
          : {}),
      })
      if (hasSeparateWardrobe && refPair.wardrobeUrl) {
        imageReferences.push({
          imageUrl: refPair.wardrobeUrl,
          refRole: 'wardrobe',
          characterName: char.name,
        })
      }
      continue
    }

    if (refPair.wardrobeUrl) {
      imageReferences.push({
        imageUrl: refPair.wardrobeUrl,
        refRole: 'wardrobe',
        characterName: char.name,
      })
    }
  }

  const objectImageReferences = (selection.objectRefIds ?? [])
    .map((id) => objectReferences.find((o) => o.id === id))
    .filter((o): o is VisualReference => !!o?.imageUrl)
    .map((obj) => ({
      imageUrl: obj.imageUrl!,
      name: obj.name || 'prop',
      importance: obj.importance,
      description: obj.description,
      dimensions: obj.dimensions,
    }))

  const locationRef = selection.locationRefId
    ? locationReferences.find((l) => l.id === selection.locationRefId)
    : undefined
  const mappedLocation = locationRef
    ? locationReferenceForGeneration(locationRef, selection.locationVersionId)
    : undefined

  const buildIdentityWithHeight = (name: string, index: number, personTokenIndex?: number) => {
    const meta = characterMeta.find((c) => c.name === name)
    return videoIdentityLabel(
      name,
      index,
      personTokenIndex,
      meta?.characterHeight,
      Boolean(meta?.hasDualReferences)
    )
  }
  const buildWardrobeWithSummary = (name: string, index: number, personTokenIndex?: number) => {
    const meta = characterMeta.find((c) => c.name === name)
    return videoWardrobeLabel(name, index, personTokenIndex, meta?.wardrobeSummary)
  }
  const buildDiptychWithHeight = (name: string, index?: number, personTokenIndex?: number) => {
    const meta = characterMeta.find((c) => c.name === name)
    return videoDiptychLabel(
      name,
      index,
      personTokenIndex,
      meta?.characterHeight,
      meta?.wardrobeSummary
    )
  }

  const characterRefEntries = buildCharacterReferenceEntries(
    imageReferences,
    characterMeta,
    buildIdentityWithHeight,
    buildWardrobeWithSummary,
    0,
    buildDiptychWithHeight
  )
  const propRefEntries = buildPropReferenceEntries(objectImageReferences, characterRefEntries.length).map(
    (entry, index) => ({
      ...entry,
      promptToken: `prop [${index + 1}]`,
    })
  )
  let locationRefEntry = buildLocationReferenceEntry(
    mappedLocation,
    characterRefEntries.length + propRefEntries.length
  )
  if (!locationRefEntry) {
    // When no library LocationReference image is drawn yet (or the beat has an
    // explicit start-frame environment still), fall back to the beat's valid opening
    // frame image as a location [1] reference so Omni reference_to_video anchors on
    // the start-frame environment instead of inventing the setting from text alone.
    const explicitStartUrl = beat.storyboardStartImageUrl?.trim()
    const startHasDarkState = beatHasOpeningEnvironmentState(beat.beatDirection?.startFrame || '')
    const stillPromptCoversDarkState =
      !startHasDarkState ||
      beatHasOpeningEnvironmentState(beat.storyboardImagePrompt || '') ||
      beatHasOpeningEnvironmentState(beat.beatDirection?.framePrompt || '')
    const nonStaleStillUrl =
      !isBeatFrameStale(beat) && stillPromptCoversDarkState
        ? beat.storyboardImageUrl?.trim()
        : undefined
    const hasExpectedLocationContext = Boolean(
      locationRef || beatContext.locationName || beat.beatDirection?.startFrame
    )
    const fallbackEnvUrl =
      explicitStartUrl ||
      (hasExpectedLocationContext && characterRefEntries.length === 0 && propRefEntries.length === 0
        ? nonStaleStillUrl
        : undefined)
    if (fallbackEnvUrl) {
      locationRefEntry = buildLocationReferenceEntry(
        {
          imageUrl: fallbackEnvUrl,
          location:
            mappedLocation?.location ||
            locationRef?.location ||
            beatContext.locationName ||
            'Opening frame environment',
          description:
            beat.beatDirection?.startFrame ||
            beat.beatDirection?.frozenMoment ||
            mappedLocation?.description,
        },
        characterRefEntries.length + propRefEntries.length
      )
    }
  }
  if (locationRefEntry) locationRefEntry.promptToken = 'location [1]'

  const allPrioritized = [
    ...characterRefEntries,
    ...propRefEntries,
    ...(locationRefEntry ? [locationRefEntry] : []),
  ]

  const { selected, dropped } = selectReferenceImagesInOrder(
    allPrioritized,
    MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
    {
      buildIdentityLabel: buildIdentityWithHeight,
      buildWardrobeLabel: buildWardrobeWithSummary,
      buildDiptychLabel: buildDiptychWithHeight,
      buildPropLabel: (propName, _sendIndex, promptToken) => {
        const base = formatNextImageCaption({ role: 'prop', token: promptToken || 'prop [1]' })
        const matchedObj = objectImageReferences.find((o) => o.name === propName)
        if (
          matchedObj &&
          (matchedObj.dimensions?.trim() ||
            extractPropScalePhrase(matchedObj.description, matchedObj.name, matchedObj.dimensions))
        ) {
          const scale = formatPropScaleDescriptor(
            matchedObj.description,
            matchedObj.name,
            matchedObj.dimensions
          )
          return `${base} Prop scale: ${scale}.`
        }
        return base
      },
      buildLocationLabel: (_locationName, _sendIndex, promptToken) => {
        const base = formatNextImageCaption({ role: 'location', token: promptToken || 'location [1]' })
        if (mappedLocation?.description?.trim() || mappedLocation?.canonicalScale) {
          const scale = formatLocationScaleDescriptor(
            mappedLocation.description,
            mappedLocation.location || mappedLocation.name,
            mappedLocation.canonicalScale
          )
          return `${base} Environment scale: ${scale}.`
        }
        return base
      },
      preserveLibraryPromptTokens: true,
    }
  )

  const warnings = [...beatContext.warnings]
  if (dropped.length > 0) {
    warnings.push(
      `Dropped ${dropped.length} reference(s) (cap=${MAX_VERTEX_GEMINI_REFERENCE_IMAGES}): ${dropped.map((r) => r.name).join(', ')}`
    )
  }

  const labeledRefs: LabeledVideoReference[] = selected.map((ref) => ({
    url: ref.imageUrl,
    type: ref.role === 'location' || ref.role.startsWith('prop-') ? 'style' : 'character',
    name: ref.name,
    role: ref.role,
    refRole: ref.refRole,
    characterName: ref.characterName,
    propName: ref.propName,
    locationName: ref.locationName,
    promptToken: ref.promptToken,
    subjectOrdinal: ref.subjectOrdinal,
    ...(ref.wardrobeDescription ? { wardrobeDescription: ref.wardrobeDescription } : {}),
  }))

  return {
    refs: selected,
    labeledRefs,
    urlList: selected.map((r) => r.imageUrl),
    warnings,
  }
}

/**
 * User-saved beat references replace whatever the client attached.
 * Also replaces stale client references when beatDirection specifies castInFrame
 * or keyProps that are missing from (or contradict) the client reference list,
 * or when clientRefs still carry legacy PiP composite / full-body wardrobe plates.
 * Otherwise only unlabeled client urls are rebuilt on the server.
 */
export function shouldReplaceClientVideoReferences(
  beat: SceneBeat | null | undefined,
  clientRefs: Parameters<typeof shouldRelabelRefs>[0]
): boolean {
  if (shouldUseExplicitBeatReferences(beat) || shouldRelabelRefs(clientRefs)) {
    return true
  }
  if (!Array.isArray(clientRefs)) return false
  const structuredRefs = clientRefs.filter(
    (ref): ref is Exclude<(typeof clientRefs)[number], string> =>
      Boolean(ref && typeof ref === 'object')
  )
  const hasStaleWardrobeOrPipRef = structuredRefs.some(
    (ref) =>
      ref.refRole === 'wardrobe-diptych' ||
      ref.refRole === 'wardrobe' ||
      ref.role === 'wardrobe' ||
      /^The next image is the (?:identity and wardrobe|wardrobe) of\b/i.test(
        (ref.name || '').trim()
      )
  )
  if (hasStaleWardrobeOrPipRef) {
    return true
  }
  const dir = beat?.beatDirection
  if (!dir) return false
  if (Array.isArray(dir.castInFrame)) {
    const directedCast = dir.castInFrame.map((name) => name.trim()).filter(Boolean)
    if (directedCast.length === 0) {
      const hasClientCharacter = structuredRefs.some(
        (ref) =>
          Boolean(ref.characterName?.trim()) ||
          ref.role === 'identity' ||
          ref.role === 'wardrobe'
      )
      if (hasClientCharacter) return true
    } else {
      const missingDirectedCast = directedCast.some((castName) => {
        const needle = castName.toLowerCase()
        return !structuredRefs.some(
          (ref) =>
            ref.characterName?.trim().toLowerCase() === needle ||
            ref.name?.toLowerCase().includes(needle)
        )
      })
      if (missingDirectedCast) return true
    }
  }
  if (Array.isArray(dir.keyProps) && dir.keyProps.length > 0) {
    const directedProps = dir.keyProps.map((name) => name.trim()).filter(Boolean)
    const missingDirectedProp = directedProps.some((propName) => {
      const needle = propName.toLowerCase()
      return !structuredRefs.some(
        (ref) =>
          ref.propName?.trim().toLowerCase() === needle ||
          ref.name?.toLowerCase().includes(needle)
      )
    })
    if (missingDirectedProp) return true
  }
  return false
}

/** Resolve references for a segment using its beatId. */
export function resolveSegmentVideoReferences(
  segment: { beatId?: string | null },
  scene: Record<string, unknown>,
  args: Omit<ResolveBeatVideoReferencesArgs, 'scene' | 'beat'>
): ResolvedBeatVideoReferences {
  const beatId = segment.beatId?.trim()
  const beat = beatId ? getSceneBeats(scene).find((b) => b.beatId === beatId) : undefined
  return resolveBeatVideoReferences({ ...args, scene, beat })
}
