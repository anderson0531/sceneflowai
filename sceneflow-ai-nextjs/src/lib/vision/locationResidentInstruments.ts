/**
 * Wall- and chute-mounted instruments live on the location plate.
 *
 * A vault door is architecture: the wide still is large enough to lock it.
 * A brass pressure gauge or galvanometer is a few inches of that same still.
 * Close-ups have to be told that the instrument in the frame is that mounted
 * unit, or the model invents a new one from the prop plate or from nothing.
 * Handheld props (a framed photograph, a journal) are neither.
 */

const INSTRUMENT_ADJ =
  'vintage|antique|brass|bronze|copper|steel|iron|glass|pneumatic|steam|vacuum|compression|pressure|wall|mounted|instrument|gauge|meter'

const INSTRUMENT_NOUN = 'gauges?|galvanometers?|manometers?|barometers?'

/** "brass pressure gauge", "vintage brass galvanometer", "steam manometer". */
const INSTRUMENT_PATTERN = new RegExp(
  String.raw`\b((?:(?:${INSTRUMENT_ADJ})[-\s]+){0,4}(?:pressure[-\s]+|steam[-\s]+|vacuum[-\s]+)?(?:${INSTRUMENT_NOUN}))\b`,
  'i'
)

/** "brass dial", "instrument dial" — a bare "dial the lock" is a verb. */
const QUALIFIED_DIAL_PATTERN = new RegExp(
  String.raw`\b((?:(?:${INSTRUMENT_ADJ})[-\s]+){1,3}dials?)\b`,
  'i'
)

const INSTRUMENT_PATTERNS = [INSTRUMENT_PATTERN, QUALIFIED_DIAL_PATTERN]

function normalizeInstrumentKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, 'gi')
}

/** Distinct instrument phrases in free text, richest spelling first. */
export function extractLocationResidentInstrumentPhrases(text: string): string[] {
  const trimmed = (text || '').trim()
  if (!trimmed) return []

  const byKey = new Map<string, string>()
  for (const pattern of INSTRUMENT_PATTERNS) {
    for (const match of trimmed.matchAll(clonePattern(pattern))) {
      const phrase = (match[1] || match[0] || '').replace(/\s+/g, ' ').trim()
      const key = normalizeInstrumentKey(phrase)
      if (!key) continue
      const existing = byKey.get(key)
      if (!existing || phrase.length > existing.length) byKey.set(key, phrase)
    }
  }

  const phrases = [...byKey.values()]
  return phrases.filter((phrase) => {
    const key = normalizeInstrumentKey(phrase)
    return !phrases.some((other) => {
      if (other === phrase) return false
      const otherKey = normalizeInstrumentKey(other)
      return otherKey.length > key.length && otherKey.includes(key)
    })
  })
}

/** True when a library name is itself a wall-mounted instrument. */
export function isLocationResidentInstrumentName(name: string | null | undefined): boolean {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return false
  return extractLocationResidentInstrumentPhrases(trimmed).length > 0
}

export function textNamesLocationResidentInstrument(text: string | null | undefined): boolean {
  return extractLocationResidentInstrumentPhrases(text ?? '').length > 0
}

/** Longest phrase, so "brass pressure gauge" wins over a shorter overlap. */
export function primaryLocationResidentInstrument(text: string | null | undefined): string | undefined {
  const phrases = extractLocationResidentInstrumentPhrases(text ?? '')
  if (phrases.length === 0) return undefined
  return phrases.reduce((best, phrase) => (phrase.length > best.length ? phrase : best))
}

function normalizeForContainment(value: string): string {
  return normalizeInstrumentKey(value)
}

/** The attached prop plate is this same instrument, not a different handheld. */
export function propPlateIdentifiesInstrument(
  propName: string | null | undefined,
  phrases: string[]
): boolean {
  const propKey = normalizeForContainment(propName ?? '')
  if (!propKey || !isLocationResidentInstrumentName(propName)) return false
  return phrases.some((phrase) => {
    const phraseKey = normalizeForContainment(phrase)
    if (!phraseKey) return false
    return propKey.includes(phraseKey) || phraseKey.includes(propKey)
  })
}

function instrumentWithArticle(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (/^the\s+/i.test(trimmed)) return trimmed
  return `the ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`
}

/**
 * Close-up instruction: copy the mounted unit off the location plate.
 * A matching prop plate may identify the instrument; it does not own condition.
 */
export function formatLocationResidentInstrumentDirective(options: {
  instrument: string
  locationToken?: string | null
  propPlateIdentifies?: boolean
}): string {
  const instrument = instrumentWithArticle(options.instrument)
  const token = options.locationToken?.trim()
  const mountedOn = token ? `mounted on ${token}` : 'mounted on the location plate'
  let line =
    `The ${instrument.replace(/^the\s+/i, '')} in this frame is the unit ${mountedOn}. ` +
    `Copy that unit from the location plate — body, glass, fittings, mount, and any crack or damage visible there. ` +
    `Match near-field materials and the mounting surface. ` +
    `Do not invent a different instrument or pull back to a wide establishing shot of the whole room.`
  if (options.propPlateIdentifies) {
    line +=
      ` The prop plate identifies the instrument. Mounting and current condition, including damage that exists only on the location version, come from the location plate.`
  }
  return line
}
