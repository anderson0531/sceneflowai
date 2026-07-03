import { NextRequest, NextResponse } from 'next/server'
import { editImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'
import { buildPreVisEndFrameEditInstruction } from '@/lib/vision/framePromptBaseline'
import { mergeBeatFrameNegativePrompt } from '@/lib/character/sceneCharacterHeadshot'

export const maxDuration = 60 // 1 minute for image generation
export const runtime = 'nodejs'

// End frame generation uses same credit bucket as FRAME_GENERATION
const END_FRAME_CREDIT_COST = IMAGE_CREDITS.FRAME_GENERATION // 10 credits

interface GenerateEndFrameRequest {
  startFrameUrl: string
  segmentPrompt: string
  segmentDuration?: number
  aspectRatio?: '16:9' | '9:16'
  // Optional character references for consistency
  characterRefs?: Array<{ url: string; name?: string }>
}

/**
 * Generate End Frame API
 *
 * End frame is produced as a **directed edit** of the start frame image (same pipeline as
 * `/api/production/generate-segment-frames` end path) to preserve visual continuity and
 * reduce hallucinated scene drift.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const { segmentId } = await params
    const body: GenerateEndFrameRequest = await req.json()
    const {
      startFrameUrl,
      segmentPrompt,
      segmentDuration = 8,
      aspectRatio = '16:9',
      characterRefs = [],
    } = body

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has sufficient credits
    const hasCredits = await CreditService.ensureCredits(userId, END_FRAME_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: END_FRAME_CREDIT_COST,
          operation: 'end_frame_generation',
        },
        { status: 402 }
      )
    }

    if (!startFrameUrl || !segmentPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: startFrameUrl, segmentPrompt' },
        { status: 400 }
      )
    }

    console.log('[Generate End Frame] Starting for segment:', segmentId)
    console.log('[Generate End Frame] Start frame URL:', startFrameUrl.substring(0, 80))
    console.log('[Generate End Frame] Segment prompt preview:', segmentPrompt.substring(0, 150))
    console.log('[Generate End Frame] Duration:', segmentDuration, 'seconds')

    const instruction = buildPreVisEndFrameEditInstruction({
      startFramePrompt: segmentPrompt,
      durationSeconds: segmentDuration,
    })
    const identityRef = characterRefs.find(c => c.url && c.url !== startFrameUrl)?.url

    const result = await editImageWithGeminiStudio({
      sourceImage: startFrameUrl,
      instruction,
      referenceImage: identityRef,
      aspectRatio,
      imageSize: '1K',
      editIntent: 'keyframeEnd',
      segmentDurationSeconds: segmentDuration,
      negativePrompt: mergeBeatFrameNegativePrompt(),
    })

    const endFrameUrl = await uploadImageToBlob(
      result.imageBase64,
      `segments/${segmentId}/end-frame-${Date.now()}.png`
    )

    console.log('[Generate End Frame] Successfully generated and uploaded:', endFrameUrl)

    try {
      await CreditService.charge(userId, END_FRAME_CREDIT_COST, 'ai_usage', segmentId, {
        operation: 'end_frame_generation',
        segmentId,
        aspectRatio,
        mode: 'edit_from_start',
      })
      console.log(`[Generate End Frame] Charged ${END_FRAME_CREDIT_COST} credits to user ${userId}`)

      await trackCost(userId, 'end_frame_generation', END_FRAME_CREDIT_COST, {
        imageCount: 1,
        segmentId,
      })
    } catch (chargeError: unknown) {
      console.error('[Generate End Frame] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      endFrameUrl,
      endFramePrompt: instruction,
      segmentId,
    })
  } catch (error) {
    console.error('[Generate End Frame] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to generate end frame',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

