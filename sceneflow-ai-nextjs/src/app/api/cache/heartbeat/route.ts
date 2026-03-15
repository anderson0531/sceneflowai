/**
 * Cache Heartbeat API Route
 * 
 * POST /api/cache/heartbeat
 * Extends the TTL of an active Vertex AI context cache.
 * Called periodically by the frontend useCacheHeartbeat hook.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCacheEntryByResourceName, heartbeat } from '@/lib/vertexai/cacheManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { resourceName, extendMinutes } = await req.json()

    if (!resourceName) {
      return NextResponse.json(
        { error: 'resourceName is required' },
        { status: 400 }
      )
    }

    const cacheEntry = await getCacheEntryByResourceName(resourceName)
    if (!cacheEntry) {
      return NextResponse.json(
        { error: 'Cache not found or expired' },
        { status: 404 }
      )
    }

    await heartbeat(cacheEntry, extendMinutes || 60)

    return NextResponse.json({
      success: true,
      cacheId: cacheEntry.cacheId,
      newExpiresAt: cacheEntry.expiresAt,
    })
  } catch (error: any) {
    console.error('[Cache Heartbeat] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Heartbeat failed' },
      { status: 500 }
    )
  }
}
