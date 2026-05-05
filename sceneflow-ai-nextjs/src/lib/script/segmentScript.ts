/**
 * Helpers for the segmented Production Script.
 *
 * Includes:
 *   - Stable id minting (segmentId / lineId / sfxId)
 *   - Deterministic one-sentence-per-line splitter
 *   - Veo-quantized timing recompute over a ScriptSegment[]
 *   - Conversion utilities between flat dialogue + segments
 *
 * This module has zero dependencies on any API route or DB shape so it can be
 * used from the script generator, the migration loader, the Edit Script modal
 * and unit tests without dragging server-only modules in.
 */

import {
  VEO_VALID_DURATIONS,
  snapToVeoDuration,
} from '@/lib/scene/veoDuration'
import {
  DialogueLine,
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
  ScriptSegment,
  SegmentSFX,
  SegmentTransitionType,
} from '@/lib/script/segmentTypes'

// ---------------------------------------------------------------------------
// Id minting
// ---------------------------------------------------------------------------

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

function shortId(prefix: string, length = 8): string {
  let out = prefix
  for (let i = 0; i < length; i++) {
    out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]
  }
  return out
}

export function mintSegmentId(): string {
  return shortId('seg_')
}

export function mintLineId(): string {
  return shortId('ln_')
}

export function mintSfxId(): string {
  return shortId('sfx_')
}

// ---------------------------------------------------------------------------
// Script-line splitter
// ---------------------------------------------------------------------------

/**
 * Split dialogue/narration into script lines using STRICT bracket delimiters.
 *
 * Rules:
 * - Each bracketed direction block (`[ ... ]`) starts a new line.
 * - Line text extends from one bracket block until the next bracket block.
 * - If no bracket blocks are present, return ONE unsplit line (strict mode).
 */
export function splitIntoSentences(input: string): string[] {
  const text = (input || '').replace(/\s+/g, ' ').trim()
  if (!text) return []

  // Normalize spaced ellipsis variants; they are retained as text and are
  // not used for splitting in strict bracket mode.
  const body = text.replace(/\.\s*\.\s*\./g, '…')

  const bracketMatches = Array.from(body.matchAll(/\[[^\]]+\]/g))
  if (bracketMatches.length === 0) {
    return [body]
  }

  const lines: string[] = []
  const firstStart = bracketMatches[0].index ?? 0
  const preface = body.slice(0, firstStart).trim()

  for (let i = 0; i < bracketMatches.length; i++) {
    const start = bracketMatches[i].index ?? 0
    const end =
      i + 1 < bracketMatches.length
        ? (bracketMatches[i + 1].index ?? body.length)
        : body.length
    const line = body.slice(start, end).trim()
    if (!line) continue
    if (i === 0 && preface) {
      lines.push(`${preface} ${line}`.trim())
    } else {
      lines.push(line)
    }
  }

  return lines.length > 0 ? lines : [body]
}

// ---------------------------------------------------------------------------
// Dialogue completeness normalization
// ---------------------------------------------------------------------------

type SentenceChunk = { text: string; complete: boolean }
type PendingFragment = { tag: string; text: string; template: any; sourceIndexes: number[] }

function splitBodyIntoSentenceChunks(body: string): SentenceChunk[] {
  const normalized = String(body || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const chunks = normalized.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || []
  return chunks
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((text) => ({
      text,
      complete: /[.!?]["')\]]*$/.test(text),
    }))
}

function splitLeadingTag(line: string): { tag: string; body: string } {
  const trimmed = String(line || '').trim()
  const m = /^\s*(\[[^\]]+\])\s*(.*)$/.exec(trimmed)
  if (!m) return { tag: '', body: trimmed }
  return { tag: m[1], body: m[2].trim() }
}

function withTag(tag: string, body: string): string {
  const t = tag.trim()
  const b = body.trim()
  if (!t) return b
  return b ? `${t} ${b}` : t
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (/[.!?]["')\]]*$/.test(trimmed)) return trimmed
  return `${trimmed}.`
}

function isLikelyOrphanClauseStart(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return /^(and|but|or|so|yet|then|because|if|when|while|though|although)\b/i.test(trimmed)
}

/**
 * Enforce exactly one complete sentence per line while preserving bracket
 * direction tags. Designed for script generation output cleanup before
 * persistence and migration.
 */
export function normalizeDialogueToCompleteSentenceLines(
  dialogue: Array<{ character?: string; line?: string; [key: string]: any }>
): Array<{ character?: string; line?: string; [key: string]: any }> {
  if (!Array.isArray(dialogue) || dialogue.length === 0) return []

  const out: Array<{ character?: string; line?: string; [key: string]: any }> = []
  const pendingBySpeaker = new Map<string, PendingFragment>()

  const speakerKey = (d: any) => String(d?.character || '').trim().toUpperCase() || '__UNKNOWN__'
  const sourceIndexesOf = (d: any): number[] =>
    Array.isArray(d?.__sourceIndexes)
      ? d.__sourceIndexes.filter((x: any) => Number.isInteger(x))
      : Number.isInteger(d?.__legacyIndex)
      ? [d.__legacyIndex]
      : []

  for (const d of dialogue) {
    const key = speakerKey(d)
    const { tag, body } = splitLeadingTag(d?.line || '')
    if (!body) continue
    const chunks = splitBodyIntoSentenceChunks(body)
    if (chunks.length === 0) continue

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const treatAsFragment = !chunk.complete || isLikelyOrphanClauseStart(chunk.text)
      if (treatAsFragment) {
        const pending = pendingBySpeaker.get(key)
        const mergedSourceIndexes = Array.from(
          new Set([...(pending?.sourceIndexes || []), ...sourceIndexesOf(d)])
        )
        pendingBySpeaker.set(key, {
          tag: pending?.tag || tag,
          text: `${pending?.text ? `${pending.text} ` : ''}${chunk.text}`.trim(),
          template: pending?.template || d,
          sourceIndexes: mergedSourceIndexes,
        })
        continue
      }

      const pending = pendingBySpeaker.get(key)
      pendingBySpeaker.delete(key)
      const fullBody = `${pending?.text ? `${pending.text} ` : ''}${chunk.text}`.trim()
      const mergedSourceIndexes = Array.from(
        new Set([...(pending?.sourceIndexes || []), ...sourceIndexesOf(d)])
      )
      out.push({
        ...d,
        ...(pending?.template || {}),
        __sourceIndexes: mergedSourceIndexes,
        line: withTag(pending?.tag || tag, ensureTerminalPunctuation(fullBody)),
      })
    }
  }

  // Flush unresolved fragments as complete lines (fallback repair).
  for (const [key, pending] of pendingBySpeaker.entries()) {
    const template = pending.template || dialogue.find((d) => speakerKey(d) === key) || {}
    out.push({
      ...template,
      __sourceIndexes: pending.sourceIndexes,
      line: withTag(pending.tag, ensureTerminalPunctuation(pending.text)),
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// Dialogue line construction
// ---------------------------------------------------------------------------

export interface BuildDialogueLineOptions {
  character: string
  text: string
  characterId?: string
  voiceDirection?: string
  /** Default 'dialogue'. NARRATOR character forces 'narration'. */
  kind?: 'narration' | 'dialogue'
}

/**
 * Build a normalized DialogueLine list from a single raw entry, splitting
 * multi-sentence text into one DialogueLine per sentence.
 */
export function buildDialogueLines(opts: BuildDialogueLineOptions): DialogueLine[] {
  const sentences = splitIntoSentences(opts.text)
  if (sentences.length === 0) return []

  const isNarrator =
    opts.kind === 'narration' ||
    opts.character?.trim().toUpperCase() === NARRATOR_CHARACTER

  const character = isNarrator ? NARRATOR_CHARACTER : (opts.character || '').trim()
  const characterId = isNarrator ? NARRATOR_CHARACTER_ID : opts.characterId

  return sentences.map((sentence) => ({
    lineId: mintLineId(),
    character,
    characterId,
    line: sentence,
    kind: isNarrator ? 'narration' : 'dialogue',
    voiceDirection: opts.voiceDirection,
  }))
}

/**
 * Re-normalize an existing DialogueLine using strict bracket-delimited
 * splitting. Preserves the original `lineId` on the FIRST resulting line so
 * existing audio/translations keep matching, and mints fresh ids for tails.
 */
export function normalizeDialogueLine(line: DialogueLine): DialogueLine[] {
  const normalized = normalizeDialogueToCompleteSentenceLines([
    { character: line.character, line: line.line },
  ])
  if (normalized.length <= 1) {
    return [
      {
        ...line,
        line: normalized[0]?.line || line.line || '',
      },
    ]
  }

  return normalized.map((entry, i) => ({
    ...line,
    lineId: i === 0 ? line.lineId : mintLineId(),
    line: entry.line || line.line,
  }))
}

/**
 * Apply script-line normalization across every dialogue line in every segment
 * of a scene, in place-friendly fashion (returns a new array).
 */
export function enforceOneSentencePerLine(segments: ScriptSegment[]): ScriptSegment[] {
  return segments.map((seg) => ({
    ...seg,
    dialogue: seg.dialogue.flatMap((d) => normalizeDialogueLine(d)),
  }))
}

// ---------------------------------------------------------------------------
// Veo timing
// ---------------------------------------------------------------------------

/**
 * Snap each segment's duration to a valid Veo bucket (4/6/8/10/12) and
 * recompute cumulative startTime/endTime so they're contiguous across the
 * scene.
 */
export function quantizeAndResequence(segments: ScriptSegment[]): ScriptSegment[] {
  let cursor = 0
  return segments.map((seg, idx) => {
    const requested = Math.max(
      0,
      typeof seg.endTime === 'number' && typeof seg.startTime === 'number'
        ? seg.endTime - seg.startTime
        : 10
    )
    const snapped = snapToVeoDuration(requested || 10)
    const startTime = cursor
    const endTime = startTime + snapped
    cursor = endTime
    return {
      ...seg,
      sequenceIndex: idx,
      startTime,
      endTime,
    }
  })
}

/**
 * Sum of all segment durations on a scene.
 */
export function totalSceneDuration(segments: ScriptSegment[]): number {
  if (!segments?.length) return 0
  return segments.reduce(
    (acc, seg) => acc + Math.max(0, (seg.endTime || 0) - (seg.startTime || 0)),
    0
  )
}

// ---------------------------------------------------------------------------
// SFX helpers
// ---------------------------------------------------------------------------

export function buildSegmentSfx(
  description: string,
  options: { time?: number; sourceLineId?: string } = {}
): SegmentSFX {
  return {
    sfxId: mintSfxId(),
    description: (description || '').trim(),
    time: options.time,
    sourceLineId: options.sourceLineId,
  }
}

// ---------------------------------------------------------------------------
// Inspection / queries
// ---------------------------------------------------------------------------

/**
 * Find a DialogueLine by lineId across all segments on a scene. Returns null
 * if not found.
 */
export function findDialogueLineById(
  segments: ScriptSegment[] | undefined,
  lineId: string
): { segment: ScriptSegment; line: DialogueLine; segmentIndex: number; lineIndex: number } | null {
  if (!segments || !lineId) return null
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]
    const lineIndex = seg.dialogue.findIndex((d) => d.lineId === lineId)
    if (lineIndex >= 0) {
      return { segment: seg, line: seg.dialogue[lineIndex], segmentIndex: s, lineIndex }
    }
  }
  return null
}

/**
 * Flatten a scene's segments back into a positional dialogue list (legacy
 * compatibility). Excludes narrator-kind lines because the legacy schema
 * stored those in a separate scene.narration string.
 */
export function flattenDialogueLegacy(
  segments: ScriptSegment[] | undefined
): Array<{ character: string; line: string; lineId: string }> {
  if (!segments) return []
  const out: Array<{ character: string; line: string; lineId: string }> = []
  for (const seg of segments) {
    for (const d of seg.dialogue) {
      if (d.kind === 'narration') continue
      out.push({ character: d.character, line: d.line, lineId: d.lineId })
    }
  }
  return out
}

/**
 * Flatten narrator lines into a single legacy-style narration string.
 */
export function flattenNarrationLegacy(
  segments: ScriptSegment[] | undefined
): { text: string; lineIds: string[] } {
  if (!segments) return { text: '', lineIds: [] }
  const lineIds: string[] = []
  const sentences: string[] = []
  for (const seg of segments) {
    for (const d of seg.dialogue) {
      if (d.kind !== 'narration') continue
      lineIds.push(d.lineId)
      sentences.push(d.line)
    }
  }
  return { text: sentences.join(' '), lineIds }
}

/**
 * Helper exported for prompts: the canonical Veo bucket list as a string
 * "4 / 6 / 8 / 10 / 12 seconds".
 */
export function veoDurationsHuman(): string {
  return VEO_VALID_DURATIONS.join(' / ') + ' seconds'
}

/**
 * Convenience: build a brand-new segment scaffold.
 */
export function buildEmptySegment(
  options: { sequenceIndex?: number; startTime?: number; targetDuration?: number; transitionType?: SegmentTransitionType } = {}
): ScriptSegment {
  const dur = snapToVeoDuration(options.targetDuration ?? 10)
  const start = options.startTime ?? 0
  return {
    segmentId: mintSegmentId(),
    sequenceIndex: options.sequenceIndex ?? 0,
    startTime: start,
    endTime: start + dur,
    segmentDirection: '',
    transitionType: options.transitionType ?? 'CUT',
    dialogue: [],
    sfx: [],
    references: { startFrameDescription: null, endFrameDescription: null, characterIds: [] },
  }
}
