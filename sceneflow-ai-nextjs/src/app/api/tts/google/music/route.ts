import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for music generation

export async function POST(request: NextRequest) {
  try {
    const { text, duration } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    // Check for Vertex AI configuration
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
    console.log('[Google Music] Vertex AI project configured:', !!projectId)
    
    if (!projectId) {
      console.error('[Google Music] Error: Vertex AI not configured (VERTEX_PROJECT_ID required)')
      return NextResponse.json({ error: 'Music generation API not configured' }, { status: 500 })
    }

    const durationSeconds = duration || 30
    console.log('[Google Music] Generating music:', { text, duration: durationSeconds })

    // Note: Lyria RealTime API is experimental and may require special access
    // This implementation returns an informative error since the API isn't publicly available yet
    
    console.warn('[Google Music] Lyria RealTime API is experimental and may not be available')
    console.warn('[Google Music] Falling back to placeholder response')
    
    // TODO: Update this when Lyria RealTime API becomes publicly available via Vertex AI
    // Expected Vertex AI endpoint:
    // POST https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/lyria-realtime:predict
    
    return NextResponse.json({ 
      error: 'Music generation not yet available',
      details: 'Google Lyria RealTime API is currently experimental. Please check back later or contact support for early access.',
      fallback: 'Consider using background music libraries or keeping ElevenLabs for music generation.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('[Google Music] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Music generation failed', 
      details: error?.message || String(error)
    }, { status: 500 })
  }
}

