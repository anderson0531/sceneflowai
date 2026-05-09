import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Static voice list (ListVoices API is blocked, so we use a curated list)
const GOOGLE_VOICES = [
  // Gemini voices (Support Audio Profiles / Director's Notes)
  { name: 'gemini-Achernar', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Achernar (Gemini)' },
  { name: 'gemini-Achird', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Achird (Gemini)' },
  { name: 'gemini-Algenib', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Algenib (Gemini)' },
  { name: 'gemini-Algieba', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Algieba (Gemini)' },
  { name: 'gemini-Alnilam', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Alnilam (Gemini)' },
  { name: 'gemini-Aoede', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Aoede (Gemini)' },
  { name: 'gemini-Autonoe', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Autonoe (Gemini)' },
  { name: 'gemini-Callirrhoe', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Callirrhoe (Gemini)' },
  { name: 'gemini-Charon', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Charon (Gemini)' },
  { name: 'gemini-Despina', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Despina (Gemini)' },
  { name: 'gemini-Enceladus', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Enceladus (Gemini)' },
  { name: 'gemini-Erinome', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Erinome (Gemini)' },
  { name: 'gemini-Fenrir', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Fenrir (Gemini)' },
  { name: 'gemini-Gacrux', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Gacrux (Gemini)' },
  { name: 'gemini-Iapetus', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Iapetus (Gemini)' },
  { name: 'gemini-Kore', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Kore (Gemini)' },
  { name: 'gemini-Laomedeia', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Laomedeia (Gemini)' },
  { name: 'gemini-Leda', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Leda (Gemini)' },
  { name: 'gemini-Orus', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Orus (Gemini)' },
  { name: 'gemini-Pulcherrima', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Pulcherrima (Gemini)' },
  { name: 'gemini-Puck', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Puck (Gemini)' },
  { name: 'gemini-Rasalgethi', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Rasalgethi (Gemini)' },
  { name: 'gemini-Sadachbia', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Sadachbia (Gemini)' },
  { name: 'gemini-Sadaltager', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Sadaltager (Gemini)' },
  { name: 'gemini-Schedar', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Schedar (Gemini)' },
  { name: 'gemini-Sulafat', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Sulafat (Gemini)' },
  { name: 'gemini-Umbriel', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Umbriel (Gemini)' },
  { name: 'gemini-Vindemiatrix', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Vindemiatrix (Gemini)' },
  { name: 'gemini-Zephyr', languageCode: 'en-US', gender: 'FEMALE', type: 'Gemini', displayName: 'Zephyr (Gemini)' },
  { name: 'gemini-Zubenelgenubi', languageCode: 'en-US', gender: 'MALE', type: 'Gemini', displayName: 'Zubenelgenubi (Gemini)' },
  // Studio voices (Premium quality - ElevenLabs comparable)
  { name: 'en-US-Studio-O', languageCode: 'en-US', gender: 'FEMALE', type: 'Studio', displayName: 'Sophia (Studio)' },
  { name: 'en-US-Neural2-C', languageCode: 'en-US', gender: 'FEMALE', type: 'Neural2', displayName: 'Emma (Neural2)' },
  { name: 'en-US-Studio-M', languageCode: 'en-US', gender: 'MALE', type: 'Studio', displayName: 'Marcus (Studio)' },
  { name: 'en-US-Studio-Q', languageCode: 'en-US', gender: 'MALE', type: 'Studio', displayName: 'Quinn (Studio)' },
]

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

    // Use static voice list (ListVoices API is blocked)
    const formattedVoices = GOOGLE_VOICES.map((voice) => ({
      id: voice.name,
      name: voice.displayName || formatVoiceName(voice.name),
      language: voice.languageCode,
      gender: voice.gender,
      type: voice.type,
    }))

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

function formatVoiceName(voiceName: string, displayName?: string): string {
  // Use custom display name if provided
  if (displayName) return displayName
  
  // Convert 'en-US-Neural2-F' to 'English (US) - Neural2 F'
  const parts = voiceName.split('-')
  if (parts.length < 3) return voiceName

  const locale = parts.slice(0, 2).join('-').toUpperCase()
  const type = parts[2]
  const variant = parts[3] || ''

  const localeNames: Record<string, string> = {
    'EN-US': 'English (US)',
    'EN-GB': 'English (UK)',
    'EN-AU': 'English (AU)',
  }

  const localeName = localeNames[locale] || locale
  return `${localeName} - ${type} ${variant}`.trim()
}
