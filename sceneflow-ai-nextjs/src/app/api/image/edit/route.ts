/**
 * Image Edit API Route
 *
 * Instruction-based editing via Gemini multimodal edit on Vertex (editVertexImage).
 * Preserves composition better than Imagen foreground-inpaint for storyboard edits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { editVertexImage } from '@/lib/vertexai/vertexImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import {
  CHARACTER_IDENTITY_REFERENCE_INSTRUCTION,
  DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK,
  WARDROBE_ONLY_REFERENCE_INSTRUCTION,
} from '@/lib/character/characterReferenceAssembly'

interface EditReferenceImage {
  imageUrl: string
  name?: string
}

interface EditRequestBody {
  mode: 'instruction'
  sourceImage: string
  instruction: string
  subjectReference?: {
    imageUrl: string
    description: string
  }
  referenceImages?: EditReferenceImage[]
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  imageSize?: '1K' | '2K'
  modelTier?: 'eco' | 'designer' | 'director'
  saveToBlob?: boolean
  blobPrefix?: string
  projectId?: string
}

function buildDualReferenceInstruction(referenceImages: EditReferenceImage[]): string | undefined {
  const names = referenceImages.map((r) => r.name?.toLowerCase() ?? '')
  const hasIdentity = names.some((n) => n.includes('identity') || n.includes('diptych'))
  const hasWardrobe = names.some((n) => n.includes('wardrobe') || n.includes('diptych'))
  if (!hasIdentity || !hasWardrobe) return undefined
  return [
    DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK,
    CHARACTER_IDENTITY_REFERENCE_INSTRUCTION,
    WARDROBE_ONLY_REFERENCE_INSTRUCTION,
  ].join('\n\n')
}

export async function POST(request: NextRequest) {
  try {
    const body: EditRequestBody = await request.json()

    const {
      mode,
      sourceImage,
      instruction,
      subjectReference,
      referenceImages: bodyReferenceImages,
      aspectRatio = '16:9',
      imageSize = '1K',
      modelTier: requestedTier = 'eco',
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

    const referenceImages: EditReferenceImage[] = [...(bodyReferenceImages ?? [])]
    if (
      subjectReference?.imageUrl &&
      !referenceImages.some((r) => r.imageUrl === subjectReference.imageUrl)
    ) {
      referenceImages.push({
        imageUrl: subjectReference.imageUrl,
        name: subjectReference.description || 'Identity reference',
      })
    }

    const totalRefs = 1 + referenceImages.length
    const modelTier = totalRefs > 3 ? 'designer' : requestedTier

    console.log(`[Image Edit API] Gemini edit: "${instruction.substring(0, 50)}..."`)

    const result = await editVertexImage({
      sourceImage,
      instruction: instruction.trim(),
      referenceImages,
      aspectRatio,
      imageSize,
      modelTier,
      editIntent: 'preVisEdit',
      dualReferenceInstruction: buildDualReferenceInstruction(referenceImages),
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
    version: '4.1.0',
    description: 'AI-powered image editing via Gemini multimodal edit on Vertex',
    provider: 'vertex-gemini',
    modes: [
      {
        mode: 'instruction',
        description: 'Edit image using natural language instruction',
        requiredFields: ['sourceImage', 'instruction'],
        optionalFields: [
          'subjectReference',
          'referenceImages',
          'aspectRatio',
          'imageSize',
          'modelTier',
          'saveToBlob',
          'blobPrefix',
        ],
      },
    ],
  })
}
