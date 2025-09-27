import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

type Block = { who: string; text: string }

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) return new Response(JSON.stringify({ error: 'TTS not configured' }), { status: 500 })

    const { blocks, voiceMap, narratorVoiceId } = await req.json()
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return new Response(JSON.stringify({ error: 'No blocks provided' }), { status: 400 })
    }

    const encoder = new TextEncoder()
    const boundary = '--SFBND--'

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const b of blocks as Block[]) {
          const text = String(b.text || '').trim()
          if (!text) continue
          const who = String(b.who || 'Narrator')
          const voiceId = (voiceMap?.[who] || (who === 'Narrator' ? narratorVoiceId : '')) || '21m00Tcm4TlvDq8ikWAM'
          const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=0&output_format=mp3_44100_128`
          const body = { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.25, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true } }
          const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey, Accept: 'audio/mpeg' }, body: JSON.stringify(body) })
          if (!resp.ok) {
            const err = await resp.text().catch(()=> 'error')
            controller.enqueue(encoder.encode(`${boundary}\nERR:${who}:${err}\n`))
            continue
          }
          const buf = new Uint8Array(await resp.arrayBuffer())
          controller.enqueue(encoder.encode(`${boundary}\nMETA:${who}:${buf.byteLength}\n`))
          controller.enqueue(buf)
        }
        controller.close()
      }
    })

    return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' } })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: 'TableRead failed', details: e?.message || 'unknown' }), { status: 500 })
  }
}




