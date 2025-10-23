import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ 
      enabled: false, 
      error: 'ElevenLabs API key not configured' 
    })
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        enabled: false, 
        error: `ElevenLabs API error: ${response.status}` 
      })
    }
    
    const data = await response.json()
    
    // Transform ElevenLabs voices to match our Voice interface
    const voices = data.voices?.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      description: voice.description,
      category: voice.category,
      labels: voice.labels,
      previewUrl: voice.preview_url,
      language: voice.labels?.language,
      gender: voice.labels?.gender,
      age: voice.labels?.age,
      useCase: voice.labels?.use_case,
      accent: voice.labels?.accent
    })) || []
    
    return NextResponse.json({ 
      enabled: true, 
      voices 
    })
  } catch (error: any) {
    console.error('[ElevenLabs Voices] Error:', error)
    return NextResponse.json({ 
      enabled: false, 
      error: error.message 
    })
  }
}