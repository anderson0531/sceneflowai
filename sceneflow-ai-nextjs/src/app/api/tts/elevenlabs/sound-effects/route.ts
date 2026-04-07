import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'

export const dynamic = 'force-dynamic'

// SFX credit cost is 15 credits per generation
const SFX_CREDIT_COST = AUDIO_CREDITS.SOUND_EFFECT // 15 credits

export async function POST(request: NextRequest) {
  try {
    // Get user session for credit charging
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }
    
    // Check if user has sufficient credits
    const hasCredits = await CreditService.ensureCredits(userId, SFX_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits', 
        required: SFX_CREDIT_COST,
        operation: 'sound_effect_generation'
      }, { status: 402 })
    }
    
    const { text, duration, projectId, sceneId, saveToBlob = false } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    console.log('[SFX] ElevenLabs API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.error('[SFX] Error: ElevenLabs API key not configured')
      return NextResponse.json({ error: 'Sound effects API not configured' }, { status: 500 })
    }

    const durationSeconds = duration || 2.0  // Default 2 seconds for SFX
    console.log('[SFX] Generating sound effect:', text, 'Duration:', durationSeconds)

    const url = 'https://api.elevenlabs.io/v1/sound-generation'
    
    const body = {
      text,
      duration_seconds: durationSeconds,
      prompt_influence: 0.3  // Lower influence for more natural sound effects
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

    console.log('[SFX] ElevenLabs response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[SFX] ElevenLabs API failed:', response.status, errorText)
      
      // Check for quota exceeded
      if (response.status === 429 || errorText.includes('quota')) {
        return NextResponse.json({ 
          error: 'Quota exceeded', 
          details: 'ElevenLabs API quota exceeded. Please check your account.' 
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: 'Sound effect generation failed', 
        details: errorText 
      }, { status: 502 })
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('[SFX] Sound effect generated successfully, size:', arrayBuffer.byteLength)
    
    // Charge credits after successful generation
    try {
      await CreditService.charge(
        userId,
        SFX_CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'elevenlabs_sfx', duration: durationSeconds, prompt: text.substring(0, 100) }
      )
      console.log(`[SFX] Charged ${SFX_CREDIT_COST} credits to user ${userId}`)
      
      // Track cost for reconciliation
      await trackCost(userId, 'elevenlabs_sfx', SFX_CREDIT_COST, { 
        projectId,
        sceneId
      })
    } catch (chargeError: any) {
      console.error('[SFX] Failed to charge credits:', chargeError)
      // Don't fail the request if credit charge fails - the user already got the audio
    }
    
    // Optionally save to Vercel Blob for persistence
    if (saveToBlob) {
      const timestamp = Date.now()
      const filename = `audio/sfx/${projectId || 'default'}/${sceneId || 'sfx'}-${timestamp}.mp3`
      const blob = await put(filename, Buffer.from(arrayBuffer), {
        access: 'public',
        contentType: 'audio/mpeg',
      })
      console.log('[SFX] Saved to blob:', blob.url)
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
    console.error('[SFX] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Sound effect generation failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

