/**
 * Image Edit API Route
 * 
 * Provides AI-powered image editing via Vertex AI Imagen 3 (imagen-3.0-capability-001).
 * Uses project service-account auth and Vertex quotas — not the consumer Gemini API
 * (generativelanguage.googleapis.com), which is rate-limited at ~20 RPM.
 * 
 * Primary Mode:
 * - Instruction-based editing with optional subject reference for identity
 * 
 * Content Moderation:
 * - All prompts are pre-screened via Hive AI
 * - Blocks NSFW, violence, hate content before generation
 * - Saves credits by catching violations before expensive image operations
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { NextRequest, NextResponse } from 'next/server'
import { editImageWithInstruction } from '@/lib/imagen/editClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { moderatePrompt, createBlockedResponse, getUserModerationContext } from '@/lib/moderation'

interface EditRequestBody {
  /** Edit mode: 'instruction' (only mode supported now) */
  mode: 'instruction'
  /** Source image URL or base64 data URL */
  sourceImage: string
  /** Natural language edit instruction */
  instruction: string
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
      subjectReference,
      saveToBlob = true,
      blobPrefix = 'edited',
      userId = 'anonymous',
      projectId
    } = body
    
    // Validate required fields
    if (!mode || mode !== 'instruction') {
      return NextResponse.json(
        { error: 'Invalid mode. Only "instruction" mode is supported.' },
        { status: 400 }
      )
    }
    
    if (!sourceImage) {
      return NextResponse.json(
        { error: 'Missing required field: sourceImage' },
        { status: 400 }
      )
    }
    
    if (!instruction) {
      return NextResponse.json(
        { error: 'Missing required field: instruction' },
        { status: 400 }
      )
    }
    
    console.log(`[Image Edit API] Processing instruction edit: "${instruction.substring(0, 50)}..."`)
    if (subjectReference) {
      console.log(`[Image Edit API] Using subject reference for identity preservation`)
    }
    
    // Content moderation: Pre-screen prompts before generation
    const moderationContext = await getUserModerationContext(userId, projectId)
    const moderationResult = await moderatePrompt(instruction, moderationContext)
    
    if (!moderationResult.allowed) {
      console.log(`[Image Edit API] Prompt blocked by moderation: ${moderationResult.reason}`)
      return createBlockedResponse(
        moderationResult.result!,
        'Your edit request contains content that violates our content policy. Please revise and try again.'
      )
    }
    
    const enrichedInstruction = subjectReference
      ? `${instruction.trim()}. Preserve the person's identity using the provided subject reference.`
      : `${instruction.trim()}. Preserve composition, framing, and lighting unless the instruction requires otherwise.`

    const result = await editImageWithInstruction({
      sourceImage,
      instruction: enrichedInstruction,
      subjectReference,
    })

    if (!result.success || !result.imageDataUrl) {
      throw new Error(result.error || 'Image edit failed')
    }

    const imageDataUrl = result.imageDataUrl
    const base64Payload = imageDataUrl.includes(',')
      ? imageDataUrl.split(',')[1]
      : imageDataUrl

    // Optionally save to blob storage for persistence
    let permanentUrl = imageDataUrl
    if (saveToBlob) {
      try {
        const filename = `${blobPrefix}-${Date.now()}.png`
        permanentUrl = await uploadImageToBlob(base64Payload, filename)
        console.log(`[Image Edit API] Saved to blob: ${permanentUrl}`)
      } catch (blobError: any) {
        console.warn('[Image Edit API] Failed to save to blob, returning data URL:', blobError.message)
        // Continue with data URL if blob upload fails
      }
    }
    
    console.log(`[Image Edit API] Edit completed successfully`)
    
    return NextResponse.json({
      success: true,
      mode: 'instruction',
      imageUrl: permanentUrl,
      originalImageUrl: sourceImage
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
    version: '3.0.0',
    description: 'AI-powered image editing via Vertex AI Imagen 3 (instruction-based)',
    provider: 'vertex-ai',
    modes: [
      {
        mode: 'instruction',
        description: 'Edit image using natural language instruction (Vertex Imagen 3)',
        requiredFields: ['sourceImage', 'instruction'],
        optionalFields: ['subjectReference', 'saveToBlob', 'blobPrefix'],
        note: 'When subjectReference is provided, identity is preserved via Imagen subject customization'
      }
    ],
  })
}
