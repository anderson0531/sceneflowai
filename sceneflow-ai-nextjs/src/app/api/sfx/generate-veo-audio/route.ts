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

const VEO_SFX_CREDIT_COST = VIDEO_CREDITS.VEO_FAST

interface VeoSfxRequestBody {
  text?: string
  durationSeconds?: number
  projectId?: string
  sfxId?: string
  sfxIndex?: number
  promptMode?: VeoSfxPromptMode
}

function parsePromptMode(value: unknown): VeoSfxPromptMode {
  return value === 'actionBeat' ? 'actionBeat' : 'ambient'
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

    const body = (await request.json()) as VeoSfxRequestBody
    const text = (body.text || '').trim()
    const projectId = body.projectId

    if (!text) {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Missing required field: projectId' }, { status: 400 })
    }

    const clipDurationSeconds = toClipDuration(body.durationSeconds)

    const hasCredits = await CreditService.ensureCredits(userId, VEO_SFX_CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json(
        {
          error: 'Insufficient credits for Veo ambient SFX generation',
          creditsRequired: VEO_SFX_CREDIT_COST,
          creditsAvailable: breakdown?.total_credits ?? 0,
          operation: 'veo_sfx',
        },
        { status: 402 }
      )
    }

    const promptMode = parsePromptMode(body.promptMode)

    const result = await generateVeoSfxAudio({
      text,
      projectId,
      sfxId: body.sfxId,
      sfxIndex: body.sfxIndex,
      clipDurationSeconds,
      promptMode,
    })

    try {
      await CreditService.charge(userId, VEO_SFX_CREDIT_COST, 'ai_usage', body.sfxId || null, {
        operation: 'veo_sfx',
        projectId,
        sfxId: body.sfxId,
        sfxIndex: body.sfxIndex,
        clipDurationSeconds,
        promptPreview: text.slice(0, 100),
        promptMode,
      })
      await trackCost(userId, 'veo_sfx', VEO_SFX_CREDIT_COST, {
        projectId,
      }).catch(() => null)
    } catch (chargeError: any) {
      console.error('[Veo SFX] Failed to charge credits:', chargeError?.message || chargeError)
    }

    return NextResponse.json({
      url: result.url,
      gcsPath: result.gcsPath,
      clipDurationSeconds: result.clipDurationSeconds,
      durationSeconds: result.clipDurationSeconds,
      byteLength: result.byteLength,
      sfxId: body.sfxId,
      sfxIndex: body.sfxIndex,
      operation: 'veo_sfx',
      source: 'veo',
      promptMode: result.promptMode,
    })
  } catch (error: any) {
    console.error('[Veo SFX] Error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'Veo SFX generation failed' },
      { status: 500 }
    )
  }
}
