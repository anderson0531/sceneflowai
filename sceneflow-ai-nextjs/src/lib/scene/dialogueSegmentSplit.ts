/**
 * Dialogue timing + text splitting for Veo 3.1 segment boundaries.
 * Dialogue lip-sync clips are capped at ~10s effective; absolute Veo max is 12s.
 */
import { stripDirectionBracketsForTiming } from '@/lib/tts/textOptimizer'
import { snapToVeoDuration, allocateVeoSplitDurations } from '@/lib/scene/veoDuration'

/** Effective max for on-screen dialogue in a single Veo clip (user-facing ~10s). */
export const VEO_DIALOGUE_CLIP_MAX_SEC = 10

/** Hard Veo 3.1 clip ceiling (action-only / narration backdrop). */
export const VEO_ABSOLUTE_CLIP_MAX_SEC = 12

export const SPOKEN_WORDS_PER_SECOND = 2.5

export function estimateSpokenDurationSeconds(text: string): number {
  const spoken = stripDirectionBracketsForTiming(text || '')
  const words = spoken.split(/\s+/).filter(Boolean).length
  if (words === 0) return 0
  return Math.max(1, Math.round((words / SPOKEN_WORDS_PER_SECOND) * 10) / 10)
}

function packUnitsIntoChunks(
  units: string[],
  maxSeconds: number
): string[] {
  const chunks: string[] = []
  let current: string[] = []
  let currentDur = 0

  for (const unit of units) {
    const unitDur = estimateSpokenDurationSeconds(unit)
    if (currentDur + unitDur > maxSeconds && current.length > 0) {
      chunks.push(current.join(' ').trim())
      current = []
      currentDur = 0
    }
    current.push(unit)
    currentDur += unitDur
  }
  if (current.length > 0) {
    chunks.push(current.join(' ').trim())
  }
  return chunks.filter((c) => c.length > 0)
}

/**
 * Split spoken text into parts that each fit within maxSeconds at ~2.5 words/sec.
 */
export function splitSpokenTextAtBoundaries(text: string, maxSeconds: number): string[] {
  const cleaned = stripDirectionBracketsForTiming(text || '').trim()
  if (!cleaned) return ['']

  const totalSec = estimateSpokenDurationSeconds(cleaned)
  if (totalSec <= maxSeconds) return [cleaned]

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length > 1) {
    const bySentence = packUnitsIntoChunks(sentences, maxSeconds)
    if (bySentence.every((p) => estimateSpokenDurationSeconds(p) <= maxSeconds * 1.15)) {
      return bySentence
    }
  }

  const clauses = cleaned
    .split(/(?<=[,;—–])\s*|\s+(?=and\s)/i)
    .map((c) => c.trim())
    .filter(Boolean)

  if (clauses.length > 1) {
    const byClause = packUnitsIntoChunks(clauses, maxSeconds)
    if (byClause.every((p) => estimateSpokenDurationSeconds(p) <= maxSeconds * 1.15)) {
      return byClause
    }
  }

  const words = cleaned.split(/\s+/).filter(Boolean)
  const targetParts = Math.max(2, Math.ceil(totalSec / maxSeconds))
  const wordsPerPart = Math.ceil(words.length / targetParts)
  const parts: string[] = []
  for (let i = 0; i < targetParts; i++) {
    const slice = words.slice(i * wordsPerPart, (i + 1) * wordsPerPart).join(' ')
    if (slice.trim()) parts.push(slice.trim())
  }
  return parts.length > 0 ? parts : [cleaned]
}

export function maxVeoDurationForSegment(hasDialogue: boolean): number {
  return hasDialogue ? VEO_DIALOGUE_CLIP_MAX_SEC : VEO_ABSOLUTE_CLIP_MAX_SEC
}

export interface DialogueSplitPart {
  excerpt: string
  estimatedSeconds: number
  veoDuration: number
  partIndex: number
  partCount: number
}

/**
 * Plan dialogue text splits + Veo-quantized durations for one spoken line.
 */
export function planDialogueLineSplits(
  fullText: string,
  maxSeconds: number = VEO_DIALOGUE_CLIP_MAX_SEC
): DialogueSplitPart[] {
  const excerpts = splitSpokenTextAtBoundaries(fullText, maxSeconds)
  const spokenDurations = excerpts.map((ex) => estimateSpokenDurationSeconds(ex))
  const totalSpoken = spokenDurations.reduce((a, b) => a + b, 0)
  const veoDurations =
    excerpts.length === 1
      ? [snapToVeoDuration(Math.max(spokenDurations[0], 4))]
      : allocateVeoSplitDurations(totalSpoken, maxSeconds)

  return excerpts.map((excerpt, i) => ({
    excerpt,
    estimatedSeconds: spokenDurations[i] ?? maxSeconds,
    veoDuration: veoDurations[i] ?? snapToVeoDuration(maxSeconds),
    partIndex: i,
    partCount: excerpts.length,
  }))
}

export function segmentHasDialogueAssignment(seg: {
  assigned_dialogue_indices?: number[]
}): boolean {
  return Array.isArray(seg.assigned_dialogue_indices) && seg.assigned_dialogue_indices.length > 0
}

export function segmentHasActionContent(seg: {
  action?: string | null
  actionPrompt?: string | null
  trigger_reason?: string
  video_prompt_elements?: { action?: string } | null
  segmentDirection?: { talentAction?: string } | null
}): boolean {
  const action =
    seg.action?.trim() ||
    seg.actionPrompt?.trim() ||
    seg.video_prompt_elements?.action?.trim() ||
    seg.segmentDirection?.talentAction?.trim() ||
    ''
  return action.length > 0
}

export function outputSegmentHasContent(seg: {
  dialogueLineIds?: string[]
  dialogueLines?: unknown[]
  action?: string | null
  actionPrompt?: string | null
  triggerReason?: string
  segmentDirection?: { talentAction?: string } | null
}): boolean {
  const hasDialogue =
    (Array.isArray(seg.dialogueLineIds) && seg.dialogueLineIds.length > 0) ||
    (Array.isArray(seg.dialogueLines) && seg.dialogueLines.length > 0)
  if (hasDialogue) return true
  return segmentHasActionContent({
    action: seg.action,
    actionPrompt: seg.actionPrompt,
    segmentDirection: seg.segmentDirection,
  })
}

const MIN_PHASE1_ACTION_CHARS = 12

/** Visible action / keyframe text on a Phase 1 LLM direction row (not trigger_reason alone). */
export function phase1RawDirectionHasContent(dir: {
  assigned_dialogue_indices?: unknown
  dialogue_indices?: unknown
  veoTimelineContinuation?: boolean
  talent_action?: string
  keyframe_start_description?: string
  keyframe_end_description?: string
  start_frame_description?: string
  end_frame_description?: string
}): boolean {
  const idxs = dir.assigned_dialogue_indices ?? dir.dialogue_indices
  if (Array.isArray(idxs) && idxs.length > 0) return true
  if (dir.veoTimelineContinuation === true) return true
  const fields = [
    dir.talent_action,
    dir.keyframe_start_description,
    dir.keyframe_end_description,
    dir.start_frame_description,
    dir.end_frame_description,
  ]
  return fields.some((f) => typeof f === 'string' && f.trim().length >= MIN_PHASE1_ACTION_CHARS)
}

export function prunePhase1RawDirections<T extends { sequence?: number }>(directions: T[]): T[] {
  const filtered = directions.filter((d) => phase1RawDirectionHasContent(d as Parameters<typeof phase1RawDirectionHasContent>[0]))
  return filtered.map((d, i) => ({ ...d, sequence: i + 1 }))
}

export type FtvMotionDirectionFields = {
  segmentDirectionSummary?: string
  talentAction?: string
  keyframeStartDescription?: string
  keyframeEndDescription?: string
  startFrameDescription?: string
  endFrameDescription?: string
}

/** Segment-specific motion prompt for F2V — never scene-wide director notes. */
export function composeFtvMotionFromDirection(dir: FtvMotionDirectionFields): string {
  const summary = dir.segmentDirectionSummary?.trim() || dir.talentAction?.trim() || ''
  if (summary) return summary

  const start = (
    dir.keyframeStartDescription ||
    dir.startFrameDescription ||
    ''
  ).trim()
  const end = (
    dir.keyframeEndDescription ||
    dir.endFrameDescription ||
    ''
  ).trim()

  if (start && end) {
    const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…` : s)
    return (
      `Animate from the start keyframe to the end keyframe. Opening: ${clip(start, 140)} ` +
      `Closing: ${clip(end, 140)}`
    )
  }
  return start || end
}
