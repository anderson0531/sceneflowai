/**
 * Cache Invalidate API Route
 * 
 * DELETE /api/cache/invalidate
 * Explicitly delete a cached content resource on Vertex AI.
 * Called when the user makes a substantial content change.
 */

import { NextRequest, NextResponse } from 'next/server'
import { invalidateCacheByResourceName, invalidateCache, type CacheZone } from '@/lib/vertexai/cacheManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  try {
    const { resourceName, projectId, zone } = await req.json()

    if (resourceName) {
      await invalidateCacheByResourceName(resourceName)
      return NextResponse.json({ success: true, deleted: resourceName })
    }

    if (projectId && zone) {
      await invalidateCache(projectId, zone as CacheZone)
      return NextResponse.json({ success: true, deleted: `${projectId}:${zone}` })
    }

    return NextResponse.json(
      { error: 'resourceName or (projectId + zone) required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[Cache Invalidate] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Invalidation failed' },
      { status: 500 }
    )
  }
}
