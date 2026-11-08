import { toGoogleTranslateCode } from '@/constants/veoLanguages'
import { preserveLeadingPerformanceCue } from '@/lib/translation/timedDialogueMetrics'

export interface TranslateGuideDialogueOptions {
  /** Target shot duration in seconds (default 10.0s for Veo/Kling dialogue shots). */
  targetDurationSeconds?: number
  sourceDurationSeconds?: number
  maxTargetSyllables?: number
  /**
   * When true (default), uses Timed Dialogue Adaptation & Translation so expanded
   * languages (e.g. Spanish) are rewritten to fit the shot duration while preserving
   * emotion, subtext, ellipses, and bracketed performance cues.
   * Set false for literal translation of on-screen signage or title cards.
   */
  adaptForTiming?: boolean
}

/**
 * Split leading [emotion, tags] from dialogue body.
 * Example: "[urgent, direct] Hello world" → emotion + body
 */
export function splitEmotionPrefix(text: string): { emotion: string | null; body: string } {
  const trimmed = text.trim()
  const match = trimmed.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (!match) {
    return { emotion: null, body: trimmed }
  }
  return { emotion: match[1].trim(), body: match[2].trim() }
}

export async function translatePlainText(
  text: string,
  targetLanguage: string,
  sourceLanguage = 'en',
  options?: TranslateGuideDialogueOptions
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return text
  if (targetLanguage === 'en' || targetLanguage === sourceLanguage) {
    return text
  }

  const target = toGoogleTranslateCode(targetLanguage)
  const source = toGoogleTranslateCode(sourceLanguage)

  const response = await fetch('/api/translate/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: trimmed,
      targetLanguage: target,
      sourceLanguage: source,
      ...(options?.adaptForTiming
        ? {
            adaptForTiming: true,
            targetDurationSeconds: options.targetDurationSeconds ?? 10.0,
            ...(options.sourceDurationSeconds
              ? { sourceDurationSeconds: options.sourceDurationSeconds }
              : {}),
            ...(options.maxTargetSyllables
              ? { maxTargetSyllables: options.maxTargetSyllables }
              : {}),
          }
        : {}),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || 'Translation failed')
  }

  const data = await response.json()
  return data.translatedText as string
}

/**
 * Translate and adapt dialogue/narration for Veo/Kling shots while preserving
 * leading `[emotion, delivery]` performance cues in English and fitting the
 * shot's target duration (default 10.0s).
 */
export async function translateGuideDialogueLine(
  englishText: string,
  targetLanguage: string,
  options?: TranslateGuideDialogueOptions
): Promise<string> {
  const trimmed = englishText.trim()
  if (!trimmed || targetLanguage === 'en') {
    return englishText
  }

  const { emotion, body } = splitEmotionPrefix(trimmed)

  if (emotion && !body) {
    return `[${emotion}]`
  }

  const adaptForTiming = options?.adaptForTiming !== false

  if (adaptForTiming) {
    const adapted = await translatePlainText(trimmed, targetLanguage, 'en', {
      ...options,
      adaptForTiming: true,
      targetDurationSeconds: options?.targetDurationSeconds ?? 10.0,
    })
    return preserveLeadingPerformanceCue(trimmed, adapted)
  }

  const translatedBody = await translatePlainText(body || trimmed, targetLanguage, 'en', {
    adaptForTiming: false,
  })
  return emotion ? `[${emotion}] ${translatedBody}` : translatedBody
}
