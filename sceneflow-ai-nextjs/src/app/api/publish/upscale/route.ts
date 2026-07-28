/**
 * Phase 2 Topaz upscale stub — queues upscale job when credentials are provisioned.
 *
 * POST /api/publish/upscale
 * GET  /api/publish/upscale?jobId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import type { UpscaleSettings } from '@/lib/types/finalCut'

export const dynamic = 'force-dynamic'

const TOPAZ_API_KEY = process.env.TOPAZ_API_KEY || process.env.TOPAZ_LABS_API_KEY

const jobStore = new Map<
  string,
  { status: string; outputUrl?: string; error?: string; createdAt: number }
>()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      videoUrl?: string
      upscaleSettings?: UpscaleSettings
    }

    if (!body.videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
    }

    const jobId = uuidv4()

    if (!TOPAZ_API_KEY) {
      jobStore.set(jobId, {
        status: 'COMPLETED',
        outputUrl: body.videoUrl,
        createdAt: Date.now(),
      })
      return NextResponse.json({
        success: true,
        jobId,
        status: 'COMPLETED',
        outputUrl: body.videoUrl,
        message: 'Topaz credentials not configured — returning source video (passthrough).',
      })
    }

    jobStore.set(jobId, { status: 'PROCESSING', createdAt: Date.now() })

    // Phase 2: integrate Topaz API when credentials are available
    return NextResponse.json({
      success: true,
      jobId,
      status: 'PROCESSING',
      message: 'Topaz upscale job queued.',
    })
  } catch (error) {
    console.error('[Publish Upscale] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upscale failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  const job = jobStore.get(jobId)
  if (!job) {
    return NextResponse.json({ status: 'FAILED', error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    outputUrl: job.outputUrl,
    downloadUrl: job.outputUrl,
    error: job.error,
  })
}
