import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { text, duration } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    console.log('[SFX] ElevenLabs API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.error('[SFX] Error: ElevenLabs API key not configured')
      return NextResponse.json({ error: 'Sound effects API not configured' }, { status: 500 })
    }

    const durationSeconds = duration || 2.0  // Default 2 seconds for SFX
    console.log('[SFX] Generating sound effect:', text, 'Duration:', durationSeconds)

    const url = 'https://api.elevenlabs.io/v1/sound-generation'
    
    const body = {
      text,
      duration_seconds: durationSeconds,
      prompt_influence: 0.3  // Lower influence for more natural sound effects
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    })

    console.log('[SFX] ElevenLabs response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[SFX] ElevenLabs API failed:', response.status, errorText)
      
      // Check for quota exceeded
      if (response.status === 429 || errorText.includes('quota')) {
        return NextResponse.json({ 
          error: 'Quota exceeded', 
          details: 'ElevenLabs API quota exceeded. Please check your account.' 
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: 'Sound effect generation failed', 
        details: errorText 
      }, { status: 502 })
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('[SFX] Sound effect generated successfully, size:', arrayBuffer.byteLength)
    
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[SFX] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Sound effect generation failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

