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
 * Bracket tags Gemini-TTS documents as markup rather than words to speak.
 * Anything outside this list is a human stage direction and still gets stripped,
 * because the model reads notes like `[exhausted, whispering]` out loud.
 */
const GEMINI_MARKUP_TAGS = new Set([
  'short pause',
  'medium pause',
  'long pause',
  'sigh',
  'uhm',
  'whispering',
  'shouting',
  'extremely fast',
  'sarcasm',
  'laughing',
])

/**
 * Cue phrasing that maps onto a documented pacing tag. Anchored so a cue only
 * counts when the whole phrase is a pause request — "beat the drum" is not one.
 */
const PAUSE_CUE_TAGS: Array<[RegExp, string]> = [
  [/^(?:a|an|the)?\s*(?:long|lengthy|extended)\s+(?:pause|beat|silence)$/i, '[long pause]'],
  [/^(?:a|an|the)?\s*(?:short|brief|quick|slight)\s+(?:pause|beat)$/i, '[short pause]'],
  [/^(?:a|an|the)?\s*(?:medium|measured)?\s*(?:pause|beat|silence)$/i, '[medium pause]'],
]

export function isGeminiMarkupTag(inner: string): boolean {
  return GEMINI_MARKUP_TAGS.has(inner.replace(/\s+/g, ' ').trim().toLowerCase())
}

/**
 * Strip bracket content except Gemini's documented markup tags, which are
 * normalized to their canonical lowercase spelling so the model recognizes them.
 *
 * A bracket that only asks for a pause is rewritten in place as the documented
 * pacing tag, so `[a long pause]` keeps its beat instead of vanishing.
 */
function stripBracketsExceptMarkup(text: string): string {
  return text.replace(/\[([\s\S]*?)\]/g, (_match, inner: string) => {
    const normalized = String(inner).replace(/\s+/g, ' ').trim().toLowerCase()
    if (!normalized) return ''
    if (GEMINI_MARKUP_TAGS.has(normalized)) return `[${normalized}]`
    const pauseOnly = isPauseOnlyCue(normalized)
    return pauseOnly ?? ''
  })
}

/**
 * True only when every comma-separated part of a bracket is a pause request.
 * `[a long pause]` becomes a tag; `[a long pause, then coldly]` does not, because
 * "coldly" is delivery direction that belongs in the prompt instead.
 */
function isPauseOnlyCue(inner: string): string | null {
  const parts = inner.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  let tag: string | null = null
  for (const part of parts) {
    const partTag = pauseTagForCue(part)
    if (!partTag) return null
    // Longest pause wins when a bracket asks for several.
    if (!tag || PAUSE_TAG_RANK[partTag] > PAUSE_TAG_RANK[tag]) tag = partTag
  }
  return tag
}

const PAUSE_TAG_RANK: Record<string, number> = {
  '[short pause]': 1,
  '[medium pause]': 2,
  '[long pause]': 3,
}

/**
 * Novelization attribution that belongs in the scene direction, not the audio.
 * Only matches a trailing tag on a quoted line or after terminal punctuation, so
 * ordinary narration ("He said the vault was empty.") is left alone.
 */
const DIALOGUE_TAG_VERBS =
  '(?:said|says|asked|asks|replied|replies|answered|answers|muttered|mutters|whispered|whispers|shouted|shouts|yelled|yells|snapped|snaps|barked|barks|growled|growls|hissed|hisses|sighed|sighs|breathed|breathes|added|adds|continued|continues|offered|offers|observed|observes|noted|notes|remarked|remarks|murmured|murmurs|stated|states|declared|declares|repeated|repeats|insisted|insists|countered|counters|conceded|concedes|drawled|drawls|intoned|intones)'

const TAG_SUBJECT = `(?:[A-Z][\\w'\u2019-]*|he|she|they|it|the\\s+\\w+)`
const CLOSE_QUOTE = `["'\u2019\u201D]`
const OPEN_QUOTE = `["'\u2018\u201C]`

/** Interposed: `"Enough," he said coldly, "we are done."` — joins the two halves. */
const INTERPOSED_TAG = new RegExp(
  `(${CLOSE_QUOTE})\\s*,?\\s*(${TAG_SUBJECT}\\s+${DIALOGUE_TAG_VERBS}\\b[^"'\u2018\u201C]*?)[,.]?\\s*(${OPEN_QUOTE})`,
  'gi'
)

/** Trailing on a quoted line: `"...," he said coldly.` */
const TRAILING_QUOTED_TAG = new RegExp(
  `([,.!?])?(${CLOSE_QUOTE})\\s*,?\\s*(${TAG_SUBJECT}\\s+${DIALOGUE_TAG_VERBS}\\b[^.!?]*)[.!?]?\\s*$`,
  'i'
)

/** Trailing on an unquoted line: `The breach is regrettable, he said coldly.` */
const TRAILING_BARE_TAG = new RegExp(
  `,\\s*(${TAG_SUBJECT}\\s+${DIALOGUE_TAG_VERBS}\\b[^.!?]*)([.!?])?\\s*$`,
  'i'
)

/** Leading: `He said coldly, "..."` */
const LEADING_TAG = new RegExp(
  `^\\s*(${TAG_SUBJECT}\\s+${DIALOGUE_TAG_VERBS}\\b[^"'\u2018\u201C]*?)[,:]\\s*(?=${OPEN_QUOTE})`,
  'i'
)

/** Attribution verbs that describe no manner, so they are useless as direction. */
const NEUTRAL_TAG_VERBS = new Set([
  'said', 'says', 'asked', 'asks', 'replied', 'replies', 'answered', 'answers',
  'added', 'adds', 'continued', 'continues', 'stated', 'states', 'repeated', 'repeats',
])

const TAG_ATTRIBUTION = new RegExp(
  `^${TAG_SUBJECT}\\s+(${DIALOGUE_TAG_VERBS})\\b[,\\s]*(.*)$`,
  'i'
)

/**
 * Reduce a captured tag to the delivery manner. "he said coldly" is direction
 * only in its adverb; the attribution itself tells the model nothing.
 */
function cleanTag(raw: string): string {
  const flat = raw
    .replace(/["'\u2018\u2019\u201C\u201D]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.:;!?\s]+|[,.:;!?\s]+$/g, '')
    .trim()

  const attribution = TAG_ATTRIBUTION.exec(flat)
  if (!attribution) return flat

  const manner = attribution[2].replace(/^[,.:;\s]+/, '').trim()
  if (manner) return manner

  const verb = attribution[1].toLowerCase()
  return NEUTRAL_TAG_VERBS.has(verb) ? '' : verb
}

/**
 * Remove novelization dialogue tags from the spoken string and return them
 * separately so callers can route the manner ("coldly") into scene direction.
 *
 * Replacements keep quotation marks balanced and restore terminal punctuation,
 * so the outer-quote unwrap still fires and the line does not lose its full stop.
 */
export function stripDialogueTags(text: string): { text: string; tags: string[] } {
  const tags: string[] = []
  const record = (raw: string) => {
    const tag = cleanTag(raw)
    if (tag) tags.push(tag)
  }

  let working = text.replace(INTERPOSED_TAG, (_m, _close: string, tag: string) => {
    record(tag)
    // Drop both inner quotes so the surviving halves read as one quoted line.
    return ' '
  })

  working = working.replace(
    TRAILING_QUOTED_TAG,
    (_m, punct: string | undefined, close: string, tag: string) => {
      record(tag)
      // A comma only existed to introduce the tag; the line now ends here.
      const terminal = punct && /[.!?]/.test(punct) ? punct : '.'
      return `${terminal}${close}`
    }
  )

  working = working.replace(
    TRAILING_BARE_TAG,
    (_m, tag: string, punct: string | undefined) => {
      record(tag)
      return punct && /[.!?]/.test(punct) ? punct : '.'
    }
  )

  working = working.replace(LEADING_TAG, (_m, tag: string) => {
    record(tag)
    return ''
  })

  return { text: working.replace(/\s+/g, ' ').trim(), tags }
}

/**
 * Punctuation-level pacing. Gemini honors terminal punctuation and em-dashes as
 * timing signals, so collapse the ASCII variants onto the characters it reads
 * rather than leaving spaced dots and double hyphens.
 */
export function normalizePacingPunctuation(text: string): string {
  return (
    text
      // `. . .` and `....` both mean a trailing-off beat.
      .replace(/\.\s*\.\s*\.\s*\.+/g, '\u2026')
      .replace(/\.\s*\.\s*\./g, '\u2026')
      .replace(/\u2026\s*\.+/g, '\u2026')
      // `--` / `---` are typed stand-ins for an interruption.
      .replace(/\s*-{2,}\s*/g, '\u2014')
      // A spaced em-dash reads as a pause; an unspaced one reads as a cut-off.
      .replace(/\s+\u2014\s+/g, '\u2014')
      .replace(/\s*\u2026\s*/g, '\u2026 ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * Convert pause cues captured from stage directions into documented pacing tags,
 * so `[a long pause]` still buys its beat instead of vanishing.
 */
export function pauseTagForCue(cue: string): string | null {
  for (const [pattern, tag] of PAUSE_CUE_TAGS) {
    if (pattern.test(cue)) return tag
  }
  return null
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
  s = stripDialogueTags(s).text
  // Legacy Google voices have no markup vocabulary, so every bracket goes.
  s = s.replace(/\[[\s\S]*?\]/g, '')
  s = s.replace(/\([\s\S]*?\)/g, '')
  s = unwrapMarkdownEmphasis(s)
  s = s.replace(/\*/g, '')
  s = normalizePacingPunctuation(s)
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
 *
 * Documented markup tags are skipped — they stay inline in the spoken string,
 * so repeating them as prompt cues would double-apply the effect.
 */
export function extractBracketDeliveryHints(text: string): string[] {
  const normalized = normalizePerformanceBracketChars(text || '')
  const hints: string[] = []
  const re = /\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(normalized)) !== null) {
    const inner = m[1].replace(/\s+/g, ' ').trim()
    if (!inner) continue
    if (isGeminiMarkupTag(inner)) continue
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
  const stripped = stripDialogueTags(normalizePerformanceBracketChars(input))
  let optimized = removeStageDirections(stripped.text)
  optimized = unwrapMarkdownEmphasis(optimized)
  optimized = optimized.replace(/\*/g, '')
  
  // Normalize whitespace
  optimized = normalizeWhitespace(optimized)
  optimized = normalizePacingPunctuation(optimized)
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
 * Bracketed stage directions like `[tired, muttering]` are removed from the
 * spoken string (they may otherwise be read verbatim) but are captured in
 * `cues` so the API `prompt` field can steer delivery. Google's documented
 * markup tags survive inline, since those are the only bracket contents the
 * model interprets rather than speaks. See `generate-scene-audio` route.
 */
export function optimizeTextForGeminiTTS(input: string): OptimizedText {
  const originalLength = input.length
  const bracketHints = extractBracketDeliveryHints(input)
  const emotionCues = extractEmotionCues(input)

  const stripped = stripDialogueTags(normalizePerformanceBracketChars(input))

  let optimized = stripBracketsExceptMarkup(stripped.text)
  optimized = optimized.replace(/\([\s\S]*?\)/g, '')
  optimized = unwrapMarkdownEmphasis(optimized)
  optimized = optimized.replace(/\*/g, '')
  optimized = optimized.replace(/\s+/g, ' ').trim()
  optimized = unwrapOuterScreenplayQuotes(optimized)

  optimized = normalizeWhitespace(optimized)
  optimized = normalizePacingPunctuation(optimized)
  optimized = trimEchoedPrefixTail(optimized)

  // A style tag that survived inline already steers delivery; repeating it as a
  // prompt cue would apply the effect twice.
  const inlineTags = new Set(
    Array.from(optimized.matchAll(/\[([^\]]+)\]/g)).map((m) =>
      m[1].replace(/\s+/g, ' ').trim().toLowerCase()
    )
  )

  const cues: string[] = []
  const seenCue = new Set<string>()
  for (const c of [...bracketHints, ...emotionCues, ...stripped.tags]) {
    // Pause cues become inline pacing tags, so repeating them as prompt
    // direction would ask the model to slow the whole line down.
    if (pauseTagForCue(c)) continue
    const k = c.toLowerCase()
    if (inlineTags.has(k)) continue
    if (seenCue.has(k)) continue
    seenCue.add(k)
    cues.push(c)
  }

  const optimizedLength = optimized.length

  // Markup tags are directives, not words: a line of nothing but pacing tags
  // has nothing to synthesize.
  const isSpeakable = optimized.replace(/\[[^\]]*\]/g, '').trim().length > 0

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
 * Strips `(...)` directions and every bracket except Google's documented markup
 * tags, so multi-word stage directions like `[exhausted, whispering]` cannot be
 * read verbatim while real pacing control survives. Delivery direction travels
 * in the prompt instead (see `voiceConfig.prompt`).
 */
export function finalizeTextForGeminiTts(text: string): string {
  let s = normalizePerformanceBracketChars(text)

  s = stripDialogueTags(s).text
  s = stripBracketsExceptMarkup(s)
  s = s.replace(/\([\s\S]*?\)/g, '')

  s = unwrapMarkdownEmphasis(s)
  s = s.replace(/\*/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  s = unwrapOuterScreenplayQuotes(s)
  s = normalizePacingPunctuation(s)
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

