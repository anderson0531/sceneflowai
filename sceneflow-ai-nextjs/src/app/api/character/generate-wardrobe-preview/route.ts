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
 * Generates a single full-body studio portrait of a character in a specific wardrobe.
 * Uses the character's reference image for facial consistency.
 * Based on script context, puts the character in role (expression, demeanor).
 * 
 * Credit cost: 5 credits per wardrobe (1 full-body image)
 */

const CREDIT_COST_PER_WARDROBE = IMAGE_CREDITS.GEMINI_EDIT // 5 credits for full body image

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
      wardrobeReason, // AI analysis/reason for character state context
      sceneNumbers,   // Scene numbers for context
      gender,         // Character gender for pronoun usage in prompts
      // For batch generation
      batch = false,
      wardrobes = [] // Array of { wardrobeId, description, accessories, reason, sceneNumbers }
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
        ? [{ wardrobeId, description: wardrobeDescription, accessories: wardrobeAccessories, reason: wardrobeReason, sceneNumbers }]
        : []

    if (wardrobesToGenerate.length === 0) {
      return NextResponse.json({ error: 'At least one wardrobe is required' }, { status: 400 })
    }

    // Calculate total credit cost (1 full-body image per wardrobe)
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

    console.log(`[Wardrobe Preview] Generating ${wardrobesToGenerate.length} full-body portrait(s) for ${characterName}`)

    // Generate previews for each wardrobe
    const results: Array<{
      wardrobeId: string
      fullBodyUrl: string
      previewImageUrl: string // Legacy fallback
      success: boolean
      error?: string
    }> = []

    for (const wardrobe of wardrobesToGenerate) {
      try {
        console.log(`[Wardrobe Preview] Generating full-body portrait for: ${wardrobe.wardrobeId}`)
        
        // Generate FULL BODY studio portrait using character reference
        const fullBodyPrompt = buildFullBodyPrompt(
          characterName,
          appearanceDescription,
          wardrobe.description,
          wardrobe.accessories,
          wardrobe.reason, // Pass reason for character state/expression context
          gender // Pass gender for pronoun usage
        )
        
        console.log(`[Wardrobe Preview] Full body prompt: ${fullBodyPrompt.substring(0, 150)}...`)

        const fullBodyBase64 = await generateImageWithGemini(fullBodyPrompt, {
          aspectRatio: '9:16', // Tall portrait for full-body head-to-toe framing
          numberOfImages: 1,
          personGeneration: 'allow_adult',
          referenceImages: [{
            referenceId: 1,
            imageUrl: characterReferenceImageUrl, // Use character reference for facial consistency
            subjectDescription: `${characterName}, the person in this reference photo - match their face exactly`
          }]
        })
        
        const fullBodyUrl = await uploadImageToBlob(
          fullBodyBase64,
          `wardrobes/${characterId || 'char'}-${wardrobe.wardrobeId}-fullbody-${Date.now()}.png`
        )
        
        console.log(`[Wardrobe Preview] Full body generated: ${wardrobe.wardrobeId}`)
        
        results.push({
          wardrobeId: wardrobe.wardrobeId,
          fullBodyUrl,
          previewImageUrl: fullBodyUrl, // Legacy compatibility
          success: true
        })
        
      } catch (error: any) {
        console.error(`[Wardrobe Preview] Failed for ${wardrobe.wardrobeId}:`, error)
        results.push({
          wardrobeId: wardrobe.wardrobeId,
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
            imagesGenerated: successfulCount, // 1 full-body image per wardrobe
            model: 'imagen-3-capability' 
          }
        )
        console.log(`[Wardrobe Preview] Charged ${chargedCredits} credits for ${successfulCount} wardrobe(s)`)
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
 * Build a prompt for generating a FULL BODY shot (9:16)
 * Uses a flowing natural language prompt structure proven to generate full-body images
 * Includes character state/expression based on script context (reason)
 */
function buildFullBodyPrompt(
  characterName: string,
  appearanceDescription?: string,
  wardrobeDescription?: string,
  accessories?: string,
  reason?: string, // AI analysis for character state/expression context
  gender?: string // Character's gender for pronoun usage
): string {
  // Determine pronouns based on gender
  const isFemale = gender?.toLowerCase() === 'female' || gender?.toLowerCase() === 'woman'
  const pronoun = isFemale ? 'She' : 'He'
  const possessive = isFemale ? 'Her' : 'His'
  
  // Build a single flowing prompt - this structure is proven to generate actual full-body shots
  const promptParts: string[] = []
  
  // Start with explicit full-body framing directive
  promptParts.push('A full body studio portrait showing the complete figure from head to toe')
  
  // Add character appearance description
  if (appearanceDescription) {
    // Extract key physical descriptors (first 1-2 sentences)
    const appearanceBrief = appearanceDescription.split('.').slice(0, 2).join('.').trim()
    if (appearanceBrief) {
      promptParts.push(`of ${characterName}, ${appearanceBrief}`)
    } else {
      promptParts.push(`of ${characterName}`)
    }
  } else {
    promptParts.push(`of ${characterName}`)
  }
  
  // Parse wardrobe into structured outfit description
  if (wardrobeDescription) {
    const outfit = parseOutfitDescription(wardrobeDescription)
    
    // Build outfit description in natural language order (top to bottom)
    const outfitItems: string[] = []
    
    if (outfit.outerwear) outfitItems.push(outfit.outerwear)
    if (outfit.top) outfitItems.push(outfit.top)
    if (outfit.bottom) outfitItems.push(outfit.bottom)
    if (outfit.footwear) outfitItems.push(outfit.footwear)
    if (outfit.other) outfitItems.push(outfit.other)
    
    if (outfitItems.length > 0) {
      promptParts.push(`${pronoun} is wearing ${outfitItems.join(', ')}`)
    } else {
      // Fallback to original description if parsing didn't extract items
      promptParts.push(`${pronoun} is wearing ${wardrobeDescription}`)
    }
  }
  
  // Add accessories in natural language
  if (accessories) {
    promptParts.push(`with ${accessories}`)
  }
  
  // Extract character state/expression from reason (AI analysis)
  if (reason) {
    // Look for emotional/physical state descriptors in the analysis
    const statePatterns = [
      /emphasiz(?:ing|es?)\s+(?:his|her|their\s+)?([\w\s]+?)(?:\.|,|$)/i,
      /convey(?:ing|s?)\s+(?:his|her|their\s+)?([\w\s]+?)(?:\.|,|$)/i,
      /reflect(?:ing|s?)\s+(?:his|her|their\s+)?([\w\s]+?)(?:\.|,|$)/i,
      /show(?:ing|s?)\s+(?:his|her|their\s+)?([\w\s]+?)(?:\.|,|$)/i,
      /(exhaustion|weariness|determination|focus|desperation|confidence|anxiety)/i
    ]
    
    for (const pattern of statePatterns) {
      const match = reason.match(pattern)
      if (match && match[1]) {
        const state = match[1].trim().slice(0, 40) // Limit length
        promptParts.push(`${possessive} expression and demeanor convey ${state}`)
        break
      }
    }
  }
  
  // Add pose and setting - crucial for full body framing
  promptParts.push(`${pronoun} is standing with a relaxed posture against a textured gray studio backdrop`)
  
  // Technical photography directives - explicit full-length framing is critical
  promptParts.push('Sharp focus, high-resolution photography, wide-angle lens showing the subject from head to toe, full length portrait, cinematically lit')
  
  return promptParts.join('. ') + '.'
}

/**
 * Parse outfit description to extract specific clothing items
 * Helps structure the prompt for better full-body generation
 */
function parseOutfitDescription(description: string): {
  top?: string
  bottom?: string
  footwear?: string
  outerwear?: string
  other?: string
} {
  const result: {
    top?: string
    bottom?: string
    footwear?: string
    outerwear?: string
    other?: string
  } = {}
  
  const lower = description.toLowerCase()
  const parts = description.split(/[,;.]/).map(s => s.trim()).filter(Boolean)
  
  // Keywords for categorization
  const topKeywords = /shirt|blouse|top|tee|t-shirt|sweater|pullover|polo|tank|camisole|vest|cardigan/i
  const bottomKeywords = /pants|trousers|jeans|skirt|shorts|slacks|leggings|chinos|khakis/i
  const footwearKeywords = /shoes|boots|sneakers|heels|loafers|sandals|oxfords|flats|pumps|trainers|footwear/i
  const outerwearKeywords = /jacket|coat|blazer|overcoat|parka|windbreaker|hoodie|raincoat|cardigan|cape/i
  
  const topParts: string[] = []
  const bottomParts: string[] = []
  const footwearParts: string[] = []
  const outerwearParts: string[] = []
  const otherParts: string[] = []
  
  for (const part of parts) {
    if (footwearKeywords.test(part)) {
      footwearParts.push(part)
    } else if (outerwearKeywords.test(part)) {
      outerwearParts.push(part)
    } else if (bottomKeywords.test(part)) {
      bottomParts.push(part)
    } else if (topKeywords.test(part)) {
      topParts.push(part)
    } else {
      otherParts.push(part)
    }
  }
  
  if (topParts.length > 0) result.top = topParts.join(', ')
  if (bottomParts.length > 0) result.bottom = bottomParts.join(', ')
  if (footwearParts.length > 0) result.footwear = footwearParts.join(', ')
  if (outerwearParts.length > 0) result.outerwear = outerwearParts.join(', ')
  if (otherParts.length > 0) result.other = otherParts.join(', ')
  
  // If no footwear was explicitly mentioned, add a hint
  if (!result.footwear && !lower.includes('shoe') && !lower.includes('boot') && !lower.includes('foot')) {
    result.footwear = 'appropriate footwear matching the outfit'
  }
  
  return result
}
