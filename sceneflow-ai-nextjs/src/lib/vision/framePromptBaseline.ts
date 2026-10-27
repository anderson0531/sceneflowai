import { stripAllCues } from '@/lib/scene/performanceCues'

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
  let result = stripAllCues(text)
  result = result
    // Replace " speaks, '...'" with a period to leave just the character name (e.g. "Sarah.")
    .replace(/\s+(?:speaks|says)[,:]?\s*(?:"[^"]+"|'[^']+')[.!?]?/gi, '.')
    // Clean up empty sentences or stray punctuation that might be left behind
    .replace(/\s*\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return result
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

export interface PreVisStartFrameEditArgs {
  shotStillPrompt?: string | null
  startFramePrompt?: string | null
  customPrompt?: string | null
  fallbackActionPrompt?: string | null
}

export interface PreVisEndFrameEditArgs {
  startFramePrompt?: string | null
  endFramePrompt?: string | null
  customPrompt?: string | null
  fallbackActionPrompt?: string | null
  durationSeconds?: number
}

const START_FRAME_CONTINUITY_PREAMBLE =
  'Edit the reference shot still to illustrate the starting action of the shot (t=0s, the exact moment before the shot movement unfolds). ' +
  'Position the subject and camera at their initial opening pose and staging. ' +
  'DO NOT hallucinate new objects, DO NOT change the background or location architecture, and DO NOT alter character core appearance, wardrobe, or lighting. ' +
  'Maintain absolute physics and visual continuity with consistent lighting and location.'

const END_FRAME_CONTINUITY_PREAMBLE =
  'Edit the start frame image to reflect movement that aligns with the beat action and illustrates the ending action of the shot. ' +
  'DO NOT hallucinate new objects, DO NOT change the background, and DO NOT alter character core appearance. ' +
  'Maintain absolute physics and visual continuity with consistent lighting and location.'

/**
 * Directed-edit instruction for anchoring a shot's Start Frame (t=0s) to the Pre-Vis Shot Still.
 * Stages the opening pose/camera position before the beat's action unfolds while preserving
 * consistent lighting, location, and character identity.
 */
export function buildPreVisStartFrameEditInstruction(
  args: PreVisStartFrameEditArgs
): string {
  const custom = normalize(args.customPrompt)
  if (custom) {
    return `${START_FRAME_CONTINUITY_PREAMBLE}\n\nStarting action direction (t=0s): ${custom}`
  }

  const startDelta = normalize(args.startFramePrompt)
  const stillVisual =
    normalize(args.shotStillPrompt) ||
    stripDialoguePrompt(normalize(args.fallbackActionPrompt))

  if (startDelta && stillVisual && startDelta !== stillVisual) {
    return `${START_FRAME_CONTINUITY_PREAMBLE}\n\nShot context: ${stillVisual}\n\nStarting action direction (t=0s): ${startDelta}`
  }

  if (startDelta) {
    return `${START_FRAME_CONTINUITY_PREAMBLE}\n\nStarting action direction (t=0s): ${startDelta}`
  }

  if (stillVisual) {
    return `${START_FRAME_CONTINUITY_PREAMBLE}\n\nStage the initial opening pose and camera framing (t=0s) for: ${stillVisual}`
  }

  return `${START_FRAME_CONTINUITY_PREAMBLE}\n\nStage the initial opening pose and camera framing at the start of the shot (t=0s) while preserving consistent lighting and location.`
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
    const fallback =
      dur != null
        ? `Show subtle visual progression after ~${dur}s while preserving composition, lighting, and environment.`
        : 'Show subtle visual progression while preserving composition, lighting, and environment.'
    return `${END_FRAME_CONTINUITY_PREAMBLE}\n\nEdit start frame: ${fallback}`
  }

  let instruction = `${END_FRAME_CONTINUITY_PREAMBLE}\n\nEdit start frame: ${startVisual}`

  const endDelta = normalize(args.endFramePrompt)
  if (endDelta && isVisualEndFrameDelta(endDelta) && endDelta !== startVisual) {
    instruction += `\n\nMovement delta: ${endDelta}`
  }

  return instruction
}
