import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { put } from '@vercel/blob'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for SFX generation

const SFX_CREDIT_COST = AUDIO_CREDITS.SOUND_EFFECT || 15 // Fallback to 15

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

    // Check for Vertex AI configuration
    const gcpProjectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
    const region = process.env.GCP_REGION || 'us-central1'
    
    console.log('[Google SFX] Vertex AI project configured:', !!gcpProjectId)
    
    if (!gcpProjectId) {
      console.error('[Google SFX] Error: Vertex AI not configured (VERTEX_PROJECT_ID required)')
      return NextResponse.json({ error: 'SFX generation API not configured' }, { status: 500 })
    }

    // Append a hint for Lyria to generate sound effects instead of music if possible
    const sfxPrompt = `Sound effect, ambiance, or foley: ${text}`
    console.log('[Google SFX] Generating SFX with Lyria:', { text: sfxPrompt })

    const accessToken = await getVertexAIAuthToken()
    // Using lyria-002 model which handles audio generation
    const modelId = 'lyria-002'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${region}/publishers/google/models/${modelId}:predict`
    
    const requestBody = {
      instances: [
        {
          prompt: sfxPrompt,
        }
      ],
      parameters: {
        sample_count: 1
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Google SFX] Lyria API failed:', response.status, errorText)
      return NextResponse.json({ 
        error: 'SFX generation failed', 
        details: errorText 
      }, { status: 502 })
    }

    const data = await response.json()
    const predictions = data?.predictions
    
    if (!predictions || predictions.length === 0) {
      console.error('[Google SFX] Unexpected response structure:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json({ error: 'Unexpected response format from Vertex AI' }, { status: 500 })
    }
    
    const prediction = predictions[0]
    // Be defensive about the field name containing the audio data
    const base64Data = prediction.bytesBase64Encoded || prediction.audioContent || prediction.audio || prediction.content
    
    if (!base64Data) {
      console.error('[Google SFX] Could not find base64 audio in prediction:', JSON.stringify(prediction).slice(0, 500))
      return NextResponse.json({ error: 'Unexpected prediction format from Vertex AI' }, { status: 500 })
    }
    
    const arrayBuffer = Buffer.from(base64Data, 'base64')
    
    console.log('[Google SFX] SFX generated successfully, size:', arrayBuffer.byteLength)
    
    // Charge credits after successful generation
    try {
      await CreditService.charge(
        userId,
        SFX_CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'google_sfx', duration: duration || 2, prompt: sfxPrompt.substring(0, 100) }
      )
      console.log(`[Google SFX] Charged ${SFX_CREDIT_COST} credits to user ${userId}`)
      
      // Track cost for reconciliation
      await trackCost(userId, 'google_sfx', SFX_CREDIT_COST, {
        projectId,
        sceneId
      })
    } catch (chargeError: any) {
      console.error('[Google SFX] Failed to charge credits:', chargeError)
    }
    
    // Optionally save to Vercel Blob for persistence
    if (saveToBlob) {
      const timestamp = Date.now()
      const filename = `audio/sfx/${projectId || 'default'}/${sceneId || 'sfx'}-${timestamp}.wav`
      const blob = await put(filename, arrayBuffer, {
        access: 'public',
        contentType: 'audio/wav',
      })
      console.log('[Google SFX] Saved to blob:', blob.url)
      return NextResponse.json({
        url: blob.url,
        size: arrayBuffer.byteLength,
        duration: duration || 2,
      })
    }
    
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[Google SFX] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'SFX generation failed', 
      details: error?.message || String(error)
    }, { status: 500 })
  }
}
