/**
 * Export Animatic Status API Route
 * 
 * GET /api/export/animatic/[renderId]
 * 
 * Polls Shotstack render status and returns download URL when complete.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRenderStatus } from '@/lib/video/ShotstackService'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  try {
    const { renderId } = await params

    if (!renderId) {
      return NextResponse.json(
        { error: 'Missing renderId parameter' },
        { status: 400 }
      )
    }

    // Check if Shotstack API key is configured
    if (!process.env.SHOTSTACK_API_KEY) {
      return NextResponse.json(
        { error: 'Shotstack API key not configured' },
        { status: 503 }
      )
    }

    console.log(`[Export Status] Checking render status: ${renderId}`)

    const statusResponse = await getRenderStatus(renderId)

    console.log(`[Export Status] Render ${renderId}:`, {
      status: statusResponse.response.status,
      hasUrl: !!statusResponse.response.url,
    })

    return NextResponse.json({
      success: true,
      renderId,
      status: statusResponse.response.status,
      url: statusResponse.response.url || null,
      poster: statusResponse.response.poster || null,
      thumbnail: statusResponse.response.thumbnail || null,
      error: statusResponse.response.error || null,
    })
  } catch (error: any) {
    console.error('[Export Status] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to get render status',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
