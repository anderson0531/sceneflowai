import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildSegmentEnhancedPrompt } from '@/lib/video/buildSegmentEnhancedPrompt'
import { normalizeReferenceImages } from '@/lib/video/normalizeReferenceImages'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

export const runtime = 'nodejs'

interface PreviewApiPromptRequest {
  prompt: string
  guidePrompt?: string
  generationMethod?: VideoGenerationMethod | 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF' | 'AUTO'
  genType?: 'T2V' | 'I2V'
  referenceImages?: Array<{ url: string; type?: 'style' | 'character'; name?: string; role?: string }> | string[]
  startFrameUrl?: string
  endFrameUrl?: string
  segmentIndex?: number
  audioContext?: {
    hasNarration?: boolean
    narrationText?: string
    emotionalTone?: string
    dialogueBeat?: string
    suggestedAtmosphere?: string
  }
}

function resolvePreviewMethod(
  body: PreviewApiPromptRequest
): VideoGenerationMethod {
  let method = (body.generationMethod || body.genType || 'T2V') as VideoGenerationMethod
  if (method === 'FTV' && (!body.startFrameUrl?.trim() || !body.endFrameUrl?.trim())) {
    method = body.startFrameUrl?.trim() ? 'I2V' : 'T2V'
  }
  if (method === 'AUTO') method = 'T2V'
  return method
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await params
    const body = (await req.json()) as PreviewApiPromptRequest

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const method = resolvePreviewMethod(body)
    const referenceImages = normalizeReferenceImages(body.referenceImages)?.map((ref) => ({
      url: ref.url,
      type: (ref.type === 'character' ? 'character' : 'style') as 'style' | 'character',
      name: ref.name,
      role: ref.role,
    }))

    const { enhancedPrompt } = buildSegmentEnhancedPrompt({
      prompt: body.prompt,
      guidePrompt: body.guidePrompt,
      method,
      referenceImages,
      segmentIndex: body.segmentIndex ?? 0,
      audioContext: body.audioContext,
    })

    return NextResponse.json({ apiPrompt: enhancedPrompt })
  } catch (error) {
    console.error('[Preview API Prompt] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview API prompt' },
      { status: 500 }
    )
  }
}
