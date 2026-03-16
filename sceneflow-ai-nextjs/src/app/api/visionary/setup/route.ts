import { NextRequest, NextResponse } from 'next/server'
import VisionaryReport from '@/models/VisionaryReport'
import { sequelize } from '@/config/database'

export const dynamic = 'force-dynamic'

/**
 * POST /api/visionary/setup
 * 
 * Creates the visionary_reports table if it doesn't exist.
 * Safe to call multiple times (uses sync with alter: false).
 */
export async function POST(request: NextRequest) {
  try {
    await sequelize.authenticate()

    // Sync only the VisionaryReport model (create table if not exists)
    await VisionaryReport.sync({ alter: false })

    console.log('[Visionary Setup] visionary_reports table synced')

    return NextResponse.json({
      success: true,
      message: 'visionary_reports table created/verified',
    })
  } catch (err: any) {
    console.error('[Visionary Setup] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Setup failed' },
      { status: 500 }
    )
  }
}
