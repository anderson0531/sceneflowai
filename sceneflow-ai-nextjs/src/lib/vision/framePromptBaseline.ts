export type FramePromptType = 'start' | 'end' | 'both'

export interface FramePromptSegmentLike {
  segmentId?: string
  userEditedPrompt?: string | null
  generatedPrompt?: string | null
  action?: string | null
  actionPrompt?: string | null
  subject?: string | null
}

export interface ResolveAdvancedBaselineArgs {
  segment: FramePromptSegmentLike | null
  intelligentPrompt?: string | null
}

export interface FramePromptInitArgs {
  isOpen: boolean
  wasOpen: boolean
  currentContextKey: string
  lastInitializedContextKey: string | null
}

function normalize(value?: string | null): string {
  return (value || '').trim()
}

/**
 * Baseline source used by quick generation API requests.
 * Keep this precedence stable so UI and API agree.
 */
export function resolveQuickFrameActionPrompt(segment: FramePromptSegmentLike | null): string {
  if (!segment) return ''
  return (
    normalize(segment.userEditedPrompt) ||
    normalize(segment.generatedPrompt) ||
    normalize(segment.action) ||
    normalize(segment.actionPrompt) ||
    normalize(segment.subject) ||
    ''
  )
}

/**
 * Baseline text shown in advanced mode before user edits.
 * Prefer the deterministic intelligent prompt; otherwise use quick prompt source.
 */
export function resolveAdvancedFramePromptBaseline(args: ResolveAdvancedBaselineArgs): string {
  const intelligent = normalize(args.intelligentPrompt)
  if (intelligent) return intelligent
  return resolveQuickFrameActionPrompt(args.segment)
}

export function shouldInitializeFramePromptState(args: FramePromptInitArgs): boolean {
  if (!args.isOpen) return false
  if (!args.wasOpen) return true
  return args.currentContextKey !== args.lastInitializedContextKey
}
