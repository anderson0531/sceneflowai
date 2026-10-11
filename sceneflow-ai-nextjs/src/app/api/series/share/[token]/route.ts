import { NextRequest, NextResponse } from 'next/server'
import { buildPublicSeriesShare } from '@/lib/series/publicShare'
import { findSeriesByShareToken } from '@/lib/series/findSeriesByShareToken'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/series/share/[token]
 * Public read-only Series Bible payload for share links.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const series = await findSeriesByShareToken(token)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 })
    }

    const share = buildPublicSeriesShare({
      title: series.title,
      logline: series.logline,
      genre: series.genre,
      bible: (series.production_bible || {}) as Record<string, unknown>,
      episodes: series.episode_blueprints || [],
    })

    return NextResponse.json({
      success: true,
      ...share,
      episodeCount: share.episodes.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Load failed' },
      { status: 500 }
    )
  }
}
