import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { text, duration } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    console.log('[Music] ElevenLabs API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.error('[Music] Error: ElevenLabs API key not configured')
      return NextResponse.json({ error: 'Music generation API not configured' }, { status: 500 })
    }

    const durationSeconds = duration || 30  // Default 30 seconds for background music
    console.log('[Music] Generating background music:', text, 'Duration:', durationSeconds)

    const url = 'https://api.elevenlabs.io/v1/music-generation'
    
    const body = {
      text,
      duration_seconds: durationSeconds,
      prompt_influence: 0.5  // Balanced influence for music generation
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

    console.log('[Music] ElevenLabs response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[Music] ElevenLabs API failed:', response.status, errorText)
      
      // Check for quota exceeded
      if (response.status === 429 || errorText.includes('quota')) {
        return NextResponse.json({ 
          error: 'Quota exceeded', 
          details: 'ElevenLabs API quota exceeded. Please check your account.' 
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: 'Music generation failed', 
        details: errorText 
      }, { status: 502 })
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('[Music] Music generated successfully, size:', arrayBuffer.byteLength)
    
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[Music] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Music generation failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

