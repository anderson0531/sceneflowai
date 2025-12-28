/**
 * Voice Design Preview API Route
 * 
 * POST /api/tts/elevenlabs/voice-design/preview
 * 
 * Uses ElevenLabs Text-to-Voice API to generate voice previews from a description.
 * Returns multiple voice options for the user to choose from.
 */

import { NextRequest, NextResponse } from 'next/server'

interface VoiceDesignRequest {
  voiceDescription: string
  previewText?: string
}

interface VoicePreview {
  generatedVoiceId: string
  audioBase64: string
}

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ElevenLabs API key not configured' },
      { status: 500 }
    )
  }

  try {
    const body: VoiceDesignRequest = await request.json()
    const { voiceDescription, previewText } = body

    if (!voiceDescription) {
      return NextResponse.json(
        { error: 'Voice description is required' },
        { status: 400 }
      )
    }

    if (voiceDescription.length < 20) {
      return NextResponse.json(
        { error: 'Voice description must be at least 20 characters' },
        { status: 400 }
      )
    }

    if (voiceDescription.length > 1000) {
      return NextResponse.json(
        { error: 'Voice description must be less than 1000 characters' },
        { status: 400 }
      )
    }

    console.log('[Voice Design Preview] Generating previews for:', voiceDescription.substring(0, 50) + '...')

    // Call ElevenLabs Voice Design API
    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-voice/create-previews`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_description: voiceDescription,
        text: previewText || "Hello, this is a preview of my voice. I'm excited to be part of your project!",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Voice Design Preview] ElevenLabs error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid ElevenLabs API key' },
          { status: 401 }
        )
      }
      
      if (response.status === 422) {
        return NextResponse.json(
          { error: 'Invalid voice description. Please provide a more detailed description.' },
          { status: 422 }
        )
      }
      
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Transform response to our format
    const previews: VoicePreview[] = (data.previews || []).map((preview: any) => ({
      generatedVoiceId: preview.generated_voice_id,
      audioBase64: preview.audio_base_64,
    }))

    console.log('[Voice Design Preview] Generated', previews.length, 'voice previews')

    return NextResponse.json({
      success: true,
      previews,
    })
  } catch (error) {
    console.error('[Voice Design Preview] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate voice previews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
