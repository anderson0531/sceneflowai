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
  'Edit the start frame image to generate the concluding end frame (t=T) of the shot based on the camera motion, action, and temporal changes through the clip. ' +
  'Allow the background perspective, spatial scale, parallax, framing crop, and subject pose or position to evolve naturally to reflect the completed movement from t=0s to t=T so the start and end frames create a clear motion delta for Frame-to-Video (F2V) generation. ' +
  'Maintain world and character identity continuity within the same location and lighting atmosphere without hallucinating unrelated objects.'

function sanitizeFramePromptSentence(value?: string | null): string {
  return normalize(value)
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Strip directed-edit preambles ("Edit the reference shot still...", "Edit the start frame image...",
 * "Starting action direction (t=0s):", "Concluding end frame direction (t=T):", "Edit start frame:",
 * "Movement delta:") so stored or nested frame instructions never duplicate boilerplate when
 * re-wrapped or passed from Start -> End frame.
 */
export function stripFrameEditPreamble(value?: string | null): string {
  let text = normalize(value)
  if (!text) return ''

  // Strip full preambles if present
  if (text.startsWith(START_FRAME_CONTINUITY_PREAMBLE)) {
    text = text.slice(START_FRAME_CONTINUITY_PREAMBLE.length).trim()
  }
  if (text.startsWith(END_FRAME_CONTINUITY_PREAMBLE)) {
    text = text.slice(END_FRAME_CONTINUITY_PREAMBLE.length).trim()
  }
  text = text
    .replace(
      /^Edit the reference shot still to illustrate the starting action of the shot[\s\S]*?consistent lighting and location\.\s*/i,
      ''
    )
    .replace(
      /^Edit the start frame image to (?:reflect movement that aligns with the beat action|generate the concluding end frame)[\s\S]*?(?:consistent lighting and location|hallucinating unrelated objects)\.\s*/i,
      ''
    )
    .trim()

  // If both "Shot context: ..." and "Starting action direction (t=0s): ..." are present, keep the starting action direction
  const startDirIdx = text.search(/Starting action direction \(t=0s\):\s*/i)
  if (startDirIdx >= 0) {
    text = text
      .slice(startDirIdx)
      .replace(/^Starting action direction \(t=0s\):\s*/i, '')
      .trim()
  }

  // If "Concluding end frame direction (t=T): ..." or legacy "Movement delta: ..." is present, keep the concluding direction
  const concludingDirIdx = text.search(/Concluding end frame direction \(t=T\):\s*/i)
  if (concludingDirIdx >= 0) {
    text = text
      .slice(concludingDirIdx)
      .replace(/^Concluding end frame direction \(t=T\):\s*/i, '')
      .trim()
  } else {
    const movementIdx = text.search(/Movement delta:\s*/i)
    if (movementIdx >= 0) {
      text = text
        .slice(movementIdx)
        .replace(/^Movement delta:\s*/i, '')
        .trim()
    }
  }

  text = text
    .replace(/^Stage the initial opening pose and camera framing \(t=0s\) for:\s*/i, '')
    .replace(/^Edit start frame:\s*/i, '')
    .trim()

  return sanitizeFramePromptSentence(text)
}

/**
 * Directed-edit instruction for anchoring a shot's Start Frame (t=0s) to the Pre-Vis Shot Still.
 * Stages the opening pose/camera position before the beat's action unfolds while preserving
 * consistent lighting, location, and character identity.
 */
export function buildPreVisStartFrameEditInstruction(
  args: PreVisStartFrameEditArgs
): string {
  const custom = stripFrameEditPreamble(args.customPrompt)
  if (custom) {
    return `${START_FRAME_CONTINUITY_PREAMBLE}\n\nStarting action direction (t=0s): ${custom}`
  }

  const startDelta = stripFrameEditPreamble(args.startFramePrompt)
  const stillVisual = sanitizeFramePromptSentence(
    normalize(args.shotStillPrompt) ||
      stripDialoguePrompt(normalize(args.fallbackActionPrompt))
  )

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
 * Directed-edit instruction for Pre-Vis anchored end frames (t=T).
 * Focuses directly on the camera movement, spatial/perspective shift, and terminal action
 * state from the Clip prompt so the End Frame provides a clear F2V motion delta rather than
 * re-describing the static t=0s start frame.
 */
export function buildPreVisEndFrameEditInstruction(
  args: PreVisEndFrameEditArgs
): string {
  const custom = stripFrameEditPreamble(args.customPrompt)
  if (custom) {
    return `${END_FRAME_CONTINUITY_PREAMBLE}\n\nConcluding end frame direction (t=T): ${custom}`
  }

  const endDelta = stripFrameEditPreamble(args.endFramePrompt)
  const strippedStart = stripFrameEditPreamble(args.startFramePrompt)
  const fallback = sanitizeFramePromptSentence(
    stripDialoguePrompt(normalize(args.fallbackActionPrompt))
  )
  const startVisual = strippedStart || fallback

  if (endDelta && isVisualEndFrameDelta(endDelta)) {
    return `${END_FRAME_CONTINUITY_PREAMBLE}\n\nConcluding end frame direction (t=T): ${endDelta}`
  }

  if (startVisual) {
    return `${END_FRAME_CONTINUITY_PREAMBLE}\n\nConcluding end frame direction (t=T): Advance the camera perspective, spatial framing, and subject or environmental motion from the opening state (${startVisual}) to the completed end-of-clip state.`
  }

  const dur =
    typeof args.durationSeconds === 'number' && args.durationSeconds > 0
      ? args.durationSeconds
      : undefined
  const fallbackText =
    dur != null
      ? `Advance camera perspective, framing, and scene motion over ~${dur}s to the completed end-of-clip state while maintaining world and lighting continuity.`
      : 'Advance camera perspective, framing, and scene motion to the completed end-of-clip state while maintaining world and lighting continuity.'
  return `${END_FRAME_CONTINUITY_PREAMBLE}\n\nConcluding end frame direction (t=T): ${fallbackText}`
}
