import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreatomateRenderService } from '../../../../services/CreatomateRenderService'
import { CreditService } from '../../../../services/CreditService'

export const runtime = 'nodejs'
export const maxDuration = 60 // Creatomate handles long renders asynchronously

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.EXPORT_STUDIO_ENABLED !== 'true') {
      return NextResponse.json({
        error: 'FFmpeg export disabled',
        message: 'Set EXPORT_STUDIO_ENABLED=true to enable the FFmpeg export pipeline.'
      }, { status: 503 })
    }

    const { scenes, options, projectTitle } = await req.json()

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided' }, { status: 400 })
    }

    // 3. Calculate credits required (100 credits per minute of video)
    const totalDuration = scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0)
    const mergeDuration = totalDuration
    const totalCreditDuration = totalDuration + mergeDuration
    const creditsRequired = Math.ceil(totalCreditDuration / 60) * 100 // 100 credits per minute

    // 4. Check user credits
    const hasCredits = await CreditService.ensureCredits(session.user.id, creditsRequired)
    if (!hasCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        message: `You need ${creditsRequired} credits to render this video (${Math.round(totalDuration / 60 * 10) / 10} minutes).`,
        required: creditsRequired 
      }, { status: 402 })
    }

    // 5. Validate Creatomate API key
    const apiKey = process.env.CREATOMATE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Creatomate not configured',
        message: 'Video rendering is not available. Please contact support.'
      }, { status: 500 })
    }

    const renderService = new CreatomateRenderService(apiKey)
    const chunkSize = Math.max(1, parseInt(process.env.CREATOMATE_BATCH_SCENE_COUNT || '10', 10))

    console.log(`[Creatomate] Starting segmented render pipeline for ${scenes.length} scenes (chunk size: ${chunkSize})`)

    let batchResults: Array<{ renderId: string; url: string; duration: number; sceneStart: number; sceneEnd: number }>
    let mergeResult: { renderId: string }

    try {
      batchResults = await renderService.renderScenesInBatches(scenes, options, projectTitle, chunkSize)
      console.log('[Creatomate] Completed batch renders:', batchResults.map(b => b.renderId))

      const segments = batchResults.map(result => ({ url: result.url, duration: result.duration }))
      mergeResult = await renderService.mergeVideoSegments(segments, options, projectTitle)
    } catch (error) {
      console.error('[Creatomate Render] Segmented workflow failed:', error)
      throw error
    }

    const batchRenderIds = batchResults.map(result => result.renderId)

    try {
      await CreditService.charge(
        session.user.id,
        creditsRequired,
        'ai_usage',
        `render_${mergeResult.renderId}`,
        {
          service: 'video_render',
          duration: totalDuration,
          mergeDuration,
          totalCreditDuration,
          sceneCount: scenes.length,
          batchCount: batchResults.length,
          batchRenderIds,
          projectTitle,
          renderId: mergeResult.renderId,
          status: 'pending'
        }
      )
      console.log(`[Creatomate] Charged ${creditsRequired} credits for segmented render pipeline (pending)`)
    } catch (error: any) {
      console.error('[Creatomate] Failed to charge credits:', error)
      throw new Error('Insufficient credits or payment processing failed')
    }

    return NextResponse.json({
      success: true,
      renderId: mergeResult.renderId,
      batchRenderIds,
      creditsCharged: creditsRequired,
      message: 'Segmented render pipeline submitted. Final video will be ready after merge completes.'
    })

  } catch (error: any) {
    console.error('[Creatomate Render] Error:', error)
    return NextResponse.json({
      error: 'Render failed',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}

// GET endpoint to check render status (for async polling)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const renderId = searchParams.get('renderId')

    if (!renderId) {
      return NextResponse.json({ error: 'renderId required' }, { status: 400 })
    }

    const apiKey = process.env.CREATOMATE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Creatomate not configured' }, { status: 500 })
    }

    const renderService = new CreatomateRenderService(apiKey)
    const status = await renderService.getRenderStatus(renderId)

    // Get video URL if render is complete
    let videoUrl = null
    if (status === 'succeeded') {
      videoUrl = await renderService.getRenderUrl(renderId)
    }

    return NextResponse.json({
      success: true,
      status,
      videoUrl,
      renderId
    })

  } catch (error: any) {
    console.error('[Creatomate Status] Error:', error)
    return NextResponse.json({
      error: 'Status check failed',
      message: error.message
    }, { status: 500 })
  }
}
