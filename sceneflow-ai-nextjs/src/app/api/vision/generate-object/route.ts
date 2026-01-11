import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { ObjectCategory } from '@/types/visionReferences'

export const runtime = 'nodejs'
export const maxDuration = 120

interface GenerateObjectRequest {
  name: string
  description: string
  prompt: string
  category?: ObjectCategory
  referenceImageUrl?: string // Optional reference image to base generation on
  referenceImageBase64?: string // Alternative: base64 encoded reference
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
}

/**
 * Build an optimized prompt for clean reference image generation
 */
function buildReferenceImagePrompt(
  prompt: string, 
  category: ObjectCategory = 'other',
  hasReference: boolean
): string {
  // Base prompt modifiers for clean reference images
  const studioModifiers = [
    'Professional product photography',
    'Clean studio lighting with soft shadows',
    'High resolution, sharp focus',
    'Centered composition',
    '8K quality, production reference image'
  ]

  // Category-specific enhancements
  const categoryEnhancements: Record<ObjectCategory, string[]> = {
    'prop': ['Hero prop presentation', 'Detailed texture visible', 'Museum quality display'],
    'vehicle': ['3/4 angle automotive photography', 'Dramatic studio lighting', 'Showroom quality'],
    'set-piece': ['Architectural detail photography', 'Environmental context minimal', 'Scale reference implied'],
    'costume': ['Fashion photography on form', 'Fabric texture detailed', 'Full garment visible'],
    'technology': ['Tech product showcase', 'Sleek modern presentation', 'Interface visible if applicable'],
    'other': ['Professional reference photography', 'Clear subject isolation', 'Production quality']
  }

  const enhancements = categoryEnhancements[category] || categoryEnhancements.other

  // If we have a reference image, focus on extracting/enhancing rather than creating
  if (hasReference) {
    return `Create a clean, studio-quality reference image based on the provided reference photo. ${prompt}. ${enhancements.join(', ')}. ${studioModifiers.join(', ')}. Remove background clutter, enhance clarity, professional product shot quality.`
  }

  return `${prompt}. ${enhancements.join(', ')}. ${studioModifiers.join(', ')}.`
}

/**
 * Generate a clean reference image for an object
 * Supports optional reference image for generating improved versions
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
    const { 
      name, 
      description, 
      prompt,
      category = 'other',
      referenceImageUrl,
      referenceImageBase64,
      aspectRatio = '1:1' // Square is best for reference images
    } = body

    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name and prompt' },
        { status: 400 }
      )
    }

    const hasReference = !!(referenceImageUrl || referenceImageBase64)
    console.log(`[Object Generation] Generating: ${name}`)
    console.log(`[Object Generation] Category: ${category}, Has Reference: ${hasReference}`)

    // Build optimized prompt
    const optimizedPrompt = buildReferenceImagePrompt(prompt, category, hasReference)
    console.log(`[Object Generation] Optimized prompt: ${optimizedPrompt.substring(0, 200)}...`)

    // Build reference images array if provided
    const referenceImages = hasReference ? [{
      imageUrl: referenceImageUrl,
      base64Image: referenceImageBase64,
      mimeType: 'image/jpeg',
      name: `${name} reference`
    }] : undefined

    // Generate using Gemini Studio (supports reference images natively)
    const result = await generateImageWithGeminiStudio({
      prompt: optimizedPrompt,
      aspectRatio: aspectRatio as any,
      imageSize: '2K',
      referenceImages
    })

    console.log('[Object Generation] Image generated, uploading to storage...')

    // Upload to blob storage
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)
    const filename = `objects/${category}/${safeName}-${Date.now()}.${result.mimeType === 'image/png' ? 'png' : 'jpg'}`
    const imageUrl = await uploadImageToBlob(result.imageBase64, filename)

    console.log('[Object Generation] Upload complete:', imageUrl)

    // Charge credits after successful generation
    let newBalance: number | undefined
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'IMAGE_GENERATION',
        `Object reference: ${name}`
      )
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (creditError) {
      console.error('[Object Generation] Credit charge failed:', creditError)
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      name,
      description,
      category,
      prompt: optimizedPrompt,
      hasReferenceSource: hasReference,
      creditsUsed: CREDIT_COST,
      newBalance
    })

  } catch (error: any) {
    console.error('[Object Generation] Error:', error)
    
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

    return NextResponse.json(
      { error: error.message || 'Failed to generate object reference image' },
      { status: 500 }
    )
  }
}
