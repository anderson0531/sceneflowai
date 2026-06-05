/**
 * Migration: extend moderation_events for stage-based Hive reports.
 */

import { sequelize } from '@/models'

export async function migrateModerationEvents() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')
    console.log('🔐 Starting moderation_events stage/report migration...')

    const enumValues = [
      'blueprint_text',
      'script_text',
      'character_image',
      'storyboard_image',
      'fal_video',
    ]

    for (const value of enumValues) {
      try {
        await sequelize.query(`
          ALTER TYPE enum_moderation_events_content_type ADD VALUE IF NOT EXISTS '${value}';
        `)
        console.log(`✓ enum value ${value}`)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.log(`enum ${value} note:`, msg)
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE moderation_events
        ADD COLUMN IF NOT EXISTS stage VARCHAR(32);
      `)
      console.log('✓ Added stage column')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log('stage column note:', msg)
    }

    try {
      await sequelize.query(`
        ALTER TABLE moderation_events
        ADD COLUMN IF NOT EXISTS report_json JSONB;
      `)
      console.log('✓ Added report_json column')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log('report_json column note:', msg)
    }

    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_moderation_events_project_stage
        ON moderation_events (project_id, stage, created_at DESC)
        WHERE project_id IS NOT NULL;
      `)
      console.log('✓ Created project/stage index')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log('project stage index note:', msg)
    }

    console.log('✅ moderation_events migration completed')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

if (require.main === module) {
  migrateModerationEvents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
