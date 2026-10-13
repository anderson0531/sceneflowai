import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiProductModel } from '@/lib/config/modelConfig'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { CreditService } from '@/services/CreditService'
import { TEXT_CREDITS } from '@/lib/credits/creditCosts'
import { isSeriesProductionFormat } from '@/config/series/productionFormats'
import {
  buildClarifySynopsisPrompt,
  fallbackSynopsisText,
  parseClarifySynopsisResult,
  sanitizeSynopsisMessages,
} from '@/lib/series/clarifySynopsis'

export const runtime = 'nodejs'
export const maxDuration = 60

const CREDIT_COST = TEXT_CREDITS.GEMINI_FLASH

interface ClarifyRequestBody {
  productionFormat?: string
  episodeCount?: number
  targetAudience?: string
  messages?: unknown
  currentSynopsis?: string
  seriesId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId =
      (session?.user as { id?: string; email?: string })?.id ||
      (session?.user as { email?: string })?.email

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as ClarifyRequestBody
    const productionFormat = (body.productionFormat || '').trim()
    if (!isSeriesProductionFormat(productionFormat)) {
      return NextResponse.json(
        { success: false, error: 'A production format is required.' },
        { status: 400 }
      )
    }

    const messages = sanitizeSynopsisMessages(body.messages)
    const hasUserTurn = messages.some((message) => message.role === 'user')
    if (!hasUserTurn) {
      return NextResponse.json(
        { success: false, error: 'A synopsis idea is required.' },
        { status: 400 }
      )
    }

    const episodeCount = Math.max(1, Math.min(40, Math.floor(Number(body.episodeCount) || 5)))
    const targetAudience = (body.targetAudience || '').trim()
    const currentSynopsis = (body.currentSynopsis || '').trim()

    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', required: CREDIT_COST },
        { status: 402 }
      )
    }

    const prompt = buildClarifySynopsisPrompt({
      productionFormat,
      episodeCount,
      targetAudience,
      messages,
      currentSynopsis,
    })

    const result = await generateText(prompt, {
      model: getGeminiProductModel('series'),
      temperature: 0.4,
      maxOutputTokens: 2048,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
      timeoutMs: 45000,
      maxRetries: 1,
    })

    if (result.finishReason === 'SAFETY') {
      return NextResponse.json(
        { success: false, error: 'Content blocked by safety filters.' },
        { status: 422 }
      )
    }

    const parsed = safeParseJsonFromText(result.text || '{}') as Record<string, unknown>
    const clarified = parseClarifySynopsisResult(
      parsed,
      fallbackSynopsisText({ messages, currentSynopsis })
    )

    let creditsBalance: number | undefined
    try {
      await CreditService.charge(userId, CREDIT_COST, 'ai_usage', body.seriesId || null, {
        operation: 'series_synopsis_clarify',
        model: getGeminiProductModel('series'),
      })
      const breakdown = await CreditService.getCreditBreakdown(userId)
      creditsBalance = breakdown.total_credits
    } catch (chargeError) {
      console.error('[Series Synopsis Clarify] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      result: clarified,
      creditsCharged: CREDIT_COST,
      creditsBalance,
    })
  } catch (error) {
    console.error('[Series Synopsis Clarify] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Clarify failed' },
      { status: 500 }
    )
  }
}
