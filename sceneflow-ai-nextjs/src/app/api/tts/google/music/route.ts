import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for music generation

export async function POST(request: NextRequest) {
  try {
    const { text, duration } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    console.log('[Google Music] API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.error('[Google Music] Error: Google/Gemini API key not configured')
      return NextResponse.json({ error: 'Music generation API not configured' }, { status: 500 })
    }

    const durationSeconds = duration || 30
    console.log('[Google Music] Generating music:', { text, duration: durationSeconds })

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Note: As of now, Lyria RealTime API is experimental and may require special access
    // This implementation uses the standard Gemini API approach
    // Once Lyria RealTime API is fully available, update to use client.live.music.connect()
    
    try {
      // Attempt to use music generation (experimental feature)
      // For now, we'll return an informative error since Lyria API isn't publicly available yet
      
      console.warn('[Google Music] Lyria RealTime API is experimental and may not be available')
      console.warn('[Google Music] Falling back to placeholder response')
      
      // TODO: Update this when Lyria RealTime API becomes publicly available
      // Expected API usage:
      // const musicSession = await genAI.live.music.connect({
      //   prompt: text,
      //   duration: durationSeconds
      // })
      // const audioData = await musicSession.generate()
      
      return NextResponse.json({ 
        error: 'Music generation not yet available',
        details: 'Google Lyria RealTime API is currently experimental. Please check back later or contact support for early access.',
        fallback: 'Consider using background music libraries or keeping ElevenLabs for music generation.'
      }, { status: 501 })
      
    } catch (musicError: any) {
      console.error('[Google Music] Lyria API error:', musicError)
      throw musicError
    }

  } catch (error: any) {
    console.error('[Google Music] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Music generation failed', 
      details: error?.message || String(error)
    }, { status: 500 })
  }
}

