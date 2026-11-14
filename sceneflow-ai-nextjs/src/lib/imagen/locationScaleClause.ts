/**
 * Lock architectural scale when a location establishing still is consumed
 * in a beat frame. Wide plates fill the frame; without a size lock the model
 * treats that occupancy as the room's real-world size and doors drift
 * (7ft in one still, 5ft in the next).
 *
 * The measure itself is a send-time margin overlay on a *copy* of the plate.
 * This clause tells the model to use those ticks and not paint them into the
 * output. Do not put this essay on the 18-word interleaved pair caption.
 */

export interface LocationCanonicalScale {
  figureHeightFt: number
  doorHeightFt: number
  ceilingHeightFt: number
  fixtureHeights?: string
}

export const DEFAULT_LOCATION_CANONICAL_SCALE: LocationCanonicalScale = {
  figureHeightFt: 6,
  doorHeightFt: 7,
  ceilingHeightFt: 10,
}

const DOOR_PATTERN =
  /(?:(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot)\s*(?:[- ]*tall\s*)?(?:[a-z-]+\s+){0,2}doors?)|(?:(?:[a-z-]+\s+){0,2}doors?\s*(?:are|is|at|of)?\s*(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot))/i
const CEILING_PATTERN =
  /(?:(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot)\s*(?:[- ]*(?:high|tall|arched|vaulted)\s*)?(?:[a-z-]+\s+){0,2}(?:ceilings?|vaults?|tunnels?|arch(?:es|way)?))|(?:(?:ceilings?|vaults?)\s*(?:are|is|at|of|height)?\s*(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot))/i

const FIXTURE_HEIGHT_PATTERN =
  /\b([a-z][a-z0-9\s-]{1,35}?\s+(?:mounted|hung|bolted|installed|set|positioned)\s+(?:at\s+)?(?:a\s+height\s+of\s+)?\d+(?:\.\d+)?\s*[- ]?(?:ft|feet|foot|in|inches?)(?:\s+(?:high|tall|height|off the floor|above the floor))?)/gi

const DOOR_NOUN_PATTERN = /\b(?:doors?|doorways?|entryways?|portals?|gates?|bulkheads?)\b/i

const OUTDOOR_SETTING_PATTERN =
  /\b(?:coastline|shoreline|seawall|beach|ocean|forest|woods|mountain|cliffside|rooftop|highway|sidewalk|courtyard|park|plaza|meadow|desert|riverbank|skyline|street|alleyway)\b/i

const INDOOR_SETTING_PATTERN =
  /\b(?:room|office|kitchen|bedroom|hallway|corridor|ceiling|indoor|interior|tunnel|vault|chamber|laboratory|lab|lobby|basement|cellar|cabin|warehouse|hangar|apartment|parlor)\b/i

function firstFinite(match: RegExpMatchArray | null): number | null {
  if (!match) return null
  for (let i = 1; i < match.length; i += 1) {
    const value = Number(match[i])
    if (Number.isFinite(value) && value > 0 && value < 40) return value
  }
  return null
}

export function isExteriorLocation(
  description?: string | null,
  name?: string | null,
  intExt?: string | null
): boolean {
  const ie = (intExt || '').trim()
  if (ie) {
    if (/^EXT\.?$/i.test(ie)) return true
    if (/INT/i.test(ie)) return false
  }
  const locName = (name || '').trim()
  if (/^EXT\.?(?!\s*\/\s*INT)/i.test(locName)) return true
  if (/^INT\.?/i.test(locName)) return false
  const combined = [description, name].filter(Boolean).join(' ')
  if (!combined.trim()) return false
  return OUTDOOR_SETTING_PATTERN.test(combined) && !INDOOR_SETTING_PATTERN.test(combined)
}

export function mentionsDoorInLocation(
  description?: string | null,
  name?: string | null
): boolean {
  const text = [description, name].filter(Boolean).join(' ')
  return DOOR_NOUN_PATTERN.test(text)
}

export function extractMountedFixtureHeights(
  description?: string | null,
  explicitFixtureHeights?: string | null
): string | undefined {
  const explicit = explicitFixtureHeights?.trim()
  if (explicit) return explicit
  const text = (description || '').trim()
  if (!text) return undefined
  const matches = Array.from(text.matchAll(FIXTURE_HEIGHT_PATTERN))
    .map((m) => m[1]?.replace(/\s+/g, ' ').trim())
    .filter((m): m is string => Boolean(m))
  if (matches.length === 0) return undefined
  return [...new Set(matches)].slice(0, 3).join(', ')
}

/**
 * Extract ONLY explicitly specified architectural measurements without inventing
 * 7ft doors or 10ft ceilings when the location prose / user scale omitted them.
 * Also ignores legacy auto-stamped `{ ceilingHeightFt: 10, doorHeightFt: 7 }`
 * defaults when neither doors nor measurements appear in the location text.
 */
export function extractExplicitLocationCanonicalScale(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null,
  intExt?: string | null
): Partial<LocationCanonicalScale> {
  const text = [description, name].filter(Boolean).join(' ').trim()
  const textDoor = firstFinite(text.match(DOOR_PATTERN))
  const textCeiling = firstFinite(text.match(CEILING_PATTERN))
  const fixtureHeights = extractMountedFixtureHeights(text, canonicalScale?.fixtureHeights)
  const exterior = isExteriorLocation(description, name, intExt)

  const rawDoor =
    Number.isFinite(canonicalScale?.doorHeightFt) && (canonicalScale!.doorHeightFt as number) > 0
      ? Number(canonicalScale!.doorHeightFt)
      : undefined
  const rawCeiling =
    Number.isFinite(canonicalScale?.ceilingHeightFt) &&
    (canonicalScale!.ceilingHeightFt as number) > 0
      ? Number(canonicalScale!.ceilingHeightFt)
      : undefined
  const rawFigure =
    Number.isFinite(canonicalScale?.figureHeightFt) &&
    (canonicalScale!.figureHeightFt as number) > 0
      ? Number(canonicalScale!.figureHeightFt)
      : undefined

  const isLegacyAutoStampedPair =
    rawCeiling === DEFAULT_LOCATION_CANONICAL_SCALE.ceilingHeightFt &&
    rawDoor === DEFAULT_LOCATION_CANONICAL_SCALE.doorHeightFt &&
    !canonicalScale?.fixtureHeights?.trim() &&
    Boolean(text) &&
    textCeiling == null &&
    textDoor == null

  let doorHeightFt: number | undefined
  if (rawDoor != null && !isLegacyAutoStampedPair) {
    if (
      rawDoor !== DEFAULT_LOCATION_CANONICAL_SCALE.doorHeightFt ||
      textDoor != null ||
      mentionsDoorInLocation(description, name) ||
      !text
    ) {
      doorHeightFt = rawDoor
    }
  } else if (textDoor != null) {
    doorHeightFt = textDoor
  }

  let ceilingHeightFt: number | undefined
  if (rawCeiling != null && !isLegacyAutoStampedPair) {
    if (
      !(
        exterior &&
        rawCeiling === DEFAULT_LOCATION_CANONICAL_SCALE.ceilingHeightFt &&
        textCeiling == null
      )
    ) {
      ceilingHeightFt = rawCeiling
    }
  } else if (textCeiling != null) {
    ceilingHeightFt = textCeiling
  }

  return {
    ...(rawFigure != null ? { figureHeightFt: rawFigure } : {}),
    ...(doorHeightFt != null ? { doorHeightFt } : {}),
    ...(ceilingHeightFt != null ? { ceilingHeightFt } : {}),
    ...(fixtureHeights ? { fixtureHeights } : {}),
  }
}

export function hasExplicitLocationScale(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null,
  intExt?: string | null
): boolean {
  const explicit = extractExplicitLocationCanonicalScale(description, name, canonicalScale, intExt)
  return Boolean(explicit.ceilingHeightFt || explicit.doorHeightFt || explicit.fixtureHeights)
}

export function extractLocationCanonicalScale(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null
): LocationCanonicalScale {
  const text = [description, name].filter(Boolean).join(' ')
  const door = firstFinite(text.match(DOOR_PATTERN))
  const ceiling = firstFinite(text.match(CEILING_PATTERN))
  const fixtureHeights = extractMountedFixtureHeights(
    text,
    canonicalScale?.fixtureHeights
  )
  return {
    figureHeightFt:
      Number.isFinite(canonicalScale?.figureHeightFt) && (canonicalScale!.figureHeightFt as number) > 0
        ? Number(canonicalScale!.figureHeightFt)
        : DEFAULT_LOCATION_CANONICAL_SCALE.figureHeightFt,
    doorHeightFt:
      Number.isFinite(canonicalScale?.doorHeightFt) && (canonicalScale!.doorHeightFt as number) > 0
        ? Number(canonicalScale!.doorHeightFt)
        : door ?? DEFAULT_LOCATION_CANONICAL_SCALE.doorHeightFt,
    ceilingHeightFt:
      Number.isFinite(canonicalScale?.ceilingHeightFt) && (canonicalScale!.ceilingHeightFt as number) > 0
        ? Number(canonicalScale!.ceilingHeightFt)
        : ceiling ?? DEFAULT_LOCATION_CANONICAL_SCALE.ceilingHeightFt,
    ...(fixtureHeights ? { fixtureHeights } : {}),
  }
}

function formatFeetNumber(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}

/**
 * Concise explicit scale phrase to attach directly alongside a location reference.
 * Only emits ceiling or door measurements when explicitly defined for this location
 * so models are never primed to hallucinate doors in doorless rooms or exteriors.
 */
export function formatLocationScaleDescriptor(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null,
  options?: { hasCharacters?: boolean; intExt?: string | null }
): string {
  const explicit = extractExplicitLocationCanonicalScale(
    description,
    name,
    canonicalScale,
    options?.intExt
  )
  const parts: string[] = []
  if (explicit.ceilingHeightFt) {
    parts.push(`${formatFeetNumber(explicit.ceilingHeightFt)}-foot ceiling`)
  }
  if (explicit.doorHeightFt) {
    parts.push(`${formatFeetNumber(explicit.doorHeightFt)}-foot door`)
  }
  if (explicit.fixtureHeights) {
    parts.push(explicit.fixtureHeights)
  }
  if (options?.hasCharacters !== false) {
    parts.push('maintain proportionate size with characters')
  }
  return parts.join(', ')
}

export function locationScaleClause(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null
): string {
  const scale = extractLocationCanonicalScale(description, name, canonicalScale)
  const figure = formatFeetNumber(scale.figureHeightFt)
  if (isExteriorLocation(description, name)) {
    return (
      `Keep true environmental scale from the location plate relative to adult characters (~${figure}-foot tall). ` +
      `Do not shrink environmental features to fill a tighter shot.`
    )
  }
  const explicit = extractExplicitLocationCanonicalScale(description, name, canonicalScale)
  const scaleParts: string[] = []
  if (explicit.doorHeightFt || mentionsDoorInLocation(description, name)) {
    const door = formatFeetNumber(explicit.doorHeightFt ?? scale.doorHeightFt)
    scaleParts.push(`door ~${door}ft`)
  }
  const ceiling = formatFeetNumber(explicit.ceilingHeightFt ?? scale.ceilingHeightFt)
  scaleParts.push(`ceiling ~${ceiling}ft`)
  if (explicit.fixtureHeights) {
    scaleParts.push(explicit.fixtureHeights)
  }
  return (
    `Keep architectural scale from the location plate (${scaleParts.join(', ')}) ` +
    `relative to adult characters (~${figure}-foot tall); never invent doors or fixtures absent from the plate. ` +
    `Ignore any right-margin scale ticks; do not draw rulers, tape measures, ` +
    `or height marks into the frame. Do not shrink architecture to fill a tighter shot.`
  )
}
