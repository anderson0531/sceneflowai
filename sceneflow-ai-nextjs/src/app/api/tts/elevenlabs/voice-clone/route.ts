/**
 * Voice Clone API Route
 * 
 * POST /api/tts/elevenlabs/voice-clone
 * 
 * Clones a voice from audio samples using ElevenLabs Instant Voice Cloning (IVC) API.
 * Accepts audio files and returns a new voice ID.
 * 
 * COMPLIANCE INTEGRATION:
 * - Requires a verified consent ID (from /api/voice/consent/complete)
 * - Validates user has voice cloning access (subscription + trust gate)
 * - Updates UserVoiceClone record with ElevenLabs voice ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { AuthService } from '../../../../../services/AuthService'
import { VoiceConsent } from '../../../../../models/VoiceConsent'
import { UserVoiceClone } from '../../../../../models/UserVoiceClone'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

/**
 * Get authenticated user ID from session or token
 */
async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  let userId: string | null = null

  try {
    const session: any = await getServerSession(authOptions as any)
    if (session?.user) {
      userId = session.user.id || null
    }
  } catch {}

  if (!userId) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (token) {
      const vr = await AuthService.verifyToken(token)
      if (vr.success && vr.user) {
        userId = vr.user.id
      }
    }
  }

  return userId
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ElevenLabs API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Authenticate user
    const userId = await getAuthenticatedUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const voiceName = formData.get('name') as string
    const description = formData.get('description') as string
    const files = formData.getAll('files') as File[]
    const consentId = formData.get('consentId') as string  // Required for compliance
    const voiceCloneId = formData.get('voiceCloneId') as string  // From consent completion

    // ========================================================================
    // COMPLIANCE CHECK: Validate consent and voice clone record
    // ========================================================================
    
    if (!consentId && !voiceCloneId) {
      return NextResponse.json(
        { 
          error: 'Voice cloning requires consent verification. Please complete the consent process first.',
          code: 'CONSENT_REQUIRED',
          helpUrl: '/api/voice/consent/initiate'
        },
        { status: 403 }
      )
    }

    // Look up the voice clone record
    let voiceClone: UserVoiceClone | null = null
    
    if (voiceCloneId) {
      voiceClone = await UserVoiceClone.findOne({
        where: { id: voiceCloneId, user_id: userId }
      })
    } else if (consentId) {
      // Find voice clone by consent ID
      voiceClone = await UserVoiceClone.findOne({
        where: { consent_id: consentId, user_id: userId }
      })
    }

    if (!voiceClone) {
      return NextResponse.json(
        { 
          error: 'Voice clone record not found. Please complete the consent verification process first.',
          code: 'VOICE_CLONE_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Verify the consent is verified
    if (voiceClone.consent_id) {
      const consent = await VoiceConsent.findByPk(voiceClone.consent_id)
      if (!consent || consent.consent_status !== 'verified') {
        return NextResponse.json(
          { 
            error: 'Voice consent has not been verified. Please complete the consent process.',
            code: 'CONSENT_NOT_VERIFIED'
          },
          { status: 403 }
        )
      }
    }

    // Check if already cloned (has ElevenLabs ID)
    if (voiceClone.elevenlabs_voice_id) {
      return NextResponse.json({
        success: true,
        voice: {
          id: voiceClone.elevenlabs_voice_id,
          name: voiceClone.voice_name,
          description: description || '',
          category: 'cloned',
          alreadyCloned: true
        },
        message: 'Voice has already been cloned'
      })
    }

    // ========================================================================
    // END COMPLIANCE CHECK
    // ========================================================================

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

    // ========================================================================
    // Update UserVoiceClone record with ElevenLabs voice ID
    // ========================================================================
    
    await voiceClone.update({
      elevenlabs_voice_id: data.voice_id,
      voice_name: voiceName,  // Update name if changed
      is_active: true,
    })
    
    console.log(`[Voice Clone] Updated voice clone record ${voiceClone.id} with ElevenLabs ID: ${data.voice_id}`)

    return NextResponse.json({
      success: true,
      voice: {
        id: data.voice_id,
        name: voiceName,
        description: description || '',
        category: 'cloned',
        requiresVerification: data.requires_verification || false,
        voiceCloneId: voiceClone.id,
        consentId: voiceClone.consent_id,
      }
    })
  } catch (error) {
    console.error('[Voice Clone] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clone voice',
        code: 'CLONE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
