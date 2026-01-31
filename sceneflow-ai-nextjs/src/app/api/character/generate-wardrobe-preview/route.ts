import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Generate Wardrobe Preview API
 * 
 * Generates a preview image of a character wearing a specific wardrobe.
 * Uses the character's reference image as a subject reference and applies
 * the wardrobe description to create a consistent preview.
 * 
 * Credit cost: 5 credits (0.5x standard image for wardrobe preview)
 */

const CREDIT_COST = IMAGE_CREDITS.GEMINI_EDIT // 5 credits per wardrobe preview

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

    const body = await req.json()
    const { 
      characterId,
      projectId,
      wardrobeId,
      characterName,
      characterReferenceImageUrl,
      appearanceDescription,
      wardrobeDescription,
      wardrobeAccessories,
      // For batch generation
      batch = false,
      wardrobes = [] // Array of { wardrobeId, description, accessories }
    } = body

    // Validate required fields
    if (!characterReferenceImageUrl) {
      return NextResponse.json({ error: 'Character reference image is required' }, { status: 400 })
    }

    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    // Determine what to generate
    const wardrobesToGenerate = batch && wardrobes.length > 0
      ? wardrobes
      : wardrobeId && wardrobeDescription
        ? [{ wardrobeId, description: wardrobeDescription, accessories: wardrobeAccessories }]
        : []

    if (wardrobesToGenerate.length === 0) {
      return NextResponse.json({ error: 'At least one wardrobe is required' }, { status: 400 })
    }

    // Calculate total credit cost
    const totalCreditCost = CREDIT_COST * wardrobesToGenerate.length

    // 2. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, totalCreditCost)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: totalCreditCost,
        balance: breakdown.total_credits,
        perWardrobeCost: CREDIT_COST,
        wardrobeCount: wardrobesToGenerate.length
      }, { status: 402 })
    }

    console.log(`[Wardrobe Preview] Generating ${wardrobesToGenerate.length} preview(s) for ${characterName}`)

    // Generate previews for each wardrobe
    const results: Array<{
      wardrobeId: string
      previewImageUrl: string
      success: boolean
      error?: string
    }> = []

    for (const wardrobe of wardrobesToGenerate) {
      try {
        console.log(`[Wardrobe Preview] Generating: ${wardrobe.wardrobeId}`)
        
        // Build prompt for wardrobe preview
        const prompt = buildWardrobePreviewPrompt(
          characterName,
          appearanceDescription,
          wardrobe.description,
          wardrobe.accessories
        )
        
        console.log(`[Wardrobe Preview] Prompt: ${prompt.substring(0, 150)}...`)

        // Generate image with character as reference
        const base64Image = await generateImageWithGemini(prompt, {
          aspectRatio: '3:4', // Portrait aspect for wardrobe display
          numberOfImages: 1,
          personGeneration: 'allow_adult',
          referenceImages: [{
            referenceId: 1,
            imageUrl: characterReferenceImageUrl,
            subjectDescription: `${characterName}, the person in this reference photo`
          }]
        })
        
        // Upload preview image
        const previewImageUrl = await uploadImageToBlob(
          base64Image,
          `wardrobes/${characterId || 'char'}-${wardrobe.wardrobeId}-${Date.now()}.png`
        )
        
        results.push({
          wardrobeId: wardrobe.wardrobeId,
          previewImageUrl,
          success: true
        })
        
        console.log(`[Wardrobe Preview] Generated: ${wardrobe.wardrobeId}`)
        
      } catch (error: any) {
        console.error(`[Wardrobe Preview] Failed for ${wardrobe.wardrobeId}:`, error)
        results.push({
          wardrobeId: wardrobe.wardrobeId,
          previewImageUrl: '',
          success: false,
          error: error.message || 'Generation failed'
        })
      }
    }

    // Count successful generations
    const successfulCount = results.filter(r => r.success).length
    const chargedCredits = CREDIT_COST * successfulCount

    // 3. Charge credits for successful generations only
    let newBalance: number | undefined
    if (chargedCredits > 0) {
      try {
        await CreditService.charge(
          userId,
          chargedCredits,
          'ai_usage',
          projectId || null,
          { 
            operation: 'generate_wardrobe_preview', 
            characterId, 
            wardrobeCount: successfulCount,
            model: 'imagen-3-capability' 
          }
        )
        console.log(`[Wardrobe Preview] Charged ${chargedCredits} credits for ${successfulCount} previews`)
        const breakdown = await CreditService.getCreditBreakdown(userId)
        newBalance = breakdown.total_credits
      } catch (chargeError: any) {
        console.error('[Wardrobe Preview] Failed to charge credits:', chargeError)
      }
    }
    
    // Return results
    if (batch) {
      return NextResponse.json({ 
        success: true,
        results,
        successCount: successfulCount,
        failedCount: results.length - successfulCount,
        creditsCharged: chargedCredits,
        creditsBalance: newBalance
      })
    } else {
      // Single wardrobe response
      const result = results[0]
      if (result?.success) {
        return NextResponse.json({ 
          success: true, 
          previewImageUrl: result.previewImageUrl,
          wardrobeId: result.wardrobeId,
          creditsCharged: chargedCredits,
          creditsBalance: newBalance
        })
      } else {
        return NextResponse.json({ 
          error: result?.error || 'Generation failed' 
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('[Wardrobe Preview] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wardrobe preview generation failed' 
    }, { status: 500 })
  }
}

/**
 * Build a prompt for generating a wardrobe preview image
 */
function buildWardrobePreviewPrompt(
  characterName: string,
  appearanceDescription?: string,
  wardrobeDescription?: string,
  accessories?: string
): string {
  const parts: string[] = []
  
  // Subject identification
  parts.push(`${characterName}`)
  
  // Include appearance hints (brief, focus on face/identity)
  if (appearanceDescription) {
    // Extract just key identifiers, not full description
    const brief = appearanceDescription.split('.')[0].slice(0, 100)
    if (brief) {
      parts.push(brief)
    }
  }
  
  // Wardrobe description is the star
  if (wardrobeDescription) {
    parts.push(`wearing ${wardrobeDescription}`)
  }
  
  // Add accessories
  if (accessories) {
    parts.push(`with accessories: ${accessories}`)
  }
  
  // Photo style directives
  parts.push('Professional fashion photography')
  parts.push('Three-quarter body shot showing outfit')
  parts.push('Soft studio lighting, neutral gray background')
  parts.push('Sharp focus, natural pose')
  
  return parts.join('. ') + '.'
}
