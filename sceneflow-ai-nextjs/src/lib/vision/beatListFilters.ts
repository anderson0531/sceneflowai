/**
 * View filters for the Beats tab card list.
 * Classification is derived from the same signals the cards already show.
 */

export type BeatListKind = 'action' | 'dialogue' | 'narration'

export type BeatAttentionFilter =
  | 'all'
  | 'needs_action'
  | 'ready'
  | 'prompt_changed'
  | 'no_audio'
  | 'needs_speaker'

export type BeatTypeFilter = 'all' | BeatListKind

export interface BeatListFacts {
  beatId: string
  kind: BeatListKind
  character?: string
  excluded: boolean
  hasAudio: boolean
  promptChanged: boolean
  needsSpeaker: boolean
  /** Action beat has SFX cues or a file, so a missing file is unfinished work. */
  tracksSfx: boolean
}

export interface BeatListFilterState {
  attention: BeatAttentionFilter
  type: BeatTypeFilter
  character: string
}

export const DEFAULT_BEAT_LIST_FILTERS: BeatListFilterState = {
  attention: 'all',
  type: 'all',
  character: 'all',
}

export function beatListFiltersActive(filters: BeatListFilterState): boolean {
  return filters.attention !== 'all' || filters.type !== 'all' || filters.character !== 'all'
}

/** Spoken lines and action beats that actually carry SFX. */
export function beatNeedsAction(facts: BeatListFacts): boolean {
  if (facts.excluded) return false
  if (facts.kind === 'action') {
    if (!facts.tracksSfx) return false
    return !facts.hasAudio || facts.promptChanged
  }
  return !facts.hasAudio || facts.promptChanged || facts.needsSpeaker
}

/** In-sync audio, and a linked speaker for dialogue and narration. */
export function beatIsReady(facts: BeatListFacts): boolean {
  if (facts.excluded) return false
  if (facts.kind === 'action') {
    return facts.tracksSfx && facts.hasAudio && !facts.promptChanged
  }
  return facts.hasAudio && !facts.promptChanged && !facts.needsSpeaker
}

export function beatMatchesAttention(facts: BeatListFacts, attention: BeatAttentionFilter): boolean {
  switch (attention) {
    case 'all':
      return true
    case 'needs_action':
      return beatNeedsAction(facts)
    case 'ready':
      return beatIsReady(facts)
    case 'prompt_changed':
      return facts.promptChanged
    case 'no_audio':
      return (facts.kind !== 'action' || facts.tracksSfx) && !facts.hasAudio
    case 'needs_speaker':
      return facts.needsSpeaker
    default:
      return true
  }
}

export function beatMatchesFilters(facts: BeatListFacts, filters: BeatListFilterState): boolean {
  if (!beatMatchesAttention(facts, filters.attention)) return false
  if (filters.type !== 'all' && facts.kind !== filters.type) return false
  if (filters.character !== 'all') {
    const name = (facts.character || '').trim()
    if (name !== filters.character) return false
  }
  return true
}

export function beatFilterCharacters(facts: BeatListFacts[]): string[] {
  const names = new Set<string>()
  for (const entry of facts) {
    if (entry.kind === 'action') continue
    const name = (entry.character || '').trim()
    if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
