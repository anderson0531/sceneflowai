/**
 * Stable fingerprints of a beat's structured direction.
 *
 * Still prompts and pre-vis frames only consume shot / blocking / frozen-moment
 * facets. Video compile reads movement, emotion, audio, and transition live.
 * Those two sets must not share a key or a dolly/emotion edit would look like
 * a stale still prompt.
 *
 * Kept in its own module because the prompt composer is client-safe and must not
 * pull in the migration graph.
 */

import type { BeatDirection } from '@/lib/script/segmentTypes'

const STILL_FINGERPRINTED_KEYS: Array<keyof BeatDirection> = [
  'shotType',
  'cameraAngle',
  'blocking',
  'gaze',
  'propInteraction',
  'lightingAccent',
  'frozenMoment',
]

const VIDEO_ONLY_FINGERPRINTED_KEYS: Array<keyof BeatDirection> = [
  'cameraMovement',
  'emotion',
  'audioCue',
  'transition',
]

const FINGERPRINTED_KEYS: Array<keyof BeatDirection> = [
  ...STILL_FINGERPRINTED_KEYS,
  ...VIDEO_ONLY_FINGERPRINTED_KEYS,
]

/**
 * List facets, fingerprinted separately because order is not meaningful.
 *
 * `castInFrame: []` is a statement — nobody is on camera — so clearing the list
 * has to move the fingerprint the way populating it does. A list that is absent
 * contributes nothing.
 */
const LIST_KEYS = ['castInFrame', 'keyProps'] as const

const STILL_KEY_NAMES = new Set<string>([...STILL_FINGERPRINTED_KEYS, ...LIST_KEYS])

function fingerprintDirection(
  direction: BeatDirection | null | undefined,
  keys: Array<keyof BeatDirection>,
  includeLists: boolean
): string {
  if (!direction) return ''
  const parts: string[] = []
  for (const key of keys) {
    const value = direction[key]
    if (typeof value === 'string' && value.trim()) {
      parts.push(`${key}=${value.trim()}`)
    }
  }
  if (includeLists) {
    for (const key of LIST_KEYS) {
      const value = direction[key]
      if (!Array.isArray(value)) continue
      const items = value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .sort()
      parts.push(`${key}=${items.join(',')}`)
    }
  }
  return parts.join('|')
}

/** Full direction fingerprint (still + video/audio facets). */
export function beatDirectionFingerprint(direction?: BeatDirection | null): string {
  return fingerprintDirection(direction, FINGERPRINTED_KEYS, true)
}

/** Facets that actually enter the still / pre-vis frame prompt. */
export function beatStillDirectionFingerprint(direction?: BeatDirection | null): string {
  return fingerprintDirection(direction, STILL_FINGERPRINTED_KEYS, true)
}

/**
 * Lift the still-relevant portion out of a stored key. Keys written before the
 * still/video split were the full fingerprint; comparing the still slice keeps
 * those records from looking stale after a movement-only edit.
 */
export function stillDirectionKeyFromStored(storedKey: string): string {
  if (!storedKey) return ''
  return storedKey
    .split('|')
    .filter((part) => STILL_KEY_NAMES.has(part.split('=')[0] ?? ''))
    .join('|')
}

/** Whether a stored still-prompt (or image) key still describes this direction. */
export function storedStillDirectionKeyMatches(
  storedKey: string | undefined,
  direction?: BeatDirection | null
): boolean {
  const current = beatStillDirectionFingerprint(direction)
  if (storedKey === undefined) return current === ''
  if (storedKey === current) return true
  return stillDirectionKeyFromStored(storedKey) === current
}
