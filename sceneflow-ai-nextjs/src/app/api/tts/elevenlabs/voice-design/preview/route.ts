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

    // Determine if we should auto-generate text or use provided/default text
    // ElevenLabs requires text to be 100-1000 characters
    const useAutoGenerate = !previewText || previewText.length < 100
    
    const requestBody: Record<string, any> = {
      voice_description: voiceDescription,
    }
    
    if (useAutoGenerate) {
      // Let ElevenLabs generate appropriate text for the voice
      requestBody.auto_generate_text = true
    } else {
      // Use provided text (must be 100-1000 chars)
      requestBody.text = previewText.length > 1000 ? previewText.substring(0, 1000) : previewText
    }

    // Call ElevenLabs Voice Design API
    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-voice/create-previews`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
        // Parse the error for more helpful message
        let errorMessage = 'Invalid request. Please provide a more detailed voice description.'
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.detail) {
            const details = Array.isArray(errorData.detail) ? errorData.detail : [errorData.detail]
            const messages = details.map((d: any) => d.msg || d.message || JSON.stringify(d))
            errorMessage = messages.join('. ')
          }
        } catch (e) {
          // Use default error message
        }
        return NextResponse.json(
          { error: errorMessage },
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
