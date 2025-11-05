import { sequelize } from '../models'

export async function migrateOneTimeTiers() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')
    
    // Add columns to subscription_tiers table
    await sequelize.query(`
      ALTER TABLE subscription_tiers 
      ADD COLUMN IF NOT EXISTS is_one_time BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS max_scenes_per_project INTEGER DEFAULT NULL;
    `)
    
    // Update ENUM for name to include coffee_break (if needed)
    // Note: This may require a more complex migration depending on PostgreSQL version
    try {
      await sequelize.query(`
        ALTER TYPE subscription_tiers_name_enum ADD VALUE IF NOT EXISTS 'coffee_break';
      `)
    } catch (error: any) {
      // If enum already exists or error occurs, it's likely fine
      console.log('Enum update note:', error.message)
    }
    
    // Update ENUM for max_resolution to include 720p
    try {
      await sequelize.query(`
        ALTER TYPE subscription_tiers_max_resolution_enum ADD VALUE IF NOT EXISTS '720p';
      `)
    } catch (error: any) {
      console.log('Resolution enum update note:', error.message)
    }
    
    // Add column to users table
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS one_time_tiers_purchased TEXT[] DEFAULT '{}';
    `)
    
    console.log('Migration completed: Added one-time tier support')
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  migrateOneTimeTiers()
    .then(() => {
      console.log('Migration completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}
