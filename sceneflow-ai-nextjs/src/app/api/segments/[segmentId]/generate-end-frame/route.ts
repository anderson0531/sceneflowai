import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import { trackCost } from '@/lib/credits/costTracking'

export const maxDuration = 60 // 1 minute for image generation
export const runtime = 'nodejs'

// End frame generation uses Imagen 3 - same as FRAME_GENERATION cost
const END_FRAME_CREDIT_COST = IMAGE_CREDITS.FRAME_GENERATION // 10 credits

interface GenerateEndFrameRequest {
  startFrameUrl: string
  segmentPrompt: string
  segmentDuration?: number
  aspectRatio?: '16:9' | '9:16'
  // Optional character references for consistency
  characterRefs?: Array<{ url: string; name?: string }>
}

/**
 * Generate End Frame API
 * 
 * Creates an end frame image for a video segment using Imagen 3.
 * The end frame is generated based on:
 * - The start frame (as a reference for character/scene consistency)
 * - The segment's action/dialogue description
 * - The segment duration (to estimate how much change should occur)
 * 
 * This enables Frame-Anchored Video Production where Veo 3.1 uses
 * both start AND end frames to generate videos with reduced character drift.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const { segmentId } = await params
    const body: GenerateEndFrameRequest = await req.json()
    const { 
      startFrameUrl, 
      segmentPrompt, 
      segmentDuration = 8,
      aspectRatio = '16:9',
      characterRefs = []
    } = body

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has sufficient credits
    const hasCredits = await CreditService.ensureCredits(userId, END_FRAME_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits', 
        required: END_FRAME_CREDIT_COST,
        operation: 'end_frame_generation'
      }, { status: 402 })
    }

    if (!startFrameUrl || !segmentPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: startFrameUrl, segmentPrompt' },
        { status: 400 }
      )
    }

    console.log('[Generate End Frame] Starting for segment:', segmentId)
    console.log('[Generate End Frame] Start frame URL:', startFrameUrl.substring(0, 80))
    console.log('[Generate End Frame] Segment prompt preview:', segmentPrompt.substring(0, 150))
    console.log('[Generate End Frame] Duration:', segmentDuration, 'seconds')

    // Build the end frame generation prompt
    // This prompt instructs Imagen to generate what the scene looks like AFTER the action
    const endFramePrompt = buildEndFramePrompt(segmentPrompt, segmentDuration)
    
    console.log('[Generate End Frame] Built end frame prompt:', endFramePrompt.substring(0, 200))

    // Prepare reference images - start frame is the primary reference
    const referenceImages = [
      {
        referenceId: 1,
        imageUrl: startFrameUrl,
        subjectDescription: 'Starting frame - maintain exact character appearance, costumes, and environment'
      }
    ]

    // Add character references if provided (for additional consistency)
    characterRefs.slice(0, 4).forEach((charRef, index) => {
      referenceImages.push({
        referenceId: index + 2,
        imageUrl: charRef.url,
        subjectDescription: charRef.name ? `Character: ${charRef.name}` : `Character reference ${index + 1}`
      })
    })

    console.log('[Generate End Frame] Using', referenceImages.length, 'reference image(s)')

    // Generate the end frame
    // Use Gemini Studio for character portrait references (better identity preservation)
    // Use Vertex AI Imagen for frame-only references (faster, for continuity)
    let imageDataUrl: string
    const hasCharacterPortraitRefs = characterRefs.length > 0
    
    if (hasCharacterPortraitRefs) {
      // Character portrait references - use Gemini Studio for better identity
      console.log('[Generate End Frame] Using Gemini Studio for character portrait references')
      const geminiPrompt = `Generate a cinematic end frame based on this description. The character(s) shown in the reference image(s) must maintain their exact appearance from start to end.\n\n${endFramePrompt}\n\nIMPORTANT: The start frame shows the beginning state. Generate what the scene looks like AFTER the action, while preserving exact character identity from the reference images.`
      
      const allRefs = [
        { imageUrl: startFrameUrl, name: 'start-frame' },
        ...characterRefs.slice(0, 4).map(c => ({ imageUrl: c.url, name: c.name || 'character' }))
      ]
      
      const result = await generateImageWithGeminiStudio({
        prompt: geminiPrompt,
        aspectRatio: aspectRatio as '16:9' | '9:16',
        imageSize: '1K',
        referenceImages: allRefs
      })
      imageDataUrl = result.imageBase64
    } else {
      // Frame reference only - use Vertex AI Imagen for continuity
      imageDataUrl = await callVertexAIImagen(endFramePrompt, {
        aspectRatio,
        referenceImages: referenceImages.map(ref => ({
          referenceId: ref.referenceId,
          imageUrl: ref.imageUrl,
          subjectDescription: ref.subjectDescription,
          referenceType: 'REFERENCE_TYPE_SUBJECT' as const,
          subjectType: 'SUBJECT_TYPE_PERSON' as const
        })),
        numberOfImages: 1
      })
    }

    // Upload to blob storage (uploadImageToBlob accepts base64 data URL directly)
    const endFrameUrl = await uploadImageToBlob(
      imageDataUrl,
      `segments/${segmentId}/end-frame-${Date.now()}.png`
    )

    console.log('[Generate End Frame] Successfully generated and uploaded:', endFrameUrl)

    // Charge credits after successful generation
    try {
      await CreditService.charge(
        userId,
        END_FRAME_CREDIT_COST,
        'ai_usage',
        segmentId,
        { operation: 'end_frame_generation', segmentId, aspectRatio, hasCharacterRefs: hasCharacterPortraitRefs }
      )
      console.log(`[Generate End Frame] Charged ${END_FRAME_CREDIT_COST} credits to user ${userId}`)
      
      // Track cost for reconciliation
      await trackCost(userId, 'end_frame_generation', END_FRAME_CREDIT_COST, {
        imageCount: 1,
        segmentId
      })
    } catch (chargeError: any) {
      console.error('[Generate End Frame] Failed to charge credits:', chargeError)
      // Don't fail the request if credit charge fails - the user already got the frame
    }

    return NextResponse.json({
      success: true,
      endFrameUrl,
      endFramePrompt: endFramePrompt,
      segmentId
    })

  } catch (error) {
    console.error('[Generate End Frame] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to generate end frame',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * Build the prompt for generating the end frame
 * 
 * The prompt is designed to:
 * 1. Reference the starting frame for character/scene consistency
 * 2. Describe the END STATE after the segment's action occurs
 * 3. Emphasize maintaining character appearance
 * 4. Phase 11: Show DELIBERATE, SPECIFIC changes from start frame
 */
function buildEndFramePrompt(segmentPrompt: string, durationSeconds: number): string {
  const prompt = `Generate the FINAL FRAME of a ${durationSeconds}-second video segment.

REFERENCE: The attached image is the START of this ${durationSeconds}s segment. 
Generate what the scene looks like at the END.

SEGMENT ACTION: ${segmentPrompt}

CRITICAL — SAME SCENE, SAME MOMENT:
1. IDENTICAL CHARACTERS — The characters must be RECOGNIZABLY THE SAME PERSON:
   - Identical facial features, skin tone, hair style and color
   - Same costumes, clothing details, accessories
   - Same body proportions and build
   
2. CONSISTENT ENVIRONMENT — Same location, lighting, color grading
   
3. DELIBERATE CHANGES — Show what SPECIFICALLY changed after ${durationSeconds}s:
   - Characters may have moved positions or shifted body language
   - Expressions should reflect the emotional result of the action/dialogue
   - Any described physical actions should be visible in their completed state
   
4. CAMERA CONTINUITY — Maintain similar camera angle and framing
   unless the action explicitly involves camera movement

The generated image must look like the LAST FRAME of a video that STARTED with the reference image.`

  return prompt
}
