import { toGoogleTranslateCode } from '@/constants/veoLanguages'

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
  sourceLanguage = 'en'
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
 * Translate dialogue/narration for Veo while preserving [emotion] prefix structure.
 */
export async function translateGuideDialogueLine(
  englishText: string,
  targetLanguage: string
): Promise<string> {
  if (!englishText.trim() || targetLanguage === 'en') {
    return englishText
  }

  const { emotion, body } = splitEmotionPrefix(englishText)

  if (emotion && body) {
    const [translatedEmotion, translatedBody] = await Promise.all([
      translatePlainText(emotion, targetLanguage),
      translatePlainText(body, targetLanguage),
    ])
    return `[${translatedEmotion}] ${translatedBody}`
  }

  if (emotion && !body) {
    return `[${await translatePlainText(emotion, targetLanguage)}]`
  }

  return translatePlainText(englishText, targetLanguage)
}
