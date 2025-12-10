import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel (female)

// Split text into paragraphs for parallel processing
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

// Generate audio for a single chunk
async function generateChunk(text: string, voiceId: string, apiKey: string): Promise<ArrayBuffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3&output_format=mp3_44100_128`
  
  const body = {
    text,
    model_id: 'eleven_flash_v2_5', // Fastest flash model for minimum latency
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

  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'Unknown error')
    throw new Error(`ElevenLabs API failed: ${resp.status} - ${errText}`)
  }

  return resp.arrayBuffer()
}

// Concatenate MP3 audio buffers (simple concatenation works for same-format MP3s)
function concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset)
    offset += buf.byteLength
  }
  return result.buffer
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, parallel = true } = await request.json()

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      console.log('❌ Error: TTS not configured - no API key found')
      return new Response(JSON.stringify({ error: 'TTS not configured' }), { status: 500 })
    }

    const id = typeof voiceId === 'string' && voiceId.length > 0 ? voiceId : DEFAULT_VOICE_ID
    
    // Split into paragraphs for parallel processing
    const paragraphs = splitIntoParagraphs(text)
    
    // If only one paragraph or parallel disabled, process as single request
    if (paragraphs.length <= 1 || !parallel) {
      console.log('🎤 TTS: Single chunk processing')
      const audioBuffer = await generateChunk(text, id, apiKey)
      return new Response(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      })
    }

    // Parallel processing - limit to 3 concurrent requests (Starter tier safe)
    const CONCURRENCY_LIMIT = 3
    console.log(`🎤 TTS: Parallel processing ${paragraphs.length} paragraphs (max ${CONCURRENCY_LIMIT} concurrent)`)
    
    const audioBuffers: ArrayBuffer[] = []
    
    // Process in batches if more paragraphs than concurrency limit
    for (let i = 0; i < paragraphs.length; i += CONCURRENCY_LIMIT) {
      const batch = paragraphs.slice(i, i + CONCURRENCY_LIMIT)
      const batchResults = await Promise.all(
        batch.map(paragraph => generateChunk(paragraph, id, apiKey))
      )
      audioBuffers.push(...batchResults)
    }
    
    // Concatenate all audio chunks
    const combinedAudio = concatenateAudioBuffers(audioBuffers)
    console.log(`✅ TTS: Combined ${paragraphs.length} chunks, total size: ${combinedAudio.byteLength}`)
    
    return new Response(combinedAudio, {
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
