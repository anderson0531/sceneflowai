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

export type VideoRailStatus = 'action' | 'attention' | 'ready' | 'idle'

/**
 * Thumbnail light for one clip.
 * Red when there is no playable clip, the render failed, or a finished clip
 * has neither a draft nor a final still. Yellow for a draft still or a stale
 * prompt. Green only for a finished clip on a clean final still. A clip that
 * is still rendering has no light.
 */
export function videoRailStatus(facts: VideoClipFacts): { status: VideoRailStatus; label: string } {
  if (facts.status === 'rendering') return { status: 'idle', label: '' }
  if (facts.status === 'error') return { status: 'action', label: 'Error' }
  if (facts.status !== 'complete') return { status: 'action', label: 'No clip' }
  if (facts.promptChanged) return { status: 'attention', label: 'Prompt changed' }
  if (facts.imageTier === 'draft') return { status: 'attention', label: 'Draft' }
  if (facts.imageTier === 'final') return { status: 'ready', label: 'Final' }
  return { status: 'action', label: 'Missing' }
}

export function isContentPolicyFailureMessage(message: string): boolean {
  return /content policy|content safety filter|usage guidelines|safety filters/i.test(message)
}

/** Hover copy for a failed clip thumbnail. Policy failures name the next step. */
export function clipFailureTooltip(message: string): string {
  const trimmed = message.trim()
  const sentence = (trimmed.match(/^.*?[.!?](?:\s|$)/)?.[0] ?? trimmed).trim()
  if (!isContentPolicyFailureMessage(trimmed)) return sentence
  return `Content policy blocked. ${sentence} Select this shot to rewrite it.`
}
