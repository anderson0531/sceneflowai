import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { ObjectCategory } from '@/types/visionReferences'
import { resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import {
  generateObjectReferenceImage,
  ReferenceGenerationError,
  type ReferenceAspectRatio,
} from '@/lib/vision/referenceExpress/generateReferenceImage'

export const runtime = 'nodejs'
export const maxDuration = 120

interface GenerateObjectRequest {
  name: string
  description: string
  prompt: string
  category?: ObjectCategory
  projectId?: string
  referenceImageUrl?: string // Optional reference image to base generation on
  referenceImageBase64?: string // Alternative: base64 encoded reference
  aspectRatio?: ReferenceAspectRatio
}

/**
 * Generate a clean reference image for an object
 * Supports optional reference image for generating improved versions
 *
 * Generation itself lives in `@/lib/vision/referenceExpress/generateReferenceImage`
 * so the Reference Express background worker can run it without a session.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // Credit pre-check
    const CREDIT_COST = getCreditCost('IMAGE_GENERATION')
    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json(
        { 
          error: 'INSUFFICIENT_CREDITS',
          message: `This operation requires ${CREDIT_COST} credits. You have ${breakdown.total_credits}.`,
          required: CREDIT_COST,
          available: breakdown.total_credits
        },
        { status: 402 }
      )
    }

    const body: GenerateObjectRequest = await req.json()
    const { name, description, category = 'other' } = body

    const hasReference = !!(body.referenceImageUrl || body.referenceImageBase64)
    console.log(`[Key Props Generation] Generating: ${name}`)
    console.log(`[Key Props Generation] Category: ${category}, Has Reference: ${hasReference}`)

    // Typed in the creator's language; the image model needs English.
    const locale = await resolveRequestStoryLocale(req, { projectId: body.projectId })

    const result = await generateObjectReferenceImage({
      userId,
      name,
      prompt: body.prompt,
      category,
      referenceImageUrl: body.referenceImageUrl,
      referenceImageBase64: body.referenceImageBase64,
      aspectRatio: body.aspectRatio,
      locale,
    })

    console.log('[Key Props Generation] Upload complete:', result.imageUrl)

    let newBalance: number | undefined
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (balanceError) {
      console.error('[Key Props Generation] Balance lookup failed:', balanceError)
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      name,
      description,
      category,
      prompt: result.prompt,
      hasReferenceSource: result.hasReferenceSource,
      creditsUsed: result.creditCost,
      newBalance
    })

  } catch (error: any) {
    console.error('[Key Props Generation] Error:', error)
    
    // Handle specific error types
    if (error.message?.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    if (error.message?.includes('blocked')) {
      return NextResponse.json(
        { error: 'Image generation was blocked. Try adjusting the description.' },
        { status: 400 }
      )
    }

    const status = error instanceof ReferenceGenerationError ? error.status : 500
    return NextResponse.json(
      { error: error.message || 'Failed to generate object reference image' },
      { status }
    )
  }
}
