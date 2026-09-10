import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import {
  CAST_IMAGE_CREDIT_COST,
  generateCastReferenceImage,
  ReferenceGenerationError,
} from '@/lib/vision/referenceExpress/generateReferenceImage'

export const runtime = 'nodejs'
export const maxDuration = 300

const CREDIT_COST = CAST_IMAGE_CREDIT_COST

/**
 * Generate a character identity reference headshot.
 *
 * Generation itself lives in `@/lib/vision/referenceExpress/generateReferenceImage`
 * so the Reference Express background worker can run it without a session.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const hasEnoughCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: CREDIT_COST,
          balance: breakdown.total_credits,
          suggestedTopUp: { pack: 'quick_fix', name: 'Quick Fix', price: 25, credits: 2000 },
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const result = await generateCastReferenceImage({
      userId,
      prompt: body.prompt,
      projectId: body.projectId,
      characterId: body.characterId,
      characterName: body.characterName,
      quality: body.quality,
      rawMode: body.rawMode,
      skipAutoEnhance: body.skipAutoEnhance,
    })

    let newBalance: number | undefined
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (balanceError) {
      console.error('[Character Image] Balance lookup failed:', balanceError)
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      visionDescription: result.visionDescription,
      model: result.model,
      quality: body.quality ?? 'auto',
      provider: 'vertex-gemini-image',
      storage: 'vercel-blob',
      autoEnhanced: result.autoEnhanced,
      creditsCharged: result.creditCost,
      creditsBalance: newBalance,
    })
  } catch (error) {
    console.error('[Character Image] Generation error:', error)
    const status = error instanceof ReferenceGenerationError ? error.status : 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status }
    )
  }
}
