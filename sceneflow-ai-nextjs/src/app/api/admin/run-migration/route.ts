/**
 * Admin API Endpoint: Run Database Migration
 * 
 * Runs the moderation violations migration to add new fields to User table.
 * This endpoint should be called once after deploying v2.36.
 * 
 * Usage: POST /api/admin/run-migration
 * 
 * @version 2.36
 */

import { NextRequest, NextResponse } from 'next/server'
import { migrateModerationViolations } from '@/lib/database/migrateModerationViolations'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    console.log('[run-migration] Starting moderation violations migration...')
    
    // Run the migration
    await migrateModerationViolations()
    
    console.log('[run-migration] Migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Moderation violations migration completed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[run-migration] Migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
