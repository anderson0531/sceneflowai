import { NextRequest, NextResponse } from 'next/server'
import {
  EnhanceIdentityError,
  enhanceIdentityImage,
  parseImageDataUrl,
  resolveWardrobeForEnhance,
} from '@/lib/character/enhanceIdentityImage'
import { sanitizeSelfieEnhanceOptions } from '@/lib/character/characterReferencePrompts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { quoteAndCharge } from '@/lib/credits/chargeQuotedGeneration'

export const runtime = 'nodejs'
export const maxDuration = 300

const CREDIT_COST = IMAGE_CREDITS.GEMINI_EDIT
const MAX_INLINE_DATA_URL_LENGTH = Math.floor(3.5 * 1024 * 1024)

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
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const {
      characterId,
      projectId,
      sourceImageUrl,
      sourceImageDataUrl,
      characterName,
      appearanceDescription,
      wardrobeDescription,
      iterationCount = 0,
      artStyle,
      selfieOptions: rawSelfieOptions,
    } = body

    if (!sourceImageUrl && !sourceImageDataUrl) {
      return NextResponse.json(
        { error: 'Source image URL or captured image data is required' },
        { status: 400 }
      )
    }
    if (typeof sourceImageDataUrl === 'string') {
      if (sourceImageDataUrl.length > MAX_INLINE_DATA_URL_LENGTH) {
        return NextResponse.json(
          { error: 'Captured image payload exceeds maximum allowed size' },
          { status: 413 }
        )
      }
      if (!parseImageDataUrl(sourceImageDataUrl)) {
        return NextResponse.json(
          { error: 'Invalid captured image data URL format' },
          { status: 400 }
        )
      }
    }
    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const selfieOptions = sanitizeSelfieEnhanceOptions(rawSelfieOptions)

    console.log(`[Enhance Reference] Enhancing character: ${characterName}`)

    const result = await enhanceIdentityImage({
      sourceImageUrl,
      sourceImageDataUrl,
      characterName,
      appearanceDescription,
      wardrobeDescription,
      characterId,
      projectId,
      iterationCount,
      artStyle,
      selfieOptions,
    })

    let newBalance: number | undefined
    try {
      await quoteAndCharge({
        userId,
        projectId: projectId || null,
        quoteInput: {
          kind: 'reference',
          imageCount: 1,
          floorCredits: CREDIT_COST,
        },
        meta: { label: 'enhance_character_reference', characterId, model: result.model },
      })
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: unknown) {
      console.error('[Enhance Reference] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      enhancedImageUrl: result.enhancedImageUrl,
      visionDescription: result.visionDescription,
      model: result.model,
      iterationCount: result.iterationCount,
      remainingIterations: 3 - result.iterationCount,
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance,
      qualityFeedback: result.qualityFeedback,
    })
  } catch (error) {
    if (error instanceof EnhanceIdentityError) {
      const status =
        error.code === 'MAX_ITERATIONS_REACHED' || error.code === 'ALREADY_OPTIMIZED' ? 400 : 500
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          analysis: error.analysis,
        },
        { status }
      )
    }

    console.error('[Enhance Reference] Enhancement error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enhancement failed' },
      { status: 500 }
    )
  }
}

export { enhanceIdentityImage, resolveWardrobeForEnhance }
