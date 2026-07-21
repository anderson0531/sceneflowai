import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { CreditService } from '@/services/CreditService'
import { TEXT_CREDITS } from '@/lib/credits/creditCosts'
import {
  buildTreatmentImportPrompt,
  isTreatmentTextUsable,
  parseTreatmentImportResult,
} from '@/lib/blueprint/importTreatment'

export const runtime = 'nodejs'
export const maxDuration = 60

const CREDIT_COST = TEXT_CREDITS.GEMINI_FLASH

interface ImportTreatmentBody {
  text?: string
  projectId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string; email?: string })?.id ||
      (session?.user as { email?: string })?.email

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as ImportTreatmentBody
    const text = (body.text || '').trim()

    if (!isTreatmentTextUsable(text)) {
      return NextResponse.json(
        { success: false, error: 'Provide a longer treatment or description to import.' },
        { status: 400 }
      )
    }

    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', required: CREDIT_COST },
        { status: 402 }
      )
    }

    const prompt = buildTreatmentImportPrompt(text)

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
    const imported = parseTreatmentImportResult(parsed, text)

    let creditsBalance: number | undefined
    try {
      await CreditService.charge(userId, CREDIT_COST, 'ai_usage', body.projectId || null, {
        operation: 'blueprint_treatment_import',
        model: 'gemini-3.0-flash',
      })
      const breakdown = await CreditService.getCreditBreakdown(userId)
      creditsBalance = breakdown.total_credits
    } catch (chargeError) {
      console.error('[Blueprint Treatment Import] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      result: imported,
      creditsCharged: CREDIT_COST,
      creditsBalance,
    })
  } catch (error) {
    console.error('[Blueprint Treatment Import] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    )
  }
}
