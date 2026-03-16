import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import VisionaryReport from '@/models/VisionaryReport'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/visionary/reports
 * 
 * List all Visionary Engine reports for the authenticated user.
 * Supports pagination via ?page=1&pageSize=20
 */
export async function GET(request: NextRequest) {
  try {
    await sequelize.authenticate()

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

    const { rows, count } = await VisionaryReport.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset,
    })

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
