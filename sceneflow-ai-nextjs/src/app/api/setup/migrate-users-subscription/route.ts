import { NextRequest, NextResponse } from 'next/server'
import { migrateUsersSubscriptionColumns } from '@/lib/database/migrateUsersSubscription'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const logs: string[] = []
  
  try {
    logs.push('🔧 Starting Users Subscription Columns Migration...')
    
    // Run the migration
    await migrateUsersSubscriptionColumns()
    
    logs.push('✅ Migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Users subscription columns migration completed successfully',
      logs
    })
    
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`)
    console.error('Migration error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 })
  }
}

