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
  if (quality === 'final') {
    return facts.imageTier === 'final' || (facts.status === 'complete' && !facts.imageTier)
  }
  if (quality === 'draft') return facts.imageTier === 'draft'
  return true
}

export type VideoRailStatus = 'action' | 'attention' | 'ready' | 'idle'

/**
 * Thumbnail light for one clip.
 * Red when there is no playable clip or the render failed.
 * Yellow for a draft source frame or a stale prompt.
 * Green for a finished clip whose prompt is in sync (still frames are optional
 * for Standard Reference-to-Video clips and only required for Creative / Kling AI).
 * A clip that is still rendering has no light.
 */
export function videoRailStatus(facts: VideoClipFacts): { status: VideoRailStatus; label: string } {
  if (facts.status === 'rendering') return { status: 'idle', label: '' }
  if (facts.status === 'error') return { status: 'action', label: 'Error' }
  if (facts.status !== 'complete') return { status: 'action', label: 'No clip' }
  if (facts.promptChanged) return { status: 'attention', label: 'Prompt changed' }
  if (facts.imageTier === 'draft') return { status: 'attention', label: 'Draft' }
  return { status: 'ready', label: 'Final' }
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

/** Action-needed tooltip for a shot row in the Video Clips tab. */
export function videoRailTooltip(
  facts: VideoClipFacts,
  errorText?: string | null
): string | undefined {
  if (facts.status === 'rendering') return undefined
  if (facts.status === 'error') {
    return errorText?.trim()
      ? clipFailureTooltip(errorText)
      : 'Action needed: Video render failed — select this shot and click Generate Clip to retry.'
  }
  if (facts.status !== 'complete') {
    return 'Action needed: No video clip rendered yet — run Video Agent or click Generate Clip to render this shot. Still frames are optional and only required for Creative (Kling AI) clips.'
  }
  if (facts.promptChanged) {
    return 'Action needed: Shot prompt or direction changed after this clip was rendered — run Video Agent (highlighted in yellow) or click Regenerate Clip to update it.'
  }
  if (facts.imageTier === 'draft') {
    return 'Rendered from a Draft still frame — upgrade the still to Final and re-render when ready.'
  }
  return 'Video clip is rendered and in sync with the shot prompt.'
}
