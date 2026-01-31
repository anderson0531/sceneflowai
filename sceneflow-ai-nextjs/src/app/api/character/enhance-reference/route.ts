import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Enhance Character Reference API
 * 
 * Takes an uploaded character reference image and generates a high-quality
 * AI-enhanced version using the original as a subject reference.
 * 
 * This improves scene generation quality by providing cleaner, more consistent
 * character references that Imagen can use more effectively.
 * 
 * Credit cost: 5 credits (0.5x standard Imagen cost as enhancement)
 */

const CREDIT_COST = IMAGE_CREDITS.GEMINI_EDIT // 5 credits for enhancement

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
      }, { status: 402 })
    }

    const body = await req.json()
    const { 
      characterId,
      projectId,
      sourceImageUrl,
      characterName,
      appearanceDescription,
      iterationCount = 0 
    } = body

    if (!sourceImageUrl) {
      return NextResponse.json({ error: 'Source image URL is required' }, { status: 400 })
    }

    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    // Check iteration limit (max 3 iterations)
    if (iterationCount >= 3) {
      return NextResponse.json({ 
        error: 'Maximum enhancement iterations reached. Please upload a new source image.',
        code: 'MAX_ITERATIONS_REACHED'
      }, { status: 400 })
    }

    console.log(`[Enhance Reference] Enhancing character: ${characterName}`)
    console.log(`[Enhance Reference] Source image: ${sourceImageUrl.substring(0, 60)}...`)
    console.log(`[Enhance Reference] Iteration: ${iterationCount + 1}/3`)

    // Build enhancement prompt focusing on quality and consistency
    const enhancementPrompt = buildEnhancementPrompt(characterName, appearanceDescription)
    
    console.log(`[Enhance Reference] Enhancement prompt: ${enhancementPrompt.substring(0, 200)}...`)

    // Generate enhanced image using source as reference
    const base64Image = await generateImageWithGemini(enhancementPrompt, {
      aspectRatio: '1:1',
      numberOfImages: 1,
      personGeneration: 'allow_adult',
      referenceImages: [{
        referenceId: 1,
        imageUrl: sourceImageUrl,
        subjectDescription: `${characterName}, the person in this reference photo`
      }]
    })
    
    // Upload enhanced image to Vercel Blob
    const enhancedImageUrl = await uploadImageToBlob(
      base64Image,
      `characters/enhanced-${characterId || 'char'}-${Date.now()}.png`
    )
    
    // Auto-analyze the enhanced image for appearance description
    let visionDescription = null
    try {
      visionDescription = await analyzeCharacterImage(enhancedImageUrl, characterName)
      console.log(`[Enhance Reference] Auto-analyzed enhanced image`)
    } catch (error) {
      console.error('[Enhance Reference] Vision analysis failed:', error)
    }

    // 3. Charge credits after successful generation
    let newBalance: number | undefined
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'ai_usage',
        projectId || null,
        { operation: 'enhance_character_reference', characterId, model: 'imagen-3-capability' }
      )
      console.log(`[Enhance Reference] Charged ${CREDIT_COST} credits to user ${userId}`)
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: any) {
      console.error('[Enhance Reference] Failed to charge credits:', chargeError)
    }
    
    return NextResponse.json({ 
      success: true, 
      enhancedImageUrl,
      visionDescription,
      iterationCount: iterationCount + 1,
      remainingIterations: 3 - (iterationCount + 1),
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance
    })

  } catch (error) {
    console.error('[Enhance Reference] Enhancement error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Enhancement failed' 
    }, { status: 500 })
  }
}

/**
 * Build a prompt optimized for character reference enhancement
 */
function buildEnhancementPrompt(characterName: string, appearanceDescription?: string): string {
  const parts: string[] = []
  
  // Core subject identification
  parts.push(`Professional headshot portrait of ${characterName}`)
  
  // Include appearance details if available
  if (appearanceDescription) {
    // Extract key physical features from the description
    const cleanedDescription = appearanceDescription
      .replace(/^(A|An)\s+/i, '')
      .split('.')[0] // Take first sentence
      .trim()
    
    if (cleanedDescription.length > 10) {
      parts.push(cleanedDescription)
    }
  }
  
  // Quality and style directives for reference image
  parts.push('Studio lighting, neutral background')
  parts.push('Sharp focus, high resolution')
  parts.push('Natural expression, direct eye contact with camera')
  parts.push('Professional photography, 4K quality')
  parts.push('Clean, well-lit portrait suitable for film production reference')
  
  return parts.join('. ') + '.'
}
