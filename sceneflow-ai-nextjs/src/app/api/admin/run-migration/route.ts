/**
 * Admin API Endpoint: Run Database Migration
 * 
 * Runs database migrations. Supports multiple migration types via query param.
 * 
 * Usage: 
 *   POST /api/admin/run-migration                    - Run all pending migrations
 *   POST /api/admin/run-migration?type=series        - Run Series feature migration
 *   POST /api/admin/run-migration?type=moderation    - Run moderation violations migration
 *   POST /api/admin/run-migration?type=rollback-series - Rollback Series migration (emergency)
 * 
 * @version 2.37
 */

import { NextRequest, NextResponse } from 'next/server'
import { migrateModerationViolations } from '@/lib/database/migrateModerationViolations'
import { migrateSeriesFeature, rollbackSeriesFeature } from '@/lib/database/migrateSeriesFeature'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const migrationType = searchParams.get('type') || 'all'
    
    console.log(`[run-migration] Starting migration type: ${migrationType}`)
    
    const results: Record<string, any> = {}
    
    // Run Series feature migration
    if (migrationType === 'all' || migrationType === 'series') {
      console.log('[run-migration] Running Series feature migration...')
      const seriesResult = await migrateSeriesFeature()
      results.series = seriesResult
      console.log('[run-migration] Series migration result:', seriesResult)
    }
    
    // Run Moderation violations migration
    if (migrationType === 'all' || migrationType === 'moderation') {
      console.log('[run-migration] Running moderation violations migration...')
      await migrateModerationViolations()
      results.moderation = { success: true, message: 'Completed' }
      console.log('[run-migration] Moderation migration completed')
    }
    
    // Rollback Series feature (emergency only)
    if (migrationType === 'rollback-series') {
      console.log('[run-migration] ROLLBACK: Rolling back Series feature migration...')
      const rollbackResult = await rollbackSeriesFeature()
      results.seriesRollback = rollbackResult
      console.log('[run-migration] Series rollback result:', rollbackResult)
    }
    
    console.log('[run-migration] All migrations completed')
    
    // Check if any migration failed
    const hasErrors = Object.values(results).some((r: any) => r.success === false || r.errors?.length > 0)
    
    return NextResponse.json({
      success: !hasErrors,
      migrationType,
      results,
      timestamp: new Date().toISOString()
    }, { status: hasErrors ? 207 : 200 }) // 207 = Multi-Status (partial success)
    
  } catch (error: any) {
    console.error('[run-migration] Migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support GET for checking migration status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    availableMigrations: [
      { type: 'all', description: 'Run all pending migrations' },
      { type: 'series', description: 'Create Series table and add columns to Projects' },
      { type: 'moderation', description: 'Add moderation violation fields to Users' },
      { type: 'rollback-series', description: 'EMERGENCY: Rollback Series feature migration' }
    ],
    usage: 'POST /api/admin/run-migration?type=<type>',
    timestamp: new Date().toISOString()
  })
}
