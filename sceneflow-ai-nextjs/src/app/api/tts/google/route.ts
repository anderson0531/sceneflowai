import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'

export const dynamic = 'force-dynamic'

// Default voice if none specified
const DEFAULT_VOICE = 'en-US-Journey-F'

// Voice ID mapping from common ElevenLabs-style IDs to Google voices
const VOICE_MAPPING: Record<string, string> = {
  // Female voices
  'rachel': 'en-US-Journey-F',
  'bella': 'en-US-Journey-O',
  'domi': 'en-US-Neural2-E',
  'elli': 'en-US-Neural2-G',
  // Male voices
  'adam': 'en-US-Journey-D',
  'antoni': 'en-US-Neural2-A',
  'arnold': 'en-US-Neural2-I',
  'josh': 'en-US-Neural2-J',
  // Default mapping
  '21m00Tcm4TlvDq8ikWAM': 'en-US-Journey-F', // Rachel default from ElevenLabs
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, prompt } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    let apiKey = process.env.GOOGLE_API_KEY
    let accessToken: string | null = null

    try {
      // First try to get the GCP token (Vertex AI / standard Google service account auth)
      accessToken = await getVertexAIAuthToken()
      console.log('[Google TTS] Using Vertex AI service account token')
    } catch (authErr) {
      console.log('[Google TTS] No service account token available, falling back to API key:', authErr)
    }
    
    if (!accessToken && !apiKey) {
      console.error('[Google TTS] Error: Google API key or service account not configured')
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
    let url = `https://texttospeech.googleapis.com/v1/text:synthesize`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
      // Explicitly specify the cloud project if needed via headers x-goog-user-project, but bearer is enough
    } else if (apiKey) {
      url += `?key=${apiKey}`
    }
    
    const isGemini = googleVoice.startsWith('gemini-')
    const isCustomClone = !isGemini && !googleVoice.includes('-') && googleVoice.length > 20 // Custom clone keys are typically long alphanumeric strings
    
    const actualVoiceName = isGemini ? googleVoice.replace('gemini-', '') : googleVoice
    const languageCode = actualVoiceName.split('-').length >= 2 && !isGemini && !isCustomClone
      ? actualVoiceName.split('-').slice(0, 2).join('-') 
      : 'en-US'
    
    const payload: any = {
      input: { text },
      voice: {
        languageCode,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    }

    if (isCustomClone) {
      // Use Voice Cloning Key
      payload.voice.voiceClone = {
        voiceCloningKey: actualVoiceName
      }
    } else {
      payload.voice.name = actualVoiceName
    }

    if (isGemini) {
      payload.voice.modelName = 'gemini-2.5-flash-tts'
      if (prompt) {
        payload.input.prompt = `INSTRUCTION: You are a voice actor. Do not read this instruction aloud. Adopt the following voice profile precisely: ${prompt}`
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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

