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
// Sentence splitter
// ---------------------------------------------------------------------------

/**
 * Split a free-form line of dialogue / narration into one sentence per
 * element. Preserves leading parenthetical/bracketed performance directions
 * such as "[frustrated, low]" or "(whispering)" by attaching them to the
 * first resulting sentence.
 *
 * Handles `.`, `?`, `!`, `…`, multi-character ellipses (`...`), and avoids
 * over-splitting on common abbreviations and decimal numbers.
 */
export function splitIntoSentences(input: string): string[] {
  const text = (input || '').replace(/\s+/g, ' ').trim()
  if (!text) return []

  // Pull leading performance direction off the front so the first sentence
  // keeps it. e.g. "[frustrated, low] Another loop. Another translation."
  let prefix = ''
  let body = text
  // Normalize spaced ellipsis variants (". . .") so they are handled
  // consistently as in-line pauses.
  body = body.replace(/\.\s*\.\s*\./g, '…')
  const directionMatch = body.match(/^\s*([\[\(][^\]\)]+[\]\)])\s*/)
  if (directionMatch) {
    prefix = directionMatch[1] + ' '
    body = body.slice(directionMatch[0].length)
  }

  // Common abbreviations we should not split on.
  const ABBREV = new Set([
    'mr', 'mrs', 'ms', 'dr', 'st', 'sr', 'jr', 'vs', 'etc', 'e.g', 'i.e',
    'no', 'fig', 'inc', 'ltd', 'mt', 'mts', 'rev', 'col', 'gen', 'sgt',
  ])

  const sentences: string[] = []
  let buf = ''

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    buf += ch

    const isTerminator = ch === '.' || ch === '?' || ch === '!' || ch === '…'
    if (!isTerminator) continue

    // Collapse runs of "....."/"..." and mixed "…." into one token.
    const runStart = i
    while (i + 1 < body.length && (body[i + 1] === '.' || body[i + 1] === '…')) {
      buf += body[i + 1]
      i++
    }
    const run = body.slice(runStart, i + 1)
    const hasEllipsisRun = run === '…' || run.length > 1

    // Look at the previous word to skip abbreviations.
    if (ch === '.' && !hasEllipsisRun) {
      const wordMatch = buf.match(/(\b[A-Za-z]+)\.\s*$/)
      const word = wordMatch?.[1]?.toLowerCase()
      if (word && ABBREV.has(word)) {
        continue
      }
      // Decimal numbers like 1.5 — only split if a non-digit follows.
      const next = body[i + 1]
      const prev = buf.length >= 2 ? buf[buf.length - 2] : ''
      if (/\d/.test(prev || '') && /\d/.test(next || '')) {
        continue
      }
    }

    // Treat ellipses as mid-line pauses by default (no hard split).
    if (hasEllipsisRun) {
      continue
    }

    // Consume the trailing closing quote / bracket so it stays with this sentence.
    while (i + 1 < body.length && /[\)\]\"\']/.test(body[i + 1])) {
      buf += body[i + 1]
      i++
    }

    const trimmed = buf.trim()
    if (trimmed) sentences.push(trimmed)
    buf = ''
  }

  const tail = buf.trim()
  if (tail) sentences.push(tail)

  if (sentences.length === 0) return prefix ? [prefix.trim()] : []

  if (prefix) {
    sentences[0] = (prefix + sentences[0]).trim()
  }
  return sentences
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
 * Re-normalize an existing DialogueLine so that any multi-sentence text gets
 * split into multiple lines. Preserves the original `lineId` on the FIRST
 * resulting line so existing audio/translations keep matching, and mints
 * fresh ids for the new tail lines.
 */
export function normalizeDialogueLine(line: DialogueLine): DialogueLine[] {
  const sentences = splitIntoSentences(line.line || '')
  if (sentences.length <= 1) {
    return [
      {
        ...line,
        line: sentences[0] || line.line || '',
      },
    ]
  }

  return sentences.map((sentence, i) => ({
    ...line,
    lineId: i === 0 ? line.lineId : mintLineId(),
    line: sentence,
  }))
}

/**
 * Apply the one-sentence rule across every dialogue line in every segment of
 * a scene, in place-friendly fashion (returns a new array).
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
