import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { LocationAnalysisSceneInput } from '@/lib/vision/locationStateAnalysis'
import { summarizeLocationVersionSyncDiff } from '@/lib/vision/locationScriptSync'
import {
  analyzeLocationVersionsFromScript,
  type LocationVersionSyncTarget,
} from '@/lib/vision/syncLocationVersionsFromScript'

export const runtime = 'nodejs'
export const maxDuration = 300

interface SyncLocationVersionsRequest {
  location: LocationVersionSyncTarget
  scenes: LocationAnalysisSceneInput[]
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    logline?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SyncLocationVersionsRequest = await req.json()
    const { location, scenes, screenplayContext } = body

    if (!location?.id || !location?.location) {
      return NextResponse.json({ error: 'location is required' }, { status: 400 })
    }
    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided for analysis' }, { status: 400 })
    }

    const result = await analyzeLocationVersionsFromScript({
      location,
      scenes,
      screenplayContext,
    })

    return NextResponse.json({
      success: true,
      diff: result.diff,
      totals: result.totals ?? summarizeLocationVersionSyncDiff(result.diff),
      analyzedScenes: result.analyzedScenes,
    })
  } catch (error: any) {
    console.error('[Location Version Sync] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync location versions from script' },
      { status: 500 }
    )
  }
}
