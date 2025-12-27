import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { artStylePresets } from '@/constants/artStylePresets'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCharacterAttributes } from '../../../../lib/character/persistence'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'

export const runtime = 'nodejs'
export const maxDuration = 120  // Increased for new AI image models

const CREDIT_COST = IMAGE_CREDITS.IMAGEN_3 // 5 credits per image

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // 2. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: CREDIT_COST,
        balance: breakdown.total_credits,
        suggestedTopUp: { pack: 'quick_fix', name: 'Quick Fix', price: 25, credits: 2000 }
      }, { status: 402 })
    }

    const body = await req.json()
    
    // DEBUG: Log the ENTIRE request body to see exactly what the client sent
    console.log('[Character Image] ========== FULL REQUEST BODY ==========')
    console.log(JSON.stringify(body, null, 2))
    console.log('[Character Image] ========================================')
    
    const { prompt, projectId, characterId, quality = 'auto', artStyle, rawMode } = body
    
    // Use user prompt directly - NO modifications
    const finalPrompt = prompt?.trim() || ''

    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // SIMPLIFIED: Just use the prompt as-is. No filtering, no optimization.
    const enhancedPrompt = finalPrompt

    console.log('[Character Image] ========== PROMPT COMPARISON ==========')
    console.log('[Character Image] Received prompt length:', prompt?.length || 0)
    console.log('[Character Image] Final prompt length:', enhancedPrompt.length)
    console.log('[Character Image] Prompts identical:', prompt === enhancedPrompt)
    console.log('[Character Image] FULL PROMPT SENT TO MODEL:')
    console.log(enhancedPrompt)
    console.log('[Character Image] =======================================')

    // Generate with Gemini API (1:1 for portrait)
    const base64Image = await generateImageWithGemini(enhancedPrompt, {
      aspectRatio: '1:1',
      numberOfImages: 1,
      imageSize: quality === 'max' ? '2K' : '1K' // Map quality to image size
    })
    
    // Upload to Vercel Blob
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `characters/char-${Date.now()}.png`
    )
    
    // AUTO-ANALYZE: Extract detailed description using Gemini Vision
    let visionDescription = null
    try {
      const characterName = prompt?.split(',')[0]?.trim() || 'Character'
      visionDescription = await analyzeCharacterImage(imageUrl, characterName)
      console.log(`[Character Image] Auto-analyzed with Gemini Vision`)
    } catch (error) {
      console.error('[Character Image] Vision analysis failed:', error)
      // Continue without analysis - not critical
    }

    // 3. Charge credits after successful generation
    let newBalance: number | undefined
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'ai_usage',
        projectId || null,
        { operation: 'imagen_generate', characterId, model: 'gemini-3-pro-image-preview' }
      )
      console.log(`[Character Image] Charged ${CREDIT_COST} credits to user ${userId}`)
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: any) {
      console.error('[Character Image] Failed to charge credits:', chargeError)
    }
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      visionDescription, // Include in response for client to save
      model: 'gemini-3-pro-image-preview',
      quality: quality,
      provider: 'gemini-api',
      storage: 'vercel-blob',
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance
    })

  } catch (error) {
    console.error('[Character Image] Gemini API generation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Image generation failed' 
    }, { status: 500 })
  }
}

