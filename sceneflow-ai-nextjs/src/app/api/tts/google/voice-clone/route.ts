import { NextRequest, NextResponse } from 'next/server'
import { tryMintGoogleVoiceCloningKey } from '@/lib/continuity/voiceDnaService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const consentAudioFile = formData.get('consentAudio') as File | null
    const files = formData.getAll('files') as File[]
    const languageCode = String(formData.get('languageCode') || 'en-US').trim()
    const displayName = String(formData.get('name') || 'Google Custom Voice').trim()

    if (!consentAudioFile) {
      return NextResponse.json(
        { error: 'Consent audio is required for Google Voice Cloning' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Training audio samples are required' },
        { status: 400 }
      )
    }

    const [consentBuffer, referenceBuffer] = await Promise.all([
      consentAudioFile.arrayBuffer().then((b) => Buffer.from(b)),
      files[0].arrayBuffer().then((b) => Buffer.from(b)),
    ])

    const result = await tryMintGoogleVoiceCloningKey({
      referenceWavBuffer: referenceBuffer,
      consentAudioBuffer: consentBuffer,
      localeOrLanguageCode: languageCode,
    })

    if (result.status !== 'minted') {
      console.warn('[Google Voice Clone] Fallback/Error:', result.reason, result.detail)
      return NextResponse.json(
        {
          error: result.detail || 'Failed to generate voice cloning key',
          reason: result.reason,
          languageCode: result.languageCode,
        },
        { status: result.httpStatus >= 400 ? result.httpStatus : 502 }
      )
    }

    return NextResponse.json({
      voice: {
        id: result.voiceCloningKey,
        name: displayName,
        languageCode: result.languageCode,
        provider: 'google',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error during voice cloning'
    console.error('[Google Voice Clone] Server Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
