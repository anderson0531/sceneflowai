import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  BackdropMode, 
  getPersonGenerationForMode, 
  getNegativePromptForMode 
} from '@/lib/vision/backdropGenerator'
import { CREDIT_COSTS, getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'

export const runtime = 'nodejs'
export const maxDuration = 60

interface GenerateBackdropRequest {
  prompt: string
  mode: BackdropMode
  sourceSceneNumber?: number
  characterId?: string
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

/**
 * Generate a backdrop image using Gemini 3.0
 * Supports 4 modes: atmospheric, portrait, master, animatic
 * Uses personGeneration settings based on mode
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

    const body: GenerateBackdropRequest = await req.json()
    const { 
      prompt, 
      mode = 'master',
      sourceSceneNumber,
      characterId,
      aspectRatio = '16:9',
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      )
    }

    console.log(`[Backdrop Generation] Mode: ${mode}, Scene: ${sourceSceneNumber}`)
    console.log(`[Backdrop Generation] Prompt: ${prompt.substring(0, 200)}...`)

    // Get mode-specific settings
    const personGeneration = getPersonGenerationForMode(mode)
    const negativePrompt = getNegativePromptForMode(mode)

    console.log(`[Backdrop Generation] personGeneration: ${personGeneration}`)

    // Generate image using Gemini 3.0
    const base64Image = await generateImageWithGemini(prompt, {
      aspectRatio,
      numberOfImages: 1,
      imageSize: '2K',
      personGeneration,
      negativePrompt: negativePrompt || undefined,
    })

    console.log('[Backdrop Generation] Image generated, uploading to storage...')

    // Upload to blob storage
    const filename = `backdrops/${mode}-scene${sourceSceneNumber || 'unknown'}-${Date.now()}.png`
    const imageUrl = await uploadImageToBlob(base64Image, filename)

    console.log('[Backdrop Generation] Upload complete:', imageUrl)

    // Charge credits after successful generation
    let newBalance: number | undefined
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'ai_usage',
        null,
        { operation: 'backdrop_generation', mode, sceneNumber: sourceSceneNumber }
      )
      console.log(`[Backdrop Generation] Charged ${CREDIT_COST} credits to user ${userId}`)
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: any) {
      console.error('[Backdrop Generation] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      mode,
      sourceSceneNumber,
      characterId,
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance,
    })

  } catch (error: any) {
    console.error('[Backdrop Generation] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate backdrop',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
