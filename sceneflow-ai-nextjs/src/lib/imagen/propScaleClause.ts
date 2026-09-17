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

export function extractPropScalePhrase(
  description?: string | null,
  name?: string | null
): string | null {
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

/** Legend / image-label clause. Always emitted for props so fill-the-frame stills do not dominate. */
export function propScaleClause(
  description?: string | null,
  name?: string | null
): string {
  const phrase = extractPropScalePhrase(description, name)
  if (phrase && phrase !== 'handheld') {
    return `match appearance from the still; keep the described ${phrase} size relative to the character; do not enlarge to fill the frame`
  }
  return PROP_SCALE_GENERIC
}
