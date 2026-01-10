import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  inferActionType, 
  getActionWeights,
  buildEndFramePrompt,
  enhancePrompt,
  determineTransitionType
} from '@/lib/intelligence'
import type { TransitionType, ActionType, AnchorStatus } from '@/components/vision/scene-production/types'

export const maxDuration = 120 // 2 minutes for potentially generating both frames
export const runtime = 'nodejs'

interface FrameGenerationRequest {
  // Required fields
  sceneId: string
  segmentId: string
  segmentIndex: number
  actionPrompt: string
  duration: number
  
  // Which frame to generate
  frameType: 'start' | 'end' | 'both'
  
  // Transition from previous segment (affects start frame generation)
  transitionType?: TransitionType
  
  // Reference images
  previousEndFrameUrl?: string | null  // For CONTINUE transitions
  sceneImageUrl?: string | null         // Fallback reference
  startFrameUrl?: string | null         // Required for end frame generation
  
  // Character data for identity lock
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
    referenceUrl?: string
  }>
  
  // Scene context for prompt enhancement
  sceneContext?: {
    location?: string
    timeOfDay?: string
    atmosphere?: string
    lighting?: string
    heading?: string
  }
  
  // Trigger reason (for transition type determination)
  triggerReason?: string
  
  // Aspect ratio
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

interface FrameGenerationResponse {
  success: boolean
  segmentId: string
  
  // Generated frames
  startFrameUrl?: string
  startFramePrompt?: string
  endFrameUrl?: string
  endFramePrompt?: string
  
  // Metadata
  actionType: ActionType
  transitionType: TransitionType
  anchorStatus: AnchorStatus
  
  // Generation parameters used
  imageStrength?: number
  guidanceScale?: number
  
  error?: string
}

/**
 * Generate Segment Frames API
 * 
 * Keyframe State Machine implementation for generating Start and End frames.
 * 
 * Principles:
 * - CONTINUE transitions: Start frame inherits from previous segment's end frame
 * - CUT transitions: Start frame is freshly generated from scene image or prompt
 * - End frames use inverse proportionality: low action = high identity lock
 * 
 * This enables Frame-Anchored Video Production where Veo 3.1 FTV mode uses
 * both start AND end frames for constrained video generation with minimal character drift.
 */
export async function POST(req: NextRequest) {
  try {
    const body: FrameGenerationRequest = await req.json()
    const {
      sceneId,
      segmentId,
      segmentIndex,
      actionPrompt,
      duration,
      frameType,
      transitionType: requestedTransition,
      previousEndFrameUrl,
      sceneImageUrl,
      startFrameUrl: providedStartFrameUrl,
      characters = [],
      sceneContext = {},
      triggerReason,
      aspectRatio = '16:9'
    } = body

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!sceneId || !segmentId || !actionPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: sceneId, segmentId, actionPrompt' },
        { status: 400 }
      )
    }

    console.log('[Generate Frames] Starting for segment:', segmentId)
    console.log('[Generate Frames] Action prompt:', actionPrompt.substring(0, 100))
    console.log('[Generate Frames] Frame type requested:', frameType)

    // Analyze the action to determine weights
    const actionType = inferActionType(actionPrompt)
    const weights = getActionWeights(actionType)
    
    console.log('[Generate Frames] Inferred action type:', actionType)
    console.log('[Generate Frames] Image strength:', weights.imageStrength)

    // Determine transition type if not explicitly provided
    const transitionType = requestedTransition || determineTransitionType(
      segmentIndex,
      actionPrompt,
      undefined, // Previous segment action not available
      triggerReason
    )
    
    console.log('[Generate Frames] Transition type:', transitionType)

    let generatedStartFrameUrl: string | undefined
    let startFramePrompt: string | undefined
    let generatedEndFrameUrl: string | undefined
    let endFramePrompt: string | undefined

    // ========================================================================
    // GENERATE START FRAME
    // ========================================================================
    if (frameType === 'start' || frameType === 'both') {
      console.log('[Generate Frames] Generating start frame...')
      
      // Determine which reference image to use for start frame
      let referenceImageUrl: string | undefined
      let imageStrength = 0 // T2I mode by default
      
      if (transitionType === 'CONTINUE' && previousEndFrameUrl) {
        // Continuation: use previous segment's end frame with high strength
        referenceImageUrl = previousEndFrameUrl
        imageStrength = Math.min(0.90, weights.imageStrength + 0.1) // Boost for continuation
        console.log('[Generate Frames] Using previous end frame for continuation')
      } else if (sceneImageUrl) {
        // CUT transition: use scene image as reference
        referenceImageUrl = sceneImageUrl
        imageStrength = 0.75 // Moderate strength for establishing
        console.log('[Generate Frames] Using scene image for new shot')
      }
      
      // Build enhanced start frame prompt
      startFramePrompt = enhancePrompt(
        `Opening frame: ${actionPrompt}`,
        {
          actionType,
          framePosition: 'start',
          characters: characters.map(c => ({
            name: c.name,
            appearance: c.appearance,
            ethnicity: c.ethnicity,
            age: c.age,
            wardrobe: c.wardrobe
          })),
          sceneContext: {
            location: sceneContext.location || sceneContext.heading,
            timeOfDay: sceneContext.timeOfDay,
            atmosphere: sceneContext.atmosphere,
            lighting: sceneContext.lighting
          },
          actionDescription: actionPrompt
        }
      )
      
      console.log('[Generate Frames] Start frame prompt:', startFramePrompt.substring(0, 150))
      
      // Prepare reference images
      // The scene image already contains characters in context - use it as the SINGLE reference
      // Adding separate character portrait refs is redundant and exceeds the 2-ref limit for 16:9
      const startReferenceImages: Array<{
        referenceId: number
        imageUrl: string
        subjectDescription: string
      }> = []
      
      if (referenceImageUrl) {
        // Scene image or previous frame already has characters - use as single reference
        startReferenceImages.push({
          referenceId: 1,
          imageUrl: referenceImageUrl,
          subjectDescription: transitionType === 'CONTINUE' 
            ? 'Previous frame - maintain exact visual continuity including character appearance'
            : 'Scene establishing shot - match location, style, and character appearance'
        })
        console.log('[Generate Frames] Using scene/previous frame as single reference (characters already in context)')
      } else {
        // No scene image - fall back to character portrait references
        const startCharsWithRefs = characters.filter(c => c.referenceUrl)
        console.log(`[Generate Frames] No scene image, using ${startCharsWithRefs.length} character portrait refs`)
        
        const maxRefs = aspectRatio === '1:1' ? 4 : 2
        startCharsWithRefs.slice(0, maxRefs).forEach((char, index) => {
          startReferenceImages.push({
            referenceId: index + 1,
            imageUrl: char.referenceUrl!,
            subjectDescription: `Character: ${char.name} - match exact appearance`
          })
        })
      }
      
      // Generate start frame using Vertex AI Imagen (higher rate limits than Gemini API)
      const startImageDataUrl = await callVertexAIImagen(startFramePrompt, {
        aspectRatio,
        referenceImages: startReferenceImages.length > 0 ? startReferenceImages.map(ref => ({
          referenceId: ref.referenceId,
          imageUrl: ref.imageUrl,
          subjectDescription: ref.subjectDescription,
          referenceType: 'REFERENCE_TYPE_SUBJECT' as const,
          subjectType: 'SUBJECT_TYPE_PERSON' as const
        })) : undefined,
        numberOfImages: 1
      })
      
      // Upload to blob storage
      generatedStartFrameUrl = await uploadImageToBlob(
        startImageDataUrl,
        `scenes/${sceneId}/segments/${segmentId}/start-frame-${Date.now()}.png`
      )
      
      console.log('[Generate Frames] Start frame generated:', generatedStartFrameUrl)
    }

    // ========================================================================
    // GENERATE END FRAME
    // ========================================================================
    if (frameType === 'end' || frameType === 'both') {
      console.log('[Generate Frames] Generating end frame...')
      
      // For end frame, we need a start frame reference
      const startFrameReference = generatedStartFrameUrl || providedStartFrameUrl
      
      if (!startFrameReference) {
        return NextResponse.json(
          { error: 'End frame generation requires a start frame reference' },
          { status: 400 }
        )
      }
      
      // Build enhanced end frame prompt using intelligence library
      endFramePrompt = buildEndFramePrompt(
        `Opening frame showing: ${actionPrompt}`,
        actionPrompt,
        duration,
        {
          actionType,
          characters: characters.map(c => ({
            name: c.name,
            appearance: c.appearance,
            ethnicity: c.ethnicity,
            age: c.age,
            wardrobe: c.wardrobe
          })),
          sceneContext: {
            location: sceneContext.location || sceneContext.heading,
            timeOfDay: sceneContext.timeOfDay,
            atmosphere: sceneContext.atmosphere,
            lighting: sceneContext.lighting
          }
        }
      )
      
      console.log('[Generate Frames] End frame prompt:', endFramePrompt.substring(0, 150))
      
      // Prepare reference images for end frame
      // The start frame already contains characters in context - use it as the SINGLE reference
      // Adding separate character portrait refs is redundant and exceeds the 2-ref limit for 16:9
      const endReferenceImages: Array<{
        referenceId: number
        imageUrl: string
        subjectDescription: string
      }> = [
        {
          referenceId: 1,
          imageUrl: startFrameReference,
          subjectDescription: 'Starting frame - maintain EXACT character appearance, costumes, and environment'
        }
      ]
      
      // DON'T add separate character refs - start frame already has them in context
      console.log('[Generate Frames] End frame using start frame as single reference (characters already in context)')
      
      // Generate end frame using Vertex AI Imagen (higher rate limits than Gemini API)
      const endImageDataUrl = await callVertexAIImagen(endFramePrompt, {
        aspectRatio,
        referenceImages: endReferenceImages.map(ref => ({
          referenceId: ref.referenceId,
          imageUrl: ref.imageUrl,
          subjectDescription: ref.subjectDescription,
          referenceType: 'REFERENCE_TYPE_SUBJECT' as const,
          subjectType: 'SUBJECT_TYPE_PERSON' as const
        })),
        numberOfImages: 1
      })
      
      // Upload to blob storage
      generatedEndFrameUrl = await uploadImageToBlob(
        endImageDataUrl,
        `scenes/${sceneId}/segments/${segmentId}/end-frame-${Date.now()}.png`
      )
      
      console.log('[Generate Frames] End frame generated:', generatedEndFrameUrl)
    }

    // Determine anchor status
    let anchorStatus: AnchorStatus = 'pending'
    if (generatedStartFrameUrl || providedStartFrameUrl) {
      anchorStatus = 'start-locked'
    }
    if ((generatedStartFrameUrl || providedStartFrameUrl) && generatedEndFrameUrl) {
      anchorStatus = 'fully-anchored'
    }

    const response: FrameGenerationResponse = {
      success: true,
      segmentId,
      startFrameUrl: generatedStartFrameUrl,
      startFramePrompt,
      endFrameUrl: generatedEndFrameUrl,
      endFramePrompt,
      actionType,
      transitionType,
      anchorStatus,
      imageStrength: weights.imageStrength,
      guidanceScale: weights.guidanceScale
    }

    console.log('[Generate Frames] Complete:', {
      segmentId,
      anchorStatus,
      hasStartFrame: !!generatedStartFrameUrl,
      hasEndFrame: !!generatedEndFrameUrl
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Generate Frames] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate frames',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
