import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Translation not configured' }, { status: 500 })
    }

    // Use Google Cloud Translation API v2 (simpler, REST-based)
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
