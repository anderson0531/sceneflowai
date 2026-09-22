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

export interface FrameListFacts {
  key: string
  kind: FrameListKind
  imageTier?: 'draft' | 'final'
  isMissing: boolean
  isPlaceholder: boolean
  promptChanged: boolean
  hasImageError: boolean
  hasOwnImage: boolean
}

export function frameNeedsAction(facts: FrameListFacts): boolean {
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
      return facts.imageTier === 'final' && facts.hasOwnImage && !facts.promptChanged
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
