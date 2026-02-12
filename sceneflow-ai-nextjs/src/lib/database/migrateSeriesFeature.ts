/**
 * Series Feature Database Migration
 * 
 * Creates the Series table and adds series_id/episode_number columns to Projects.
 * Safe to run multiple times - checks for existence before creating.
 * 
 * @version 2.37
 */

import { sequelize } from '@/config/database'
import { QueryTypes } from 'sequelize'

export async function migrateSeriesFeature(): Promise<{
  success: boolean
  actions: string[]
  errors: string[]
}> {
  const actions: string[] = []
  const errors: string[] = []

  try {
    // Step 1: Check if series table exists
    const [seriesTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'series'
      ) as exists
    `, { type: QueryTypes.SELECT }) as any[]

    if (!seriesTableExists?.exists) {
      // Create the series table
      await sequelize.query(`
        CREATE TABLE series (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          logline TEXT,
          genre VARCHAR(100),
          target_audience VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          max_episodes INTEGER NOT NULL DEFAULT 20,
          production_bible JSONB NOT NULL DEFAULT '{}',
          episode_blueprints JSONB NOT NULL DEFAULT '[]',
          metadata JSONB NOT NULL DEFAULT '{}',
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `)
      actions.push('Created series table')

      // Create indexes for series table
      await sequelize.query(`
        CREATE INDEX idx_series_user_id ON series(user_id)
      `)
      actions.push('Created index on series.user_id')

      await sequelize.query(`
        CREATE INDEX idx_series_status ON series(status)
      `)
      actions.push('Created index on series.status')

      await sequelize.query(`
        CREATE INDEX idx_series_created_at ON series(created_at DESC)
      `)
      actions.push('Created index on series.created_at')

    } else {
      actions.push('Series table already exists - skipped creation')
    }

    // Step 2: Check if series_id column exists in projects table
    const [seriesIdColumnExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'series_id'
      ) as exists
    `, { type: QueryTypes.SELECT }) as any[]

    if (!seriesIdColumnExists?.exists) {
      // Add series_id column to projects
      await sequelize.query(`
        ALTER TABLE projects 
        ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE SET NULL
      `)
      actions.push('Added series_id column to projects table')

      // Create index for series_id
      await sequelize.query(`
        CREATE INDEX idx_projects_series_id ON projects(series_id) WHERE series_id IS NOT NULL
      `)
      actions.push('Created index on projects.series_id')

    } else {
      actions.push('projects.series_id column already exists - skipped')
    }

    // Step 3: Check if episode_number column exists in projects table
    const [episodeNumberColumnExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'episode_number'
      ) as exists
    `, { type: QueryTypes.SELECT }) as any[]

    if (!episodeNumberColumnExists?.exists) {
      // Add episode_number column to projects
      await sequelize.query(`
        ALTER TABLE projects 
        ADD COLUMN episode_number INTEGER
      `)
      actions.push('Added episode_number column to projects table')

    } else {
      actions.push('projects.episode_number column already exists - skipped')
    }

    // Step 4: Verify the foreign key constraint exists and is valid
    const [fkExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%series%'
      ) as exists
    `, { type: QueryTypes.SELECT }) as any[]

    if (fkExists?.exists) {
      actions.push('Foreign key constraint on projects.series_id verified')
    }

    return {
      success: true,
      actions,
      errors
    }

  } catch (error: any) {
    errors.push(error.message || 'Unknown error during migration')
    console.error('[migrateSeriesFeature] Migration error:', error)
    
    return {
      success: false,
      actions,
      errors
    }
  }
}

/**
 * Rollback the Series feature migration (for emergencies)
 */
export async function rollbackSeriesFeature(): Promise<{
  success: boolean
  actions: string[]
  errors: string[]
}> {
  const actions: string[] = []
  const errors: string[] = []

  try {
    // Remove foreign key and columns from projects first
    try {
      await sequelize.query(`
        ALTER TABLE projects DROP COLUMN IF EXISTS episode_number
      `)
      actions.push('Dropped episode_number column from projects')
    } catch (e: any) {
      errors.push(`Failed to drop episode_number: ${e.message}`)
    }

    try {
      await sequelize.query(`
        ALTER TABLE projects DROP COLUMN IF EXISTS series_id
      `)
      actions.push('Dropped series_id column from projects')
    } catch (e: any) {
      errors.push(`Failed to drop series_id: ${e.message}`)
    }

    // Drop series table
    try {
      await sequelize.query(`
        DROP TABLE IF EXISTS series CASCADE
      `)
      actions.push('Dropped series table')
    } catch (e: any) {
      errors.push(`Failed to drop series table: ${e.message}`)
    }

    return {
      success: errors.length === 0,
      actions,
      errors
    }

  } catch (error: any) {
    errors.push(error.message || 'Unknown error during rollback')
    return {
      success: false,
      actions,
      errors
    }
  }
}
