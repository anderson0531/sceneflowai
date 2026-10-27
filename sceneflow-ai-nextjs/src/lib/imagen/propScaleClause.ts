/**
 * Lock handheld / hero-prop scale when a studio product still is consumed
 * in a beat frame. Product refs fill the frame; without a size clause the
 * model treats that occupancy as the object's real-world size.
 */

const SIZE_PATTERN =
  /(\d+(?:\.\d+)?)\s*[- ]?(inches?|in\.?|cm|mm|ft|feet|foot)\b/i
const QUOTED_INCH_PATTERN = /(\d+(?:\.\d+)?)\s*(?:["”]|-inch\b)/i
const HANDHELD_PATTERN = /\bhandheld\b/i

export const PROP_SCALE_GENERIC =
  'match appearance from the still; keep handheld / real-world scale relative to the character; do not enlarge to fill the frame'

export const PROP_SCALE_FURNITURE =
  'match appearance from the still; keep furniture / set-piece scale relative to the character; do not enlarge to fill the frame'

const FURNITURE_PATTERN =
  /\b(workbench|work-bench|work bench|table|desk|bench|counter|countertop|shelf|shelves|cabinet|dresser|bed|sofa|couch|chair|stool|crate|trunk|chest)\b/i

export function isFurnitureProp(
  description?: string | null,
  name?: string | null,
  dimensions?: string | null
): boolean {
  const text = [dimensions, description, name].filter(Boolean).join(' ')
  return FURNITURE_PATTERN.test(text)
}

export function extractPropScalePhrase(
  description?: string | null,
  name?: string | null,
  dimensions?: string | null
): string | null {
  const explicit = dimensions?.trim()
  if (explicit) {
    if (HANDHELD_PATTERN.test(explicit) && isFurnitureProp(description, name)) {
      return null
    }
    return explicit
  }
  const text = [description, name].filter(Boolean).join(' ')
  if (!text.trim()) return null
  const sized = text.match(SIZE_PATTERN) || text.match(QUOTED_INCH_PATTERN)
  if (sized) {
    const amount = sized[1]
    const unitRaw = (sized[2] || 'inch').toLowerCase()
    const unit =
      unitRaw.startsWith('in') || unitRaw === '"' || unitRaw === '”' || unitRaw.includes('inch')
        ? Number(amount) === 1
          ? 'inch'
          : 'inch'
        : unitRaw.replace(/\.$/, '')
    const normalizedUnit = unit.startsWith('in') ? 'inch' : unit
    return `${amount}-${normalizedUnit}`
  }
  if (HANDHELD_PATTERN.test(text)) return 'handheld'
  return null
}

/**
 * Concise explicit scale descriptor for prop captions & reference bindings
 * (e.g., "12-inch size relative to character", "handheld real-world scale").
 */
export function formatPropScaleDescriptor(
  description?: string | null,
  name?: string | null,
  dimensions?: string | null
): string {
  const explicit = dimensions?.trim()
  if (explicit) {
    if (isFurnitureProp(description, name, dimensions)) {
      return `${explicit} set-piece scale, maintain proportionate size relative to room and characters`
    }
    return `${explicit} real-world scale, maintain proportionate size relative to characters and hands`
  }
  const phrase = extractPropScalePhrase(description, name)
  if (isFurnitureProp(description, name)) {
    return phrase && phrase !== 'handheld'
      ? `${phrase} set-piece scale, maintain proportionate size relative to room and characters`
      : 'set-piece scale, maintain proportionate size relative to room and characters'
  }
  if (phrase && phrase !== 'handheld') {
    return `${phrase} size, maintain proportionate size relative to characters and hands`
  }
  return 'handheld real-world scale, maintain proportionate size relative to characters and hands'
}

/** Legend / image-label clause. Always emitted for props so fill-the-frame stills do not dominate. */
export function propScaleClause(
  description?: string | null,
  name?: string | null,
  dimensions?: string | null
): string {
  const phrase = extractPropScalePhrase(description, name, dimensions)
  if (isFurnitureProp(description, name, dimensions)) {
    if (dimensions?.trim()) {
      return `match appearance from the still; keep the described ${dimensions.trim()} furniture / set-piece scale relative to the character; do not enlarge to fill the frame`
    }
    return PROP_SCALE_FURNITURE
  }
  if (phrase && phrase !== 'handheld') {
    return `match appearance from the still; keep the described ${phrase} size relative to the character; do not enlarge to fill the frame`
  }
  return PROP_SCALE_GENERIC
}
