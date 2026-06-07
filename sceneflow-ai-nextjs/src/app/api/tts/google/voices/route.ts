import { NextRequest, NextResponse } from 'next/server'
import { getGeminiVoicesForApi } from '@/lib/tts/geminiVoiceCatalog'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    
    if (!apiKey) {
      console.error('[Google Voices] Error: Google API key not configured')
      return NextResponse.json({ 
        enabled: false,
        error: 'TTS not configured',
        voices: []
      }, { status: 500 })
    }

    const formattedVoices = getGeminiVoicesForApi()

    const shouldLog = process.env.NODE_ENV !== 'production' && process.env.DEBUG_TTS !== 'false'
    if (shouldLog) {
      console.log('[Google Voices] Returning', formattedVoices.length, 'static voices')
    }

    return NextResponse.json({ 
      enabled: true, 
      voices: formattedVoices 
    })
  } catch (error: any) {
    console.error('[Google Voices] Error:', error?.message || String(error))
    return NextResponse.json({ 
      enabled: false,
      error: 'Failed to fetch voices', 
      details: error?.message || String(error),
      voices: []
    }, { status: 500 })
  }
}
