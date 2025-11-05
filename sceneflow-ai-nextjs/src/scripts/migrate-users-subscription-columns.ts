// Wrapper script - imports and runs the migration function from lib
// This allows the script to be run directly: npx tsx src/scripts/migrate-users-subscription-columns.ts
import { migrateUsersSubscriptionColumns } from '../lib/database/migrateUsersSubscription'

// Run if called directly
if (require.main === module) {
  migrateUsersSubscriptionColumns()
    .then(() => {
      console.log('✅ Migration completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}

