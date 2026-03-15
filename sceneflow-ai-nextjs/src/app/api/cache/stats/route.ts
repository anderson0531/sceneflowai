/**
 * Cache Stats API Route
 * 
 * GET /api/cache/stats
 * Returns diagnostic information about active caches.
 * Useful for the admin dashboard and debugging.
 */

import { NextResponse } from 'next/server'
import { getActiveCacheStats, isVertexCachingEnabled } from '@/lib/vertexai/cacheManager'
import { getCacheMetrics } from '@/lib/vertexai/cacheObservability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const enabled = isVertexCachingEnabled()
    const stats = getActiveCacheStats()

    return NextResponse.json({
      enabled,
      ...stats,
    })
  } catch (error: any) {
    console.error('[Cache Stats] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}
