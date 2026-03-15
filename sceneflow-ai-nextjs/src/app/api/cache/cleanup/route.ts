/**
 * Cache Cleanup API Route
 * 
 * POST /api/cache/cleanup
 * Delete all active caches for a project. Called on session end
 * via navigator.sendBeacon from the frontend.
 * 
 * This is a best-effort operation — TTL is the safety net.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cleanupProjectCaches } from '@/lib/vertexai/cacheManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Support both JSON body and plain text (sendBeacon)
    let projectId: string | undefined
    
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      projectId = body.projectId
    } else {
      const text = await req.text()
      try {
        const parsed = JSON.parse(text)
        projectId = parsed.projectId
      } catch {
        projectId = text.trim()
      }
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    await cleanupProjectCaches(projectId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Cache Cleanup] Error:', error.message)
    // Always return 200 for sendBeacon — it doesn't read responses
    return NextResponse.json({ success: false, error: error.message })
  }
}
