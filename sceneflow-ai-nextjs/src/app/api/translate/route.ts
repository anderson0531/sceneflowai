import { NextRequest, NextResponse } from 'next/server'
import { resolveTranslateApiKey } from '@/lib/i18n/translateApiKey'
import { translateRawTexts } from '@/lib/i18n/contentTranslator'

// Google Cloud Translation API
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2'

interface TranslateRequest {
  text?: string
  texts?: string[]
  targetLanguage: string
  sourceLanguage?: string
}

/**
 * Raw text translation, single or batch.
 *
 * Prefer POST /api/i18n/content for interface-facing content: it is
 * authenticated and enforces field classification, so generation prompts cannot
 * be translated by accident. This endpoint remains for delivery-language work
 * (dubs, captions, narration) where the caller has raw strings and no field
 * path.
 *
 * Reads through the shared `content_translations` cache before touching a
 * provider.
 */
export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json()
    const { text, texts, targetLanguage, sourceLanguage = 'en' } = body

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 })
    }

    if (targetLanguage === sourceLanguage) {
      if (texts) return NextResponse.json({ translatedTexts: texts })
      return NextResponse.json({ translatedText: text })
    }

    const inputs = texts && Array.isArray(texts) && texts.length > 0 ? texts : text ? [text] : null
    if (!inputs) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Cached Vertex path first; it shares the cache and uses service account
    // auth rather than the rate-limited v2 REST key.
    try {
      const results = await translateRawTexts(inputs, targetLanguage, sourceLanguage)
      const anyTranslated = results.some((result, index) => result !== inputs[index])
      if (anyTranslated) {
        if (texts) return NextResponse.json({ translatedTexts: results })
        return NextResponse.json({ translatedText: results[0] })
      }
    } catch (error) {
      console.warn('[Translate API] Vertex path failed, falling back to v2 REST:', error)
    }

    const apiKey = resolveTranslateApiKey()
    if (!apiKey) {
      console.error('[Translate API] No Google API key configured; returning source text')
      if (texts) {
        return NextResponse.json({ translatedTexts: texts, warning: 'API key not configured' })
      }
      return NextResponse.json({ translatedText: text, warning: 'API key not configured' })
    }

    const results = await translateBatch(inputs, targetLanguage, sourceLanguage, apiKey)
    if (texts) return NextResponse.json({ translatedTexts: results })
    return NextResponse.json({ translatedText: results[0] })
  } catch (error) {
    console.error('[Translate API] Error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}

async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string,
  apiKey: string
): Promise<string[]> {
  try {
    const response = await fetch(`${GOOGLE_TRANSLATE_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        target: targetLanguage,
        source: sourceLanguage,
        format: 'text',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Translate API] Google API batch error:', errorData)
      return texts
    }

    const data = await response.json()
    const translations = data.data?.translations || []

    return texts.map(
      (originalText, index) => translations[index]?.translatedText || originalText
    )
  } catch (error) {
    console.error('[Translate API] Batch translation error:', error)
    return texts
  }
}
