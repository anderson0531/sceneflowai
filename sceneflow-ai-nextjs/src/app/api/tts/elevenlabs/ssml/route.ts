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
    console.log('🔍 [SSML] API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.log('❌ [SSML] Error: TTS not configured - no API key found')
      return new Response(JSON.stringify({ error: 'TTS not configured' }), { status: 500 })
    }

    const id = typeof voiceId === 'string' && voiceId.length > 0 ? voiceId : DEFAULT_VOICE_ID
    console.log('🔍 [SSML] Using voice ID:', id, 'Text length:', text.length)

    // Wrap text in <speak> tags if not already wrapped
    const ssmlText = text.trim().startsWith('<speak>') ? text : `<speak>${text}</speak>`
    console.log('🔍 [SSML] Text:', ssmlText.substring(0, 200))

    // Use SSML endpoint (not regular text-to-speech)
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}/ssml?optimize_streaming_latency=0&output_format=mp3_44100_128`
    console.log('🔍 [SSML] Calling ElevenLabs SSML API:', url)

    const body = {
      text: ssmlText,
      model_id: 'eleven_multilingual_v2', // Required for stage direction support
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

    console.log('🔍 [SSML] ElevenLabs response status:', resp.status)

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error')
      console.log('❌ [SSML] ElevenLabs API failed:', resp.status, errText)
      return new Response(JSON.stringify({ error: 'Provider error', details: errText }), { status: 502 })
    }

    const arrayBuf = await resp.arrayBuffer()
    console.log('✅ [SSML] Audio generated, size:', arrayBuf.byteLength)
    return new Response(arrayBuf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.log('❌ [SSML] TTS failed:', e?.message || String(e))
    return new Response(JSON.stringify({ error: 'TTS failed', details: e?.message || String(e) }), { status: 500 })
  }
}

