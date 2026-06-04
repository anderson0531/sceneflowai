import { NextRequest, NextResponse } from 'next/server'
import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
  downloadProductionVideo,
} from '@/lib/gemini/productionVideoClient'
import { uploadVideoToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BACKDROP_MODES, BackdropMode } from '@/lib/vision/backdropGenerator'

export const maxDuration = 300
export const runtime = 'nodejs'

interface GenerateBackdropVideoRequest {
  prompt: string
  mode: BackdropMode
  sourceSceneNumber?: number
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateBackdropVideoRequest = await req.json()
    const {
      prompt,
      mode = 'master',
      sourceSceneNumber,
      negativePrompt,
      duration = 5,
      aspectRatio = '16:9',
    } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const modeConfig = BACKDROP_MODES[mode]

    let enhancedPrompt = prompt
    if (modeConfig.styleModifiers.length > 0) {
      enhancedPrompt = `${prompt}. Style: ${modeConfig.styleModifiers.join(', ')}.`
    }
    if (modeConfig.lensDefault) {
      enhancedPrompt = `${enhancedPrompt} Shot with ${modeConfig.lensDefault}.`
    }

    console.log('[Generate Backdrop Video] Mode:', mode, 'Scene:', sourceSceneNumber)

    const veoResult = await generateProductionVideo(enhancedPrompt, {
      negativePrompt: negativePrompt || modeConfig.negativePrompt,
      aspectRatio,
      durationSeconds: Math.min(duration, 8) as 4 | 6 | 8,
      personGeneration: modeConfig.allowPeople ? 'allow_adult' : 'dont_allow',
      forceProvider: 'vertex',
    })

    if (veoResult.status === 'FAILED') {
      throw new Error(veoResult.error || 'Video generation failed')
    }

    const finalResult = await waitForProductionVideoCompletion(
      veoResult.operationName!,
      'vertex',
      240,
      10
    )

    if (finalResult.status !== 'COMPLETED' || !finalResult.videoUrl) {
      throw new Error(finalResult.error || 'Video generation did not complete')
    }

    let videoBuffer: Buffer | null = null
    if (finalResult.videoUrl.startsWith('data:video/')) {
      const m = finalResult.videoUrl.match(/^data:video\/[^;]+;base64,(.+)$/)
      if (m) videoBuffer = Buffer.from(m[1], 'base64')
    } else if (finalResult.videoUrl.startsWith('file:')) {
      videoBuffer = await downloadProductionVideo(finalResult.videoUrl.slice(5), 'vertex')
    } else if (finalResult.videoUrl.startsWith('http')) {
      const res = await fetch(finalResult.videoUrl)
      if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`)
      videoBuffer = Buffer.from(await res.arrayBuffer())
    }

    if (!videoBuffer) throw new Error('Failed to obtain video bytes')

    const assetUrl = await uploadVideoToBlob(
      videoBuffer,
      `backdrops/${session.user.id}-${Date.now()}.mp4`
    )

    return NextResponse.json({
      success: true,
      assetUrl,
      generationProvider: 'vertex' as const,
      wasPolicyFallback: false,
    })
  } catch (error: unknown) {
    console.error('[Generate Backdrop Video] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
