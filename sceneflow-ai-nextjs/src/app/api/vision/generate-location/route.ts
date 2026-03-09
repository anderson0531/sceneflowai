import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'

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
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
  /** Screenplay context for richer prompt generation */
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    visualStyle?: string
  }
}

/**
 * Build an optimized prompt for location reference image generation
 * Creates environment-only shots WITHOUT actors for production consistency
 */
function buildLocationPrompt(
  locationName: string,
  intExt?: string,
  timeOfDay?: string,
  description?: string
): string {
  const parts: string[] = []

  // Core location
  if (description) {
    parts.push(description)
  } else {
    parts.push(`${locationName} setting`)
  }

  // Interior/Exterior context
  if (intExt) {
    const mapping: Record<string, string> = {
      'INT': 'Interior scene',
      'EXT': 'Exterior scene',
      'INT/EXT': 'Interior/Exterior transitional scene',
      'EXT/INT': 'Exterior/Interior transitional scene'
    }
    parts.push(mapping[intExt] || '')
  }

  // Time of day lighting
  if (timeOfDay) {
    const lightingMap: Record<string, string> = {
      'DAY': 'Natural daylight, bright ambient lighting',
      'NIGHT': 'Nighttime atmosphere, artificial interior lighting or moonlight',
      'MORNING': 'Early morning light, soft golden hour tones',
      'EVENING': 'Evening atmosphere, warm golden lighting',
      'SUNSET': 'Dramatic sunset lighting with warm orange and pink tones',
      'SUNRISE': 'Sunrise atmosphere, soft warm golden light breaking through',
      'DUSK': 'Twilight atmosphere, cool blue-purple tones with fading light',
      'DAWN': 'Pre-dawn atmosphere, soft cool light with hint of warmth'
    }
    const lighting = lightingMap[timeOfDay.toUpperCase()]
    if (lighting) parts.push(lighting)
  }

  // Production quality modifiers
  parts.push(
    'Empty scene with NO people or characters present',
    'Cinematic production design, professional film set quality',
    'Wide establishing shot showing the full environment',
    'High resolution, sharp focus, detailed textures',
    'Film production location reference photograph'
  )

  return parts.filter(Boolean).join('. ') + '.'
}

/**
 * Generate a location reference image for the Production Bible.
 * Creates environment-only shots for visual consistency across scenes.
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
    const {
      projectId: reqProjectId,
      locationName,
      locationDisplay,
      intExt,
      timeOfDay,
      description,
      aspectRatio = '16:9', // Widescreen is best for location establishing shots
      screenplayContext
    } = body

    if (!locationName) {
      return NextResponse.json(
        { error: 'Missing required field: locationName' },
        { status: 400 }
      )
    }

    console.log(`[Location Generation] Generating: ${locationName}`)
    console.log(`[Location Generation] INT/EXT: ${intExt || 'N/A'}, Time: ${timeOfDay || 'N/A'}`)

    // Build optimized prompt
    const prompt = buildLocationPrompt(locationName, intExt, timeOfDay, description)
    console.log(`[Location Generation] Prompt: ${prompt.substring(0, 200)}...`)

    // Generate image — negativePrompt enforces no people in location shots
    const result = await generateImageWithGeminiStudio({
      prompt,
      aspectRatio,
      negativePrompt: 'people, persons, humans, actors, characters, figures, silhouettes, faces, crowds',
    })

    if (!result.imageBase64) {
      return NextResponse.json(
        { error: 'No image generated. Try adjusting the description.' },
        { status: 500 }
      )
    }

    // Upload to blob storage
    const fileName = `scenes/location-${locationName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
    const imageUrl = await uploadImageToBlob(result.imageBase64, fileName, reqProjectId || 'default')

    // Deduct credits
    await CreditService.charge(userId, CREDIT_COST, 'ai_usage', null, {
      provider: 'gemini',
      category: 'images',
      operation: `Location reference: ${locationName}`
    })

    console.log(`[Location Generation] Success: ${imageUrl}`)

    return NextResponse.json({
      imageUrl,
      prompt,
      creditCost: CREDIT_COST
    })
  } catch (error: any) {
    console.error('[Location Generation] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate location image' },
      { status: 500 }
    )
  }
}
