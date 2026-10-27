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

function firstFinite(match: RegExpMatchArray | null): number | null {
  if (!match) return null
  for (let i = 1; i < match.length; i += 1) {
    const value = Number(match[i])
    if (Number.isFinite(value) && value > 0 && value < 40) return value
  }
  return null
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
 * Concise explicit scale phrase to attach directly alongside a location reference
 * (e.g., "11-foot ceiling, 7-foot door, chalkboard mounted at a height of 6-foot").
 */
export function formatLocationScaleDescriptor(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null
): string {
  const scale = extractLocationCanonicalScale(description, name, canonicalScale)
  const parts: string[] = [
    `${formatFeetNumber(scale.ceilingHeightFt)}-foot ceiling`,
    `${formatFeetNumber(scale.doorHeightFt)}-foot door`,
  ]
  if (scale.fixtureHeights) {
    parts.push(scale.fixtureHeights)
  }
  parts.push('maintain proportionate size with characters')
  return parts.join(', ')
}

export function locationScaleClause(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null
): string {
  const scale = extractLocationCanonicalScale(description, name, canonicalScale)
  const door = formatFeetNumber(scale.doorHeightFt)
  const ceiling = formatFeetNumber(scale.ceilingHeightFt)
  const figure = formatFeetNumber(scale.figureHeightFt)
  const fixturePart = scale.fixtureHeights ? `, ${scale.fixtureHeights}` : ''
  return (
    `Keep architectural scale from the location plate: interior door ~${door}ft and ceiling ~${ceiling}ft${fixturePart} ` +
    `relative to adult characters (~${figure}-foot tall). Ignore the right-margin scale ticks; do not draw rulers, tape measures, ` +
    `or height marks into the frame. Do not shrink architecture to fill a tighter shot.`
  )
}
