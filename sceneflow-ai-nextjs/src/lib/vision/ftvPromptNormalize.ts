/**
 * Frame-to-video (FTV / F2V) prompt narrowing for Veo.
 *
 * Start/end images already fix appearance, wardrobe, and environment; rich text
 * duplicates or contradicts pixels and increases false-positive safety filters.
 */

import type { SceneSegment } from '@/components/vision/scene-production/types'
import { formatPerformanceClause, parsePerformanceCue } from '@/lib/scene/performanceCues'

/**
 * Normalize ellipsis and repeated-dot patterns before sending text to Vertex Veo.
 *
 * Ellipsis (`...`), unicode …, and runs like `..` are ordinary in prose but occasionally
 * correlate with false positives when layered safety / input guardrails use broad regexes
 * or treat punctuation-heavy spans as anomalous (e.g. Model Armor–style input inspection).
 * Two-dot ellipsis (`..`) is rewritten as a comma pause so we never emit a stray `.` before
 * the next word (e.g. `more like.. a` → `more like, a`), which reads cleaner and avoids odd punctuation runs.
 */
export function normalizeVeoSuspiciousPunctuation(text: string): string {
  if (!text.trim()) return ''
  let s = text.replace(/\r\n/g, '\n')
  s = s.replace(/\u2026/g, '. ')
  s = s.replace(/\.{3,}/g, '. ')
  s = s.replace(/\.{2}/g, ', ')
  s = s.replace(/\s*,\s*,/g, ', ')
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
    /^([^\n]*?\bspeaks the following line\b)(\s*\([^)]+\))?\s*:/gim,
    (_match, prefix: string, deliveryPart?: string) => {
      const deliveryHint = deliveryPart?.trim() ? ` ${deliveryPart.trim()}` : ''
      return `Deliver with natural lip sync${deliveryHint}:`
    }
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

export function buildFtvSilentMotionHint(
  cameraMovement?: string | null,
  promptText?: string | null
): string {
  const combined = `${cameraMovement || ''} ${promptText || ''}`.toLowerCase()
  const hasDynamicCamera =
    /\b(dolly|push[- ]?in|pull[- ]?back|pull[- ]?out|pan|tilt|track|tracking|crane|orbit|arc|boom|zoom|handheld|drift|sweep|glide)\b/.test(
      combined
    ) && !/^\s*(?:static|locked[- ]?off|fixed)\s*$/i.test(cameraMovement || '')
  if (hasDynamicCamera) {
    return 'Subtle motion between keyframes to match the end pose with smooth camera movement.'
  }
  return FTV_SILENT_MOTION_HINT
}

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
        const parsed = parsePerformanceCue(d.line.trim())
        const spoken = parsed.spokenText.replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '')
        const raw = normalizeVeoSuspiciousPunctuation(spoken)
        const delivery = parsed.deliveryProse ? ` Delivery: ${parsed.deliveryProse}.` : ''
        const performance = formatPerformanceClause(d.voiceDirection)
        return `${name} speaks, "${escapeDialogueForDoubleQuotes(raw)}".${delivery}${performance}`
      })
    if (parts.length > 0) return normalizeVeoSuspiciousPunctuation(parts.join('\n'))
  }

  return extractSpeaksQuotedPerformCue(narrowedFallbackText)
}

/**
 * Compile an FTV (Frame-to-Video) transition prompt that preserves BOTH
 * physical transition motion (camera movement, continuous 0s–10s action, closing keyframe arrival)
 * AND any spoken dialogue cue, while stripping static environment/character/wardrobe blocks
 * and `0s–2s` / `8s–10s` hold buckets that otherwise cause the clip to hold the start pose
 * and jump to the end frame in the final 2 seconds.
 */
export function compileFtvTransitionPrompt(raw: string): string {
  if (!raw?.trim()) return ''
  let narrowed = narrowPromptForFtvFrameLock(raw)
  // Drop static 0s–2s start-frame hold and static t=0s pose clauses that anchor the clip to the start image
  narrowed = narrowed
    .replace(
      /\s*\b0s[–-]2s\s*\(Start frame\):\s*[\s\S]*?(?=\s+(?:\d+s[–-]\d+s\s*\([^)]+\)|Continuous motion|Coverage|Lens|Space|Shot|Angle|Camera|Blocking|Emotion|Gaze|Prop interaction|Props|Lighting|End on|Sound|Only these people|No people in frame):|$)/gi,
      ''
    )
    .replace(
      /\b2s[–-][58]s\s*\(Action\):\s*/gi,
      'Continuous motion from start frame to end frame (0s–10s): '
    )
    .replace(/\b5s[–-]8s\s*\(Action progression\):\s*/gi, '')
    .replace(
      /\b8s[–-]10s\s*\(End frame\):\s*(?:End on:\s*)?/gi,
      'Smoothly reach the closing keyframe state by the end of the shot: '
    )
    .replace(/\b(?:Coverage|Lens|Space|Gaze|Prop interaction|Lighting):\s*[^.!?]+[.!?]\s*/gi, '')
    .replace(
      /\s*\bBlocking:\s*[\s\S]*?(?=\s+(?:Emotion|Gaze|Prop interaction|Props|Lighting|\d+s[–-]\d+s\s*\([^)]+\)|Smoothly reach|End on|Sound|Only these people|No people in frame|Only these objects):|$)/gi,
      ''
    )
    .replace(
      /\bHold the 0s[–-]2s start state before initiating the 2s[–-]8s progression,\s*and settle cleanly into the 8s[–-]10s end frame without inventing unstated events or extra cuts\b/gi,
      'Progress smoothly and continuously from the start frame across the entire shot duration to arrive naturally at the end frame without holding the opening pose or jumping in the final 2 seconds'
    )
    .trim()

  const performCue = extractSpeaksQuotedPerformCue(raw)
  if (!narrowed) {
    return performCue ?? ''
  }
  if (performCue && !narrowed.includes(performCue) && !/\bspeaks,\s*"/i.test(narrowed)) {
    return normalizeVeoSuspiciousPunctuation(`${narrowed} ${performCue}`.trim())
  }
  return normalizeVeoSuspiciousPunctuation(narrowed)
}
