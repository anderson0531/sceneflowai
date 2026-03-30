import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import VisionaryReport from '@/models/VisionaryReport'
import User from '@/models/User' // Import your User model
import { sequelize } from '@/config/database'

export const dynamic = 'force-dynamic'

/**
 * GET /api/visionary/reports
 * 
 * List all Market Insights (Visionary) reports for the authenticated user.
 * Supports pagination via ?page=1&pageSize=20
 */
export async function GET(request: NextRequest) {
  try {
    const userIdParam = request.headers.get('x-user-id')
    if (!userIdParam) {
       return NextResponse.json({ success: false, error: 'Auth Required' }, { status: 401 })
    }

    // 1. First, just test the connection without user context
    await sequelize.authenticate();

    // THE FIX: Upsert User to prevent "Tenant not found"
    // This ensures the foreign key relationship in Postgres is satisfied
    let [user] = await User.findOrCreate({
      where: { email: userIdParam },
      defaults: { email: userIdParam } // Default role if new user
    });

    const userId = user.id;

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, 20)
    const offset = (page - 1) * pageSize

    const result = await VisionaryReport.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset,
    })

    return NextResponse.json({
      success: true,
      reports: result.rows,
      total: result.count
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (err: any) {
    console.error('[GET /api/visionary/reports] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
