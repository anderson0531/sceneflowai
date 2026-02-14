import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'

export const runtime = 'nodejs'
export const maxDuration = 180

/**
 * Generate Wardrobe Preview API
 * 
 * Generates TWO preview images of a character wearing a specific wardrobe:
 * 1. Headshot (1:1) - Portrait showing face with outfit context
 * 2. Full Body (3:4) - Full body shot showing complete outfit head to toe
 * 
 * Uses the character's reference image as a subject reference and applies
 * the wardrobe description to create consistent previews.
 * 
 * Credit cost: 10 credits per wardrobe (2 images × 5 credits each)
 */

const CREDIT_COST_PER_IMAGE = IMAGE_CREDITS.GEMINI_EDIT // 5 credits per image
const CREDIT_COST_PER_WARDROBE = CREDIT_COST_PER_IMAGE * 2 // 10 credits for headshot + full body

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

    // Calculate total credit cost (2 images per wardrobe: headshot + full body)
    const totalCreditCost = CREDIT_COST_PER_WARDROBE * wardrobesToGenerate.length

    // 2. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, totalCreditCost)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: totalCreditCost,
        balance: breakdown.total_credits,
        perWardrobeCost: CREDIT_COST_PER_WARDROBE,
        wardrobeCount: wardrobesToGenerate.length
      }, { status: 402 })
    }

    console.log(`[Wardrobe Preview] Generating ${wardrobesToGenerate.length} preview set(s) for ${characterName} (headshot + full body each)`)

    // Generate previews for each wardrobe
    const results: Array<{
      wardrobeId: string
      headshotUrl: string
      fullBodyUrl: string
      previewImageUrl: string // Legacy fallback
      success: boolean
      error?: string
    }> = []

    for (const wardrobe of wardrobesToGenerate) {
      try {
        console.log(`[Wardrobe Preview] Generating headshot + full body for: ${wardrobe.wardrobeId}`)
        
        // 1. Generate HEADSHOT (1:1 square)
        const headshotPrompt = buildHeadshotPrompt(
          characterName,
          appearanceDescription,
          wardrobe.description,
          wardrobe.accessories
        )
        
        console.log(`[Wardrobe Preview] Headshot prompt: ${headshotPrompt.substring(0, 100)}...`)

        const headshotBase64 = await generateImageWithGemini(headshotPrompt, {
          aspectRatio: '1:1', // Square portrait
          numberOfImages: 1,
          personGeneration: 'allow_adult',
          referenceImages: [{
            referenceId: 1,
            imageUrl: characterReferenceImageUrl,
            subjectDescription: `${characterName}, the person in this reference photo`
          }]
        })
        
        const headshotUrl = await uploadImageToBlob(
          headshotBase64,
          `wardrobes/${characterId || 'char'}-${wardrobe.wardrobeId}-headshot-${Date.now()}.png`
        )
        
        console.log(`[Wardrobe Preview] Headshot generated: ${wardrobe.wardrobeId}`)
        
        // 2. Generate FULL BODY (3:4 portrait)
        const fullBodyPrompt = buildFullBodyPrompt(
          characterName,
          appearanceDescription,
          wardrobe.description,
          wardrobe.accessories
        )
        
        console.log(`[Wardrobe Preview] Full body prompt: ${fullBodyPrompt.substring(0, 100)}...`)

        const fullBodyBase64 = await generateImageWithGemini(fullBodyPrompt, {
          aspectRatio: '3:4', // Portrait showing full body
          numberOfImages: 1,
          personGeneration: 'allow_adult',
          referenceImages: [{
            referenceId: 1,
            imageUrl: characterReferenceImageUrl,
            subjectDescription: `${characterName}, the person in this reference photo`
          }]
        })
        
        const fullBodyUrl = await uploadImageToBlob(
          fullBodyBase64,
          `wardrobes/${characterId || 'char'}-${wardrobe.wardrobeId}-fullbody-${Date.now()}.png`
        )
        
        console.log(`[Wardrobe Preview] Full body generated: ${wardrobe.wardrobeId}`)
        
        results.push({
          wardrobeId: wardrobe.wardrobeId,
          headshotUrl,
          fullBodyUrl,
          previewImageUrl: fullBodyUrl, // Legacy compatibility
          success: true
        })
        
        console.log(`[Wardrobe Preview] Complete set generated: ${wardrobe.wardrobeId}`)
        
      } catch (error: any) {
        console.error(`[Wardrobe Preview] Failed for ${wardrobe.wardrobeId}:`, error)
        results.push({
          wardrobeId: wardrobe.wardrobeId,
          headshotUrl: '',
          fullBodyUrl: '',
          previewImageUrl: '',
          success: false,
          error: error.message || 'Generation failed'
        })
      }
    }

    // Count successful generations
    const successfulCount = results.filter(r => r.success).length
    const chargedCredits = CREDIT_COST_PER_WARDROBE * successfulCount

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
            imagesGenerated: successfulCount * 2, // headshot + full body
            model: 'imagen-3-capability' 
          }
        )
        console.log(`[Wardrobe Preview] Charged ${chargedCredits} credits for ${successfulCount} wardrobes (${successfulCount * 2} images)`)
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
          headshotUrl: result.headshotUrl,
          fullBodyUrl: result.fullBodyUrl,
          previewImageUrl: result.previewImageUrl, // Legacy compatibility
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
 * Build a prompt for generating a HEADSHOT preview (1:1)
 * Focus on face and upper body, showing outfit context
 */
function buildHeadshotPrompt(
  characterName: string,
  appearanceDescription?: string,
  wardrobeDescription?: string,
  accessories?: string
): string {
  const parts: string[] = []
  
  // Subject identification
  parts.push(`Professional portrait photograph of ${characterName}`)
  
  // Include appearance hints (brief, focus on face/identity)
  if (appearanceDescription) {
    const brief = appearanceDescription.split('.')[0].slice(0, 80)
    if (brief) {
      parts.push(brief)
    }
  }
  
  // Wardrobe context (upper portion visible)
  if (wardrobeDescription) {
    parts.push(`wearing ${wardrobeDescription}`)
  }
  
  // Key accessories (especially ones visible in headshot)
  if (accessories) {
    // Filter to accessories visible in headshot
    const headshotAccessories = accessories.split(',')
      .filter(a => /glasses|earring|necklace|tie|collar|watch|scarf|hat|hair/i.test(a))
      .join(', ')
    if (headshotAccessories) {
      parts.push(`with ${headshotAccessories}`)
    }
  }
  
  // Photo style directives for headshot
  parts.push('Professional headshot photography')
  parts.push('Head and shoulders framing')
  parts.push('Soft studio lighting with subtle fill')
  parts.push('Clean neutral gray background')
  parts.push('Sharp focus on face')
  parts.push('Natural confident expression')
  parts.push('High-end fashion editorial quality')
  
  return parts.join('. ') + '.'
}

/**
 * Build a prompt for generating a FULL BODY shot (3:4)
 * Shows complete outfit from head to toe
 */
function buildFullBodyPrompt(
  characterName: string,
  appearanceDescription?: string,
  wardrobeDescription?: string,
  accessories?: string
): string {
  const parts: string[] = []
  
  // Subject identification
  parts.push(`Full body fashion photograph of ${characterName}`)
  
  // Include brief appearance hint
  if (appearanceDescription) {
    const brief = appearanceDescription.split('.')[0].slice(0, 60)
    if (brief) {
      parts.push(brief)
    }
  }
  
  // FULL wardrobe description is the star here
  if (wardrobeDescription) {
    parts.push(`wearing complete outfit: ${wardrobeDescription}`)
  }
  
  // ALL accessories
  if (accessories) {
    parts.push(`accessories: ${accessories}`)
  }
  
  // Photo style directives for full body
  parts.push('Professional fashion photography')
  parts.push('Full body shot from head to feet')
  parts.push('Standing pose, natural posture')
  parts.push('Soft studio lighting')
  parts.push('Clean neutral gray backdrop')
  parts.push('Sharp focus throughout')
  parts.push('Complete outfit clearly visible')
  parts.push('Shoes and accessories visible')
  parts.push('High-end fashion catalog quality')
  
  return parts.join('. ') + '.'
}
