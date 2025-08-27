import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel (female)

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json()

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    console.log('🔍 Debug: ELEVENLABS_API_KEY loaded:', !!apiKey)
    console.log('🔍 Debug: API Key length:', apiKey ? apiKey.length : 0)
    
    if (!apiKey) {
      console.log('❌ Error: TTS not configured - no API key found')
      return new Response(JSON.stringify({ error: 'TTS not configured' }), { status: 500 })
    }

    const id = typeof voiceId === 'string' && voiceId.length > 0 ? voiceId : DEFAULT_VOICE_ID
    console.log('🔍 Debug: Using voice ID:', id)

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}?optimize_streaming_latency=0&output_format=mp3_44100_128`
    console.log('🔍 Debug: Calling ElevenLabs API:', url)

    const body = {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.25,
        similarity_boost: 0.8,
        style: 0.5,
        use_speaker_boost: true,
      },
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    })

    console.log('🔍 Debug: ElevenLabs response status:', resp.status)

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error')
      console.log('❌ Error: ElevenLabs API failed:', resp.status, errText)
      return new Response(JSON.stringify({ error: 'Provider error', details: errText }), { status: 502 })
    }

    const arrayBuf = await resp.arrayBuffer()
    console.log('✅ Success: Audio generated, size:', arrayBuf.byteLength)
    return new Response(arrayBuf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.log('❌ Error: TTS failed:', e?.message || String(e))
    return new Response(JSON.stringify({ error: 'TTS failed', details: e?.message || String(e) }), { status: 500 })
  }
}
