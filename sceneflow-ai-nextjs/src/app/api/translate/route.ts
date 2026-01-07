import { NextRequest, NextResponse } from 'next/server'

// Google Cloud Translation API
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2'

interface TranslateRequest {
  text?: string
  texts?: string[]
  targetLanguage: string
  sourceLanguage?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json()
    const { text, texts, targetLanguage, sourceLanguage = 'en' } = body

    console.log('[Translate API] Request received:', {
      targetLanguage,
      sourceLanguage,
      hasText: !!text,
      hasTexts: !!texts,
      textPreview: text?.substring(0, 50) || texts?.[0]?.substring(0, 50)
    })

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 })
    }

    // Skip translation if target is same as source
    if (targetLanguage === sourceLanguage) {
      console.log('[Translate API] Skipping - target equals source')
      if (texts) {
        return NextResponse.json({ translatedTexts: texts })
      }
      return NextResponse.json({ translatedText: text })
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error('[Translate API] ⚠️ NO GOOGLE API KEY FOUND - Translation will not work!')
      console.error('[Translate API] Set GOOGLE_TRANSLATE_API_KEY or GOOGLE_API_KEY in environment')
      // Fallback: return original text with warning flag
      if (texts) {
        return NextResponse.json({ translatedTexts: texts, warning: 'API key not configured' })
      }
      return NextResponse.json({ translatedText: text, warning: 'API key not configured' })
    }

    console.log('[Translate API] Using API key:', apiKey.substring(0, 8) + '...')

    // Handle batch translation
    if (texts && Array.isArray(texts) && texts.length > 0) {
      console.log('[Translate API] Batch translating', texts.length, 'texts to', targetLanguage)
      const results = await translateBatch(texts, targetLanguage, sourceLanguage, apiKey)
      console.log('[Translate API] Batch translation complete')
      return NextResponse.json({ translatedTexts: results })
    }

    // Handle single text translation
    if (text) {
      console.log('[Translate API] Single translating to', targetLanguage, ':', text?.substring(0, 50))
      const result = await translateSingle(text, targetLanguage, sourceLanguage, apiKey)
      console.log('[Translate API] Single translation result:', result?.substring(0, 50))
      return NextResponse.json({ translatedText: result })
    }

    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  } catch (error) {
    console.error('[Translate API] Error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}

async function translateSingle(
  text: string,
  targetLanguage: string,
  sourceLanguage: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch(`${GOOGLE_TRANSLATE_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        source: sourceLanguage,
        format: 'text',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Translate API] Google API error:', errorData)
      return text // Return original on error
    }

    const data = await response.json()
    return data.data?.translations?.[0]?.translatedText || text
  } catch (error) {
    console.error('[Translate API] Single translation error:', error)
    return text
  }
}

async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string,
  apiKey: string
): Promise<string[]> {
  try {
    // Google Translate API accepts array of strings via multiple 'q' parameters
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
      return texts // Return originals on error
    }

    const data = await response.json()
    const translations = data.data?.translations || []
    
    return texts.map((originalText, index) => {
      return translations[index]?.translatedText || originalText
    })
  } catch (error) {
    console.error('[Translate API] Batch translation error:', error)
    return texts
  }
}
