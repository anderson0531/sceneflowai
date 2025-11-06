import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreatomateRenderService } from '../../../../services/CreatomateRenderService'
import { CreditService } from '../../../../services/CreditService'

export const runtime = 'nodejs'
export const maxDuration = 60 // Creatomate handles long renders asynchronously

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request
    const { scenes, options, projectTitle } = await req.json()

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided' }, { status: 400 })
    }

    // 3. Calculate credits required (100 credits per minute of video)
    const totalDuration = scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0)
    const creditsRequired = Math.ceil(totalDuration / 60) * 100 // 100 credits per minute

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

    // 6. Initialize Creatomate service
    const renderService = new CreatomateRenderService(apiKey)

    // 7. Submit render job (returns immediately with renderId)
    console.log(`[Creatomate] Submitting render job for ${scenes.length} scenes (${Math.round(totalDuration)}s, ${creditsRequired} credits)`)
    
    let renderId: string
    try {
      renderId = await renderService.submitRender(scenes, options, projectTitle)
      console.log(`[Creatomate] Render job submitted: ${renderId}`)
    } catch (error: any) {
      console.error('[Creatomate Render] Render submission failed:', error)
      throw error
    }

    // 8. Reserve credits (charge will happen when render completes)
    // For now, we'll charge immediately to prevent credit issues
    // In the future, we could implement a credit reservation system
    try {
      await CreditService.charge(
        session.user.id, 
        creditsRequired, 
        'ai_usage',
        `render_${renderId}`,
        { 
          service: 'video_render',
          duration: totalDuration,
          sceneCount: scenes.length,
          projectTitle,
          renderId,
          status: 'pending'
        }
      )
      console.log(`[Creatomate] Charged ${creditsRequired} credits for video render (pending)`)
    } catch (error: any) {
      console.error('[Creatomate] Failed to charge credits:', error)
      // If credit charge fails, we should not proceed with render
      throw new Error('Insufficient credits or payment processing failed')
    }

    // 9. Return renderId for client-side polling
    return NextResponse.json({
      success: true,
      renderId,
      creditsCharged: creditsRequired,
      message: 'Render job submitted successfully. Video will be ready shortly.'
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
