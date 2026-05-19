/**
 * TTS Text Optimizer
 * 
 * Optimizes dialogue text for Text-to-Speech generation by:
 * - Removing stage directions in parentheses
 * - Extracting emotion cues
 * - Preserving natural punctuation
 * - Cleaning up whitespace
 */

export interface OptimizedText {
  text: string
  cues: string[]
  originalLength: number
  optimizedLength: number
  isSpeakable: boolean  // NEW: indicates if text contains speakable content
}

/** Fullwidth / CJK-style brackets often pasted from docs; normalize so [] stripping works. */
function normalizePerformanceBracketChars(text: string): string {
  return text
    .replace(/\uFF3B/g, '[')
    .replace(/\uFF3D/g, ']')
}

/**
 * Removes stage directions and audio tags from text
 * Removes [bracket] tags (Google/Gemini TTS reads them aloud if left in).
 * Uses [\s\S] so multi-line directions inside one pair of brackets are removed.
 */
function removeStageDirections(text: string): string {
  let cleaned = normalizePerformanceBracketChars(text)

  // Square brackets (performance / delivery notes)
  cleaned = cleaned.replace(/\[[\s\S]*?\]/g, '')

  // Traditional parenthetical stage directions (single pair; multiline-safe)
  cleaned = cleaned.replace(/\([\s\S]*?\)/g, '')

  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

/**
 * Strip `[...]` delivery / direction notes for word-count and duration estimation only.
 * Does not remove parenthetical stage directions — use `optimizeTextForTTS` for full TTS cleanup.
 * Handles multiline brackets and fullwidth square brackets (same as TTS normalization).
 */
export function stripDirectionBracketsForTiming(text: string): string {
  let s = normalizePerformanceBracketChars(text || '')
  s = s.replace(/\[[\s\S]*?\]/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/** Turn *emphasis* into plain words so TTS does not say "asterisk". */
function unwrapMarkdownEmphasis(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1')
}

/**
 * Gemini (and other TTS) sometimes appends a copy of the opening phrase at the end.
 * If the tail matches the head (length 20–120), drop the redundant tail once.
 */
export function trimEchoedPrefixTail(text: string): string {
  const t = text.trim()
  if (t.length < 40) return t
  const maxN = Math.min(120, Math.floor(t.length / 2))
  for (let n = maxN; n >= 20; n--) {
    const head = t.slice(0, n)
    const tail = t.slice(-n)
    if (head.toLowerCase() === tail.toLowerCase()) {
      return t.slice(0, -n).replace(/\s+$/, '').trim()
    }
  }
  return t
}

/**
 * Last pass before Google TTS: defense in depth on already-optimized script text.
 */
export function finalizeTextForGoogleTts(text: string): string {
  let s = normalizePerformanceBracketChars(text)
  s = s.replace(/\[[\s\S]*?\]/g, '')
  s = s.replace(/\([\s\S]*?\)/g, '')
  s = unwrapMarkdownEmphasis(s)
  s = s.replace(/\*/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  s = trimEchoedPrefixTail(s)
  return s
}

/**
 * Extracts emotion and delivery cues from text
 */
function extractEmotionCues(text: string): string[] {
  const cues: string[] = []
  
  // Common emotion and delivery cues
  const cuePatterns = [
    /(?:voice|tone|delivery)[\s,]+(?:is\s+)?(hoarse|choked|whisper|shout|excited|sad|angry|happy|nervous|relief|grateful|surprised|shocked|worried|calm|urgent|desperate|firm|gentle)/gi,
    /\b(whispering|shouting|excitedly|sadly|angrily|happily|nervously|calmly|urgently|desperately|firmly|gently)\b/gi,
  ]
  
  for (const pattern of cuePatterns) {
    const matches = text.match(pattern)
    if (matches) {
      cues.push(...matches.map(m => m.toLowerCase().trim()))
    }
  }
  
  return [...new Set(cues)] // Remove duplicates
}

/**
 * Capture bracketed delivery hints like `[tired, muttering]` before those brackets
 * are stripped from spoken text. Gemini-TTS steers delivery via `prompt`; cues
 * must not be silently discarded.
 */
export function extractBracketDeliveryHints(text: string): string[] {
  const normalized = normalizePerformanceBracketChars(text || '')
  const hints: string[] = []
  const re = /\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(normalized)) !== null) {
    const inner = m[1].replace(/\s+/g, ' ').trim()
    if (!inner) continue
    for (const part of inner.split(',')) {
      const p = part.trim()
      if (p.length > 0) hints.push(p)
    }
  }
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const h of hints) {
    const key = h.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(h)
  }
  return deduped
}

/** Strip a single layer of outer screenplay quotes so TTS does not read them aloud. */
export function unwrapOuterScreenplayQuotes(text: string): string {
  let s = text.trim()
  const pairs: [string, string][] = [
    ["'", "'"],
    ['\u2018', '\u2019'],
    ['\u201C', '\u201D'],
    ['"', '"'],
  ]
  for (const [open, close] of pairs) {
    if (s.length >= 2 && s.startsWith(open) && s.endsWith(close)) {
      s = s.slice(open.length, -close.length).trim()
      break
    }
  }
  return s
}

/** Normalizes whitespace in text */
function normalizeWhitespace(text: string): string {
  // Replace multiple spaces with single space
  let normalized = text.replace(/\s+/g, ' ')
  
  // Trim whitespace
  normalized = normalized.trim()
  
  // Normalize line breaks - replace multiple newlines with single space
  normalized = normalized.replace(/\n\s*\n+/g, ' ')
  
  return normalized
}

/**
 * Optimizes text for TTS generation
 */
export function optimizeTextForTTS(input: string): OptimizedText {
  const originalLength = input.length
  
  // Extract emotion cues before removing stage directions
  const cues = extractEmotionCues(input)
  
  // Remove stage directions and performance markup
  let optimized = removeStageDirections(input)
  optimized = unwrapMarkdownEmphasis(optimized)
  optimized = optimized.replace(/\*/g, '')
  
  // Normalize whitespace
  optimized = normalizeWhitespace(optimized)
  optimized = trimEchoedPrefixTail(optimized)
  
  const optimizedLength = optimized.length
  
  // Check if result is speakable (has actual content)
  const isSpeakable = optimized.trim().length > 0
  
  // Log if significant changes were made
  if (originalLength !== optimizedLength || cues.length > 0) {
    console.log('[TTS Optimizer]', {
      originalLength,
      optimizedLength,
      reduction: originalLength - optimizedLength,
      cues: cues.length > 0 ? cues : 'none',
      isSpeakable
    })
  }
  
  return {
    // Never fall back to raw input for TTS — if empty, callers skip synthesis
    text: optimized,
    cues,
    originalLength,
    optimizedLength,
    isSpeakable
  }
}

/**
 * Optimizes text for Cloud Gemini-TTS (gemini-* voices).
 *
 * Bracketed directions like `[tired, muttering]` are removed from the spoken
 * string (they may otherwise be read verbatim) but are captured in `cues` so
 * the API `prompt` field can steer delivery. See `generate-scene-audio` route.
 */
export function optimizeTextForGeminiTTS(input: string): OptimizedText {
  const originalLength = input.length
  const bracketHints = extractBracketDeliveryHints(input)
  const emotionCues = extractEmotionCues(input)
  const cues: string[] = []
  const seenCue = new Set<string>()
  for (const c of [...bracketHints, ...emotionCues]) {
    const k = c.toLowerCase()
    if (seenCue.has(k)) continue
    seenCue.add(k)
    cues.push(c)
  }

  let optimized = removeStageDirections(input)
  optimized = unwrapMarkdownEmphasis(optimized)
  optimized = optimized.replace(/\*/g, '')
  optimized = unwrapOuterScreenplayQuotes(optimized)

  optimized = normalizeWhitespace(optimized)
  optimized = trimEchoedPrefixTail(optimized)

  const optimizedLength = optimized.length

  const isSpeakable = optimized.trim().length > 0

  if (originalLength !== optimizedLength || cues.length > 0) {
    console.log('[Gemini TTS Optimizer]', {
      originalLength,
      optimizedLength,
      isSpeakable,
      cues: cues.length > 0 ? cues : 'none',
      sample: optimized.substring(0, 60)
    })
  }

  return {
    text: optimized,
    cues,
    originalLength,
    optimizedLength,
    isSpeakable
  }
}

/**
 * Last pass before Google Gemini TTS: defense in depth on already-optimized script text.
 *
 * Strips both `[...]` and `(...)` directions so Gemini cannot speak them
 * aloud. The previous behavior preserved brackets to allow Gemini's inline
 * style tags, but multi-word stage directions like `[exhausted, whispering]`
 * were sometimes read verbatim. Voice prompts now carry emotion hints
 * instead (see `voiceConfig.prompt`).
 */
export function finalizeTextForGeminiTts(text: string): string {
  let s = normalizePerformanceBracketChars(text)

  s = s.replace(/\[[\s\S]*?\]/g, '')
  s = s.replace(/\([\s\S]*?\)/g, '')

  s = unwrapMarkdownEmphasis(s)
  s = s.replace(/\*/g, '')
  s = unwrapOuterScreenplayQuotes(s)
  s = s.replace(/\s+/g, ' ').trim()
  s = trimEchoedPrefixTail(s)

  return s
}

/**
 * Example transformations for testing
 */
export const EXAMPLE_TRANSFORMATIONS = {
  'stage direction at start': {
    input: '(His voice hoarse, almost a choked whisper) Mint. Thank you.',
    expected: 'Mint. Thank you.'
  },
  'multiple stage directions': {
    input: '(excitedly) I can\'t believe it! (voice getting louder) This is amazing!',
    expected: 'I can\'t believe it! This is amazing!'
  },
  'with hesitation': {
    input: '(thoughtfully) I... I\'m not sure about this.',
    expected: 'I... I\'m not sure about this.'
  },
  'with interruption': {
    input: '(urgently) Wait—I need to tell you something!',
    expected: 'Wait—I need to tell you something!'
  },
  'preserve emphasis': {
    input: '(whispering) This is IMPORTANT.',
    expected: 'This is IMPORTANT.'
  }
} as const

