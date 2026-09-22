/**
 * View filters for the Video beat gallery.
 * Final | Draft follows the beat's Pre-Vis frame tier. Clips do not store
 * their own generation tier.
 */

export type VideoClipStatus = 'complete' | 'rendering' | 'error' | 'queued'

export type VideoAttentionFilter =
  | 'all'
  | 'needs_action'
  | 'in_the_can'
  | 'prompt_changed'
  | 'error'
  | 'no_clip'

export type VideoQualityFilter = 'all' | 'final' | 'draft'

export interface VideoClipFacts {
  key: string
  status: VideoClipStatus
  promptChanged: boolean
  imageTier?: 'draft' | 'final'
}

export function videoNeedsAction(facts: VideoClipFacts): boolean {
  return facts.status !== 'complete' || facts.promptChanged
}

export function videoMatchesAttention(facts: VideoClipFacts, attention: VideoAttentionFilter): boolean {
  switch (attention) {
    case 'all':
      return true
    case 'needs_action':
      return videoNeedsAction(facts)
    case 'in_the_can':
      return facts.status === 'complete'
    case 'prompt_changed':
      return facts.promptChanged
    case 'error':
      return facts.status === 'error'
    case 'no_clip':
      return facts.status !== 'complete' && facts.status !== 'error' && facts.status !== 'rendering'
    default:
      return true
  }
}

export function videoMatchesFilters(
  facts: VideoClipFacts,
  attention: VideoAttentionFilter,
  quality: VideoQualityFilter
): boolean {
  if (!videoMatchesAttention(facts, attention)) return false
  if (quality === 'final') return facts.imageTier === 'final'
  if (quality === 'draft') return facts.imageTier === 'draft'
  return true
}
