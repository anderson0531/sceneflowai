import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadReferenceLibraryBase64Image } from '@/lib/storage/referenceLibraryStorage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  buildCharacterIdentityReferencePrompt,
  promptHasIdentityReferenceAnchor,
} from '@/lib/character/characterReferencePrompts'
import {
  ENHANCE_IDENTITY_ASPECT_RATIO,
  ENHANCE_IDENTITY_IMAGE_SIZE,
  ENHANCE_IDENTITY_MODEL,
  ENHANCE_IDENTITY_MODEL_TIER,
  enhanceIdentityImage,
} from '@/lib/character/enhanceIdentityImage'

export const runtime = 'nodejs'
export const maxDuration = 120

const CREDIT_COST = IMAGE_CREDITS.CHARACTER_IDENTITY_WITH_ENHANCE

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
    const {
      prompt,
      projectId,
      characterId,
      characterName,
      quality = 'auto',
      rawMode,
      skipAutoEnhance = false,
    } = body

    let finalPrompt = prompt?.trim() || ''
    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!rawMode && !promptHasIdentityReferenceAnchor(finalPrompt)) {
      finalPrompt = buildCharacterIdentityReferencePrompt({
        appearanceDescription: finalPrompt,
      })
    }

    const resolvedCharacterName =
      (typeof characterName === 'string' && characterName.trim()) ||
      finalPrompt.split(/[,\n]/)[0]?.trim() ||
      'Character'

    console.log('[Character Image] Generating identity headshot (designer 2K)...')
    const draftResult = await generateImageWithGeminiStudio({
      prompt: finalPrompt,
      aspectRatio: ENHANCE_IDENTITY_ASPECT_RATIO,
      imageSize: quality === 'max' ? '4K' : ENHANCE_IDENTITY_IMAGE_SIZE,
      modelTier: ENHANCE_IDENTITY_MODEL_TIER,
    })

    const draftBase64 = `data:${draftResult.mimeType};base64,${draftResult.imageBase64}`
    const draftImageUrl = await uploadReferenceLibraryBase64Image(
      draftBase64,
      `characters/char-draft-${Date.now()}.png`,
      projectId || 'default'
    )

    let imageUrl = draftImageUrl
    let visionDescription: string | null = null
    let autoEnhanced = false

    if (!skipAutoEnhance) {
      console.log('[Character Image] Auto-enhancing identity reference...')
      const enhanced = await enhanceIdentityImage({
        sourceImageUrl: draftImageUrl,
        characterName: resolvedCharacterName,
        appearanceDescription: finalPrompt,
        characterId,
        projectId,
        iterationCount: 0,
        skipIterationGuard: true,
        skipPreAnalysis: true,
      })
      imageUrl = enhanced.enhancedImageUrl
      visionDescription = enhanced.visionDescription
      autoEnhanced = true
    }

    if (!visionDescription) {
      try {
        const { analyzeCharacterImage } = await import('@/lib/imagen/visionAnalyzer')
        visionDescription = await analyzeCharacterImage(imageUrl, resolvedCharacterName)
      } catch (error) {
        console.error('[Character Image] Vision analysis failed:', error)
      }
    }

    let newBalance: number | undefined
    try {
      await CreditService.charge(userId, CREDIT_COST, 'ai_usage', projectId || null, {
        operation: 'character_identity_with_enhance',
        characterId,
        model: ENHANCE_IDENTITY_MODEL,
        autoEnhanced,
      })
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: unknown) {
      console.error('[Character Image] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      visionDescription,
      model: ENHANCE_IDENTITY_MODEL,
      quality,
      provider: 'vertex-gemini-image',
      storage: 'vercel-blob',
      autoEnhanced,
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance,
    })
  } catch (error) {
    console.error('[Character Image] Generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}
