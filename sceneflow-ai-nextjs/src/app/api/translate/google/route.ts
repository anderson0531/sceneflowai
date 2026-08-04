import { NextRequest, NextResponse } from 'next/server'
import { resolveTranslateApiKey } from '@/lib/i18n/translateApiKey'
import { translateRawText } from '@/lib/i18n/contentTranslator'
import { sourceHash } from '@/lib/i18n/contentHash'

export const dynamic = 'force-dynamic'

/**
 * Single-string translation for delivery-language work: dub lines, captions,
 * narration. Callers include the script player, blueprint TTS, and the shared
 * review surfaces, so this stays unauthenticated.
 *
 * Prefer POST /api/i18n/content for interface-facing content: it is
 * authenticated, batched, and enforces field classification so generation
 * prompts cannot be translated by accident.
 *
 * Now reads through the shared `content_translations` cache, so repeated
 * playback of the same scene no longer re-bills every line.
 */
export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (targetLanguage === sourceLanguage) {
      return NextResponse.json({ translatedText: text, sourceLanguage })
    }

    // Vertex first: it shares the cache and uses service account auth, which is
    // not subject to the v2 REST key's tighter rate limits.
    try {
      const translated = await translateRawText(text, targetLanguage, sourceLanguage)
      if (translated !== text) {
        return NextResponse.json({
          translatedText: translated,
          sourceLanguage,
          cacheKey: sourceHash(text, sourceLanguage),
        })
      }
    } catch (error) {
      console.warn('[Google Translate] Vertex path failed, falling back to v2 REST:', error)
    }

    const apiKey = resolveTranslateApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: 'Translation not configured' }, { status: 500 })
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        source: sourceLanguage,
        format: 'text'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Google Translate] API error:', response.status, errorText)
      return NextResponse.json({ error: 'Translation failed', details: errorText }, { status: 502 })
    }

    const data = await response.json()
    const translatedText = data.data.translations[0].translatedText

    return NextResponse.json({ 
      translatedText,
      sourceLanguage: data.data.translations[0].detectedSourceLanguage || sourceLanguage
    })
  } catch (error: any) {
    console.error('[Google Translate] Error:', error)
    return NextResponse.json({ error: 'Translation failed', details: error.message }, { status: 500 })
  }
}
