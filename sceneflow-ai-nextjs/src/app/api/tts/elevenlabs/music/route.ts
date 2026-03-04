import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'

export const dynamic = 'force-dynamic'

// Music credit cost is 25 credits per generation
const MUSIC_CREDIT_COST = AUDIO_CREDITS.MUSIC_TRACK // 25 credits

export async function POST(request: NextRequest) {
  try {
    // Get user session for credit charging
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }
    
    // Check if user has sufficient credits
    const hasCredits = await CreditService.ensureCredits(userId, MUSIC_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits', 
        required: MUSIC_CREDIT_COST,
        operation: 'music_generation'
      }, { status: 402 })
    }
    
    const { text, duration, projectId, sceneId, saveToBlob = false } = await request.json()

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
    
    // Prefix prompt with "cinematic" to ensure appropriate music style
    const cinematicPrompt = `Cinematic background music: ${text}`
    console.log('[Music] Generating cinematic music:', cinematicPrompt, 'Duration:', durationSeconds)

    const url = 'https://api.elevenlabs.io/v1/music'
    
    const body = {
      prompt: cinematicPrompt,
      music_length_ms: durationSeconds * 1000,  // Convert to milliseconds
      model_id: 'music_v1'
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
    
    // Charge credits after successful generation
    try {
      await CreditService.charge(
        userId,
        MUSIC_CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'elevenlabs_music', duration: durationSeconds, prompt: cinematicPrompt.substring(0, 100) }
      )
      console.log(`[Music] Charged ${MUSIC_CREDIT_COST} credits to user ${userId}`)
      
      // Track cost for reconciliation
      await trackCost(userId, 'elevenlabs_music', MUSIC_CREDIT_COST, {
        projectId,
        sceneId
      })
    } catch (chargeError: any) {
      console.error('[Music] Failed to charge credits:', chargeError)
      // Don't fail the request if credit charge fails - the user already got the audio
    }
    
    // Optionally save to Vercel Blob for persistence
    if (saveToBlob) {
      const timestamp = Date.now()
      const filename = `audio/music/${projectId || 'default'}/${sceneId || 'music'}-${timestamp}.mp3`
      const blob = await put(filename, Buffer.from(arrayBuffer), {
        access: 'public',
        contentType: 'audio/mpeg',
      })
      console.log('[Music] Saved to blob:', blob.url)
      return NextResponse.json({
        url: blob.url,
        size: arrayBuffer.byteLength,
        duration: durationSeconds,
      })
    }
    
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

