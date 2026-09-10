import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import {
  generateLocationReferenceImage,
  ReferenceGenerationError,
  type ReferenceAspectRatio,
} from '@/lib/vision/referenceExpress/generateReferenceImage'
import { resolveRequestStoryLocale } from '@/i18n/server/requestLocale'

export const runtime = 'nodejs'
export const maxDuration = 120

interface GenerateLocationImageRequest {
  /** Project ID for blob storage organization */
  projectId?: string
  /** Normalized location name (e.g., "PODCAST STUDIO") */
  locationName: string
  /** Full scene heading (e.g., "INT. PODCAST STUDIO - DAY") */
  locationDisplay?: string
  /** INT/EXT indicator */
  intExt?: string
  /** Time of day */
  timeOfDay?: string
  /** User or AI-generated description of the location */
  description?: string
  /** Aspect ratio for the generated image */
  aspectRatio?: ReferenceAspectRatio
  /** Screenplay context for richer prompt generation */
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    visualStyle?: string
  }
  /** Pre-composed prompt from LocationPromptBuilder (overrides server-side composition) */
  locationPrompt?: string
  /** Art style selected in prompt builder */
  artStyle?: string
  /** Shot type from prompt builder */
  shotType?: string
  /** Camera angle from prompt builder */
  cameraAngle?: string
  /** Lighting preset from prompt builder */
  lighting?: string
  /** Additional details from prompt builder */
  additionalDetails?: string
  /** Whether the prompt was composed in advanced/raw mode */
  rawMode?: boolean
}

/**
 * Generate a location reference image for the Reference Library.
 * Creates environment-only shots for visual consistency across scenes.
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

    const body: GenerateLocationImageRequest = await req.json()

    console.log(`[Location Generation] Generating: ${body.locationName}`)
    console.log(
      `[Location Generation] INT/EXT: ${body.intExt || 'N/A'}, Time: ${body.timeOfDay || 'N/A'}`
    )

    const locale = await resolveRequestStoryLocale(req, { projectId: body.projectId })

    const { imageUrl, prompt, creditCost } = await generateLocationReferenceImage({
      userId,
      projectId: body.projectId,
      locationName: body.locationName,
      intExt: body.intExt,
      timeOfDay: body.timeOfDay,
      description: body.description,
      aspectRatio: body.aspectRatio,
      locationPrompt: body.locationPrompt,
      locale,
    })

    console.log(`[Location Generation] Success: ${imageUrl}`)

    return NextResponse.json({ imageUrl, prompt, creditCost })
  } catch (error: any) {
    console.error('[Location Generation] Error:', error)
    const status = error instanceof ReferenceGenerationError ? error.status : 500
    return NextResponse.json(
      { error: error.message || 'Failed to generate location image' },
      { status }
    )
  }
}
