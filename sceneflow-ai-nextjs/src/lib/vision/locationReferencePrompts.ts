/**
 * Prompts and constants for location reference images used in Vision Production.
 */

import {
  SET_PIECE_NOUN_PATTERN,
  beatHasLocationStateChange,
} from '@/lib/vision/locationStateAnalysis'
import {
  dedupeStateNoteClauses,
  extractVersionFocalDelta,
} from '@/lib/vision/locationScriptSync'
import {
  buildRelatedLocationContinuityClause,
  parseLocationHierarchy,
} from '@/lib/vision/locationFamily'
import { isWideEstablishingShotType } from '@/lib/character/characterReferenceAssembly'
import {
  isDetailShot,
  isMediumCoverageLocationShot,
  resolveStillShotClass,
} from '@/lib/imagen/stillFramingNormalize'
import {
  locationScaleClause,
  type LocationCanonicalScale,
} from '@/lib/imagen/locationScaleClause'
import {
  isMountedSetFixtureCatalogName,
  extractMountedSetFixturePhrases,
  stripAutoMountedFixtureClause,
  stripTemporalAftermathFromBaseDescription,
} from '@/lib/vision/mountedSetFixtures'
import {
  formatLocationResidentInstrumentDirective,
  isLocationResidentInstrumentName,
  primaryLocationResidentInstrument,
  propPlateIdentifiesInstrument,
} from '@/lib/vision/locationResidentInstruments'
import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'

export const LOCATION_REFERENCE_ASPECT_RATIO = '16:9' as const

export interface BuildLocationBasePromptOptions {
  parentLocationName?: string
  parentLocationDescription?: string
  subZoneLabel?: string
  hasParentReferenceImage?: boolean
  artStyle?: string | null
}

/**
 * Client-safe seed for a location base establishing still.
 * Matches the server composition used when no custom prompt is stored.
 */
export function buildLocationBasePrompt(
  locationName: string,
  intExt?: string,
  timeOfDay?: string,
  description?: string,
  options?: BuildLocationBasePromptOptions
): string {
  const parts: string[] = []

  if (description) {
    parts.push(description)
  } else {
    parts.push(`${locationName} setting`)
  }

  if (options?.parentLocationName) {
    const continuityClause = buildRelatedLocationContinuityClause({
      locationName,
      locationDescription: description,
      parentLocationName: options.parentLocationName,
      parentLocationDescription: options.parentLocationDescription,
      subZoneLabel: options.subZoneLabel,
      hasParentReferenceImage: options.hasParentReferenceImage,
    })
    if (continuityClause) {
      parts.push(continuityClause.replace(/[.]+$/, ''))
    }
  }

  if (intExt) {
    const mapping: Record<string, string> = {
      INT: 'Interior scene',
      EXT: 'Exterior scene',
      'INT/EXT': 'Interior/Exterior transitional scene',
      'EXT/INT': 'Exterior/Interior transitional scene',
    }
    parts.push(mapping[intExt] || '')
  }

  if (timeOfDay) {
    const lightingMap: Record<string, string> = {
      DAY: 'Natural daylight, bright ambient lighting',
      NIGHT: 'Nighttime atmosphere, artificial interior lighting or moonlight',
      MORNING: 'Early morning light, soft golden hour tones',
      EVENING: 'Evening atmosphere, warm golden lighting',
      SUNSET: 'Dramatic sunset lighting with warm orange and pink tones',
      SUNRISE: 'Sunrise atmosphere, soft warm golden light breaking through',
      DUSK: 'Twilight atmosphere, cool blue-purple tones with fading light',
      DAWN: 'Pre-dawn atmosphere, soft cool light with hint of warmth',
    }
    const lighting = lightingMap[timeOfDay.toUpperCase()]
    if (lighting) parts.push(lighting)
  }

  const rawStyle = options?.artStyle?.trim()
  const isDefaultPhotoreal = !rawStyle || rawStyle === 'photorealistic'
  const isLiveAction = isDefaultPhotoreal || isPhotorealisticArtStyle(rawStyle)

  if (isLiveAction) {
    parts.push(
      LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
      'Cinematic production design, professional film set quality',
      'High resolution, sharp focus, detailed textures',
      'Film production location reference photograph for visual consistency across scenes'
    )
    if (!isDefaultPhotoreal && rawStyle) {
      const spec = buildArtStyleSpecFromValue(rawStyle)
      parts.push(`Global Art Style grade: ${spec.stylePrompt}`)
    }
  } else {
    const spec = buildArtStyleSpecFromValue(rawStyle)
    const stylizedTurnaround = LOCATION_TURNAROUND_GENERATION_INSTRUCTION.replace(
      'One photograph capturing',
      `One unified ${spec.title} establishing plate capturing`
    )
    parts.push(
      stylizedTurnaround,
      spec.locationRefDirective.replace(/[.]+$/, ''),
      'High resolution, sharp focus, detailed environment continuity plate across scenes'
    )
  }

  return parts.filter(Boolean).join('. ') + '.'
}

/** Generation: single extreme-wide establishing shot of the location. */
export const LOCATION_TURNAROUND_GENERATION_INSTRUCTION =
  'Single unified cinematic frame — extreme wide establishing shot of the location. ' +
  'One photograph capturing the full environment layout, spatial geometry, and permanent set features in their mounted position as described for this space. ' +
  'Depict only features explicitly described for this location; do not add handheld props. ' +
  'NOT a 2x2 grid, NOT a multi-panel sheet, NOT split-screen, NOT a collage, NOT multiple camera angles. ' +
  'Empty scene with NO people or characters present.'

/** Downstream beat/frame generation: how to consume a location reference image. */
export const LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: Single wide-angle establishing shot of the environment. ' +
  'Match architectural layout, furniture placement, color palette, and spatial geometry from this reference. ' +
  'Render one unbroken single-camera frame. Match lighting to Global Style Anchor.'

export const LOCATION_DETAIL_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: The attached plate is an extreme-wide establishing still of the environment. ' +
  'For this close-up, match ambient lighting tone and color palette of the location in shallow-focus background bokeh. ' +
  'Do not reproduce architectural layout or furniture placement as the frame.'

export const LOCATION_OBJECT_INSERT_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: The attached plate is the set. ' +
  'Match near-field materials, metal, paint, and the mounting surface around the subject from this reference. ' +
  'Fill the frame with the named instrument. Do not pull back to a wide establishing shot of the whole room.'

export const LOCATION_ENVIRONMENT_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: The attached plate is the set, not a second wide establishing subject. ' +
  'Match architectural layout, color palette, and lighting as the surrounding environment. ' +
  'Do not copy the plate as an extreme-wide establishing shot or empty room. ' +
  'Only include specific wall-mounted fixtures from the reference plate if the shot angle directly faces that wall; do not duplicate every fixture from the wide plate into the background.'

export function isObjectInsertLocationShot(options?: {
  shotType?: string | null
  actionFraming?: string | null
  emptyCast?: boolean
}): boolean {
  const shot = resolveStillShotClass(options?.shotType, options?.actionFraming)
  const emptyCast =
    options?.emptyCast ?? /\bno people in frame\b/i.test(options?.actionFraming ?? '')
  return emptyCast && shot.isInsertOrEcu
}

function closeUpLocationInstrument(options?: {
  shotType?: string | null
  actionFraming?: string | null
}): string | undefined {
  const instrument = primaryLocationResidentInstrument(options?.actionFraming)
  if (!instrument) return undefined
  const shot = resolveStillShotClass(options?.shotType, options?.actionFraming)
  const hint = shot.shotHint || options?.shotType || ''
  if (isWideEstablishingShotType(hint) && !shot.isDetail && !shot.isInsertOrEcu) return undefined
  if (shot.isDetail || shot.isInsertOrEcu || isDetailShot(hint) || isDetailShot(options?.shotType)) {
    return instrument
  }
  return undefined
}

export function buildLocationConsumptionInstruction(options?: {
  shotType?: string | null
  promptToken?: string
  actionFraming?: string | null
  emptyCast?: boolean
  locationDescription?: string | null
  locationName?: string | null
  canonicalScale?: Partial<LocationCanonicalScale> | null
  /** Library prop names attached to this frame, if any. */
  propNames?: string[] | null
}): string {
  const token = options?.promptToken?.trim()
  const scaleLock = locationScaleClause(
    options?.locationDescription,
    options?.locationName,
    options?.canonicalScale
  )
  const withScale = (instruction: string) => `${instruction} ${scaleLock}`
  const instrument = closeUpLocationInstrument(options)
  if (instrument) {
    const phrases = [instrument]
    const propPlateIdentifies = (options?.propNames ?? []).some((name) =>
      propPlateIdentifiesInstrument(name, phrases)
    )
    return withScale(
      formatLocationResidentInstrumentDirective({
        instrument,
        locationToken: token,
        propPlateIdentifies,
      })
    )
  }
  if (isObjectInsertLocationShot(options)) {
    if (!token) return withScale(LOCATION_OBJECT_INSERT_CONSUMPTION_INSTRUCTION)
    return withScale(
      'LOCATION REFERENCE: The attached plate is the set. ' +
        `Match near-field materials, metal, paint, and the mounting surface around the subject from ${token}. ` +
        'Fill the frame with the named instrument. Do not pull back to a wide establishing shot of the whole room.'
    )
  }
  const shot = resolveStillShotClass(options?.shotType, options?.actionFraming)
  const hint = shot.shotHint || options?.shotType || ''
  if (isMediumCoverageLocationShot(hint)) {
    if (!token) return withScale(LOCATION_ENVIRONMENT_CONSUMPTION_INSTRUCTION)
    return withScale(
      'LOCATION REFERENCE: The attached plate is the set, not a second wide establishing subject. ' +
        `Match architectural layout, color palette, and lighting of ${token} as the surrounding environment. ` +
        `Do not copy ${token} as an extreme-wide establishing shot or empty room. ` +
        'Only include specific wall-mounted fixtures from the reference plate if the shot angle directly faces that wall; do not duplicate every fixture from the wide plate into the background.'
    )
  }
  if (!isDetailShot(options?.shotType) && !shot.isDetail) {
    if (hint.trim() && !isWideEstablishingShotType(hint)) {
      if (!token) return withScale(LOCATION_ENVIRONMENT_CONSUMPTION_INSTRUCTION)
      return withScale(
        'LOCATION REFERENCE: The attached plate is the set, not a second wide establishing subject. ' +
          `Match architectural layout, color palette, and lighting of ${token} as the surrounding environment. ` +
          `Do not copy ${token} as an extreme-wide establishing shot or empty room. ` +
          'Only include specific wall-mounted fixtures from the reference plate if the shot angle directly faces that wall; do not duplicate every fixture from the wide plate into the background.'
      )
    }
    return withScale(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION)
  }
  if (!token) return withScale(LOCATION_DETAIL_CONSUMPTION_INSTRUCTION)
  return withScale(
    'LOCATION REFERENCE: The attached plate is an extreme-wide establishing still of the environment. ' +
      `For this close-up, match ambient lighting tone and color palette of ${token} in shallow-focus background bokeh. ` +
      'Do not reproduce architectural layout or furniture placement as the frame.'
  )
}

/** Extra lock when the attached still is a post-change version, not the intact base. */
export const LOCATION_VERSION_CONSUMPTION_SUFFIX =
  'This image is the CURRENT set state. Match damaged, missing, or redressed elements exactly. ' +
  'Do not restore features that are absent from this reference.'

/** Generation: version still from the base establishing shot. Structural set only. */
export const LOCATION_VERSION_GENERATION_INSTRUCTION =
  'Same location as the attached base reference photograph — match architecture, layout, ' +
  'materials, palette, and any furniture that is NOT listed as changed, exactly. ' +
  'Treat the attached base location photograph as the master wide-shot set containing all resident fixtures, and render this version as a camera angle of that base location showing the active structural set-state changes on existing set pieces without inventing new objects. ' +
  'Paint ONLY lasting structural set-state changes as the new source of truth: architecture, ' +
  'structural openings, walls, floors, built-in or overturned set furniture, ' +
  'permanent architectural fixtures, flooding, room debris, boarded windows, or damaged architectural features described in the state notes. ' +
  'Do NOT add handheld objects, beat keyProps, or objects a character will introduce ' +
  '(journals, documents, tools, weapons, papers, bags). If the state notes name those, ignore them and leave the set empty of that object. ' +
  'Do not restore pre-change dressing that the structural state notes say is gone, destroyed, or redressed.'

const LEGACY_LOCATION_HARDWARE_PRIMING_PATTERNS: RegExp[] = [
  /\s*Include any named built-in architectural hardware or permanent fixtures in their mounted position only when described for this location;\s*never invent unrelated doors,\s*vaults,\s*or hardware\.?/gi,
  /\s*Include any named built-in architectural hardware[^.!?]*(?:hatch\s+wheel|vault\s+door|lockdown\s+wheel|bolted\s+valve|door\s+wheel|vault\s+wheel|doors,\s*vaults)[^.!?]*\.?/gi,
  /\s*(?:Any\s+)?(?:named\s+)?built-in\s+(?:architectural\s+)?hardware\s*\([^)]*(?:wheel|vault|hatch|valve)[^)]*\)[^.!?]*\.?/gi,
]

/**
 * Strip legacy positive-prompt priming clauses ("doors, vaults, or hardware",
 * "hatch wheel", "vault door", "lockdown wheel") from previously saved prompts.
 */
export function sanitizeLegacyLocationPromptPriming(prompt?: string): string {
  let next = (prompt || '').trim()
  if (!next) return ''
  for (const pattern of LEGACY_LOCATION_HARDWARE_PRIMING_PATTERNS) {
    next = next.replace(pattern, ' ')
  }
  next = next.replace(
    /doors,\s*windows,\s*walls,\s*floors,\s*built-in or overturned set furniture \(desks,\s*chairs bolted to the room\),\s*built-in architectural hardware and permanent fixtures,\s*flooding,\s*debris that is the room,\s*boarded windows,\s*exploded or missing architectural features/gi,
    'structural openings, walls, floors, built-in or overturned set furniture, permanent architectural fixtures, flooding, room debris, boarded windows, or damaged architectural features described in the state notes'
  )
  return next
    .replace(/\.{2,}/g, '.')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()
}

/**
 * Handheld / beat-prop nouns that must not bake into a location version still.
 * These belong on the beat frame when a character introduces them.
 */
export const HANDHELD_BEAT_PROP_PATTERN =
  /\b(?:(?:heavy\s+)?(?:roll(?:\s+of)?\s+)?(?:drafting\s+)?vellum|journals?|notebooks?|scrolls?|letters?|envelopes?|schematics?|blueprints?|documents?|maps?|tools?|weapons?|guns?|pistols?|rifles?|knives?|swords?|phones?|smartphones?|cameras?|flashlights?|lanterns?|briefcases?|handbags?|purses?|wallets?|books?|tablets?|laptops?|bottles?|cigarettes?|cigars?|canisters?|vials?|flasks?|syringes?|keys?|watches?|compasses?|badges?|medallions?|coins?|rings?|lockets?)\b/i

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitStateNoteClauses(notes: string): string[] {
  return notes
    .split(/\n+|(?<=[.!;])\s+|;\s*/)
    .map((part) => part.trim().replace(/^[.!;,\s]+|[.!;,\s]+$/g, '').trim())
    .filter(Boolean)
}

function isSingleStructuralNoun(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  return SET_PIECE_NOUN_PATTERN.test(trimmed)
}

function usableCatalogPropNames(catalogPropNames?: string[]): string[] {
  const names = Array.isArray(catalogPropNames) ? catalogPropNames : []
  return names
    .map((name) => name.trim())
    .filter(
      (name) =>
        name.length >= 4 &&
        !isSingleStructuralNoun(name) &&
        !isMountedSetFixtureCatalogName(name) &&
        !isLocationResidentInstrumentName(name)
    )
}

function clauseMentionsCatalogProp(clause: string, catalogPropNames?: string[]): boolean {
  const lower = clause.toLowerCase()
  return usableCatalogPropNames(catalogPropNames).some((name) => lower.includes(name.toLowerCase()))
}

function stripCatalogPropPhrases(text: string, catalogPropNames?: string[]): string {
  let next = text
  for (const name of usableCatalogPropNames(catalogPropNames)) {
    next = next.replace(new RegExp(escapeRegExp(name), 'ig'), ' ')
  }
  return next
}

function stripHandheldAndCatalogFromClause(clause: string, catalogPropNames?: string[]): string {
  let next = stripCatalogPropPhrases(clause, catalogPropNames)
  next = next.replace(HANDHELD_BEAT_PROP_PATTERN, ' ')
  return next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/([,;:]){2,}/g, '$1')
    .replace(/^[,\s;:]+|[,\s;:]+$/g, '')
    .trim()
}

function clauseIsStructuralSet(clause: string): boolean {
  return beatHasLocationStateChange(clause)
}

/**
 * Base room prose and character blocking are not a version. A clause stays
 * when it is a lasting set change or mounted architecture (a hatch wheel).
 */
function clauseCarriesLastingSetState(clause: string): boolean {
  if (extractMountedSetFixturePhrases(clause).length > 0) return true
  return beatHasLocationStateChange(clause)
}

/**
 * Drop beat keyProps / handheld objects from version `stateNotes` at image bake time,
 * and deduplicate repeated clauses across cumulative versions.
 * Stored library notes stay as-is; only generation + prompt-builder seeds are cleaned.
 */
export function stripBeatPropsFromLocationStateNotes(
  stateNotes: string,
  catalogPropNames?: string[]
): string {
  const trimmed = (stateNotes || '').trim()
  if (!trimmed) return ''

  const kept: string[] = []
  for (const clause of splitStateNoteClauses(trimmed)) {
    if (!clauseCarriesLastingSetState(clause)) continue
    const mentionsCatalog = clauseMentionsCatalogProp(clause, catalogPropNames)
    const mentionsHandheld = HANDHELD_BEAT_PROP_PATTERN.test(clause)
    if (!mentionsCatalog && !mentionsHandheld) {
      kept.push(clause)
      continue
    }

    const stripped = stripHandheldAndCatalogFromClause(clause, catalogPropNames)
    if (!stripped) continue
    if (clauseIsStructuralSet(stripped) || clauseIsStructuralSet(clause)) {
      kept.push(stripped)
    }
  }

  if (kept.length === 0) return ''
  const deduped = dedupeStateNoteClauses(kept.join('; '))
  return deduped.replace(/[.]+$/, '').replace(/\s+/g, ' ').trim()
}

/** Ensure a custom builder prompt still carries the structural-only contract. */
export function ensureLocationVersionPromptIsStructural(
  prompt: string,
  catalogPropNames?: string[]
): string {
  let next = sanitizeLegacyLocationPromptPriming(prompt)
  if (!next) return LOCATION_VERSION_GENERATION_INSTRUCTION
  const lower = next.toLowerCase()
  if (
    !next.includes(LOCATION_VERSION_GENERATION_INSTRUCTION) &&
    !lower.includes('do not add handheld')
  ) {
    next = `${LOCATION_VERSION_GENERATION_INSTRUCTION} ${next}`
  }
  next = stripCatalogPropPhrases(next, catalogPropNames)
  return next.replace(/\s{2,}/g, ' ').trim()
}

function hasLocationArtStyleConflict(promptText: string, artStyle?: string | null): boolean {
  const rawStyle = artStyle?.trim()
  if (!rawStyle || rawStyle === 'photorealistic' || isPhotorealisticArtStyle(rawStyle)) {
    return false
  }
  return (
    promptText.includes('One photograph capturing') ||
    /\bFilm production location reference photograph\b/i.test(promptText) ||
    /\battached base reference photograph\b/i.test(promptText)
  )
}

function hasUnbackedVaultOrWheelLeak(
  promptText: string,
  locationName: string | undefined,
  backingProse: string,
  isAutoBuiltSystemPlate: boolean
): boolean {
  const promptHasVaultDoor = /\bvault\s+doors?\b/i.test(promptText)
  const promptWheelFixtures = extractMountedSetFixturePhrases(promptText)
  if (!promptHasVaultDoor && promptWheelFixtures.length === 0) {
    return false
  }

  const combinedBacking = [locationName || '', backingProse].filter(Boolean).join(' ')
  if (promptHasVaultDoor) {
    const proseHasVaultDoor = /\bvault\s+doors?\b/i.test(combinedBacking)
    const parsed = parseLocationHierarchy(locationName)
    const isPrimaryVaultRoom = /\bvault\b/i.test(locationName || '') && !parsed.subZoneLabel
    if (!proseHasVaultDoor && (!isPrimaryVaultRoom || isAutoBuiltSystemPlate)) {
      return true
    }
  }

  if (promptWheelFixtures.length > 0) {
    const backingLower = combinedBacking.toLowerCase()
    const backingFixtures = extractMountedSetFixturePhrases(combinedBacking)
    const anyBacked =
      backingFixtures.length > 0 ||
      promptWheelFixtures.some((phrase) => backingLower.includes(phrase.toLowerCase())) ||
      /\bwheels?\b/i.test(combinedBacking)
    if (!anyBacked) {
      return true
    }
  }

  return false
}

/**
 * Validate and sanitize a stored `location.generationPrompt`.
 *
 * Returns `undefined` when the stored prompt is blank, stale against the current
 * `description` / `artStyle` / `parentLocationName`, or contaminated by legacy
 * vault-door / mounted-wheel leaks — allowing the caller to rebuild a clean plate.
 */
export function resolveLocationBaseGenerationPrompt(input: {
  storedPrompt?: string | null
  locationName?: string
  description?: string
  parentLocationName?: string
  artStyle?: string | null
}): string | undefined {
  const raw = typeof input.storedPrompt === 'string' ? input.storedPrompt.trim() : ''
  if (!raw) return undefined

  const sanitized = stripAutoMountedFixtureClause(sanitizeLegacyLocationPromptPriming(raw))
  if (!sanitized) return undefined

  if (hasLocationArtStyleConflict(sanitized, input.artStyle)) {
    return undefined
  }

  const isAutoBuiltSystemPlate =
    /\bFilm production location reference photograph for visual consistency across scenes\b/i.test(
      sanitized
    ) || /\bdetailed environment continuity plate across scenes\b/i.test(sanitized)

  // Auto-saved system prompts that carried legacy priming or stale auto-fixture clauses
  // should rebuild cleanly rather than replaying outdated template structure.
  if (isAutoBuiltSystemPlate && sanitized !== raw) {
    return undefined
  }

  const cleanDescription = stripAutoMountedFixtureClause(
    stripTemporalAftermathFromBaseDescription(input.description)
  )
  const isTurnaroundOrSystemPlate =
    isAutoBuiltSystemPlate ||
    sanitized.includes('Single unified cinematic frame — extreme wide establishing shot')
  if (
    isTurnaroundOrSystemPlate &&
    cleanDescription &&
    !sanitized.toLowerCase().includes(cleanDescription.toLowerCase())
  ) {
    return undefined
  }

  const hasContinuityBlock =
    /\bRelated location continuity:/i.test(sanitized) ||
    /\bParent complex architecture\s*\(/i.test(sanitized)
  if (hasContinuityBlock) {
    const expectedParent = input.parentLocationName?.trim()
    if (!expectedParent) {
      return undefined
    }
    const parentMatch = sanitized.match(/Parent complex architecture\s*\(([^)]+)\):/i)
    if (parentMatch && parentMatch[1]!.trim().toUpperCase() !== expectedParent.toUpperCase()) {
      return undefined
    }
  }

  if (
    hasUnbackedVaultOrWheelLeak(
      sanitized,
      input.locationName,
      input.description || '',
      isAutoBuiltSystemPlate
    )
  ) {
    return undefined
  }

  return sanitized
}

/**
 * Validate and sanitize a stored `version.generationPrompt`.
 *
 * Returns `undefined` when blank, stale against current `stateNotes` / `artStyle`,
 * or contaminated by unbacked vault-door / mounted-wheel prose.
 */
export function resolveLocationVersionGenerationPrompt(input: {
  storedPrompt?: string | null
  locationName?: string
  stateNotes?: string
  description?: string
  catalogPropNames?: string[]
  artStyle?: string | null
}): string | undefined {
  const raw = typeof input.storedPrompt === 'string' ? input.storedPrompt.trim() : ''
  if (!raw) return undefined

  const sanitized = stripAutoMountedFixtureClause(sanitizeLegacyLocationPromptPriming(raw))
  if (!sanitized) return undefined

  if (hasLocationArtStyleConflict(sanitized, input.artStyle)) {
    return undefined
  }

  const isAutoBuiltVersionPlate =
    sanitized.includes('Current structural set state (source of truth') ||
    sanitized.includes('No lasting structural set changes remain after removing beat props')

  if (isAutoBuiltVersionPlate && sanitized !== raw) {
    return undefined
  }

  const structuralNotes = stripBeatPropsFromLocationStateNotes(
    input.stateNotes || '',
    input.catalogPropNames
  )
  if (isAutoBuiltVersionPlate) {
    if (structuralNotes && !sanitized.toLowerCase().includes(structuralNotes.toLowerCase())) {
      return undefined
    }
    if (!structuralNotes && sanitized.includes('Current structural set state (source of truth')) {
      return undefined
    }
  }

  if (
    hasUnbackedVaultOrWheelLeak(
      sanitized,
      input.locationName,
      [input.stateNotes || '', input.description || ''].filter(Boolean).join('. '),
      isAutoBuiltVersionPlate
    )
  ) {
    return undefined
  }

  return sanitized
}

export interface LocationVersionPromptInput {
  locationName: string
  stateNotes: string
  previousStateNotes?: string
  intExt?: string
  timeOfDay?: string
  description?: string
  catalogPropNames?: string[]
  artStyle?: string | null
}

export function buildLocationVersionPrompt(input: LocationVersionPromptInput): string {
  const structuralNotes = stripBeatPropsFromLocationStateNotes(
    input.stateNotes,
    input.catalogPropNames
  )
  const { focalDelta, backgroundState } = extractVersionFocalDelta(
    structuralNotes,
    input.previousStateNotes
  )
  const rawStyle = input.artStyle?.trim()
  const isDefaultPhotoreal = !rawStyle || rawStyle === 'photorealistic'
  const isLiveAction = isDefaultPhotoreal || isPhotorealisticArtStyle(rawStyle)
  const spec = !isDefaultPhotoreal && rawStyle ? buildArtStyleSpecFromValue(rawStyle) : undefined

  const turnaroundLine = isLiveAction
    ? LOCATION_TURNAROUND_GENERATION_INSTRUCTION
    : LOCATION_TURNAROUND_GENERATION_INSTRUCTION.replace(
        'One photograph capturing',
        `One unified ${spec!.title} establishing plate capturing`
      )
  const versionLine = isLiveAction
    ? LOCATION_VERSION_GENERATION_INSTRUCTION
    : LOCATION_VERSION_GENERATION_INSTRUCTION.replace(/photograph/g, 'reference plate')

  const lines = [
    turnaroundLine,
    versionLine,
    `Location: ${input.locationName}.`,
  ]
  if (input.description?.trim()) {
    lines.push(`Base set description: ${input.description.trim()}.`)
  }
  if (input.intExt) {
    lines.push(`Setting type: ${input.intExt}.`)
  }
  if (input.timeOfDay) {
    lines.push(`Time of day: ${input.timeOfDay}.`)
  }
  if (structuralNotes) {
    lines.push(
      `Current structural set state (source of truth — bake into this establishing shot; ignore handheld beat props): ${structuralNotes}.`
    )
    if (backgroundState && focalDelta && focalDelta !== structuralNotes) {
      lines.push(
        `Version camera angle & focal zone: Frame this version as a camera angle of the attached base wide-shot location focusing on the newly affected set zone (${focalDelta.replace(/[.]+$/, '')}), while maintaining architectural continuity with the base plate. Do not crowd unrelated wall fixtures from outside this camera angle into the frame.`
      )
    }
  } else {
    lines.push(
      'No lasting structural set changes remain after removing beat props — match the intact base architecture and set furniture. Do not invent handheld objects.'
    )
  }
  lines.push(
    'Empty scene with NO people or characters present.',
    isLiveAction
      ? spec
        ? `Cinematic production design, professional film set quality (${spec.stylePrompt}). High resolution, sharp focus, detailed textures.`
        : 'Cinematic production design, professional film set quality. High resolution, sharp focus, detailed textures.'
      : `${spec!.locationRefDirective} High resolution, sharp focus, detailed environment continuity plate.`
  )
  return lines.join(' ')
}

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  'single extreme-wide establishing shot — match layout and palette'

export function buildLocationReferenceLabel(
  locationName: string,
  referenceIndex: number
): string {
  return `Location reference ${referenceIndex}: ${locationName} (extreme-wide establishing shot)`
}

/**
 * `label` lets the caller reuse the exact label attached to the image part, so
 * the wrapper line and the image name the reference identically.
 */
export function buildLocationReferencePromptLine(
  locationName: string,
  referenceIndex: number,
  label?: string,
  options?: {
    currentSetState?: boolean
    shotType?: string | null
    promptToken?: string
    actionFraming?: string | null
    emptyCast?: boolean
    locationDescription?: string | null
    canonicalScale?: Partial<LocationCanonicalScale> | null
    propNames?: string[] | null
  }
): string {
  const heading = label ?? `Reference image ${referenceIndex}: LOCATION REFERENCE for "${locationName}"`
  const suffix = options?.currentSetState ? `\n  ${LOCATION_VERSION_CONSUMPTION_SUFFIX}` : ''
  return `- ${heading}\n  ${buildLocationConsumptionInstruction({
    shotType: options?.shotType,
    promptToken: options?.promptToken,
    actionFraming: options?.actionFraming,
    emptyCast: options?.emptyCast,
    locationName,
    locationDescription: options?.locationDescription,
    canonicalScale: options?.canonicalScale,
    propNames: options?.propNames,
  })}${suffix}`
}
