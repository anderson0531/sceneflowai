import { toGoogleTranslateCode } from '@/constants/veoLanguages'

export async function translateBlueprintNarration(
  text: string,
  targetLanguage: string,
  sourceLanguage = 'en'
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (targetLanguage === 'en' || targetLanguage.startsWith('en-')) return trimmed

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.warn('[translateBlueprintNarration] GOOGLE_API_KEY missing; using English')
    return trimmed
  }

  const target = toGoogleTranslateCode(targetLanguage)
  const source = toGoogleTranslateCode(sourceLanguage)

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: trimmed,
      target,
      source,
      format: 'text',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Translation failed: ${response.status} ${errText.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> }
  }
  const translated = data.data?.translations?.[0]?.translatedText
  return typeof translated === 'string' && translated.trim() ? translated.trim() : trimmed
}
