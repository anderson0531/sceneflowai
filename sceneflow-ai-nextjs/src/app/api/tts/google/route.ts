import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Default voice if none specified
const DEFAULT_VOICE = 'en-US-Neural2-F'

// Voice ID mapping from common ElevenLabs-style IDs to Google voices
const VOICE_MAPPING: Record<string, string> = {
  // Female voices
  'rachel': 'en-US-Neural2-F',
  'bella': 'en-US-Neural2-C',
  'domi': 'en-US-Neural2-E',
  'elli': 'en-US-Neural2-G',
  // Male voices
  'adam': 'en-US-Neural2-D',
  'antoni': 'en-US-Neural2-A',
  'arnold': 'en-US-Neural2-I',
  'josh': 'en-US-Neural2-J',
  // Default mapping
  '21m00Tcm4TlvDq8ikWAM': 'en-US-Neural2-F', // Rachel default from ElevenLabs
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    console.log('[Google TTS] API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.error('[Google TTS] Error: Google API key not configured')
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }

    // Map voice ID to Google voice name
    let googleVoice = DEFAULT_VOICE
    if (voiceId) {
      const lowercaseVoiceId = voiceId.toLowerCase()
      googleVoice = VOICE_MAPPING[lowercaseVoiceId] || voiceId
    }
    
    console.log('[Google TTS] Generating speech:', { text: text.substring(0, 50), voice: googleVoice })

    // Use REST API instead of client library
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`
    
    const languageCode = googleVoice.split('-').slice(0, 2).join('-') // e.g., 'en-US'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: googleVoice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Google TTS] REST API error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'TTS failed', 
        details: errorText 
      }, { status: 502 })
    }

    const data = await response.json()
    
    if (!data.audioContent) {
      console.error('[Google TTS] No audio content in response')
      return NextResponse.json({ error: 'No audio generated' }, { status: 500 })
    }

    // audioContent is base64 encoded
    const audioBuffer = Buffer.from(data.audioContent, 'base64')
    console.log('[Google TTS] Audio generated successfully, size:', audioBuffer.length)

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[Google TTS] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'TTS failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

