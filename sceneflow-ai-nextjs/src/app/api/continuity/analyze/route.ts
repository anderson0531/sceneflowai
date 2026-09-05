import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { analyzeContinuity } from '@/lib/series/analyzeContinuity'

export const dynamic = 'force-dynamic'

/**
 * POST /api/continuity/analyze
 * Body: { seriesId: string }
 *
 * Rule-based continuity health check against Series Bible + episode blueprints.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const seriesId = body?.seriesId as string | undefined

    if (!seriesId) {
      return NextResponse.json({ ok: false, error: 'seriesId is required' }, { status: 400 })
    }

    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ ok: false, error: 'Series not found' }, { status: 404 })
    }

    const result = analyzeContinuity(
      series.production_bible,
      series.episode_blueprints || []
    )

    return NextResponse.json({
      ok: result.ok,
      issues: result.issues,
      issueCount: result.issueCount,
      summary: result.summary,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
