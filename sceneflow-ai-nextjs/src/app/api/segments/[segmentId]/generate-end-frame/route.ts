import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxDuration = 60 // 1 minute for image generation
export const runtime = 'nodejs'

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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Generate the end frame using Imagen 3
    const imageDataUrl = await generateImageWithGemini(endFramePrompt, {
      aspectRatio,
      referenceImages,
      numberOfImages: 1
    })

    // Extract base64 data from data URL
    const base64Match = imageDataUrl.match(/^data:image\/\w+;base64,(.+)$/)
    if (!base64Match) {
      throw new Error('Invalid image data URL format')
    }
    const base64Data = base64Match[1]
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Upload to blob storage
    const endFrameUrl = await uploadImageToBlob(
      imageBuffer,
      `segments/${segmentId}/end-frame-${Date.now()}.png`
    )

    console.log('[Generate End Frame] Successfully generated and uploaded:', endFrameUrl)

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
 */
function buildEndFramePrompt(segmentPrompt: string, durationSeconds: number): string {
  // Extract action/dialogue from the segment prompt
  // The segment prompt typically describes what happens in the segment
  
  const prompt = `Generate the FINAL FRAME of a ${durationSeconds}-second video segment.

REFERENCE: Use the attached starting frame image as the primary reference.

SEGMENT ACTION: ${segmentPrompt}

CRITICAL REQUIREMENTS:
1. IDENTICAL CHARACTERS - The characters must have the exact same:
   - Facial features, skin tone, hair style and color
   - Costumes, clothing details, accessories
   - Body proportions and build
   
2. CONSISTENT ENVIRONMENT - Maintain:
   - Same location and background
   - Same lighting conditions and time of day
   - Same color grading and visual style
   
3. END STATE - Show what the scene looks like AFTER ${durationSeconds} seconds of the described action:
   - Characters may have moved positions
   - Expressions may have changed based on dialogue/action
   - Any described physical actions should be complete or in progress
   
4. CAMERA CONTINUITY - Unless the action requires it:
   - Maintain similar camera angle and framing
   - Keep the same focal distance and depth of field
   
5. CINEMATIC QUALITY - High-resolution, professional film still quality

The generated image must look like it belongs to the SAME SCENE as the reference image.`

  return prompt
}
