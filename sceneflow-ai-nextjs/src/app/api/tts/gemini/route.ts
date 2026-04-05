import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'

export const dynamic = 'force-dynamic'

const DEFAULT_VOICE = 'Puck'

// Map of voice personalities
export const GEMINI_VOICES = [
  // Upbeat / Bright
  { id: 'Puck', name: 'Puck', description: 'Upbeat, friendly, and energetic.' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Bright, conversational, and light.' },
  { id: 'Aoede', name: 'Aoede', description: 'Warm, expressive, and engaging.' },
  { id: 'Kore', name: 'Kore', description: 'Youthful, dynamic, and clear.' },
  { id: 'Charon', name: 'Charon', description: 'Informative, articulate, and professional.' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong, authoritative, and direct.' },
  { id: 'Leda', name: 'Leda', description: 'Smooth, measured, and pleasant.' },
  { id: 'Orus', name: 'Orus', description: 'Confident, clear, and steady.' },
  { id: 'Autonoe', name: 'Autonoe', description: 'Calm, thoughtful, and composed.' },
  { id: 'Umbriel', name: 'Umbriel', description: 'Deep, resonant, and serious.' },
  // ... more standard voices
  { id: 'Erinome', name: 'Erinome', description: 'Professional narrator voice.' },
  { id: 'Laomedeia', name: 'Laomedeia', description: 'Clear and distinct articulation.' },
  { id: 'Schedar', name: 'Schedar', description: 'Warm conversational tone.' },
  { id: 'Achird', name: 'Achird', description: 'Bright and engaging delivery.' },
  { id: 'Sadachbia', name: 'Sadachbia', description: 'Smooth and expressive pacing.' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Deep and authoritative voice.' },
  { id: 'Algieba', name: 'Algieba', description: 'Professional and informative.' },
  { id: 'Algenib', name: 'Algenib', description: 'Clear and steady narration.' },
  { id: 'Achernar', name: 'Achernar', description: 'Friendly and conversational.' },
  { id: 'Gacrux', name: 'Gacrux', description: 'Energetic and upbeat tone.' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', description: 'Warm and expressive.' },
  { id: 'Sadaltager', name: 'Sadaltager', description: 'Smooth and measured pacing.' },
  { id: 'Callirrhoe', name: 'Callirrhoe', description: 'Professional and clear.' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Deep and resonant voice.' },
  { id: 'Despina', name: 'Despina', description: 'Bright and energetic delivery.' },
  { id: 'Rasalgethi', name: 'Rasalgethi', description: 'Calm and thoughtful tone.' },
  { id: 'Alnilam', name: 'Alnilam', description: 'Informative and articulate.' },
  { id: 'Pulcherrima', name: 'Pulcherrima', description: 'Warm and engaging.' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', description: 'Clear and distinct narration.' },
  { id: 'Sulafat', name: 'Sulafat', description: 'Smooth and professional.' }
]

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, instruction } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    let accessToken: string | null = null

    try {
      accessToken = await getVertexAIAuthToken()
      console.log('[Gemini TTS] Obtained Vertex AI service account token')
    } catch (authErr) {
      console.error('[Gemini TTS] Failed to get Vertex AI token:', authErr)
      return NextResponse.json({ error: 'TTS not configured (Auth failure)' }, { status: 500 })
    }

    const voiceName = voiceId || DEFAULT_VOICE
    console.log('[Gemini TTS] Generating speech:', { text: text.substring(0, 50), voice: voiceName })

    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
    const region = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
    const model = 'gemini-2.5-flash' // 2.5 Flash natively supports audio output

    if (!projectId) {
      console.error('[Gemini TTS] Missing project ID')
      return NextResponse.json({ error: 'TTS not configured (Missing project ID)' }, { status: 500 })
    }

    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`

    // Prepend instruction to steer the performance if provided
    const promptText = instruction 
      ? `Instruction: ${instruction}\n\nRead the following text out loud:\n\n${text}`
      : `Read the following text out loud exactly as written:\n\n${text}`

    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini TTS] Vertex API error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'TTS failed', 
        details: errorText 
      }, { status: 502 })
    }

    const data = await response.json()
    
    // Extract inlineData from the response parts
    const parts = data.candidates?.[0]?.content?.parts || []
    const audioPart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'))

    if (!audioPart || !audioPart.inlineData?.data) {
      console.error('[Gemini TTS] No audio content in response')
      return NextResponse.json({ error: 'No audio generated by the model' }, { status: 500 })
    }

    // The data is base64 encoded PCM or WAV typically, check mimeType
    const mimeType = audioPart.inlineData.mimeType
    const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64')
    console.log(`[Gemini TTS] Audio generated successfully, type: ${mimeType}, size: ${audioBuffer.length}`)

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[Gemini TTS] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'TTS failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}