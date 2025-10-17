import { NextRequest } from 'next/server'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

export const dynamic = 'force-dynamic'

type Block = { who: string; text: string }

// Voice mapping for common characters
const DEFAULT_VOICE = 'en-US-Neural2-F'
const VOICE_MAPPING: Record<string, string> = {
  'rachel': 'en-US-Neural2-F',
  'bella': 'en-US-Neural2-C',
  'domi': 'en-US-Neural2-E',
  'elli': 'en-US-Neural2-G',
  'adam': 'en-US-Neural2-D',
  'antoni': 'en-US-Neural2-A',
  'arnold': 'en-US-Neural2-I',
  'josh': 'en-US-Neural2-J',
  '21m00Tcm4TlvDq8ikWAM': 'en-US-Neural2-F',
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) return new Response(JSON.stringify({ error: 'TTS not configured' }), { status: 500 })

    const { blocks, voiceMap, narratorVoiceId } = await req.json()
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return new Response(JSON.stringify({ error: 'No blocks provided' }), { status: 400 })
    }

    // Initialize Google TTS client
    const client = new TextToSpeechClient({ apiKey })

    const encoder = new TextEncoder()
    const boundary = '--SFBND--'

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const b of blocks as Block[]) {
          const text = String(b.text || '').trim()
          if (!text) continue
          const who = String(b.who || 'Narrator')
          let voiceId = (voiceMap?.[who] || (who === 'Narrator' ? narratorVoiceId : '')) || DEFAULT_VOICE
          
          // Map voice ID to Google voice name
          const lowercaseVoiceId = voiceId.toLowerCase()
          const googleVoice = VOICE_MAPPING[lowercaseVoiceId] || voiceId || DEFAULT_VOICE
          
          try {
            const [response] = await client.synthesizeSpeech({
              input: { text },
              voice: {
                languageCode: googleVoice.split('-').slice(0, 2).join('-'),
                name: googleVoice,
              },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0.0,
                volumeGainDb: 0.0,
              },
            })

            if (!response.audioContent) {
              controller.enqueue(encoder.encode(`${boundary}\nERR:${who}:No audio generated\n`))
              continue
            }

            const buf = new Uint8Array(response.audioContent as Buffer)
            controller.enqueue(encoder.encode(`${boundary}\nMETA:${who}:${buf.byteLength}\n`))
            controller.enqueue(buf)
          } catch (err: any) {
            controller.enqueue(encoder.encode(`${boundary}\nERR:${who}:${err.message || 'error'}\n`))
            continue
          }
        }
        controller.close()
      }
    })

    return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' } })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: 'TableRead failed', details: e?.message || 'unknown' }), { status: 500 })
  }
}




