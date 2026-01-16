import { NextRequest, NextResponse } from 'next/server'
// NOTE: Vertex AI Imagen import removed - using Gemini Studio exclusively due to Vertex auth issues
// import { callVertexAIImagen } from '@/lib/vertexai/client'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  inferActionType, 
  getActionWeights,
  buildEndFramePrompt,
  enhancePrompt,
  determineTransitionType,
  buildKeyframePrompt,
  type KeyframeContext
} from '@/lib/intelligence'
import type { TransitionType, ActionType, AnchorStatus } from '@/components/vision/scene-production/types'
import type { DetailedSceneDirection } from '@/types/scene-direction'

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
  
  // NEW: User customization options from FramePromptDialog
  customPrompt?: string          // User-edited prompt to use instead of actionPrompt
  negativePrompt?: string        // Elements to avoid in generation
  usePreviousEndFrame?: boolean  // Copy previous end frame as start frame (skip generation)
  
  // NEW: Scene direction for intelligent prompt building
  sceneDirection?: DetailedSceneDirection | null
  
  // Shot metadata for keyframe rules
  previousShotType?: string      // For shot consistency on CONTINUE
  isPanTransition?: boolean      // Whether this is a pan/dolly transition
  
  // Object references (auto-detected from segment text for prop/set consistency)
  objectReferences?: Array<{
    name: string
    description?: string
    category?: 'prop' | 'vehicle' | 'set-piece' | 'costume' | 'technology' | 'other'
    importance?: 'critical' | 'important' | 'background'
    imageUrl?: string
  }>
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
      aspectRatio = '16:9',
      // NEW: User customization options
      customPrompt,
      negativePrompt,
      usePreviousEndFrame = false,
      // NEW: Scene direction for intelligent prompts
      sceneDirection,
      previousShotType,
      isPanTransition = false,
      // NEW: Object references for prop consistency
      objectReferences = []
    } = body
    
    // Use custom prompt if provided, otherwise fall back to action prompt
    const effectivePrompt = customPrompt?.trim() || actionPrompt

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
      
      // Check if user wants to use previous segment's end frame directly (seamless continuity)
      if (usePreviousEndFrame && previousEndFrameUrl) {
        console.log('[Generate Frames] Using previous end frame as start frame (seamless continuity)')
        generatedStartFrameUrl = previousEndFrameUrl
        startFramePrompt = 'Copied from previous segment end frame for seamless continuity'
      } else {
        // Generate a new start frame
        
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
        
        // Build enhanced start frame prompt using intelligent keyframe builder if scene direction available
        if (sceneDirection && !customPrompt) {
          // Use intelligent keyframe prompt builder
          const keyframeContext: KeyframeContext = {
            segmentIndex,
            transitionType,
            previousEndFrameUrl: previousEndFrameUrl || undefined,
            previousShotType,
            isPanTransition,
          }
          
          const enhancedFrame = buildKeyframePrompt({
            actionPrompt: effectivePrompt,
            framePosition: 'start',
            duration,
            sceneDirection,
            keyframeContext,
            characters: characters.map(c => ({
              name: c.name,
              appearance: c.appearance,
              ethnicity: c.ethnicity,
              age: c.age,
              wardrobe: c.wardrobe
            })),
            objectReferences: objectReferences.map(obj => ({
              name: obj.name,
              description: obj.description,
              category: obj.category,
              importance: obj.importance,
              imageUrl: obj.imageUrl
            })),
          })
          
          startFramePrompt = enhancedFrame.prompt
          console.log('[Generate Frames] Using intelligent keyframe prompt with scene direction')
          console.log('[Generate Frames] Injected direction:', enhancedFrame.injectedDirection)
        } else {
          // Fallback to original enhancePrompt
          startFramePrompt = enhancePrompt(
            `Opening frame: ${effectivePrompt}`,
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
              actionDescription: effectivePrompt
            }
          )
        }
        
        // Append negative prompt to main prompt (Gemini doesn't have native negative prompt support)
        if (negativePrompt) {
          startFramePrompt = `${startFramePrompt}\n\nAvoid: ${negativePrompt}`
          console.log('[Generate Frames] Added negative prompt:', negativePrompt.substring(0, 100))
        }
        
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
      
      // Generate start frame using Gemini Studio (Vertex AI was deprecated due to auth issues)
      // Gemini Studio handles both character portraits AND scene/frame references
      let startImageDataUrl: string
      
      // Collect all reference images: character portraits + scene image
      const allReferenceImages: Array<{ imageUrl: string; name: string }> = []
      
      // Add character portrait references (up to 5)
      const charRefs = characters.filter(c => c.referenceUrl).slice(0, 5)
      for (const c of charRefs) {
        allReferenceImages.push({
          imageUrl: c.referenceUrl!,
          name: c.name
        })
      }
      
      // Add scene/frame reference if available and we have room (Gemini supports up to 5 refs)
      if (referenceImageUrl && allReferenceImages.length < 5) {
        allReferenceImages.push({
          imageUrl: referenceImageUrl,
          name: 'Scene Reference'
        })
      }
      
      console.log(`[Generate Frames] Using Gemini Studio with ${allReferenceImages.length} reference image(s)`)
      console.log(`[Generate Frames] References: ${allReferenceImages.map(r => r.name).join(', ') || 'none'}`)
      
      // Build enhanced prompt for Gemini
      let geminiPrompt = startFramePrompt
      if (charRefs.length > 0) {
        geminiPrompt = `Generate a cinematic frame based on this description. The character(s) shown in the reference image(s) must appear in this scene with their exact appearance preserved.\n\n${startFramePrompt}\n\nIMPORTANT: Match the character's ethnicity, facial features, hair color/style, and facial hair exactly from the reference images.`
      } else if (referenceImageUrl) {
        geminiPrompt = `Generate a cinematic frame based on this description. Use the provided reference image for visual style and scene continuity.\n\n${startFramePrompt}`
      }
      
      const result = await generateImageWithGeminiStudio({
        prompt: geminiPrompt,
        aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
        imageSize: '1K',
        referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined
      })
      startImageDataUrl = result.imageBase64
      
      // Upload to blob storage
      generatedStartFrameUrl = await uploadImageToBlob(
        startImageDataUrl,
        `scenes/${sceneId}/segments/${segmentId}/start-frame-${Date.now()}.png`
      )
      
      console.log('[Generate Frames] Start frame generated:', generatedStartFrameUrl)
      } // End of else block for generating new start frame
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
      // Use intelligent keyframe builder if scene direction is available
      if (sceneDirection) {
        const keyframeContext: KeyframeContext = {
          segmentIndex,
          transitionType,
          previousEndFrameUrl: previousEndFrameUrl || undefined,
          previousShotType,
          isPanTransition,
        }
        
        const enhancedFrame = buildKeyframePrompt({
          actionPrompt: effectivePrompt,
          framePosition: 'end',
          duration,
          sceneDirection,
          keyframeContext,
          characters: characters.map(c => ({
            name: c.name,
            appearance: c.appearance,
            ethnicity: c.ethnicity,
            age: c.age,
            wardrobe: c.wardrobe
          })),
          objectReferences: objectReferences.map(obj => ({
            name: obj.name,
            description: obj.description,
            category: obj.category,
            importance: obj.importance,
            imageUrl: obj.imageUrl
          })),
          previousFrameDescription: `Opening frame showing: ${actionPrompt}`,
        })
        
        endFramePrompt = enhancedFrame.prompt
        console.log('[Generate Frames] Using intelligent keyframe prompt for end frame')
        console.log('[Generate Frames] Injected direction:', enhancedFrame.injectedDirection)
      } else {
        // Fallback to original buildEndFramePrompt
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
      }
      
      console.log('[Generate Frames] End frame prompt:', endFramePrompt.substring(0, 150))
      
      // Append negative prompt to end frame prompt as well
      if (negativePrompt) {
        endFramePrompt = `${endFramePrompt}\n\nAvoid: ${negativePrompt}`
      }
      
      // Prepare reference images for end frame
      // The start frame already contains characters in context - use it as the SINGLE reference
      // Adding separate character portrait refs is redundant and exceeds the 2-ref limit for 16:9
      // Build reference images for end frame - start frame as primary reference
      const endReferenceImages: Array<{ imageUrl: string; name: string }> = [
        {
          imageUrl: startFrameReference,
          name: 'Start Frame - maintain character appearance and environment'
        }
      ]
      
      // DON'T add separate character refs - start frame already has them in context
      console.log('[Generate Frames] End frame using Gemini Studio with start frame as reference')
      
      // Build enhanced prompt for end frame
      const geminiEndPrompt = `Generate the ending frame for this scene segment. The starting frame is provided as reference - maintain EXACT character appearance, costumes, and environment continuity.\n\n${endFramePrompt}\n\nCRITICAL: This is the END of the action. Show the final state after the action completes.`
      
      // Generate end frame using Gemini Studio
      const endResult = await generateImageWithGeminiStudio({
        prompt: geminiEndPrompt,
        aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
        imageSize: '1K',
        referenceImages: endReferenceImages
      })
      const endImageDataUrl = endResult.imageBase64
      
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
