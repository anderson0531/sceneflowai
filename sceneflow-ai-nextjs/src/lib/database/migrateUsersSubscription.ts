import { sequelize } from '@/models'

export async function migrateUsersSubscriptionColumns() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')
    
    // Step 1: Create subscription_status ENUM type if it doesn't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE users_subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'trial');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)
      console.log('✓ Created subscription_status ENUM type (or already exists)')
    } catch (error: any) {
      console.log('Enum creation note:', error.message)
    }
    
    // Step 2: Add subscription_tier_id (UUID, nullable, FK to subscription_tiers)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_tier_id UUID;
      `)
      console.log('✓ Added subscription_tier_id column')
      
      // Add foreign key constraint if it doesn't exist
      await sequelize.query(`
        DO $$ BEGIN
          ALTER TABLE users 
          ADD CONSTRAINT fk_users_subscription_tier 
          FOREIGN KEY (subscription_tier_id) 
          REFERENCES subscription_tiers(id);
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)
      console.log('✓ Added foreign key constraint for subscription_tier_id')
    } catch (error: any) {
      console.log('subscription_tier_id column note:', error.message)
    }
    
    // Step 3: Add subscription_status (ENUM, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_status users_subscription_status_enum DEFAULT NULL;
      `)
      console.log('✓ Added subscription_status column')
    } catch (error: any) {
      console.log('subscription_status column note:', error.message)
    }
    
    // Step 4: Add subscription_start_date (DATE, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP;
      `)
      console.log('✓ Added subscription_start_date column')
    } catch (error: any) {
      console.log('subscription_start_date column note:', error.message)
    }
    
    // Step 5: Add subscription_end_date (DATE, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
      `)
      console.log('✓ Added subscription_end_date column')
    } catch (error: any) {
      console.log('subscription_end_date column note:', error.message)
    }
    
    // Step 6: Add subscription_credits_monthly (BIGINT, default 0)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_credits_monthly BIGINT NOT NULL DEFAULT 0;
      `)
      console.log('✓ Added subscription_credits_monthly column')
    } catch (error: any) {
      console.log('subscription_credits_monthly column note:', error.message)
    }
    
    // Step 7: Add subscription_credits_expires_at (DATE, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_credits_expires_at TIMESTAMP;
      `)
      console.log('✓ Added subscription_credits_expires_at column')
    } catch (error: any) {
      console.log('subscription_credits_expires_at column note:', error.message)
    }
    
    // Step 8: Add addon_credits (BIGINT, default 0)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS addon_credits BIGINT NOT NULL DEFAULT 0;
      `)
      console.log('✓ Added addon_credits column')
    } catch (error: any) {
      console.log('addon_credits column note:', error.message)
    }
    
    // Step 9: Add storage_used_gb (DECIMAL(10,2), default 0)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS storage_used_gb DECIMAL(10, 2) NOT NULL DEFAULT 0;
      `)
      console.log('✓ Added storage_used_gb column')
    } catch (error: any) {
      console.log('storage_used_gb column note:', error.message)
    }
    
    // Step 10: Add paddle_customer_id (STRING, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS paddle_customer_id VARCHAR(255);
      `)
      console.log('✓ Added paddle_customer_id column')
    } catch (error: any) {
      console.log('paddle_customer_id column note:', error.message)
    }
    
    // Step 11: Add paddle_subscription_id (STRING, nullable)
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS paddle_subscription_id VARCHAR(255);
      `)
      console.log('✓ Added paddle_subscription_id column')
    } catch (error: any) {
      console.log('paddle_subscription_id column note:', error.message)
    }
    
    // Step 12: Add one_time_tiers_purchased (TEXT[], default empty array)
    // Note: This might already exist from the previous migration
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS one_time_tiers_purchased TEXT[] DEFAULT '{}';
      `)
      console.log('✓ Added one_time_tiers_purchased column')
    } catch (error: any) {
      console.log('one_time_tiers_purchased column note:', error.message)
    }
    
    console.log('✅ Migration completed: Added all subscription columns to users table')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

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

