/**
 * Voice Design Create API Route
 * 
 * POST /api/tts/elevenlabs/voice-design/create
 * 
 * Creates a permanent custom voice from a generated preview.
 * Uses the generated_voice_id from the preview step.
 */

import { NextRequest, NextResponse } from 'next/server'

interface VoiceCreateRequest {
  voiceName: string
  voiceDescription: string
  generatedVoiceId: string
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
    const body: VoiceCreateRequest = await request.json()
    const { voiceName, voiceDescription, generatedVoiceId } = body

    if (!voiceName) {
      return NextResponse.json(
        { error: 'Voice name is required' },
        { status: 400 }
      )
    }

    if (!generatedVoiceId) {
      return NextResponse.json(
        { error: 'Generated voice ID is required. Generate a preview first.' },
        { status: 400 }
      )
    }

    console.log('[Voice Design Create] Creating voice:', voiceName, 'from preview:', generatedVoiceId)

    // Call ElevenLabs Voice Design Create API
    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-voice/create-voice-from-preview`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_name: voiceName,
        voice_description: voiceDescription || '',
        generated_voice_id: generatedVoiceId,
        // Optional: Add labels for categorization
        labels: {
          use_case: 'character_voice',
          generated_by: 'sceneflow_ai'
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Voice Design Create] ElevenLabs error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid ElevenLabs API key' },
          { status: 401 }
        )
      }
      
      if (response.status === 422) {
        return NextResponse.json(
          { error: 'Invalid request. The preview may have expired. Please generate a new preview.' },
          { status: 422 }
        )
      }
      
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    console.log('[Voice Design Create] Voice created:', data.voice_id, data.name)

    return NextResponse.json({
      success: true,
      voice: {
        id: data.voice_id,
        name: data.name,
        description: voiceDescription,
        category: 'generated',
        previewUrl: data.preview_url,
      }
    })
  } catch (error) {
    console.error('[Voice Design Create] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create voice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
