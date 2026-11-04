/**
 * Thumbnail light for one direction shot.
 * Same stoplight as stills and clips: red when the shot has no direction,
 * yellow when the composed still prompt no longer matches that direction,
 * green when the direction is current.
 */

import {
  beatDirectionFingerprint,
  storedStillDirectionKeyMatches,
} from '@/lib/script/beatDirectionFingerprint'
import type { BeatDirection } from '@/lib/script/segmentTypes'

export type DirectionRailStatus = 'action' | 'attention' | 'ready'

export interface DirectionRailInput {
  direction?: BeatDirection | null
  /** Persisted still prompt, when the beat has one. */
  stillPrompt?: string | null
  /** Key the still prompt was composed from. Absent keys are legacy and not stale. */
  stillPromptDirectionKey?: string
}

/** True when the record carries a directed facet or an explicit prompt override. */
export function directionHasFacets(direction?: BeatDirection | null): boolean {
  if (!direction) return false
  if (direction.framePrompt?.trim() || direction.videoPrompt?.trim()) return true
  return beatDirectionFingerprint(direction) !== ''
}

export function directionRailStatus(input: DirectionRailInput): {
  status: DirectionRailStatus
  label: string
} {
  if (!directionHasFacets(input.direction)) {
    return { status: 'action', label: 'No direction' }
  }
  const prompt = input.stillPrompt?.trim()
  const storedKey = input.stillPromptDirectionKey
  if (
    prompt &&
    storedKey !== undefined &&
    !storedStillDirectionKeyMatches(storedKey, input.direction)
  ) {
    return { status: 'attention', label: 'Prompt changed' }
  }
  return { status: 'ready', label: 'Ready' }
}

/** Action-needed tooltip for a shot row in the Direction tab. */
export function directionRailTooltip(rail: {
  status: DirectionRailStatus
  label: string
}): string {
  switch (rail.label) {
    case 'No direction':
      return 'Action needed: No shot direction yet — use Shot Director or Scene Director to direct this shot.'
    case 'Prompt changed':
      return 'Action needed: Shot direction changed after prompts were composed — use Shot Director to update this shot.'
    default:
      return 'Shot direction and prompts are in sync.'
  }
}
