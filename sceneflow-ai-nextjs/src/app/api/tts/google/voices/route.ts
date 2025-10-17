import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Static voice list (ListVoices API is blocked, so we use a curated list)
const GOOGLE_VOICES = [
  // Neural2 voices (High quality)
  { name: 'en-US-Neural2-F', languageCode: 'en-US', gender: 'FEMALE', type: 'Neural2', displayName: 'Rachel (Neural2)' },
  { name: 'en-US-Neural2-C', languageCode: 'en-US', gender: 'FEMALE', type: 'Neural2', displayName: 'Isabella (Neural2)' },
  { name: 'en-US-Neural2-E', languageCode: 'en-US', gender: 'FEMALE', type: 'Neural2', displayName: 'Aria (Neural2)' },
  { name: 'en-US-Neural2-G', languageCode: 'en-US', gender: 'FEMALE', type: 'Neural2', displayName: 'Charlotte (Neural2)' },
  { name: 'en-US-Neural2-H', languageCode: 'en-US', gender: 'FEMALE', type: 'Neural2', displayName: 'Olivia (Neural2)' },
  { name: 'en-US-Neural2-A', languageCode: 'en-US', gender: 'MALE', type: 'Neural2', displayName: 'Alexander (Neural2)' },
  { name: 'en-US-Neural2-D', languageCode: 'en-US', gender: 'MALE', type: 'Neural2', displayName: 'David (Neural2)' },
  { name: 'en-US-Neural2-I', languageCode: 'en-US', gender: 'MALE', type: 'Neural2', displayName: 'Isaac (Neural2)' },
  { name: 'en-US-Neural2-J', languageCode: 'en-US', gender: 'MALE', type: 'Neural2', displayName: 'Joseph (Neural2)' },
  
  // WaveNet voices (Good quality)
  { name: 'en-US-Wavenet-A', languageCode: 'en-US', gender: 'MALE', type: 'WaveNet', displayName: 'Andrew (WaveNet)' },
  { name: 'en-US-Wavenet-B', languageCode: 'en-US', gender: 'MALE', type: 'WaveNet', displayName: 'Benjamin (WaveNet)' },
  { name: 'en-US-Wavenet-C', languageCode: 'en-US', gender: 'FEMALE', type: 'WaveNet', displayName: 'Catherine (WaveNet)' },
  { name: 'en-US-Wavenet-D', languageCode: 'en-US', gender: 'MALE', type: 'WaveNet', displayName: 'Daniel (WaveNet)' },
  { name: 'en-US-Wavenet-E', languageCode: 'en-US', gender: 'FEMALE', type: 'WaveNet', displayName: 'Elizabeth (WaveNet)' },
  { name: 'en-US-Wavenet-F', languageCode: 'en-US', gender: 'FEMALE', type: 'WaveNet', displayName: 'Fiona (WaveNet)' },
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

    console.log('[Google Voices] Returning', formattedVoices.length, 'static voices')

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
