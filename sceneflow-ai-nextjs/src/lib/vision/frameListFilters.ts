/**
 * View filters for the Pre-Vis thumbnail column.
 * Badges match SceneImageFrame: Final, Draft, Prompt changed, Missing, Placeholder.
 */

export type FrameListKind = 'action' | 'dialogue' | 'narration' | 'custom'

export type FrameAttentionFilter =
  | 'all'
  | 'needs_action'
  | 'final'
  | 'draft'
  | 'prompt_changed'
  | 'missing'
  | 'placeholder'

export type FrameTypeFilter = 'all' | 'action' | 'dialogue' | 'narration'

export type FrameReferenceStatus = 'pass' | 'drift' | 'miss'

export interface FrameListFacts {
  key: string
  kind: FrameListKind
  imageTier?: 'draft' | 'final'
  isMissing: boolean
  isPlaceholder: boolean
  promptChanged: boolean
  hasImageError: boolean
  hasOwnImage: boolean
  /** Absent on older stills and Express drafts. Pass keeps the ordinary light. */
  referenceStatus?: FrameReferenceStatus
}

export function frameNeedsAction(facts: FrameListFacts): boolean {
  if (facts.referenceStatus === 'miss' || facts.referenceStatus === 'drift') return true
  if (facts.promptChanged || facts.isMissing || facts.isPlaceholder || facts.hasImageError) {
    return true
  }
  if (!facts.hasOwnImage) return true
  return facts.imageTier !== 'final'
}

export function frameMatchesAttention(facts: FrameListFacts, attention: FrameAttentionFilter): boolean {
  switch (attention) {
    case 'all':
      return true
    case 'needs_action':
      return frameNeedsAction(facts)
    case 'final':
      return (
        facts.imageTier === 'final' &&
        facts.hasOwnImage &&
        !facts.promptChanged &&
        facts.referenceStatus !== 'miss' &&
        facts.referenceStatus !== 'drift'
      )
    case 'draft':
      return facts.imageTier === 'draft' && facts.hasOwnImage && !facts.promptChanged
    case 'prompt_changed':
      return facts.promptChanged
    case 'missing':
      return facts.isMissing
    case 'placeholder':
      return facts.isPlaceholder
    default:
      return true
  }
}

export function frameMatchesFilters(
  facts: FrameListFacts,
  attention: FrameAttentionFilter,
  type: FrameTypeFilter
): boolean {
  if (!frameMatchesAttention(facts, attention)) return false
  if (type !== 'all' && facts.kind !== type) return false
  return true
}

export type FrameRailStatus = 'action' | 'attention' | 'ready'

/**
 * Thumbnail light for one still.
 * Red when the shot is missing, errored, or its reference plates were missed.
 * Yellow for a draft, a stale prompt, or a drifted reference.
 * Green only for a clean final whose plates passed or were never scored.
 */
export function frameRailStatus(facts: FrameListFacts): { status: FrameRailStatus; label: string } {
  if (facts.isPlaceholder) return { status: 'action', label: 'Placeholder' }
  if (facts.isMissing || !facts.hasOwnImage) return { status: 'action', label: 'Missing' }
  if (facts.hasImageError) return { status: 'action', label: 'Error' }
  if (facts.referenceStatus === 'miss') return { status: 'action', label: 'Reference missed' }
  if (facts.promptChanged) return { status: 'attention', label: 'Prompt changed' }
  if (facts.referenceStatus === 'drift') return { status: 'attention', label: 'Reference drifted' }
  if (facts.imageTier === 'final') return { status: 'ready', label: 'Final' }
  return { status: 'attention', label: 'Draft' }
}

/** Toast copy when a generated still did not use its plates. Pass and unchecked stay silent. */
export function frameReferenceNotice(
  status?: string | null,
  reason?: string | null
): { level: 'warning' | 'error'; message: string } | null {
  const why = reason?.trim()
  if (status === 'miss') {
    return { level: 'error', message: why ? `Reference missed — ${why}` : 'Reference missed' }
  }
  if (status === 'drift') {
    return { level: 'warning', message: why ? `Reference drifted — ${why}` : 'Reference drifted' }
  }
  return null
}
