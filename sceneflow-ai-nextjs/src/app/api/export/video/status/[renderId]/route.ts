/**
 * Export Video Status API Route
 * 
 * GET /api/export/video/status/[renderId]
 * 
 * Polls Shotstack render status and returns progress/download URL when complete.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRenderStatus } from '@/lib/video/ShotstackService'

export const maxDuration = 30
export const runtime = 'nodejs'

// Map Shotstack status to progress percentage
function estimateProgress(status: string): number {
  const progressMap: Record<string, number> = {
    queued: 10,
    fetching: 25,
    rendering: 50,
    saving: 90,
    done: 100,
    failed: 0,
  }
  return progressMap[status] || 0
}

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

    console.log(`[Export Video Status] Checking render status: ${renderId}`)

    const statusResponse = await getRenderStatus(renderId)
    const status = statusResponse.response.status
    const progress = estimateProgress(status)

    console.log(`[Export Video Status] Render ${renderId}:`, {
      status,
      progress,
      hasUrl: !!statusResponse.response.url,
    })

    return NextResponse.json({
      success: true,
      renderId,
      status,
      progress,
      url: statusResponse.response.url || null,
      poster: statusResponse.response.poster || null,
      thumbnail: statusResponse.response.thumbnail || null,
      error: statusResponse.response.error || null,
    })
  } catch (error: any) {
    console.error('[Export Video Status] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to get render status',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
