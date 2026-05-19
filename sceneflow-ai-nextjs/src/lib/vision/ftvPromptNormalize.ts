/**
 * Frame-to-video (FTV / F2V) prompt narrowing for Veo.
 *
 * Start/end images already fix appearance, wardrobe, and environment; rich text
 * duplicates or contradicts pixels and increases false-positive safety filters.
 */

import type { SceneSegment } from '@/components/vision/scene-production/types'

/**
 * Normalize ellipsis and repeated-dot patterns before sending text to Vertex Veo.
 *
 * Ellipsis (`...`), unicode …, and runs like `..` are ordinary in prose but occasionally
 * correlate with false positives when layered safety / input guardrails use broad regexes
 * or treat punctuation-heavy spans as anomalous (e.g. Model Armor–style input inspection).
 * We keep intent as a single period or `. ` pause where possible.
 */
export function normalizeVeoSuspiciousPunctuation(text: string): string {
  if (!text.trim()) return ''
  let s = text.replace(/\r\n/g, '\n')
  s = s.replace(/\u2026/g, '. ')
  s = s.replace(/\.{3,}/g, '. ')
  s = s.replace(/\.{2}/g, '.')
  s = s.replace(/ {2,}/g, ' ')
  s = s.replace(/\s+\./g, '.')
  return s.trim()
}

/** Section heading patterns (first line of a chunk) — drop entire block. */
const FTV_DROP_HEADING_REGEX =
  /^(#{1,6}\s*)?(?:\*\*)?\s*(scene(?:\s+direction)?|visual(?:\s+description|\s+style)?|character(?:\s+description)?|environment|set(?:ting)?|location|wardrobe|costume|props?|keyframe|background|palette|lighting(?:\s+mood)?)\b/i

/** Paragraph starts that usually introduce blocking/set copy (not motion). */
const FTV_DROP_PARAGRAPH_START_REGEX =
  /^(?:#{1,6}\s*)?(?:scene|visual|character|environment|set |location|wardrobe|interior|exterior)\b/i

const SEGMENT_BEAT_LINE = /^\s*segment beat\s+\d+[^\n]*$/i

export function stripFtvSegmentBeatLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !SEGMENT_BEAT_LINE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Split on --- or === divider lines; drop chunks whose opening line matches drop headings.
 */
export function stripFtvDelimitedSections(raw: string): string {
  const normalized = raw.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  const blocks = normalized.split(/\n(?:-{3,}|={3,})\s*\n/)
  const kept = blocks
    .map((b) => b.trim())
    .filter((b) => {
      if (!b) return false
      const firstLine = b.split('\n')[0]?.trim() ?? ''
      return !FTV_DROP_HEADING_REGEX.test(firstLine.replace(/^#{1,6}\s*/, ''))
    })

  return kept.join('\n\n').trim()
}

/**
 * Drop paragraph blocks (double-newline separated) that open with set/scene/visual labels.
 */
export function stripFtvLabeledParagraphs(raw: string): string {
  const paras = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const kept = paras.filter((p) => {
    const head = (p.split('\n')[0] ?? '').trim()
    if (SEGMENT_BEAT_LINE.test(head)) return false
    if (FTV_DROP_PARAGRAPH_START_REGEX.test(head)) return false
    return true
  })
  return kept.join('\n\n').trim()
}

/** Prefer canonical bundle F2V line; strip delimiter sections + noise. */
export function narrowPromptForFtvFrameLock(raw: string): string {
  let s = stripFtvDelimitedSections(raw)
  s = stripFtvLabeledParagraphs(s)
  s = stripFtvSegmentBeatLines(s)
  return normalizeVeoSuspiciousPunctuation(s.trim())
}

/**
 * Replace named-speaker boilerplate so dialogue stays without repeating identity copy.
 */
export function neutralizeFtvGuidePrompt(guide: string): string {
  let g = guide.replace(/\r\n/g, '\n').trim()
  if (!g) return ''

  g = g.replace(
    /^[^\n]*?\bspeaks the following line\b[^:\n]*:/gim,
    'Deliver with natural lip sync:'
  )
  g = g.replace(/\n\[Scene Direction\][\s\S]*?(?=\n\[|$)/gi, '\n')
  g = stripFtvDelimitedSections(g)
  g = stripFtvLabeledParagraphs(g)

  return normalizeVeoSuspiciousPunctuation(g.trim())
}

/** Short native-audio hint — avoids long policy-sensitive wording. */
export const FTV_MINIMAL_NATIVE_AUDIO_HINT =
  'Synchronized dialogue for the quoted speech; subtle room tone only.'

/** One-line hint when FTV has no spoken line (silent interpolation). */
export const FTV_SILENT_MOTION_HINT =
  'Subtle motion between keyframes to match the end pose; static camera.'

function escapeDialogueForDoubleQuotes(line: string): string {
  return line.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * Extract trailing perform cue: `Name speaks, "dialogue"` (straight or curly quotes).
 * Returns the last match when multiple appear (blocking prose often precedes dialogue).
 */
export function extractSpeaksQuotedPerformCue(text: string): string | null {
  const n = text.replace(/\r\n/g, '\n').replace(/[""]/g, '"').replace(/['']/g, "'")
  const re =
    /\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)*)\s+speaks,\s*"((?:[^"\\]|\\.)*)"/g
  let m: RegExpExecArray | null
  let last: string | null = null
  while ((m = re.exec(n)) !== null) {
    const name = m[1].trim()
    const line = normalizeVeoSuspiciousPunctuation(m[2].trim().replace(/\s+/g, ' '))
    last = `${name} speaks, "${escapeDialogueForDoubleQuotes(line)}"`
  }
  return last
}

/**
 * Prefer dialogue-only text for FTV: frames encode blocking; only lipsync/audio cue stays.
 */
export function buildMinimalFtvPerformPrompt(
  segment: SceneSegment,
  narrowedFallbackText: string
): string | null {
  const dls = segment.dialogueLines
  if (Array.isArray(dls) && dls.length > 0) {
    const parts = dls
      .filter((d) => d?.line?.trim())
      .map((d) => {
        const name = (d.character || 'Speaker').trim()
        const stripped = d.line.trim().replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '')
        const raw = normalizeVeoSuspiciousPunctuation(stripped)
        return `${name} speaks, "${escapeDialogueForDoubleQuotes(raw)}"`
      })
    if (parts.length > 0) return normalizeVeoSuspiciousPunctuation(parts.join('\n'))
  }

  return extractSpeaksQuotedPerformCue(narrowedFallbackText)
}
