/**
 * Migration: Add Moderation Violation Tracking Fields to Users
 * 
 * This migration adds fields to track content moderation violations:
 * - moderation_violations_count: Number of times user's content was blocked
 * - last_violation_at: Timestamp of most recent violation
 * - moderation_suspended_until: If set, user is suspended from using the platform
 * 
 * These fields support the Hybrid Smart Sampling strategy where repeat
 * offenders have higher sampling rates and may be suspended.
 * 
 * @version 2.36
 */

import { sequelize } from '@/models'

export async function migrateModerationViolations() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')
    
    console.log('🔐 Starting moderation violation tracking migration...')
    
    // Step 1: Add moderation_violations_count (INTEGER, default 0)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS moderation_violations_count INTEGER NOT NULL DEFAULT 0;
      `)
      console.log('✓ Added moderation_violations_count column')
    } catch (error: any) {
      console.log('moderation_violations_count column note:', error.message)
    }
    
    // Step 1.5: Add moderation_violations_recent (INTEGER, default 0) - violations in last 24 hours
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS moderation_violations_recent INTEGER NOT NULL DEFAULT 0;
      `)
      console.log('✓ Added moderation_violations_recent column')
    } catch (error: any) {
      console.log('moderation_violations_recent column note:', error.message)
    }
    
    // Step 2: Add last_violation_at (TIMESTAMP, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_violation_at TIMESTAMP;
      `)
      console.log('✓ Added last_violation_at column')
    } catch (error: any) {
      console.log('last_violation_at column note:', error.message)
    }
    
    // Step 3: Add moderation_suspended_until (TIMESTAMP, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS moderation_suspended_until TIMESTAMP;
      `)
      console.log('✓ Added moderation_suspended_until column')
    } catch (error: any) {
      console.log('moderation_suspended_until column note:', error.message)
    }
    
    // Step 4: Add index for efficient lookups of suspended users
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_users_moderation_suspended 
        ON users (moderation_suspended_until) 
        WHERE moderation_suspended_until IS NOT NULL;
      `)
      console.log('✓ Created index for moderation_suspended_until')
    } catch (error: any) {
      console.log('moderation suspended index note:', error.message)
    }
    
    // Step 5: Add index for efficient lookups of high-violation users
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_users_moderation_violations 
        ON users (moderation_violations_count) 
        WHERE moderation_violations_count > 0;
      `)
      console.log('✓ Created index for moderation_violations_count')
    } catch (error: any) {
      console.log('moderation violations index note:', error.message)
    }
    
    console.log('')
    console.log('✅ Moderation violation tracking migration completed successfully!')
    console.log('')
    console.log('New columns added to users table:')
    console.log('  - moderation_violations_count (INTEGER, default 0)')
    console.log('  - last_violation_at (TIMESTAMP, nullable)')
    console.log('  - moderation_suspended_until (TIMESTAMP, nullable)')
    console.log('')
    console.log('Indexes created:')
    console.log('  - idx_users_moderation_suspended (partial index)')
    console.log('  - idx_users_moderation_violations (partial index)')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Allow running directly with: npx tsx src/lib/database/migrateModerationViolations.ts
if (require.main === module) {
  migrateModerationViolations()
    .then(() => {
      console.log('')
      console.log('🎉 Migration script finished.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}
