import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { text, duration } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const apiKey = process.env.SUNO_API_KEY
    console.log('[Suno Music] API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.error('[Suno Music] Error: Suno API key not configured')
      return NextResponse.json({ error: 'Music generation API not configured' }, { status: 500 })
    }

    const durationSeconds = duration || 30
    console.log('[Suno Music] Generating music:', { text, duration: durationSeconds })

    // Step 1: Create music generation task
    const createResponse = await fetch('https://api.sunoapi.com/v1/suno/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        custom_mode: true,
        gpt_description_prompt: text,
        make_instrumental: true, // No vocals for background music
        mv: 'chirp-v4' // Latest model
      })
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text().catch(() => 'Unknown error')
      console.error('[Suno Music] API failed:', createResponse.status, errorText)
      return NextResponse.json({ 
        error: 'Music generation failed', 
        details: errorText 
      }, { status: 502 })
    }

    const createData = await createResponse.json()
    const taskId = createData.data?.task_id || createData.task_id

    if (!taskId) {
      console.error('[Suno Music] No task ID received')
      return NextResponse.json({ error: 'No task ID received' }, { status: 500 })
    }

    console.log('[Suno Music] Task created:', taskId)

    // Step 2: Poll for completion (with timeout)
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max
    let audioUrl = null

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      
      const statusResponse = await fetch(`https://api.sunoapi.com/v1/suno/status/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        
        if (statusData.status === 'completed' && statusData.data?.audio_url) {
          audioUrl = statusData.data.audio_url
          break
        } else if (statusData.status === 'failed') {
          throw new Error('Music generation failed on Suno')
        }
      }
      
      attempts++
    }

    if (!audioUrl) {
      console.error('[Suno Music] Timeout waiting for music generation')
      return NextResponse.json({ 
        error: 'Music generation timeout',
        details: 'Please try again later'
      }, { status: 504 })
    }

    // Step 3: Fetch the audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch generated audio')
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    console.log('[Suno Music] Music generated successfully, size:', audioBuffer.byteLength)

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[Suno Music] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Music generation failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

