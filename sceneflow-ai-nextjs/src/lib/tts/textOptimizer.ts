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
 * Normalizes whitespace in text
 */
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
 * Optimizes text specifically for Gemini 2.5 Flash TTS.
 *
 * Historically this function preserved `[...]` tags because Gemini 2.5 can
 * use them as inline delivery hints. In practice scripts emit long stage
 * directions like `[exhausted, whispering] Another late night...` that
 * Gemini sometimes reads aloud verbatim. To prevent direction text from
 * leaking into the audio we now strip ALL bracketed and parenthetical
 * directions for both Google and Gemini paths. Emotion cues are still
 * extracted and exposed via `cues` so callers can inject them into the
 * voice prompt instead of the spoken input.
 */
export function optimizeTextForGeminiTTS(input: string): OptimizedText {
  const originalLength = input.length
  const cues = extractEmotionCues(input)

  let optimized = removeStageDirections(input)
  optimized = unwrapMarkdownEmphasis(optimized)
  optimized = optimized.replace(/\*/g, '')

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

