import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadReferenceLibraryBase64Image } from '@/lib/storage/referenceLibraryStorage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  WARDROBE_REFERENCE_ASPECT_RATIO,
  buildWardrobeTurnaroundPrompt,
  buildWardrobeTurnaroundSubjectDescription,
} from '@/lib/character/wardrobeReferencePrompts'

export const runtime = 'nodejs'
export const maxDuration = 180

/**
 * Generate Wardrobe Turnaround Reference API
 *
 * Generates a 4-view costume turnaround sheet (front, 3/4, profile, back)
 * for use as a production wardrobe reference in scene/frame generation.
 *
 * Credit cost: 5 credits per wardrobe (1 turnaround sheet)
 */

const CREDIT_COST_PER_WARDROBE = IMAGE_CREDITS.GEMINI_EDIT

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
      gender,
      batch = false,
      wardrobes = [],
    } = body

    if (!characterReferenceImageUrl) {
      return NextResponse.json({ error: 'Character reference image is required' }, { status: 400 })
    }

    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const wardrobesToGenerate =
      batch && wardrobes.length > 0
        ? wardrobes
        : wardrobeId && wardrobeDescription
          ? [
              {
                wardrobeId,
                description: wardrobeDescription,
                accessories: wardrobeAccessories,
              },
            ]
          : []

    if (wardrobesToGenerate.length === 0) {
      return NextResponse.json({ error: 'At least one wardrobe is required' }, { status: 400 })
    }

    const totalCreditCost = CREDIT_COST_PER_WARDROBE * wardrobesToGenerate.length

    const hasEnoughCredits = await CreditService.ensureCredits(userId, totalCreditCost)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: totalCreditCost,
          balance: breakdown.total_credits,
          perWardrobeCost: CREDIT_COST_PER_WARDROBE,
          wardrobeCount: wardrobesToGenerate.length,
        },
        { status: 402 }
      )
    }

    console.log(
      `[Wardrobe Turnaround] Generating ${wardrobesToGenerate.length} turnaround sheet(s) for ${characterName}`
    )

    const results: Array<{
      wardrobeId: string
      fullBodyUrl: string
      previewImageUrl: string
      success: boolean
      error?: string
    }> = []

    for (const wardrobe of wardrobesToGenerate) {
      try {
        console.log(`[Wardrobe Turnaround] Generating sheet for: ${wardrobe.wardrobeId}`)

        const turnaroundPrompt = buildWardrobeTurnaroundPrompt({
          characterName,
          appearanceDescription,
          wardrobeDescription: wardrobe.description,
          accessories: wardrobe.accessories,
          gender,
        })

        console.log(`[Wardrobe Turnaround] Prompt: ${turnaroundPrompt.substring(0, 150)}...`)

        const imageBase64 = await generateImageWithGemini(turnaroundPrompt, {
          aspectRatio: WARDROBE_REFERENCE_ASPECT_RATIO,
          numberOfImages: 1,
          personGeneration: 'allow_adult',
          referenceImages: [
            {
              referenceId: 1,
              imageUrl: characterReferenceImageUrl,
              subjectDescription: buildWardrobeTurnaroundSubjectDescription(characterName),
            },
          ],
        })

        const fullBodyUrl = await uploadReferenceLibraryBase64Image(
          imageBase64,
          `wardrobes/${characterId || 'char'}-${wardrobe.wardrobeId}-turnaround-${Date.now()}.png`,
          projectId || 'default'
        )

        console.log(`[Wardrobe Turnaround] Sheet generated: ${wardrobe.wardrobeId}`)

        results.push({
          wardrobeId: wardrobe.wardrobeId,
          fullBodyUrl,
          previewImageUrl: fullBodyUrl,
          success: true,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Generation failed'
        console.error(`[Wardrobe Turnaround] Failed for ${wardrobe.wardrobeId}:`, message)
        results.push({
          wardrobeId: wardrobe.wardrobeId,
          fullBodyUrl: '',
          previewImageUrl: '',
          success: false,
          error: message,
        })
      }
    }

    const successfulCount = results.filter((r) => r.success).length
    const chargedCredits = CREDIT_COST_PER_WARDROBE * successfulCount

    let newBalance: number | undefined
    if (chargedCredits > 0) {
      try {
        await CreditService.charge(userId, chargedCredits, 'ai_usage', projectId || null, {
          operation: 'generate_wardrobe_turnaround',
          characterId,
          wardrobeCount: successfulCount,
          imagesGenerated: successfulCount,
          model: 'imagen-3-capability',
        })
        const breakdown = await CreditService.getCreditBreakdown(userId)
        newBalance = breakdown.total_credits
      } catch (chargeError: unknown) {
        console.error('[Wardrobe Turnaround] Failed to charge credits:', chargeError)
      }
    }

    if (batch) {
      return NextResponse.json({
        success: true,
        results,
        successCount: successfulCount,
        failedCount: results.length - successfulCount,
        creditsCharged: chargedCredits,
        creditsBalance: newBalance,
      })
    }

    const result = results[0]
    if (result?.success) {
      return NextResponse.json({
        success: true,
        fullBodyUrl: result.fullBodyUrl,
        previewImageUrl: result.previewImageUrl,
        wardrobeId: result.wardrobeId,
        creditsCharged: chargedCredits,
        creditsBalance: newBalance,
      })
    }

    return NextResponse.json({ error: result?.error || 'Generation failed' }, { status: 500 })
  } catch (error) {
    console.error('[Wardrobe Turnaround] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wardrobe turnaround generation failed' },
      { status: 500 }
    )
  }
}
