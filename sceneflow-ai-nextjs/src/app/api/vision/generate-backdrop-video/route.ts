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
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway'

export const maxDuration = 300
export const runtime = 'nodejs'

interface GenerateBackdropVideoRequest {
  prompt: string
  mode: BackdropMode
  sourceSceneNumber?: number
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  projectId?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = String(session.user.id)

    const body: GenerateBackdropVideoRequest = await req.json()
    const {
      prompt: enteredPrompt,
      mode = 'master',
      sourceSceneNumber,
      negativePrompt,
      duration = 5,
      aspectRatio = '16:9',
      projectId,
    } = body

    if (!enteredPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Typed in the creator's language; Veo needs English.
    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, {
      projectId,
    })
    const prompt = await englishForModel(enteredPrompt, storyLocale, properNouns)

    const modeConfig = BACKDROP_MODES[mode]

    let enhancedPrompt = prompt
    if (modeConfig.styleModifiers.length > 0) {
      enhancedPrompt = `${prompt}. Style: ${modeConfig.styleModifiers.join(', ')}.`
    }
    if (modeConfig.lensDefault) {
      enhancedPrompt = `${enhancedPrompt} Shot with ${modeConfig.lensDefault}.`
    }

    const clampedDuration = Math.min(duration, 8) as 4 | 6 | 8
    console.log('[Generate Backdrop Video] Mode:', mode, 'Scene:', sourceSceneNumber)

    const metered = await executeMeteredProviderCall({
      userId,
      projectId: projectId ?? null,
      route: '/api/vision/generate-backdrop-video',
      provider: 'vertex',
      model: 'veo-3.1-fast-generate-001',
      operation: 'backdrop_video',
      quoteInput: {
        kind: 'clip',
        provider: 'google_vertex',
        model: 'veo-3.1-fast-generate-001',
        resolution: '1080p',
        durationSeconds: clampedDuration,
        floorCredits: VIDEO_CREDITS.VEO_FAST,
      },
      meta: { mode, sourceSceneNumber, aspectRatio, durationSeconds: clampedDuration },
      execute: async () => {
        const veoResult = await generateProductionVideo(enhancedPrompt, {
          negativePrompt: negativePrompt || modeConfig.negativePrompt,
          aspectRatio,
          durationSeconds: clampedDuration,
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

        return await uploadVideoToBlob(
          videoBuffer,
          `backdrops/${userId}-${Date.now()}.mp4`
        )
      },
    })

    return NextResponse.json({
      success: true,
      assetUrl: metered.result,
      generationProvider: 'vertex' as const,
      wasPolicyFallback: false,
      creditsCharged: metered.creditsCharged,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS', required: VIDEO_CREDITS.VEO_FAST },
        { status: 402 }
      )
    }
    console.error('[Generate Backdrop Video] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
