/**
 * Mounted architectural hardware belongs on the location establishing shot,
 * not the object library. Isolated prop plates cannot lock mount or room
 * position ("across the room", bolted to a vault door).
 *
 * Match qualified names only: door / hatch / vault / gate / bulkhead / airlock
 * / lockdown / valve wheels, plus handwheels. Bare "wheel" (cart, steering)
 * stays a normal prop.
 */

import { extractLocation } from '@/lib/script/formatSceneHeading'
import { extractLocationResidentInstrumentPhrases } from '@/lib/vision/locationResidentInstruments'

const MOUNT_KIND = 'door|hatch|vault|gate|bulkhead|airlock|lockdown|valve'
const ADJ = 'heavy|frozen|jammed|iron|brass|steel|cast[- ]iron|rusted|massive|vault|hatch'

/** "heavy door wheel", "hatch wheel", "massive brass lockdown wheel" */
const QUALIFIED_WHEEL_PATTERN = new RegExp(
  String.raw`\b((?:(?:${ADJ})\s+){0,3}(?:${MOUNT_KIND})(?:[- ](?:${MOUNT_KIND}))?[- ]wheels?)\b`,
  'i'
)

/** "wheel of the vault door", "wheel on a door", "wheel on the iron hatch" */
const WHEEL_ON_APERTURE_PATTERN = new RegExp(
  String.raw`\b(wheels?\s+(?:of|on)\s+(?:(?:the|a|an|this|that)\s+)?(?:(?:${ADJ})\s+){0,3}(?:${MOUNT_KIND})s?)\b`,
  'i'
)

/** "handwheel", "brass hand-wheel" — always mounted hardware. */
const HANDWHEEL_PATTERN = new RegExp(
  String.raw`\b((?:(?:${ADJ})\s+){0,3}hand[- ]?wheels?)\b`,
  'i'
)

/**
 * Built-in architectural hatches and chutes ("overhead eighteen-inch pneumatic mail dispatch hatch",
 * "eighteen-inch pneumatic mail sorting chute", "cast-iron bulkhead hatch").
 */
const HATCH_CHUTE_ADJ =
  'overhead|ceiling|wall[- ]mounted|eighteen[- ]inch|twelve[- ]inch|heavy|cast[- ]iron|iron|brass|steel|pneumatic|mail|dispatch|sorting|pressure|steam|airlock|bulkhead|vault'
const QUALIFIED_HATCH_CHUTE_PATTERN = new RegExp(
  String.raw`\b((?:(?:${HATCH_CHUTE_ADJ})\s+){1,6}(?:hatch(?:es)?|chutes?))\b`,
  'i'
)

/**
 * Large wall-mounted / resident room boards ("massive slate board", "slate board", "massive chalkboard").
 */
const BOARD_ADJ = 'massive|large|huge|wall[- ]mounted|heavy|framed'
const RESIDENT_BOARD_PATTERN = new RegExp(
  String.raw`\b((?:(?:${BOARD_ADJ})\s+){0,3}(?:slate\s+boards?|chalkboards?|blackboards?))\b`,
  'i'
)

const FIXTURE_PATTERNS = [QUALIFIED_WHEEL_PATTERN, WHEEL_ON_APERTURE_PATTERN, HANDWHEEL_PATTERN]
const RESIDENT_SET_PIECE_PATTERNS = [
  ...FIXTURE_PATTERNS,
  QUALIFIED_HATCH_CHUTE_PATTERN,
  RESIDENT_BOARD_PATTERN,
]

export const MOUNTED_FIXTURE_DESCRIPTION_PREFIX =
  'Built-in set architecture (mounted in place)'

export interface LocationFixtureScene {
  heading?: string | { text?: string }
  action?: string
  visualDescription?: string
  locationDescription?: string
  beats?: unknown[]
  sceneDirection?: {
    scene?: {
      location?: string
      atmosphere?: string
      keyProps?: string[]
    }
  }
}

export interface LocationFixtureTarget {
  location?: string
  sceneNumbers?: number[]
  description?: string
  versions?: Array<{ stateNotes?: string }>
}

function headingText(scene: LocationFixtureScene): string {
  const heading = scene.heading
  if (typeof heading === 'string') return heading
  return heading?.text || ''
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeFixtureKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, 'gi')
}

/** Distinct fixture phrases mentioned in free text, richest spelling first. */
export function extractMountedSetFixturePhrases(text: string): string[] {
  const trimmed = (text || '').trim()
  if (!trimmed) return []

  const byKey = new Map<string, string>()
  for (const pattern of FIXTURE_PATTERNS) {
    for (const match of trimmed.matchAll(clonePattern(pattern))) {
      const phrase = (match[1] || match[0] || '').replace(/\s+/g, ' ').trim()
      const key = normalizeFixtureKey(phrase)
      if (!key) continue
      const existing = byKey.get(key)
      if (!existing || phrase.length > existing.length) byKey.set(key, phrase)
    }
  }
  return [...byKey.values()]
}

/**
 * Distinct resident set pieces (mounted wheels, architectural hatches/chutes,
 * wall boards, and wall-mounted instruments) mentioned in scene or version text.
 */
export function extractResidentSetPiecesFromText(text: string): string[] {
  const trimmed = (text || '').trim()
  if (!trimmed) return []

  const byKey = new Map<string, string>()
  for (const pattern of RESIDENT_SET_PIECE_PATTERNS) {
    for (const match of trimmed.matchAll(clonePattern(pattern))) {
      const phrase = (match[1] || match[0] || '').replace(/\s+/g, ' ').trim()
      const key = normalizeFixtureKey(phrase)
      if (!key) continue
      const existing = byKey.get(key)
      if (!existing || phrase.length > existing.length) byKey.set(key, phrase)
    }
  }

  for (const instrument of extractLocationResidentInstrumentPhrases(trimmed)) {
    const phrase = instrument.replace(/\s+/g, ' ').trim()
    const key = normalizeFixtureKey(phrase)
    if (!key) continue
    const existing = byKey.get(key)
    if (!existing || phrase.length > existing.length) byKey.set(key, phrase)
  }

  const phrases = [...byKey.values()]
  return phrases.filter((phrase) => {
    const key = normalizeFixtureKey(phrase)
    return !phrases.some((other) => {
      if (other === phrase) return false
      const otherKey = normalizeFixtureKey(other)
      return otherKey.length > key.length && otherKey.includes(key)
    })
  })
}

/** True when a library / keyProp name is mounted architectural hardware. */
export function isMountedSetFixtureName(name: string | null | undefined): boolean {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return false
  const key = normalizeFixtureKey(trimmed)
  if (key === 'wheel' || key === 'wheels') return false
  return extractMountedSetFixturePhrases(trimmed).length > 0
}

/** Catalog names that must not be stripped from location version state notes. */
export function isMountedSetFixtureCatalogName(name: string | null | undefined): boolean {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return false
  if (isMountedSetFixtureName(trimmed)) return true
  if (extractResidentSetPiecesFromText(trimmed).length > 0) return true
  const key = normalizeFixtureKey(trimmed)
  return key === 'wheel' || key === 'wheels'
}

export function rejectMountedSetFixtures<T extends { name?: string }>(items: T[]): T[] {
  return items.filter((item) => !isMountedSetFixtureName(item.name || ''))
}

/**
 * Strip temporal aftermath spoilers (e.g., "and later thick coal silt") from
 * a base location description so the base wide shot stays strictly intact.
 */
export function stripTemporalAftermathFromBaseDescription(description: string | undefined): string {
  const base = (description || '').trim()
  if (!base) return ''
  return base
    .replace(/,?\s+\band\s+(?:later|eventually|subsequently|afterward)\s+[^.;]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sceneBeatRecords(scene: LocationFixtureScene): Record<string, unknown>[] {
  return Array.isArray(scene.beats)
    ? scene.beats.map(asRecord).filter((beat): beat is Record<string, unknown> => !!beat)
    : []
}

function sceneHarvestText(scene: LocationFixtureScene): string {
  const parts: string[] = [
    scene.action || '',
    scene.visualDescription || '',
    scene.locationDescription || '',
    scene.sceneDirection?.scene?.location || '',
    ...(scene.sceneDirection?.scene?.keyProps ?? []),
  ]
  for (const beat of sceneBeatRecords(scene)) {
    const direction = asRecord(beat.beatDirection)
    const keyProps = Array.isArray(direction?.keyProps) ? direction.keyProps : []
    parts.push(
      asString(beat.actionDescription),
      asString(beat.line),
      asString(beat.description),
      asString(direction?.frozenMoment),
      asString(direction?.propInteraction),
      asString(direction?.blocking),
      ...keyProps.map((entry) => asString(entry))
    )
  }
  return parts.filter(Boolean).join(' ')
}

function deduplicateFixturePhrases(phrases: string[]): string[] {
  const byKey = new Map<string, string>()
  for (const raw of phrases) {
    const phrase = (raw || '').replace(/\s+/g, ' ').trim()
    const key = normalizeFixtureKey(phrase)
    if (!key) continue
    const existing = byKey.get(key)
    if (!existing || phrase.length > existing.length) byKey.set(key, phrase)
  }
  const all = [...byKey.values()]
  return all.filter((phrase) => {
    const key = normalizeFixtureKey(phrase)
    return !all.some((other) => {
      if (other === phrase) return false
      const otherKey = normalizeFixtureKey(other)
      return otherKey.length > key.length && otherKey.includes(key)
    })
  })
}

export function harvestMountedSetFixturesFromScenes(scenes: LocationFixtureScene[]): string[] {
  const collected: string[] = []
  for (const scene of scenes ?? []) {
    collected.push(...extractResidentSetPiecesFromText(sceneHarvestText(scene)))
  }
  return deduplicateFixturePhrases(collected)
}

export function filterScenesForLocation<T extends LocationFixtureScene>(
  location: LocationFixtureTarget,
  scenes: T[]
): T[] {
  const locationName = location.location?.trim()
  const sceneNumbers = new Set(location.sceneNumbers || [])
  return (scenes ?? []).filter((scene, index) => {
    const sceneNumber = index + 1
    if (sceneNumbers.has(sceneNumber)) return true
    if (!locationName) return false
    const extracted = extractLocation(headingText(scene))
    return Boolean(extracted && extracted === locationName)
  })
}

export function withMountedFixturesInLocationDescription(
  description: string | undefined,
  fixtures: string[]
): string {
  const base = stripTemporalAftermathFromBaseDescription(description)
  const unique = deduplicateFixturePhrases(fixtures)
  if (unique.length === 0) return base

  const lower = base.toLowerCase()
  const missing = unique.filter((phrase) => !lower.includes(phrase.toLowerCase()))
  if (missing.length === 0) return base

  const clause = `${MOUNTED_FIXTURE_DESCRIPTION_PREFIX}: ${missing.join(', ')}.`
  if (!base) return clause
  return `${base.replace(/[.]+$/, '')}. ${clause}`
}

export function mountedFixturesForLocation(
  location: LocationFixtureTarget,
  scenes: LocationFixtureScene[]
): string[] {
  const scoped = filterScenesForLocation(location, scenes)
  const harvestFrom = scoped.length > 0 ? scoped : scenes
  const fromScenes = harvestMountedSetFixturesFromScenes(harvestFrom)
  const versionText = (location.versions ?? [])
    .map((v) => v?.stateNotes || '')
    .filter(Boolean)
    .join(' ')
  const fromVersions = versionText ? extractResidentSetPiecesFromText(versionText) : []
  return deduplicateFixturePhrases([...fromScenes, ...fromVersions])
}

export function locationDescriptionWithMountedFixtures(
  location: LocationFixtureTarget,
  scenes: LocationFixtureScene[]
): string {
  return withMountedFixturesInLocationDescription(
    location.description,
    mountedFixturesForLocation(location, scenes)
  )
}
