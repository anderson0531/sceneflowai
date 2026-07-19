import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { CreditService } from '@/services/CreditService'
import { TEXT_CREDITS } from '@/lib/credits/creditCosts'
import {
  buildRefinePrompt,
  parseRefineResult,
  validateAudienceDescription,
  type AudienceRefineContext,
} from '@/lib/audience/refineAudience'

export const runtime = 'nodejs'
export const maxDuration = 60

const CREDIT_COST = TEXT_CREDITS.GEMINI_FLASH

interface RefineRequestBody {
  description?: string
  context?: AudienceRefineContext
  projectId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string; email?: string })?.id ||
      (session?.user as { email?: string })?.email

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as RefineRequestBody
    const description = (body.description || '').trim()

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Audience description is required' },
        { status: 400 }
      )
    }

    // Fast, model-free validation. If clearly insufficient, return guidance
    // without spending credits on the model.
    const localValidation = validateAudienceDescription(description)
    if (!localValidation.valid) {
      return NextResponse.json({
        success: true,
        result: {
          valid: false,
          issues: localValidation.issues,
          enhancedDescription: description,
          summary: '',
          derivedProfile: undefined,
          culturalSignals: undefined,
        },
        creditsCharged: 0,
      })
    }

    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', required: CREDIT_COST },
        { status: 402 }
      )
    }

    const prompt = buildRefinePrompt(description, body.context)

    const result = await generateText(prompt, {
      model: 'gemini-3.0-flash',
      temperature: 0.2,
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
    const refined = parseRefineResult(parsed, description)

    let creditsBalance: number | undefined
    try {
      await CreditService.charge(userId, CREDIT_COST, 'ai_usage', body.projectId || null, {
        operation: 'audience_refine',
        model: 'gemini-3.0-flash',
      })
      const breakdown = await CreditService.getCreditBreakdown(userId)
      creditsBalance = breakdown.total_credits
    } catch (chargeError) {
      console.error('[Audience Refine] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      result: refined,
      creditsCharged: CREDIT_COST,
      creditsBalance,
    })
  } catch (error) {
    console.error('[Audience Refine] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Refine failed' },
      { status: 500 }
    )
  }
}
