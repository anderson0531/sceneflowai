import { NextRequest, NextResponse } from 'next/server'
import { generateVertexImage } from '@/lib/vertexai/vertexImageClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, gcsUri, characterName, sceneDescription } = await req.json()

    if (!characterName || !sceneDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: characterName, sceneDescription' },
        { status: 400 }
      )
    }

    const referenceUrl = imageUrl || gcsUri

    console.log('[Gemini Image Test] Test 1: Generating without reference...')
    const withoutRef = await generateVertexImage({
      prompt: sceneDescription,
      aspectRatio: '16:9',
      modelTier: 'eco',
    })

    let withReference: { ok: boolean; modelId?: string; error?: string } | null = null
    if (referenceUrl) {
      console.log('[Gemini Image Test] Test 2: Generating with reference:', referenceUrl)
      try {
        const result = await generateVertexImage({
          prompt: sceneDescription,
          aspectRatio: '16:9',
          referenceImages: [{ imageUrl: referenceUrl, name: characterName }],
        })
        withReference = { ok: !!result.imageBase64, modelId: result.modelId }
      } catch (error: any) {
        withReference = { ok: false, error: error?.message || 'Unknown error' }
      }
    }

    return NextResponse.json({
      success: true,
      withoutReference: { ok: !!withoutRef.imageBase64, modelId: withoutRef.modelId },
      withReference,
      note: referenceUrl
        ? undefined
        : 'Pass imageUrl to also test reference-based generation',
    })
  } catch (error: any) {
    console.error('[Gemini Image Test] Error:', error)
    return NextResponse.json(
      {
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
