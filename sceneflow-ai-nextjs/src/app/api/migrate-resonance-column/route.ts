/**
 * Add Resonance Analysis Column Migration API
 * 
 * Adds just the resonance_analysis column without full sync
 * 
 * POST /api/migrate-resonance-column
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { sequelize } from '@/config/database'

export async function POST() {
  try {
    console.log('🔌 Adding resonance_analysis column...')
    
    // Test connection first
    await sequelize.authenticate()
    console.log('✅ Database connection established successfully.')

    // Run raw SQL to add the column if it doesn't exist
    await sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'series' AND column_name = 'resonance_analysis'
          ) THEN
              ALTER TABLE series 
              ADD COLUMN resonance_analysis JSONB DEFAULT NULL;
              
              RAISE NOTICE 'Column resonance_analysis added to series table';
          ELSE
              RAISE NOTICE 'Column resonance_analysis already exists';
          END IF;
      END
      $$;
    `)
    
    console.log('✅ Migration completed successfully.')

    return NextResponse.json({
      success: true,
      message: 'resonance_analysis column added successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
