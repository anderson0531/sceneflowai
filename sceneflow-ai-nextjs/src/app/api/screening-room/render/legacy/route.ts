import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreatomateRenderService } from '../../../../../services/CreatomateRenderService'
import { CreditService } from '../../../../../services/CreditService'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.EXPORT_STUDIO_ENABLED === 'true') {
      return NextResponse.json({
        error: 'Legacy renderer disabled',
        message: 'Set EXPORT_STUDIO_ENABLED=false to enable Creatomate fallback.'
      }, { status: 400 })
    }

    const { scenes, options, projectTitle } = await req.json()

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided' }, { status: 400 })
    }

    const totalDuration = scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0)
    const creditsRequired = Math.ceil(totalDuration / 60) * 100

    const hasCredits = await CreditService.ensureCredits(session.user.id, creditsRequired)
    if (!hasCredits) {
      return NextResponse.json({
        error: 'Insufficient credits',
        message: `You need ${creditsRequired} credits to render this video (${Math.round(totalDuration / 60 * 10) / 10} minutes).`,
        required: creditsRequired
      }, { status: 402 })
    }

    const apiKey = process.env.CREATOMATE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Creatomate not configured' }, { status: 500 })
    }

    const renderService = new CreatomateRenderService(apiKey)

    let videoUrl: string
    try {
      videoUrl = await renderService.renderVideo(scenes, options, projectTitle || 'Screening Room')
    } catch (error: any) {
      console.error('[Creatomate Legacy] Render failed', error)
      throw new Error(error?.message || 'Creatomate render failed')
    }

    try {
      await CreditService.charge(
        session.user.id,
        creditsRequired,
        'ai_usage',
        `render_legacy_${Date.now()}`,
        {
          service: 'video_render',
          duration: totalDuration,
          sceneCount: scenes.length,
          projectTitle,
          renderId: 'legacy'
        }
      )
    } catch (error: any) {
      console.error('[Creatomate Legacy] Failed to charge credits:', error)
      throw new Error('Insufficient credits or payment processing failed')
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      message: 'Creatomate render complete'
    })
  } catch (error: any) {
    console.error('[Creatomate Legacy] Error:', error)
    return NextResponse.json({
      error: 'Render failed',
      message: error?.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}
