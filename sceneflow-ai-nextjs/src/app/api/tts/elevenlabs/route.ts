import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CREDIT_COSTS, getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { AudioWatermarkService } from '@/services/AudioWatermarkService'

export const dynamic = 'force-dynamic'

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel (female)

// Calculate credit cost based on character count (30 credits per 1k chars)
function calculateTTSCreditCost(text: string): number {
  const charCount = text.length
  const baseRate = getCreditCost('ELEVENLABS')  // 30 credits per 1k chars
  // Round up to nearest 1k chars, minimum 30 credits
  const thousands = Math.max(1, Math.ceil(charCount / 1000))
  return thousands * baseRate
}

// Split text into paragraphs for parallel processing
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

// Generate audio for a single chunk
async function generateChunk(text: string, voiceId: string, apiKey: string): Promise<ArrayBuffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3&output_format=mp3_44100_128`
  
  const body = {
    text,
    model_id: 'eleven_flash_v2_5', // Fastest flash model for minimum latency
    voice_settings: {
      stability: 0.25,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true,
    },
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'Unknown error')
    throw new Error(`ElevenLabs API failed: ${resp.status} - ${errText}`)
  }

  return resp.arrayBuffer()
}

// Concatenate MP3 audio buffers (simple concatenation works for same-format MP3s)
function concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset)
    offset += buf.byteLength
  }
  return result.buffer
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    const userId = session.user.id

    const { text, voiceId, parallel = true, projectId, sceneId, voiceName, isClonedVoice = false } = await request.json()

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    }

    // Calculate credit cost based on text length
    const CREDIT_COST = calculateTTSCreditCost(text)
    
    // Credit pre-check
    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return new Response(JSON.stringify({ 
        error: 'INSUFFICIENT_CREDITS',
        message: `This operation requires ${CREDIT_COST} credits (${text.length} chars). You have ${breakdown.total_credits}.`,
        required: CREDIT_COST,
        available: breakdown.total_credits
      }), { status: 402 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      console.log('❌ Error: TTS not configured - no API key found')
      return new Response(JSON.stringify({ error: 'TTS not configured' }), { status: 500 })
    }

    const id = typeof voiceId === 'string' && voiceId.length > 0 ? voiceId : DEFAULT_VOICE_ID
    
    // Split into paragraphs for parallel processing
    const paragraphs = splitIntoParagraphs(text)
    
    // If only one paragraph or parallel disabled, process as single request
    if (paragraphs.length <= 1 || !parallel) {
      console.log('🎤 TTS: Single chunk processing')
      const audioBuffer = await generateChunk(text, id, apiKey)
      
      // Create provenance and watermark the audio
      const provenance = AudioWatermarkService.createProvenance({
        audioData: Buffer.from(audioBuffer),
        voiceType: isClonedVoice ? 'cloned' : 'stock',
        voiceId: id,
        voiceName,
        userId,
        projectId,
        sceneId,
        inputText: text
      })
      
      const watermarkedAudio = AudioWatermarkService.embedWatermarkMP3(
        Buffer.from(audioBuffer),
        provenance
      )
      
      // Charge credits after successful generation
      try {
        await CreditService.charge(
          userId,
          CREDIT_COST,
          'ai_usage',
          null,
          { operation: 'elevenlabs_tts', charCount: text.length, voiceId: id }
        )
        console.log(`🎤 TTS: Charged ${CREDIT_COST} credits to user ${userId}`)
      } catch (chargeError: any) {
        console.error('🎤 TTS: Failed to charge credits:', chargeError)
      }
      
      return new Response(watermarkedAudio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
          'X-SceneFlow-Provenance': provenance.contentHash.substring(0, 16),
        },
      })
    }

    // Parallel processing - limit to 3 concurrent requests (Starter tier safe)
    const CONCURRENCY_LIMIT = 3
    console.log(`🎤 TTS: Parallel processing ${paragraphs.length} paragraphs (max ${CONCURRENCY_LIMIT} concurrent)`)
    
    const audioBuffers: ArrayBuffer[] = []
    
    // Process in batches if more paragraphs than concurrency limit
    for (let i = 0; i < paragraphs.length; i += CONCURRENCY_LIMIT) {
      const batch = paragraphs.slice(i, i + CONCURRENCY_LIMIT)
      const batchResults = await Promise.all(
        batch.map(paragraph => generateChunk(paragraph, id, apiKey))
      )
      audioBuffers.push(...batchResults)
    }
    
    // Concatenate all audio chunks
    const combinedAudio = concatenateAudioBuffers(audioBuffers)
    console.log(`✅ TTS: Combined ${paragraphs.length} chunks, total size: ${combinedAudio.byteLength}`)
    
    // Create provenance and watermark the combined audio
    const provenance = AudioWatermarkService.createProvenance({
      audioData: Buffer.from(combinedAudio),
      voiceType: isClonedVoice ? 'cloned' : 'stock',
      voiceId: id,
      voiceName,
      userId,
      projectId,
      sceneId,
      inputText: text
    })
    
    const watermarkedAudio = AudioWatermarkService.embedWatermarkMP3(
      Buffer.from(combinedAudio),
      provenance
    )
    
    // Charge credits after successful generation
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'elevenlabs_tts', charCount: text.length, voiceId: id, chunks: paragraphs.length }
      )
      console.log(`🎤 TTS: Charged ${CREDIT_COST} credits to user ${userId}`)
    } catch (chargeError: any) {
      console.error('🎤 TTS: Failed to charge credits:', chargeError)
    }
    
    return new Response(watermarkedAudio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-SceneFlow-Provenance': provenance.contentHash.substring(0, 16),
      },
    })
  } catch (e: any) {
    console.log('❌ Error: TTS failed:', e?.message || String(e))
    return new Response(JSON.stringify({ error: 'TTS failed', details: e?.message || String(e) }), { status: 500 })
  }
}
