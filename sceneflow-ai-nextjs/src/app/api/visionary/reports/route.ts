import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import VisionaryReport from '@/models/VisionaryReport'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/visionary/reports
 * 
 * List all Market Insights (Visionary) reports for the authenticated user.
 * Supports pagination via ?page=1&pageSize=20
 */
export async function GET(request: NextRequest) {
  try {
    await sequelize.authenticate()

    // Ensure the visionary_reports table exists (auto-creates if missing)
    await VisionaryReport.sync({ alter: false })

    const userIdParam = request.headers.get('x-user-id')
    if (!userIdParam) {
      return NextResponse.json({ success: false, error: 'Missing x-user-id header' }, { status: 401 })
    }

    const user = await resolveUser(userIdParam)
    const userId = user.id

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '20')))
    const offset = (page - 1) * pageSize

    let rows: VisionaryReport[] = []
    let count = 0

    try {
      const result = await VisionaryReport.findAndCountAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset,
      })
      rows = result.rows
      count = result.count
    } catch (queryErr: any) {
      // Handle missing table gracefully (Postgres error 42P01 = undefined_table)
      if (queryErr?.original?.code === '42P01' || queryErr?.message?.includes('does not exist')) {
        console.warn('[GET /api/visionary/reports] Table does not exist yet, returning empty results')
        const emptyResponse = NextResponse.json({
          success: true,
          reports: [],
          total: 0,
          page,
          pageSize,
        })
        emptyResponse.headers.set('Cache-Control', 'no-store')
        return emptyResponse
      }
      throw queryErr // Re-throw other query errors
    }

    const reports = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      concept: r.concept,
      genre: r.genre,
      status: r.status,
      overallScore: r.overall_score,
      creditsUsed: r.credits_used,
      createdAt: r.created_at?.toISOString(),
      updatedAt: r.updated_at?.toISOString(),
      // Exclude large JSONB fields from list response for performance
      hasMarketScan: !!r.market_scan,
      hasGapAnalysis: !!r.gap_analysis,
      hasArbitrageMap: !!r.arbitrage_map,
      hasBridgePlan: !!r.bridge_plan,
    }))

    const response = NextResponse.json({
      success: true,
      reports,
      total: count,
      page,
      pageSize,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (err: any) {
    console.error('[GET /api/visionary/reports] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
