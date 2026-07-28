/**
 * Stream master render API — forwards to scene render with delivery quality settings.
 *
 * POST /api/publish/stream/render — create stitch job (720p / 1080p / 4K, optional upscale)
 * GET  /api/publish/stream/render?jobId=xxx — poll job status
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function sceneRenderUrl(request: NextRequest, sceneId: string, query?: string): string {
  const url = new URL(request.url)
  const base = `${url.protocol}//${url.host}`
  const q = query ? `?${query}` : ''
  return `${base}/api/scene/${encodeURIComponent(sceneId)}/render${q}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sceneId = (body.sceneId as string) || 'final-cut'

    const res = await fetch(sceneRenderUrl(request, sceneId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Publish Stream Render] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream render failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId query parameter required' }, { status: 400 })
    }

    const res = await fetch(sceneRenderUrl(request, 'final-cut', `jobId=${encodeURIComponent(jobId)}`), {
      headers: { cookie: request.headers.get('cookie') || '' },
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Publish Stream Render] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job status failed' },
      { status: 500 }
    )
  }
}
