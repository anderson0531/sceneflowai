/**
 * Pure (client + server safe) metrics, cadence analysis, and prompt builders
 * for Timed Dialogue Adaptation & Translation.
 */

import { getLanguageName } from '@/constants/languages'

export const TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION = `You are an expert dubbing scriptwriter and localization editor for cinematic dialogue.

Your objective is to translate and adapt dialogue lines into [TARGET_LANGUAGE] while strictly adhering to speech duration constraints ([TARGET_DURATION] / estimated syllable budget).

When translating into languages that naturally expand in syllable count (e.g., English to Spanish), do not translate literally. Rewrite the line using semantic condensation and dramatic localization so an actor can perform it within the time limit without rushing.

Follow these rules:

1. Temporal Compression:
   - Identify the essential emotional and narrative beats of the line.
   - Never truncate the line or drop sentences/clauses; rewrite and condense the complete thought so the entire line fits.
   - Condense verbose grammatical structures, repetitive phrases, and subordinate clauses into punchy, high-impact phrasing.
   - Target a syllable count that allows a natural delivery within [TARGET_DURATION] at the specified emotional cadence.

2. Emotional & Subtext Fidelity:
   - Retain the exact emotional tone, psychological state, and poetic subtext of the original line.
   - If an evocative metaphor causes temporal overflow, adapt or compress it into an equally resonant, compact equivalent rather than flattening it into neutral prose.
   - Maintain the character's voice, status, and urgency.

3. Performance & Delivery Markers:
   - Preserve all bracketed performance cues (e.g., [fragile, weeping], [breathless], [yelling]) exactly as formatted.
   - Preserve structural pauses (such as ellipses \`...\`) to give the actor breathing room where necessary for the emotion.
   - Ensure the line flows organically when spoken aloud, prioritizing dubbing rhythm over word-for-word accuracy.

Example:
Input:
- Source Dialogue: "[fragile, weeping] She knew I would run... She knew I'd invent a thousand mathematical excuses just to stay alive down in the dark."
- Source Duration: 10.0s
- Target Language: Spanish
- Max Target Syllables / Duration: 10.0s (requires slow, weeping cadence; ~22–26 syllables maximum)

Output:
[fragile, weeping] Ella sabía que yo huiría... que inventaría mil cálculos solo para sobrevivir en la oscuridad.`

export type DialogueCadenceKind = 'slow' | 'measured' | 'normal' | 'fast'

export interface DialogueCadenceAnalysis {
  cadence: DialogueCadenceKind
  cadenceDescription: string
  syllablesPerSecMin: number
  syllablesPerSecMax: number
  performanceCue: string | null
}

export interface TargetSyllableWindow {
  minSyllables: number
  maxSyllables: number
  targetDurationSeconds: number
  sourceDurationSeconds: number
  sourceSyllables: number
  cadence: DialogueCadenceKind
  cadenceDescription: string
  formattedTargetConstraint: string
}

/**
 * Split leading `[emotion, tags]` from dialogue body without modifying either part.
 */
export function extractLeadingPerformanceCue(text: string): {
  cue: string | null
  body: string
} {
  const trimmed = (text || '').trim()
  const match = trimmed.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (!match) {
    return { cue: null, body: trimmed }
  }
  return { cue: match[1].trim(), body: match[2].trim() }
}

/**
 * Ensure the translated line preserves the exact English `[performance, cue]` prefix from the source line.
 */
export function preserveLeadingPerformanceCue(
  sourceText: string,
  translatedText: string
): string {
  const { cue: sourceCue } = extractLeadingPerformanceCue(sourceText)
  const { body: translatedBody } = extractLeadingPerformanceCue(translatedText)
  const cleanBody = translatedBody.trim()
  if (!cleanBody) return translatedText.trim()
  if (sourceCue) {
    return `[${sourceCue}] ${cleanBody}`
  }
  return cleanBody
}

/**
 * Estimate spoken syllable count, ignoring bracketed `[performance]` tags and
 * preserving accented vowels in Romance and other alphabetic languages.
 */
export function estimateSyllables(text: string, language: string = 'en'): number {
  const withoutCues = (text || '').replace(/\[[^\]]*\]/g, ' ').trim()
  if (!withoutCues) return 0

  // Basic fallback for CJK languages where syllable splitting by words is not reliable.
  if (/^(zh|ja|ko)/i.test(language)) {
    const cjkChars = (
      withoutCues.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g) || []
    ).length
    return Math.max(1, Math.round(cjkChars * 0.9))
  }

  // Separate Romance hiatuses where an accented weak vowel (í, ú) meets a strong vowel (a, e, o)
  // before NFD accent folding (e.g. "sabía" -> "sabí'a", "huiría" -> "huirí'a").
  const withHiatusSplit = withoutCues
    .replace(/([aeoAEOáéóÁÉÓ])([íúÍÚ])/g, "$1'$2")
    .replace(/([íúÍÚ])([aeoAEOáéóÁÉÓ])/g, "$1'$2")

  // Fold accented vowels (e.g. á, é, í, ó, ú, ü) to ASCII base letters before word splitting
  const asciiFolded = withHiatusSplit
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const words = asciiFolded
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 0

  const isEnglish = /^en\b/i.test(language || 'en')
  const isRomance = /^(es|pt|it|fr|ca|ro)\b/i.test(language || '')
  let syllables = 0
  let prevEndedWithVowel = false

  for (const rawWord of words) {
    const word = rawWord.replace(/^-+|-+$/g, '')
    if (!word) continue

    if (isEnglish) {
      if (word.length <= 3) {
        syllables += 1
        continue
      }
      const cleaned = word
        .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
        .replace(/^y/, '')
      const matches = cleaned.match(/[aeiouy]{1,2}/g)
      syllables += Math.max(1, matches ? matches.length : 1)
    } else {
      const cleaned = word
        .replace(/qu([ei])/g, 'k$1')
        .replace(/gu([ei])/g, 'g$1')
        .replace(/^y(?=[aeiou])/, '')
      const matches = cleaned.match(/[aeiouy]{1,2}/g)
      let wordSyllables = Math.max(1, matches ? matches.length : 1)
      const startsWithLinkableVowel = /^h?[aeiou]/.test(cleaned)
      if (isRomance && prevEndedWithVowel && startsWithLinkableVowel && syllables > 0) {
        // Sinalefa: adjacent vowels across word boundaries merge in spoken Romance cadence
        syllables -= 1
      }
      syllables += wordSyllables
      prevEndedWithVowel = /[aeiouy]$/.test(cleaned)
    }
  }

  if (isRomance && syllables > 3) {
    return Math.max(1, Math.round(syllables * 0.8))
  }

  return syllables
}

const SLOW_CADENCE_REGEX =
  /\b(fragile|weeping|crying|sobbing|sob|whisper|whispering|weak|hesitant|trembling|shaky|broken|exhausted|dying|slow|soft|softly|grief|mournful|quiet|pained|strained|hushed|faint|choked|tearful|somber|heavy)\b/i

const FAST_CADENCE_REGEX =
  /\b(urgent|yelling|shouting|screaming|panicked|frantic|rushed|rapid|manic|furious|barking|desperate)\b/i

const MEASURED_CADENCE_REGEX =
  /\b(breathless|obsessive|tense|measured|deliberate|calculated|bitter|cold|gravely)\b/i

export function analyzeDialogueCadence(sourceText: string): DialogueCadenceAnalysis {
  const { cue } = extractLeadingPerformanceCue(sourceText)
  const cueText = cue || ''
  const hasEllipsis = /\.{3,}|…/.test(sourceText)

  if (SLOW_CADENCE_REGEX.test(cueText)) {
    const specificDescriptor = /\bweeping\b/i.test(cueText)
      ? 'requires slow, weeping cadence'
      : 'requires slow, emotional cadence'
    return {
      cadence: 'slow',
      cadenceDescription: specificDescriptor,
      syllablesPerSecMin: 2.2,
      syllablesPerSecMax: 2.6,
      performanceCue: cue,
    }
  }

  if (FAST_CADENCE_REGEX.test(cueText)) {
    return {
      cadence: 'fast',
      cadenceDescription: 'urgent, rapid cadence',
      syllablesPerSecMin: 3.0,
      syllablesPerSecMax: 3.5,
      performanceCue: cue,
    }
  }

  if (MEASURED_CADENCE_REGEX.test(cueText) || hasEllipsis) {
    return {
      cadence: 'measured',
      cadenceDescription: 'measured dramatic cadence with pauses',
      syllablesPerSecMin: 2.4,
      syllablesPerSecMax: 2.8,
      performanceCue: cue,
    }
  }

  return {
    cadence: 'normal',
    cadenceDescription: 'natural cinematic cadence',
    syllablesPerSecMin: 2.6,
    syllablesPerSecMax: 3.2,
    performanceCue: cue,
  }
}

export function computeTargetSyllableWindow(
  sourceText: string,
  targetDurationSeconds: number = 10.0,
  targetLanguage: string = 'es',
  explicitMaxSyllables?: number
): TargetSyllableWindow {
  const dur = Math.min(
    12,
    Math.max(
      2,
      Number.isFinite(targetDurationSeconds) && targetDurationSeconds > 0
        ? targetDurationSeconds
        : 10.0
    )
  )
  const analysis = analyzeDialogueCadence(sourceText)
  const sourceSyllables = estimateSyllables(sourceText, 'en')
  const avgSourceSylPerSec =
    (analysis.syllablesPerSecMin + analysis.syllablesPerSecMax) / 2
  const sourceDurationSeconds = Math.max(
    1.5,
    Math.min(dur, Math.round((sourceSyllables / Math.max(2.2, avgSourceSylPerSec)) * 10) / 10)
  )

  const shotMin = Math.max(4, Math.round(dur * analysis.syllablesPerSecMin))
  const shotMax = Math.max(shotMin + 2, Math.round(dur * analysis.syllablesPerSecMax))

  let minSyllables = shotMin
  let maxSyllables = shotMax

  if (typeof explicitMaxSyllables === 'number' && explicitMaxSyllables > 0) {
    maxSyllables = Math.max(4, Math.round(explicitMaxSyllables))
    minSyllables = Math.max(2, Math.round(maxSyllables * 0.82))
  } else if (sourceSyllables > 0 && Math.ceil(sourceSyllables * 1.35) < shotMax) {
    // Keep naturally brief lines brief rather than padding them to fill a 10s ceiling.
    maxSyllables = Math.max(6, Math.ceil(sourceSyllables * 1.35))
    minSyllables = Math.max(2, Math.floor(sourceSyllables * 0.8))
  }

  const formattedTargetConstraint = `${dur.toFixed(1)}s (${analysis.cadenceDescription}; ~${minSyllables}–${maxSyllables} syllables maximum)`

  return {
    minSyllables,
    maxSyllables,
    targetDurationSeconds: dur,
    sourceDurationSeconds,
    sourceSyllables,
    cadence: analysis.cadence,
    cadenceDescription: analysis.cadenceDescription,
    formattedTargetConstraint,
  }
}

export function buildTimedDialogueUserPrompt(args: {
  sourceText: string
  targetLanguage: string
  targetDurationSeconds?: number
  sourceDurationSeconds?: number
  maxTargetSyllables?: number
}): { prompt: string; window: TargetSyllableWindow; languageName: string } {
  const source = args.sourceText.trim()
  const languageName = getLanguageName(args.targetLanguage) || args.targetLanguage
  const window = computeTargetSyllableWindow(
    source,
    args.targetDurationSeconds ?? 10.0,
    args.targetLanguage,
    args.maxTargetSyllables
  )
  const sourceDur =
    typeof args.sourceDurationSeconds === 'number' && args.sourceDurationSeconds > 0
      ? args.sourceDurationSeconds
      : window.targetDurationSeconds

  const prompt = [
    'Input:',
    `- Source Dialogue: "${source}"`,
    `- Source Duration: ${sourceDur.toFixed(1)}s`,
    `- Target Language: ${languageName}`,
    `- Max Target Syllables / Duration: ${window.formattedTargetConstraint}`,
    '',
    'Output:',
    `Provide only the finalized, actor-ready line in ${languageName} with performance tags intact.`,
  ].join('\n')

  return { prompt, window, languageName }
}

/**
 * Detect whether a candidate translation is truncated or incomplete relative to the English source line.
 * Catches 1-word MAX_TOKENS cutoffs (e.g. "Ella"), dangling conjunction/pronoun cutoffs, and
 * multi-clause lines cut off at an ellipsis ("Ella sabía que yo huiría...").
 */
export function isTruncatedTimedTranslation(
  englishLine: string,
  candidateLine: string | null | undefined,
  targetLanguage: string
): boolean {
  const candidate = candidateLine?.trim() || ''
  if (!candidate) return true
  const english = englishLine?.trim() || ''
  if (!english) return false

  const { body: englishBody } = extractLeadingPerformanceCue(english)
  const { body: candidateBody } = extractLeadingPerformanceCue(candidate)
  const cleanEnglish = englishBody.trim()
  const cleanCandidate = candidateBody.trim()

  if (!cleanEnglish) return false
  if (!cleanCandidate) return true

  const englishWords = cleanEnglish.split(/\s+/).filter(Boolean).length
  const candidateWords = cleanCandidate.split(/\s+/).filter(Boolean).length

  // 1. Word-count truncation guard (e.g. 1-word "Ella" for a multi-word sentence)
  if (englishWords >= 3 && candidateWords < Math.max(2, Math.floor(englishWords * 0.35))) {
    return true
  }

  // 2. Syllable-count truncation guard
  const sourceSyllables = estimateSyllables(cleanEnglish, 'en')
  const candidateSyllables = estimateSyllables(cleanCandidate, targetLanguage)
  if (
    sourceSyllables >= 4 &&
    candidateSyllables <= Math.max(2, Math.floor(sourceSyllables * 0.48))
  ) {
    return true
  }

  // 3. Dangling subject pronoun / preposition / conjunction cutoff on multi-word lines
  if (
    englishWords >= 4 &&
    /\b(?:ella|él|yo|tú|nosotros|ellos|ellas|que|de|en|con|para|por|sin|y|o|pero|como|cuando|si|la|el|los|las|un|una)\.?$/i.test(
      cleanCandidate
    )
  ) {
    return true
  }

  // 4. Multi-clause source lines where the translation cuts off at an ellipsis
  const ellipsisSplit = cleanEnglish
    .split(/\.{3,}|…/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (
    ellipsisSplit.length >= 2 &&
    estimateSyllables(ellipsisSplit[1], 'en') >= 6 &&
    (/(\.{3,}|…)$/.test(cleanCandidate) ||
      candidateSyllables <= Math.floor(sourceSyllables * 0.55))
  ) {
    return true
  }

  return false
}

/**
 * Determine whether a stored translation is properly timed and complete for a shot.
 * Rejects truncated fragments (e.g. "Ella", "Ella sabía que yo huiría...") and
 * unadapted literal translations that overflow the shot's syllable budget.
 */
export function isStoredTranslationTimedForShot(
  englishLine: string,
  storedTranslatedLine: string | null | undefined,
  targetLanguage: string,
  targetDurationSeconds: number = 10.0
): boolean {
  const stored = storedTranslatedLine?.trim() || ''
  if (!stored) return false
  const english = englishLine?.trim() || ''
  if (!english) return true

  if (isTruncatedTimedTranslation(english, stored, targetLanguage)) {
    return false
  }

  const sourceSyllables = estimateSyllables(english, 'en')
  if (sourceSyllables <= 0) return true

  const storedSyllables = estimateSyllables(stored, targetLanguage)
  const window = computeTargetSyllableWindow(english, targetDurationSeconds, targetLanguage)
  if (sourceSyllables >= 14 && storedSyllables > window.maxSyllables + 4) {
    return false
  }

  return true
}
