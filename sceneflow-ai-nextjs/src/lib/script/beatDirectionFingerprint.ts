/**
 * Stable fingerprint of a beat's structured direction.
 *
 * Two consumers need the same answer and must not drift: `beatContentFingerprint`
 * uses it to decide whether a script edit invalidates a stored frame, and the
 * still-prompt composer uses it to decide whether a stored image prompt still
 * describes the current direction.
 *
 * Kept in its own module because the prompt composer is client-safe and must not
 * pull in the migration graph.
 */

import type { BeatDirection } from '@/lib/script/segmentTypes'

const FINGERPRINTED_KEYS: Array<keyof BeatDirection> = [
  'shotType',
  'cameraAngle',
  'cameraMovement',
  'blocking',
  'emotion',
  'gaze',
  'propInteraction',
  'lightingAccent',
  'frozenMoment',
  'audioCue',
  'transition',
]

export function beatDirectionFingerprint(direction?: BeatDirection | null): string {
  if (!direction) return ''
  const parts: string[] = []
  for (const key of FINGERPRINTED_KEYS) {
    const value = direction[key]
    if (typeof value === 'string' && value.trim()) {
      parts.push(`${key}=${value.trim()}`)
    }
  }
  const props = Array.isArray(direction.keyProps)
    ? direction.keyProps
        .map((prop) => (typeof prop === 'string' ? prop.trim() : ''))
        .filter(Boolean)
        .sort()
    : []
  if (props.length > 0) {
    parts.push(`keyProps=${props.join(',')}`)
  }
  return parts.join('|')
}
