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

const FIXTURE_PATTERNS = [QUALIFIED_WHEEL_PATTERN, WHEEL_ON_APERTURE_PATTERN, HANDWHEEL_PATTERN]

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
      keyProps?: string[]
    }
  }
}

export interface LocationFixtureTarget {
  location?: string
  sceneNumbers?: number[]
  description?: string
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
  const key = normalizeFixtureKey(trimmed)
  return key === 'wheel' || key === 'wheels'
}

export function rejectMountedSetFixtures<T extends { name?: string }>(items: T[]): T[] {
  return items.filter((item) => !isMountedSetFixtureName(item.name || ''))
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

export function harvestMountedSetFixturesFromScenes(scenes: LocationFixtureScene[]): string[] {
  const byKey = new Map<string, string>()
  for (const scene of scenes ?? []) {
    for (const phrase of extractMountedSetFixturePhrases(sceneHarvestText(scene))) {
      const key = normalizeFixtureKey(phrase)
      const existing = byKey.get(key)
      if (!existing || phrase.length > existing.length) byKey.set(key, phrase)
    }
  }
  return [...byKey.values()]
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
  const base = (description || '').trim()
  const unique: string[] = []
  const seen = new Set<string>()
  for (const fixture of fixtures) {
    const phrase = fixture.trim()
    const key = normalizeFixtureKey(phrase)
    if (!phrase || !key || seen.has(key)) continue
    seen.add(key)
    unique.push(phrase)
  }
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
  return harvestMountedSetFixturesFromScenes(harvestFrom)
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
