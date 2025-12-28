/**
 * Voice Clone API Route
 * 
 * POST /api/tts/elevenlabs/voice-clone
 * 
 * Clones a voice from audio samples using ElevenLabs Instant Voice Cloning (IVC) API.
 * Accepts audio files and returns a new voice ID.
 */

import { NextRequest, NextResponse } from 'next/server'

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
    // Parse multipart form data
    const formData = await request.formData()
    const voiceName = formData.get('name') as string
    const description = formData.get('description') as string
    const files = formData.getAll('files') as File[]

    if (!voiceName) {
      return NextResponse.json(
        { error: 'Voice name is required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one audio file is required' },
        { status: 400 }
      )
    }

    // Validate file count (ElevenLabs accepts 1-25 samples)
    if (files.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 audio files allowed' },
        { status: 400 }
      )
    }

    // Validate file types
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg']
    for (const file of files) {
      if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: MP3, WAV, WebM, OGG` },
          { status: 400 }
        )
      }
    }

    console.log('[Voice Clone] Cloning voice:', voiceName, 'with', files.length, 'sample(s)')

    // Prepare form data for ElevenLabs
    const elevenLabsFormData = new FormData()
    elevenLabsFormData.append('name', voiceName)
    
    if (description) {
      elevenLabsFormData.append('description', description)
    }
    
    // Add labels for categorization
    elevenLabsFormData.append('labels', JSON.stringify({
      use_case: 'character_voice',
      generated_by: 'sceneflow_ai',
      type: 'cloned'
    }))
    
    // Add audio files
    for (const file of files) {
      elevenLabsFormData.append('files', file)
    }

    // Call ElevenLabs Voice Clone API
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        // Don't set Content-Type - let fetch handle multipart boundary
      },
      body: elevenLabsFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Voice Clone] ElevenLabs error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid ElevenLabs API key' },
          { status: 401 }
        )
      }
      
      if (response.status === 422) {
        let message = 'Invalid audio samples. '
        try {
          const errorData = JSON.parse(errorText)
          message += errorData.detail?.message || 'Please use clear voice recordings.'
        } catch {
          message += 'Please use clear voice recordings with minimal background noise.'
        }
        return NextResponse.json(
          { error: message },
          { status: 422 }
        )
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    console.log('[Voice Clone] Voice created:', data.voice_id)

    return NextResponse.json({
      success: true,
      voice: {
        id: data.voice_id,
        name: voiceName,
        description: description || '',
        category: 'cloned',
        requiresVerification: data.requires_verification || false
      }
    })
  } catch (error) {
    console.error('[Voice Clone] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clone voice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
