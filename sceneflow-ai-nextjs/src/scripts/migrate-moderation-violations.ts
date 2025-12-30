/**
 * Migration Script: Moderation Violation Tracking
 * 
 * Adds fields to User model for tracking content moderation violations.
 * 
 * Run with: npx tsx src/scripts/migrate-moderation-violations.ts
 * 
 * @version 2.36
 */

import { migrateModerationViolations } from '../lib/database/migrateModerationViolations'

// Run if called directly
if (require.main === module) {
  migrateModerationViolations()
    .then(() => {
      console.log('✅ Moderation violations migration completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}
