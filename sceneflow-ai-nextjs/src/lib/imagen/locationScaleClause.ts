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
}

export const DEFAULT_LOCATION_CANONICAL_SCALE: LocationCanonicalScale = {
  figureHeightFt: 6,
  doorHeightFt: 7,
  ceilingHeightFt: 10,
}

const DOOR_PATTERN =
  /(?:(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot)\s*(?:[- ]*tall\s*)?(?:interior\s+)?doors?)|(?:(?:interior\s+)?doors?\s*(?:are|is|at|of)?\s*(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot))/i
const CEILING_PATTERN =
  /(?:(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot)\s*(?:[- ]*(?:high|tall)\s*)?ceilings?)|(?:ceilings?\s*(?:are|is|at|of|height)?\s*(\d+(?:\.\d+)?)\s*[- ]?(?:ft|feet|foot))/i

function firstFinite(match: RegExpMatchArray | null): number | null {
  if (!match) return null
  for (let i = 1; i < match.length; i += 1) {
    const value = Number(match[i])
    if (Number.isFinite(value) && value > 0 && value < 40) return value
  }
  return null
}

export function extractLocationCanonicalScale(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null
): LocationCanonicalScale {
  const text = [description, name].filter(Boolean).join(' ')
  const door = firstFinite(text.match(DOOR_PATTERN))
  const ceiling = firstFinite(text.match(CEILING_PATTERN))
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
  }
}

export function locationScaleClause(
  description?: string | null,
  name?: string | null,
  canonicalScale?: Partial<LocationCanonicalScale> | null
): string {
  const scale = extractLocationCanonicalScale(description, name, canonicalScale)
  const door = Number.isInteger(scale.doorHeightFt)
    ? `${scale.doorHeightFt}`
    : scale.doorHeightFt.toFixed(1)
  const ceiling = Number.isInteger(scale.ceilingHeightFt)
    ? `${scale.ceilingHeightFt}`
    : scale.ceilingHeightFt.toFixed(1)
  return (
    `Keep architectural scale from the location plate: interior door ~${door}ft and ceiling ~${ceiling}ft ` +
    `relative to adult characters. Ignore the right-margin scale ticks; do not draw rulers, tape measures, ` +
    `or height marks into the frame. Do not shrink architecture to fill a tighter shot.`
  )
}
