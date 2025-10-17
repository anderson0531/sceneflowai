import { NextRequest, NextResponse } from 'next/server'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

export const dynamic = 'force-dynamic'

// Cache for voice list (valid for 1 hour)
let cachedVoices: any[] | null = null
let cacheTime: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    
    if (!apiKey) {
      console.error('[Google Voices] Error: Google API key not configured')
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }

    // Check cache
    const now = Date.now()
    if (cachedVoices && (now - cacheTime) < CACHE_DURATION) {
      console.log('[Google Voices] Returning cached voices')
      return NextResponse.json({ voices: cachedVoices })
    }

    console.log('[Google Voices] Fetching voice list from Google')

    // Initialize the Text-to-Speech client
    const client = new TextToSpeechClient({
      apiKey: apiKey,
    })

    // Fetch available voices
    const [response] = await client.listVoices({})

    if (!response.voices) {
      console.error('[Google Voices] No voices returned from API')
      return NextResponse.json({ error: 'No voices available' }, { status: 500 })
    }

    // Format voices for frontend consumption
    // Prioritize Neural2 and WaveNet voices, filter English voices for better UX
    const formattedVoices = response.voices
      .filter((voice) => {
        // Include all Neural2, WaveNet, and Studio voices
        const name = voice.name || ''
        return name.includes('Neural2') || name.includes('Wavenet') || name.includes('Studio')
      })
      .map((voice) => ({
        id: voice.name || '',
        name: formatVoiceName(voice.name || ''),
        language: voice.languageCodes?.[0] || 'en-US',
        gender: voice.ssmlGender || 'NEUTRAL',
        type: getVoiceType(voice.name || ''),
      }))
      .sort((a, b) => {
        // Sort: English first, then by type (Neural2, Studio, WaveNet), then by name
        if (a.language.startsWith('en') && !b.language.startsWith('en')) return -1
        if (!a.language.startsWith('en') && b.language.startsWith('en')) return 1
        if (a.type !== b.type) return a.type.localeCompare(b.type)
        return a.name.localeCompare(b.name)
      })

    // Update cache
    cachedVoices = formattedVoices
    cacheTime = now

    console.log('[Google Voices] Found', formattedVoices.length, 'voices')

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

function formatVoiceName(voiceName: string): string {
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
    'ES-ES': 'Spanish (ES)',
    'ES-US': 'Spanish (US)',
    'FR-FR': 'French',
    'DE-DE': 'German',
    'IT-IT': 'Italian',
    'JA-JP': 'Japanese',
    'KO-KR': 'Korean',
    'ZH-CN': 'Chinese (CN)',
  }

  const localeName = localeNames[locale] || locale
  return `${localeName} - ${type} ${variant}`.trim()
}

function getVoiceType(voiceName: string): string {
  if (voiceName.includes('Neural2')) return 'Neural2'
  if (voiceName.includes('Studio')) return 'Studio'
  if (voiceName.includes('Wavenet')) return 'WaveNet'
  return 'Standard'
}

