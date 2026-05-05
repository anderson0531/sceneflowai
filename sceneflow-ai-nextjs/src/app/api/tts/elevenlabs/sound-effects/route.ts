import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'
import { generateElevenLabsSfx } from '@/lib/elevenlabs/sfx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SFX_CREDIT_COST = AUDIO_CREDITS.ELEVENLABS_SFX

interface SfxRequestBody {
  text?: string
  durationSeconds?: number
  promptInfluence?: number
  projectId?: string
  sfxId?: string
  sfxIndex?: number
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs SFX is not configured' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as SfxRequestBody
    const text = (body.text || '').trim()
    const projectId = body.projectId

    if (!text) {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Missing required field: projectId' }, { status: 400 })
    }

    const hasCredits = await CreditService.ensureCredits(userId, SFX_CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json(
        {
          error: 'Insufficient credits for SFX generation',
          creditsRequired: SFX_CREDIT_COST,
          creditsAvailable: breakdown?.total_credits ?? 0,
          operation: 'elevenlabs_sfx',
        },
        { status: 402 }
      )
    }

    const result = await generateElevenLabsSfx({
      text,
      durationSeconds: body.durationSeconds,
      promptInfluence: body.promptInfluence,
      projectId,
      sfxId: body.sfxId,
      sfxIndex: body.sfxIndex,
    })

    try {
      await CreditService.charge(
        userId,
        SFX_CREDIT_COST,
        'ai_usage',
        body.sfxId || null,
        {
          operation: 'elevenlabs_sfx',
          projectId,
          sfxId: body.sfxId,
          sfxIndex: body.sfxIndex,
          promptPreview: text.slice(0, 100),
        }
      )
      await trackCost(userId, 'elevenlabs_sfx', SFX_CREDIT_COST, {
        projectId,
      }).catch(() => null)
    } catch (chargeError: any) {
      console.error('[ElevenLabs SFX] Failed to charge credits:', chargeError?.message || chargeError)
    }

    return NextResponse.json({
      url: result.url,
      gcsPath: result.gcsPath,
      durationSeconds: result.durationSeconds,
      byteLength: result.byteLength,
      sfxId: body.sfxId,
      sfxIndex: body.sfxIndex,
      operation: 'elevenlabs_sfx',
    })
  } catch (error: any) {
    console.error('[ElevenLabs SFX] Error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'SFX generation failed' },
      { status: 500 }
    )
  }
}
