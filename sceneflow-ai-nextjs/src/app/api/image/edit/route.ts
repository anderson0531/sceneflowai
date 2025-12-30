/**
 * Image Edit API Route
 * 
 * Provides image editing capabilities for SceneFlow AI:
 * - Instruction-based editing (Gemini) - Quick conversational edits
 * - Mask-based inpainting (Imagen 3) - Precise pixel control
 * - Outpainting (Imagen 3) - Expand to cinematic aspect ratios
 * 
 * Content Moderation:
 * - All prompts are pre-screened via Hive AI
 * - Blocks NSFW, violence, hate content before generation
 * - Saves credits by catching violations before expensive image operations
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  editImageWithInstruction,
  inpaintImage,
  outpaintImage,
  EditMode,
  AspectRatioPreset
} from '@/lib/imagen/editClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { moderatePrompt, createBlockedResponse, getUserModerationContext } from '@/lib/moderation'

interface EditRequestBody {
  /** Edit mode: 'instruction' | 'inpaint' | 'outpaint' */
  mode: EditMode
  /** Source image URL or base64 data URL */
  sourceImage: string
  /** For instruction mode: natural language edit instruction */
  instruction?: string
  /** For mask modes: the edit/generation prompt */
  prompt?: string
  /** For inpaint mode: binary mask image (white = edit area) */
  maskImage?: string
  /** For outpaint mode: target aspect ratio */
  targetAspectRatio?: AspectRatioPreset
  /** Optional negative prompt */
  negativePrompt?: string
  /** Optional subject reference for identity consistency */
  subjectReference?: {
    imageUrl: string
    description: string
  }
  /** Whether to save result to blob storage */
  saveToBlob?: boolean
  /** Filename prefix for blob storage */
  blobPrefix?: string
  /** User ID for moderation tracking */
  userId?: string
  /** Project ID for moderation context */
  projectId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EditRequestBody = await request.json()
    
    const {
      mode,
      sourceImage,
      instruction,
      prompt,
      maskImage,
      targetAspectRatio,
      negativePrompt,
      subjectReference,
      saveToBlob = true,
      blobPrefix = 'edited',
      userId = 'anonymous',
      projectId
    } = body
    
    // Validate required fields
    if (!mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode' },
        { status: 400 }
      )
    }
    
    if (!sourceImage) {
      return NextResponse.json(
        { error: 'Missing required field: sourceImage' },
        { status: 400 }
      )
    }
    
    console.log(`[Image Edit API] Processing ${mode} edit request...`)
    
    // Content moderation: Pre-screen prompts before generation
    // This catches violations BEFORE we spend credits on expensive image operations
    const textToModerate = instruction || prompt || ''
    if (textToModerate) {
      const moderationContext = await getUserModerationContext(userId, projectId)
      const moderationResult = await moderatePrompt(textToModerate, moderationContext)
      
      if (!moderationResult.allowed) {
        console.log(`[Image Edit API] Prompt blocked by moderation: ${moderationResult.reason}`)
        return createBlockedResponse(
          moderationResult.result!,
          'Your edit request contains content that violates our content policy. Please revise and try again.'
        )
      }
    }
    
    let result
    
    switch (mode) {
      case 'instruction':
        if (!instruction) {
          return NextResponse.json(
            { error: 'Missing required field for instruction mode: instruction' },
            { status: 400 }
          )
        }
        result = await editImageWithInstruction({
          sourceImage,
          instruction,
          subjectReference
        })
        break
        
      case 'inpaint':
        if (!maskImage) {
          return NextResponse.json(
            { error: 'Missing required field for inpaint mode: maskImage' },
            { status: 400 }
          )
        }
        if (!prompt) {
          return NextResponse.json(
            { error: 'Missing required field for inpaint mode: prompt' },
            { status: 400 }
          )
        }
        result = await inpaintImage({
          sourceImage,
          maskImage,
          prompt,
          negativePrompt
        })
        break
        
      case 'outpaint':
        if (!targetAspectRatio) {
          return NextResponse.json(
            { error: 'Missing required field for outpaint mode: targetAspectRatio' },
            { status: 400 }
          )
        }
        if (!prompt) {
          return NextResponse.json(
            { error: 'Missing required field for outpaint mode: prompt' },
            { status: 400 }
          )
        }
        result = await outpaintImage({
          sourceImage,
          targetAspectRatio,
          prompt,
          negativePrompt
        })
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid mode: ${mode}. Must be 'instruction', 'inpaint', or 'outpaint'` },
          { status: 400 }
        )
    }
    
    if (!result.success) {
      console.error(`[Image Edit API] ${mode} edit failed:`, result.error)
      return NextResponse.json(
        { error: result.error || 'Image editing failed' },
        { status: 500 }
      )
    }
    
    // Optionally save to blob storage for persistence
    let permanentUrl = result.imageDataUrl
    if (saveToBlob && result.imageDataUrl) {
      try {
        const filename = `${blobPrefix}-${Date.now()}.png`
        // Extract base64 data from data URL
        const base64Data = result.imageDataUrl.split(',')[1]
        permanentUrl = await uploadImageToBlob(base64Data, filename)
        console.log(`[Image Edit API] Saved to blob: ${permanentUrl}`)
      } catch (blobError: any) {
        console.warn('[Image Edit API] Failed to save to blob, returning data URL:', blobError.message)
        // Continue with data URL if blob upload fails
      }
    }
    
    console.log(`[Image Edit API] ${mode} edit completed successfully`)
    
    return NextResponse.json({
      success: true,
      mode: result.mode,
      imageUrl: permanentUrl,
      originalImageUrl: result.originalImageUrl
    })
    
  } catch (error: any) {
    console.error('[Image Edit API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for documentation/health check
export async function GET() {
  return NextResponse.json({
    service: 'Image Edit API',
    version: '1.0.0',
    modes: [
      {
        mode: 'instruction',
        description: 'Edit image using natural language instruction (Gemini)',
        requiredFields: ['sourceImage', 'instruction'],
        optionalFields: ['subjectReference', 'saveToBlob', 'blobPrefix']
      },
      {
        mode: 'inpaint',
        description: 'Edit specific regions using a mask (Imagen 3)',
        requiredFields: ['sourceImage', 'maskImage', 'prompt'],
        optionalFields: ['negativePrompt', 'saveToBlob', 'blobPrefix']
      },
      {
        mode: 'outpaint',
        description: 'Expand image to new aspect ratio (Imagen 3)',
        requiredFields: ['sourceImage', 'targetAspectRatio', 'prompt'],
        optionalFields: ['negativePrompt', 'saveToBlob', 'blobPrefix'],
        aspectRatios: ['16:9', '21:9', '1:1', '9:16', '4:3', '3:4']
      }
    ]
  })
}
