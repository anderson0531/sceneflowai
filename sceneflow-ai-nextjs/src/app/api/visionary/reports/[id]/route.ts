import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import VisionaryReport from '@/models/VisionaryReport'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/visionary/reports/[id]
 * 
 * Get a single Visionary Engine report with all JSONB data.
 * Used for polling during analysis and for viewing completed reports.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await sequelize.authenticate()

    const { id } = await params

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing report ID' }, { status: 400 })
    }

    const report = await VisionaryReport.findByPk(id)

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    // Optional: verify ownership
    const userIdParam = request.headers.get('x-user-id')
    if (userIdParam) {
      try {
        const user = await resolveUser(userIdParam)
        if (report.user_id !== user.id) {
          return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
        }
      } catch {
        // If user resolution fails, still return for polling scenarios
      }
    }

    const response = NextResponse.json({
      success: true,
      report: {
        id: report.id,
        userId: report.user_id,
        concept: report.concept,
        genre: report.genre,
        status: report.status,
        marketScan: report.market_scan,
        gapAnalysis: report.gap_analysis,
        arbitrageMap: report.arbitrage_map,
        bridgePlan: report.bridge_plan,
        overallScore: report.overall_score,
        targetRegions: report.target_regions ?? undefined,
        creditsUsed: report.credits_used,
        errorMessage: report.error_message,
        createdAt: report.created_at?.toISOString(),
        updatedAt: report.updated_at?.toISOString(),
      },
    })
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (err: any) {
    console.error('[GET /api/visionary/reports/[id]] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/visionary/reports/[id]
 * 
 * Delete a Visionary Engine report.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await sequelize.authenticate()

    const { id } = await params
    const userIdParam = request.headers.get('x-user-id')
    if (!userIdParam) {
      return NextResponse.json({ success: false, error: 'Missing x-user-id header' }, { status: 401 })
    }

    const user = await resolveUser(userIdParam)
    const report = await VisionaryReport.findByPk(id)

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    if (report.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    await report.destroy()

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[DELETE /api/visionary/reports/[id]] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
