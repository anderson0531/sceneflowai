/**
 * Location Family & Sub-Area Continuity Resolution
 *
 * Connects related locations that represent different areas, workstations, or
 * zones of the same overarching architectural complex — for example:
 * - "FREIGHT TUNNEL VAULT"
 * - "FREIGHT TUNNEL VAULT - WORKSHOP"
 * - "FREIGHT TUNNEL VAULT - CLARA'S WORKSTATION"
 * - "FREIGHT TUNNEL ARCHIVE VAULT"
 *
 * Ensures that:
 * 1. Primary parent locations are planned/generated before their sub-areas.
 * 2. Sub-area base prompts inherit the parent location's architectural DNA
 *    (walls, floor materials, rail lines, ceiling geometry, era, lighting).
 * 3. When the parent location already has a base reference image, it is passed
 *    as an architectural continuity reference image when generating sub-areas.
 */

import {
  extractMountedSetFixturePhrases,
  stripAutoMountedFixtureClause,
} from '@/lib/vision/mountedSetFixtures'

export interface LocationFamilyMemberLike {
  id?: string
  location?: string
  locationDisplay?: string
  description?: string
  imageUrl?: string
  intExt?: string
  timeOfDay?: string
  sourceSceneIndex?: number
  sceneNumbers?: number[]
}

export interface ParsedLocationHierarchy {
  /** Normalized full location name (uppercase, collapsed whitespace). */
  normalizedFull: string
  /** If split by " - ", ": ", or " / ", the parent complex prefix before the delimiter. */
  explicitParentPrefix?: string
  /** If split by a delimiter, the sub-zone or workstation label after the delimiter. */
  subZoneLabel?: string
  /** Significant word tokens of the base/prefix name. */
  baseTokens: string[]
  /** Significant word tokens of the full location name. */
  fullTokens: string[]
}

export interface ParentLocationAnchor<T extends LocationFamilyMemberLike = LocationFamilyMemberLike> {
  parentLocation: T
  relationship: 'subzone' | 'adjacent_area'
  /** Shared complex prefix, e.g. "FREIGHT TUNNEL VAULT" or "FREIGHT TUNNEL". */
  sharedComplexPrefix: string
  /** Specific sub-area label, e.g. "WORKSHOP" or "CLARA'S WORKSTATION" or "ARCHIVE VAULT". */
  subZoneLabel?: string
}

const GENERIC_LEADING_WORDS = new Set([
  'THE',
  'A',
  'AN',
  'INT',
  'EXT',
  'OLD',
  'NEW',
  'UPPER',
  'LOWER',
  'MAIN',
  'INNER',
  'OUTER',
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
])

const DELIMITER_REGEX = /\s+(?:[-–—/:]+)\s+/

function normalizeLocationString(raw?: string): string {
  return (raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function tokenizeLocationWords(normalized: string): string[] {
  return normalized
    .replace(/['’]S\b/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !GENERIC_LEADING_WORDS.has(w))
}

export function parseLocationHierarchy(locationName?: string): ParsedLocationHierarchy {
  const normalizedFull = normalizeLocationString(locationName)
  if (!normalizedFull) {
    return { normalizedFull: '', baseTokens: [], fullTokens: [] }
  }

  const parts = normalizedFull.split(DELIMITER_REGEX).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const explicitParentPrefix = parts[0]
    const subZoneLabel = parts.slice(1).join(' - ')
    const baseTokens = tokenizeLocationWords(explicitParentPrefix)
    const fullTokens = tokenizeLocationWords(normalizedFull)
    if (baseTokens.length >= 1) {
      return {
        normalizedFull,
        explicitParentPrefix,
        subZoneLabel,
        baseTokens,
        fullTokens,
      }
    }
  }

  const fullTokens = tokenizeLocationWords(normalizedFull)
  return {
    normalizedFull,
    baseTokens: fullTokens,
    fullTokens,
  }
}

/**
 * Compute how many leading significant tokens two locations share.
 * E.g. ["FREIGHT", "TUNNEL", "VAULT"] and ["FREIGHT", "TUNNEL", "ARCHIVE", "VAULT"]
 * share 2 leading tokens ("FREIGHT TUNNEL") plus the head architectural noun ("VAULT").
 */
function sharedLeadingPrefixLength(tokensA: string[], tokensB: string[]): number {
  const limit = Math.min(tokensA.length, tokensB.length)
  let count = 0
  while (count < limit && tokensA[count] === tokensB[count]) {
    count++
  }
  return count
}

function hasImage(url?: string): boolean {
  return Boolean(url && url.trim())
}

function locationNameOf(loc: LocationFamilyMemberLike): string {
  return (loc.location || loc.locationDisplay || '').trim()
}

/**
 * Rank candidate primary/parent locations within a shared complex family.
 * Lower score = better primary parent anchor:
 * 1. Un-delimited base locations ("FREIGHT TUNNEL VAULT") rank before sub-delimited ("... - WORKSHOP").
 * 2. Shorter token count (more general root complex, e.g. "FREIGHT TUNNEL VAULT" [3] before
 *    "FREIGHT TUNNEL ARCHIVE VAULT" [4]).
 * 3. Locations that already have a generated base image rank ahead if tied.
 * 4. Earlier scene appearance (`sourceSceneIndex` / `sceneNumbers[0]`).
 */
function rankAsPrimaryAnchor(loc: LocationFamilyMemberLike, parsed: ParsedLocationHierarchy, index: number): number {
  let score = 0
  if (parsed.subZoneLabel) {
    score += 10000
  }
  score += parsed.fullTokens.length * 100
  if (!hasImage(loc.imageUrl)) {
    score += 10
  }
  const firstScene =
    typeof loc.sourceSceneIndex === 'number'
      ? loc.sourceSceneIndex
      : Array.isArray(loc.sceneNumbers) && loc.sceneNumbers.length > 0
        ? loc.sceneNumbers[0]
        : index
  score += Math.min(firstScene, 9)
  return score
}

/**
 * Resolve the primary/parent location anchor for `target` from `allLocations`,
 * or return `null` if `target` is standalone or is itself the primary parent anchor.
 */
export function resolveParentLocationAnchor<T extends LocationFamilyMemberLike>(
  target: T,
  allLocations: T[]
): ParentLocationAnchor<T> | null {
  const targetName = locationNameOf(target)
  const targetParsed = parseLocationHierarchy(targetName)
  if (!targetParsed.normalizedFull || !Array.isArray(allLocations) || allLocations.length <= 1) {
    return null
  }

  const entries = allLocations
    .map((loc, index) => ({
      loc,
      index,
      parsed: parseLocationHierarchy(locationNameOf(loc)),
    }))
    .filter((e) => Boolean(e.parsed.normalizedFull))

  const isSameLocation = (candidate: T, candidateParsed: ParsedLocationHierarchy): boolean => {
    if (target.id && candidate.id && target.id === candidate.id) return true
    return candidateParsed.normalizedFull === targetParsed.normalizedFull
  }

  // 1. Direct parent match via explicit delimiter: e.g. "FREIGHT TUNNEL VAULT - WORKSHOP" -> "FREIGHT TUNNEL VAULT"
  if (targetParsed.explicitParentPrefix) {
    const exactParent = entries.find(
      (e) =>
        !isSameLocation(e.loc, e.parsed) &&
        e.parsed.normalizedFull === targetParsed.explicitParentPrefix
    )
    if (exactParent) {
      return {
        parentLocation: exactParent.loc,
        relationship: 'subzone',
        sharedComplexPrefix: targetParsed.explicitParentPrefix,
        subZoneLabel: targetParsed.subZoneLabel,
      }
    }
  }

  // 2. Shared multi-word complex prefix (at least 2 leading significant tokens, e.g. "FREIGHT TUNNEL").
  // Only elect a candidate `e` as a parent anchor of `target` when `e` is a root complex
  // (no explicit sub-zone label of its own) AND every significant token of `e` is retained
  // in `target` (e.g. "FREIGHT TUNNEL VAULT" -> "FREIGHT TUNNEL ARCHIVE VAULT"). Peer rooms
  // that swap out a room noun (e.g. "CITY BANK VAULT" vs "CITY BANK LOBBY", or
  // "FREIGHT TUNNEL VAULT" vs "FREIGHT TUNNEL CORRIDOR") must NOT hijack each other as parents.
  if (targetParsed.baseTokens.length < 2) return null

  const targetFullTokenSet = new Set(targetParsed.fullTokens)
  const validParents = entries.filter((e) => {
    if (isSameLocation(e.loc, e.parsed)) return false
    if (e.parsed.subZoneLabel) return false
    const sharedLead = sharedLeadingPrefixLength(targetParsed.baseTokens, e.parsed.baseTokens)
    if (sharedLead < 2) return false
    if (e.parsed.fullTokens.length === 0 || e.parsed.fullTokens.length >= targetParsed.fullTokens.length) {
      return false
    }
    return e.parsed.fullTokens.every((tok) => targetFullTokenSet.has(tok))
  })

  if (validParents.length === 0) return null

  // Sort candidate parent anchors to elect the canonical root complex
  const sortedParents = [...validParents].sort(
    (a, b) =>
      rankAsPrimaryAnchor(a.loc, a.parsed, a.index) -
      rankAsPrimaryAnchor(b.loc, b.parsed, b.index)
  )

  const primary = sortedParents[0]
  if (!primary) return null

  const sharedLeadCount = sharedLeadingPrefixLength(
    primary.parsed.baseTokens,
    targetParsed.baseTokens
  )
  const sharedComplexPrefix = primary.parsed.baseTokens.slice(0, sharedLeadCount).join(' ')

  // Compute the distinguishing sub-zone label if not already set by delimiter
  const primaryTokenSet = new Set(primary.parsed.baseTokens)
  const extraTokens = targetParsed.fullTokens.filter((t) => !primaryTokenSet.has(t))
  const subZoneLabel =
    targetParsed.subZoneLabel ||
    (extraTokens.length > 0 ? extraTokens.join(' ') : targetParsed.normalizedFull)

  return {
    parentLocation: primary.loc,
    relationship: targetParsed.explicitParentPrefix ? 'subzone' : 'adjacent_area',
    sharedComplexPrefix,
    subZoneLabel,
  }
}

/**
 * Order a list of locations so parent/primary complex anchors appear before
 * their sub-zones and adjacent areas. Preserves relative order otherwise.
 */
export function sortLocationsParentsFirst<T extends LocationFamilyMemberLike>(locations: T[]): T[] {
  if (!Array.isArray(locations) || locations.length <= 1) return locations ?? []

  const indexed = locations.map((loc, index) => ({
    loc,
    index,
    anchor: resolveParentLocationAnchor(loc, locations),
  }))

  return indexed
    .sort((a, b) => {
      const aIsParentOfB =
        b.anchor &&
        ((a.loc.id && b.anchor.parentLocation.id === a.loc.id) ||
          normalizeLocationString(locationNameOf(a.loc)) ===
            normalizeLocationString(locationNameOf(b.anchor.parentLocation)))
      if (aIsParentOfB) return -1

      const bIsParentOfA =
        a.anchor &&
        ((b.loc.id && a.anchor.parentLocation.id === b.loc.id) ||
          normalizeLocationString(locationNameOf(b.loc)) ===
            normalizeLocationString(locationNameOf(a.anchor.parentLocation)))
      if (bIsParentOfA) return 1

      // Locations that are roots (no parent anchor) before sub-locations within the same shared prefix
      if (!a.anchor && b.anchor) return -1
      if (a.anchor && !b.anchor) return 1

      return a.index - b.index
    })
    .map((entry) => entry.loc)
}

export const LOCATION_SUBZONE_REFERENCE_INSTRUCTION =
  'ARCHITECTURAL CONTINUITY WITH PARENT LOCATION: The attached reference image shows another area of this same architectural complex. ' +
  'Render this location as a distinct sub-area or adjacent zone within that same architectural world — match only the shared wall materials, floor construction, structural beams, ceiling geometry, color palette, era, and ambient lighting quality from the attached reference image while framing this sub-area’s own distinct layout and resident set pieces. ' +
  'Do not duplicate one-off focal entryways, portals, or zone-specific apparatus from the parent reference image unless explicitly described for this sub-area.'

const PARENT_FOCAL_PORTAL_OR_WHEEL_PATTERN =
  /\b(?:(?:vault|bulkhead|airlock|blast|lockdown)\s+doors?|(?:door|hatch|vault|gate|bulkhead|airlock|lockdown|valve)[- ]wheels?|hand[- ]?wheels?|wheels?\s+(?:of|on)\s+(?:the\s+|a\s+|an\s+)?(?:[a-z-]+\s+){0,3}(?:door|hatch|vault|gate|bulkhead|airlock)s?)\b/i

function stripParentFocalHardwareForSubzone(
  parentDescription: string,
  targetContext: string
): string {
  const withoutAutoFixtures = stripAutoMountedFixtureClause(parentDescription)
    .replace(/,?\s+and\s+(?:later|eventually|subsequently|afterward)\s+[^.;]+/gi, '')
    .trim()
  if (!withoutAutoFixtures) return ''

  const targetMentionsPortalOrWheel =
    PARENT_FOCAL_PORTAL_OR_WHEEL_PATTERN.test(targetContext) ||
    extractMountedSetFixturePhrases(targetContext).length > 0
  if (targetMentionsPortalOrWheel) return withoutAutoFixtures

  const sentences = withoutAutoFixtures
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      // Strip trailing list items like ", and a massive circular steel vault door with a brass wheel"
      const trimmedList = sentence.replace(
        /,?\s+(?:and|with)\s+(?:a\s+|an\s+|the\s+)?[^.,;!]*(?:\b(?:vault|bulkhead|airlock|blast|lockdown)\s+doors?\b|\b(?:door|hatch|vault|gate|bulkhead|airlock|lockdown|valve)[- ]wheels?\b|\bhand[- ]?wheels?\b)[^.!?;]*/gi,
        ''
      )
      return trimmedList.trim()
    })
    .filter((sentence) => {
      if (!sentence) return false
      if (PARENT_FOCAL_PORTAL_OR_WHEEL_PATTERN.test(sentence)) return false
      if (extractMountedSetFixturePhrases(sentence).length > 0) return false
      return true
    })

  return sentences.join(' ').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Compose an architectural continuity prompt clause linking a sub-location
 * (e.g. "FREIGHT TUNNEL VAULT - WORKSHOP" or "FREIGHT TUNNEL ARCHIVE VAULT")
 * to its parent location ("FREIGHT TUNNEL VAULT").
 */
export function buildRelatedLocationContinuityClause(input: {
  locationName: string
  locationDescription?: string
  parentLocationName: string
  parentLocationDescription?: string
  subZoneLabel?: string
  hasParentReferenceImage?: boolean
}): string {
  const parentName = input.parentLocationName.trim()
  const targetName = input.locationName.trim()
  if (!parentName || !targetName || normalizeLocationString(parentName) === normalizeLocationString(targetName)) {
    return ''
  }

  const targetContext = [input.subZoneLabel || '', input.locationDescription || '']
    .filter(Boolean)
    .join(' ')
  const cleanParentDesc = stripParentFocalHardwareForSubzone(
    input.parentLocationDescription || '',
    targetContext
  )

  const zonePhrase = input.subZoneLabel
    ? `("${input.subZoneLabel}" sub-area of ${parentName})`
    : `(adjacent area within the same complex as ${parentName})`

  const parts: string[] = [
    `Related location continuity: ${targetName} is a connected area of ${parentName} ${zonePhrase}`,
    `Maintain strict architectural consistency with ${parentName} — matching wall materials, floor surfaces, structural lines, ceiling geometry, color palette, and lighting atmosphere`,
  ]

  if (cleanParentDesc) {
    parts.push(`Parent complex architecture (${parentName}): ${cleanParentDesc.replace(/[.]+$/, '')}`)
  }

  if (input.hasParentReferenceImage) {
    parts.push(LOCATION_SUBZONE_REFERENCE_INSTRUCTION.replace(/[.]+$/, ''))
  }

  return parts.join('. ') + '.'
}
