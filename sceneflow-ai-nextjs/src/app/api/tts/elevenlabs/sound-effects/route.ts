import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'
import { generateVeoSfxAudio, type VeoSfxPromptMode } from '@/lib/sfx/veoSfx'
import {
  resolveVeoSfxClipDuration,
  type VeoSfxClipDuration,
} from '@/lib/sfx/veoSfxDuration'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SFX_CREDIT_COST = VIDEO_CREDITS.VEO_LITE

interface SfxRequestBody {
  text?: string
  durationSeconds?: number
  promptInfluence?: number
  projectId?: string
  sfxId?: string
  sfxIndex?: number
  promptMode?: VeoSfxPromptMode
  voiceDirection?: string
}

function parsePromptMode(value: unknown): VeoSfxPromptMode {
  if (value === 'ambient' || value === 'actionBeat' || value === 'dialogue') {
    return value
  }
  return 'actionBeat'
}

function toClipDuration(value: number | undefined): VeoSfxClipDuration {
  if (value === 4 || value === 6 || value === 8) return value
  return resolveVeoSfxClipDuration(typeof value === 'number' ? value : 8)
}

export async function POST(request: NextRequest) {
  try {
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

    const clipDurationSeconds = toClipDuration(body.durationSeconds)
    const promptMode = parsePromptMode(body.promptMode)

    const hasCredits = await CreditService.ensureCredits(userId, SFX_CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json(
        {
          error: 'Insufficient credits for SFX generation',
          creditsRequired: SFX_CREDIT_COST,
          creditsAvailable: breakdown?.total_credits ?? 0,
          operation: 'veo_sfx',
        },
        { status: 402 }
      )
    }

    const result = await generateVeoSfxAudio({
      text,
      projectId,
      sfxId: body.sfxId,
      sfxIndex: body.sfxIndex,
      clipDurationSeconds,
      promptMode,
      voiceDirection: body.voiceDirection,
    })

    try {
      await CreditService.charge(
        userId,
        SFX_CREDIT_COST,
        'ai_usage',
        body.sfxId || null,
        {
          operation: 'veo_sfx',
          projectId,
          sfxId: body.sfxId,
          sfxIndex: body.sfxIndex,
          clipDurationSeconds: result.clipDurationSeconds,
          promptPreview: text.slice(0, 100),
          promptMode: result.promptMode,
        }
      )
      await trackCost(userId, 'veo_sfx', SFX_CREDIT_COST, {
        projectId,
      }).catch(() => null)
    } catch (chargeError: any) {
      console.error('[Veo SFX] Failed to charge credits:', chargeError?.message || chargeError)
    }

    const attribution = {
      source: 'veo' as const,
      clipDurationSeconds: result.clipDurationSeconds,
      veoQuality: 'lite' as const,
      promptMode: result.promptMode,
    }

    return NextResponse.json({
      url: result.url,
      gcsPath: result.gcsPath,
      durationSeconds: result.clipDurationSeconds,
      clipDurationSeconds: result.clipDurationSeconds,
      byteLength: result.byteLength,
      sfxId: body.sfxId,
      sfxIndex: body.sfxIndex,
      operation: 'veo_sfx',
      source: 'veo',
      promptMode: result.promptMode,
      attribution,
    })
  } catch (error: any) {
    console.error('[Veo SFX] Error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'SFX generation failed' },
      { status: 500 }
    )
  }
}
