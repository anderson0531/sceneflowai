import { NextRequest, NextResponse } from 'next/server'
import { migrateWhopPayment } from '@/lib/database/migrateWhopPayment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_request: NextRequest) {
  try {
    await migrateWhopPayment()
    return NextResponse.json({
      success: true,
      message: 'Whop payment migration completed successfully',
    })
  } catch (error: any) {
    console.error('[Migrate Whop Payment] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
