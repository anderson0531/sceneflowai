/**
 * Aggressive REF-time prompt cleanup for Omni reference_to_video.
 * Stored segment prompts are often bloated; this runs at generation time only.
 */

import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'

const STYLE_TOKEN_PATTERNS = [
  /\bphotorealistic\b/gi,
  /\bprofessional photography\b/gi,
  /\b8K resolution\b/gi,
  /\bstudio lighting\b/gi,
  /\bsharp focus\b/gi,
  /\bcinematic \d+mm lens\b/gi,
  /\bshallow depth of field\b/gi,
  /\bhigh-contrast clinical lighting\b/gi,
]

/** Split stored prompt into clause-like segments. */
function splitPromptSegments(prompt: string): string[] {
  return prompt
    .replace(/\.\.+/g, '.')
    .split(/(?<=[.!?])\s+|\.\s+/)
    .map((s) => s.trim().replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
}

function isStyleOnlySegment(segment: string): boolean {
  const stripped = STYLE_TOKEN_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, ''),
    segment
  )
    .replace(/[,.\s]+/g, ' ')
    .trim()
  return stripped.length < 8
}

function stripStyleTokens(segment: string): string {
  let text = segment
  for (const pattern of STYLE_TOKEN_PATTERNS) {
    text = text.replace(pattern, '')
  }
  return text.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').replace(/,\s*\./g, '.').trim()
}

/** Comma-salad motion/mood clause (camera tokens + emotional beat). */
function isMotionMoodSalad(segment: string): boolean {
  const lower = segment.toLowerCase()
  if (/collapsing into .* realization|quiet resignation|horrifying|intense realization/.test(lower)) {
    return true
  }
  const commaCount = (segment.match(/,/g) ?? []).length
  if (commaCount < 2) return false
  const cameraTokens =
    /\b(dolly|static|close-up|wide|medium|handheld|tracking|pan|zoom|inserts?)\b/i.test(segment)
  const moodTokens = /\b(hard|dramatic|high-contrast|low-key|mood)\b/i.test(segment)
  return cameraTokens && moodTokens && commaCount >= 2
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordOverlapRatio(a: string, b: string): number {
  const wordsA = new Set(normalizeForCompare(a).split(' ').filter((w) => w.length > 3))
  const wordsB = new Set(normalizeForCompare(b).split(' ').filter((w) => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }
  return overlap / Math.min(wordsA.size, wordsB.size)
}

/** Keep the longer/more descriptive clause when two action sentences overlap. */
function dedupeSimilarSegments(segments: string[]): string[] {
  const kept: string[] = []
  for (const segment of segments) {
    const dupIdx = kept.findIndex(
      (existing) => wordOverlapRatio(existing, segment) >= 0.55
    )
    if (dupIdx === -1) {
      kept.push(segment)
    } else if (segment.length > kept[dupIdx].length) {
      kept[dupIdx] = segment
    }
  }
  return kept
}

/**
 * Reduce a stored segment prompt to a concise neutral scene for Omni REF.
 * Caps output to ~2 sentences.
 */
export function cleanOmniRefScenePrompt(prompt: string): string {
  if (!prompt?.trim()) return prompt

  let segments = splitPromptSegments(prompt)
    .map(stripStyleTokens)
    .filter((s) => s.length > 0)
    .filter((s) => !isStyleOnlySegment(s))
    .filter((s) => !isMotionMoodSalad(s))

  segments = dedupeSimilarSegments(segments)

  const cleaned = segments
    .slice(0, 2)
    .map((s) => (s.endsWith('.') ? s : `${s}.`))
    .join(' ')
    .replace(/\.\.+/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return cleaned || prompt.trim()
}

/** Strip verbose delivery parentheticals from dialogue guide text. */
export function sanitizeOmniRefGuide(guide?: string | null): string | undefined {
  const raw = guide?.trim()
  if (!raw) return undefined

  let text = raw
  text = text.replace(/\s*\(with [^)]*delivery[^)]*\)/gi, '')
  text = text.replace(/\s*\([^)]*delivery[^)]*\)/gi, '')
  text = text.replace(/speaks the following line\s*:/gi, 'says:')
  text = neutralizeReferenceConflictPrompt(text)

  return text.trim() || undefined
}

/** Soften reference image labels for REF video (strip emotional suffixes, shot parentheticals). */
export function sanitizeOmniRefLabel(label?: string | null): string {
  if (!label?.trim()) return label?.trim() ?? ''

  let text = label.trim()

  if (/location reference/i.test(text)) {
    text = text.replace(/\s*\([^)]*(?:establishing|wide|shot|angle)[^)]*\)/gi, '')
  }

  if (!/^identity reference/i.test(text) && !/^prop reference/i.test(text)) {
    const parts = text.split(/\s*[—–]\s*/)
    if (parts.length >= 3) {
      text = parts.slice(0, -1).join(' — ')
    }
  }

  return neutralizeReferenceConflictPrompt(text).trim()
}
