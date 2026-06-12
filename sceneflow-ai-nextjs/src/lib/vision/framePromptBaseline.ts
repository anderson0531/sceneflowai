export type FramePromptType = 'start' | 'end' | 'both'

export interface FramePromptSegmentLike {
  segmentId?: string
  userEditedPrompt?: string | null
  generatedPrompt?: string | null
  action?: string | null
  actionPrompt?: string | null
  subject?: string | null
  segmentDirection?: { talentAction?: string } | null
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

export function stripDialoguePrompt(text: string): string {
  if (!text) return text
  return text
    // Replace " speaks, '...'" with a period to leave just the character name (e.g. "Sarah.")
    .replace(/\s+(?:speaks|says)[,:]?\s*(?:"[^"]+"|'[^']+')[.!?]?/gi, '.')
    // Clean up empty sentences or stray punctuation that might be left behind
    .replace(/\s*\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Baseline source used by quick generation API requests.
 * Keep this precedence stable so UI and API agree.
 */
export function resolveQuickFrameActionPrompt(segment: FramePromptSegmentLike | null): string {
  if (!segment) return ''
  const rawPrompt = (
    normalize(segment.userEditedPrompt) ||
    normalize(segment.generatedPrompt) ||
    normalize(segment.action) ||
    normalize(segment.actionPrompt) ||
    normalize(segment.segmentDirection?.talentAction) ||
    normalize(segment.subject) ||
    ''
  )
  return stripDialoguePrompt(rawPrompt)
}


/**
 * Baseline text shown in advanced mode before user edits.
 * Prefer the deterministic intelligent prompt; otherwise use quick prompt source.
 */
export function resolveAdvancedFramePromptBaseline(args: ResolveAdvancedBaselineArgs): string {
  const intelligent = normalize(args.intelligentPrompt)
  if (intelligent) return stripDialoguePrompt(intelligent)
  return resolveQuickFrameActionPrompt(args.segment)
}

export function shouldInitializeFramePromptState(args: FramePromptInitArgs): boolean {
  if (!args.isOpen) return false
  if (!args.wasOpen) return true
  return args.currentContextKey !== args.lastInitializedContextKey
}

const GENERIC_DIALOGUE_END_DELTA =
  /character completes speaking gesture|subtle expression and body motion/i

/**
 * True when endFramePrompt is a visual progression hint (not generic dialogue gesture).
 */
export function isVisualEndFrameDelta(endFramePrompt?: string | null): boolean {
  const text = normalize(endFramePrompt)
  if (!text) return false
  if (GENERIC_DIALOGUE_END_DELTA.test(text)) return false
  return true
}

export interface PreVisEndFrameEditArgs {
  startFramePrompt?: string | null
  endFramePrompt?: string | null
  customPrompt?: string | null
  fallbackActionPrompt?: string | null
  durationSeconds?: number
}

/**
 * Minimal directed-edit instruction for Pre-Vis anchored end frames.
 * Anchors on the start-frame visual description — no scene-direction bloat.
 */
export function buildPreVisEndFrameEditInstruction(
  args: PreVisEndFrameEditArgs
): string {
  const startVisual =
    normalize(args.customPrompt) ||
    normalize(args.startFramePrompt) ||
    stripDialoguePrompt(normalize(args.fallbackActionPrompt))

  if (!startVisual) {
    const dur =
      typeof args.durationSeconds === 'number' && args.durationSeconds > 0
        ? args.durationSeconds
        : undefined
    return dur != null
      ? `Edit start frame: Show subtle visual progression after ~${dur}s while preserving composition, lighting, and environment.`
      : 'Edit start frame: Show subtle visual progression while preserving composition, lighting, and environment.'
  }

  let instruction = `Edit start frame: ${startVisual}`

  const endDelta = normalize(args.endFramePrompt)
  if (endDelta && isVisualEndFrameDelta(endDelta) && endDelta !== startVisual) {
    instruction += `\n\n${endDelta}`
  }

  return instruction
}
