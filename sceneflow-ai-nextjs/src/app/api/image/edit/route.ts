/**
 * Image Edit API Route
 *
 * Instruction-based editing via Gemini multimodal edit on Vertex (editVertexImage).
 * Preserves composition better than Imagen foreground-inpaint for storyboard edits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { editVertexImage } from '@/lib/vertexai/vertexImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'

interface EditRequestBody {
  mode: 'instruction'
  sourceImage: string
  instruction: string
  subjectReference?: {
    imageUrl: string
    description: string
  }
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K'
  modelTier?: 'eco' | 'designer' | 'director'
  saveToBlob?: boolean
  blobPrefix?: string
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
      aspectRatio = '16:9',
      imageSize = '1K',
      modelTier = 'eco',
      saveToBlob = true,
      blobPrefix = 'edited',
    } = body

    if (!mode || mode !== 'instruction') {
      return NextResponse.json(
        { error: 'Invalid mode. Only "instruction" mode is supported.' },
        { status: 400 }
      )
    }

    if (!sourceImage) {
      return NextResponse.json({ error: 'Missing required field: sourceImage' }, { status: 400 })
    }

    if (!instruction?.trim()) {
      return NextResponse.json({ error: 'Missing required field: instruction' }, { status: 400 })
    }

    console.log(`[Image Edit API] Gemini edit: "${instruction.substring(0, 50)}..."`)

    const result = await editVertexImage({
      sourceImage,
      instruction: instruction.trim(),
      referenceImage: subjectReference?.imageUrl,
      aspectRatio,
      imageSize,
      modelTier,
      editIntent: 'preVisEdit',
    })

    const imageDataUrl = `data:${result.mimeType};base64,${result.imageBase64}`

    let permanentUrl = imageDataUrl
    if (saveToBlob) {
      try {
        const filename = `${blobPrefix}-${Date.now()}.png`
        permanentUrl = await uploadImageToBlob(result.imageBase64, filename)
        console.log(`[Image Edit API] Saved to blob: ${permanentUrl}`)
      } catch (blobError: unknown) {
        const message = blobError instanceof Error ? blobError.message : String(blobError)
        console.warn('[Image Edit API] Failed to save to blob, returning data URL:', message)
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'instruction',
      imageUrl: permanentUrl,
      originalImageUrl: sourceImage,
      model: result.modelId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[Image Edit API] Unexpected error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Image Edit API',
    version: '4.0.0',
    description: 'AI-powered image editing via Gemini multimodal edit on Vertex',
    provider: 'vertex-gemini',
    modes: [
      {
        mode: 'instruction',
        description: 'Edit image using natural language instruction',
        requiredFields: ['sourceImage', 'instruction'],
        optionalFields: ['subjectReference', 'aspectRatio', 'imageSize', 'modelTier', 'saveToBlob', 'blobPrefix'],
      },
    ],
  })
}
