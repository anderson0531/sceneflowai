/**
 * Image Edit API Route
 * 
 * Provides AI-powered image editing for SceneFlow AI using Gemini Studio.
 * 
 * Primary Mode:
 * - Instruction-based editing (Gemini Studio) - Natural language edits with
 *   character identity preservation via reference images
 * 
 * Content Moderation:
 * - All prompts are pre-screened via Hive AI
 * - Blocks NSFW, violence, hate content before generation
 * - Saves credits by catching violations before expensive image operations
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { NextRequest, NextResponse } from 'next/server'
import { editImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { moderatePrompt, createBlockedResponse, getUserModerationContext } from '@/lib/moderation'
import sharp from 'sharp'

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
    
    // Detect aspect ratio from source image
    let aspectRatio: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' = '1:1'
    try {
      let imageBuffer: Buffer
      if (sourceImage.startsWith('data:')) {
        const base64Data = sourceImage.split(',')[1]
        imageBuffer = Buffer.from(base64Data, 'base64')
      } else {
        const res = await fetch(sourceImage)
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)
        const arrayBuffer = await res.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
      }
      
      const metadata = await sharp(imageBuffer).metadata()
      if (metadata.width && metadata.height) {
        const ratio = metadata.width / metadata.height
        const ratios = [
          { name: '1:1', value: 1 / 1 },
          { name: '2:3', value: 2 / 3 },
          { name: '3:2', value: 3 / 2 },
          { name: '3:4', value: 3 / 4 },
          { name: '4:3', value: 4 / 3 },
          { name: '4:5', value: 4 / 5 },
          { name: '5:4', value: 5 / 4 },
          { name: '9:16', value: 9 / 16 },
          { name: '16:9', value: 16 / 9 },
          { name: '21:9', value: 21 / 9 }
        ]
        
        let closest = ratios[0]
        let minDiff = Math.abs(ratio - ratios[0].value)
        for (let i = 1; i < ratios.length; i++) {
          const diff = Math.abs(ratio - ratios[i].value)
          if (diff < minDiff) {
            minDiff = diff
            closest = ratios[i]
          }
        }
        aspectRatio = closest.name as any
        console.log(`[Image Edit API] Detected aspect ratio: ${aspectRatio} from ${metadata.width}x${metadata.height}`)
      }
    } catch (err) {
      console.warn('[Image Edit API] Failed to detect aspect ratio, defaulting to 1:1', err)
    }
    
    // Use Gemini Studio for character-aware image editing
    const result = await editImageWithGeminiStudio({
      sourceImage,
      instruction,
      referenceImage: subjectReference?.imageUrl,
      aspectRatio,
      imageSize: '1K'
    })
    
    // Convert result to data URL
    const imageDataUrl = `data:${result.mimeType};base64,${result.imageBase64}`
    
    // Optionally save to blob storage for persistence
    let permanentUrl = imageDataUrl
    if (saveToBlob) {
      try {
        const filename = `${blobPrefix}-${Date.now()}.png`
        permanentUrl = await uploadImageToBlob(result.imageBase64, filename)
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
    version: '2.0.0',
    description: 'AI-powered image editing using Gemini Studio with character identity preservation',
    modes: [
      {
        mode: 'instruction',
        description: 'Edit image using natural language instruction with character identity preservation (Gemini Studio)',
        requiredFields: ['sourceImage', 'instruction'],
        optionalFields: ['subjectReference', 'saveToBlob', 'blobPrefix'],
        note: 'When subjectReference is provided, the character identity will be preserved during edits'
      }
    ],
    deprecatedModes: [
      'inpaint (mask-based editing) - Removed: Imagen 3 did not preserve character identity',
      'outpaint (aspect ratio expansion) - Removed: Imagen 3 did not preserve character identity'
    ]
  })
}
