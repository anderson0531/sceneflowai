import crypto from 'crypto'
import { sequelize } from '@/models'

export async function migrateWhopPayment(): Promise<void> {
  await sequelize.authenticate()

  // Add explorer to subscription_tiers name enum
  try {
    await sequelize.query(`
      ALTER TYPE subscription_tiers_name_enum ADD VALUE IF NOT EXISTS 'explorer';
    `)
    console.log('✓ Added explorer to subscription_tiers_name_enum')
  } catch (error: any) {
    console.log('explorer enum note:', error.message)
  }

  // Migrate trial tier row to explorer
  try {
    await sequelize.query(`
      UPDATE subscription_tiers
      SET
        name = 'explorer',
        display_name = 'Explorer',
        monthly_price_usd = 9.00,
        annual_price_usd = 9.00,
        included_credits_monthly = 750,
        storage_gb = 5,
        is_one_time = true,
        max_projects = 3,
        max_scenes_per_project = 20,
        features = ARRAY[
          '750 credits (one-time)',
          'Credits never expire',
          '5 GB storage',
          '1080p max resolution',
          'Full platform access',
          'Email support'
        ]
      WHERE name = 'trial';
    `)
    console.log('✓ Migrated trial tier to explorer')
  } catch (error: any) {
    console.log('trial→explorer tier note:', error.message)
  }

  // Update one_time_tiers_purchased arrays
  try {
    await sequelize.query(`
      UPDATE users
      SET one_time_tiers_purchased = (
        SELECT ARRAY(
          SELECT CASE WHEN elem = 'trial' THEN 'explorer' ELSE elem END
          FROM unnest(one_time_tiers_purchased) AS elem
        )
      )
      WHERE 'trial' = ANY(one_time_tiers_purchased);
    `)
    console.log('✓ Updated one_time_tiers_purchased trial→explorer')
  } catch (error: any) {
    console.log('one_time_tiers_purchased note:', error.message)
  }

  // Whop user fields
  try {
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS whop_user_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS whop_membership_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'whop';
    `)
    console.log('✓ Added Whop columns to users')
  } catch (error: any) {
    console.log('Whop user columns note:', error.message)
  }

  // Payment webhook events table
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,
        event_id VARCHAR(255) NOT NULL UNIQUE,
        event_type VARCHAR(100) NOT NULL,
        payload_hash VARCHAR(64),
        processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_webhook_provider_type
      ON payment_webhook_events (provider, event_type);
    `)
    console.log('✓ Created payment_webhook_events table')
  } catch (error: any) {
    console.log('payment_webhook_events note:', error.message)
  }

  console.log('✅ Whop payment migration completed')
}

export function hashWebhookPayload(rawBody: string): string {
  return crypto.createHash('sha256').update(rawBody).digest('hex')
}

if (require.main === module) {
  migrateWhopPayment()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}
