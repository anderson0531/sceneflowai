import { sequelize } from '@/models'

export async function migrateRateCard() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')

    // Step 1: Create service_category ENUM type if it doesn't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE rate_cards_service_category_enum AS ENUM ('image_gen', 'video_gen', 'tts', 'ai_analysis', 'storage');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)
      console.log('✓ Created service_category ENUM type (or already exists)')
    } catch (error: any) {
      console.log('service_category ENUM creation note:', error.message)
    }

    // Step 2: Create quality_tier ENUM type if it doesn't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE rate_cards_quality_tier_enum AS ENUM ('standard', 'premium', 'ultra');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)
      console.log('✓ Created quality_tier ENUM type (or already exists)')
    } catch (error: any) {
      console.log('quality_tier ENUM creation note:', error.message)
    }

    // Step 3: Create rate_cards table if it doesn't exist
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS rate_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_category rate_cards_service_category_enum NOT NULL,
          service_name VARCHAR(200) NOT NULL,
          quality_tier rate_cards_quality_tier_enum NOT NULL DEFAULT 'standard',
          credits_per_unit BIGINT NOT NULL,
          byok_credits_per_unit BIGINT NOT NULL DEFAULT 0,
          unit_description VARCHAR(100) NOT NULL,
          provider_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          effective_to TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_rate_card UNIQUE (service_category, service_name, quality_tier)
        );
      `)
      console.log('✓ Created rate_cards table (or already exists)')
    } catch (error: any) {
      // If table already exists, that's fine
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('rate_cards table already exists')
      } else {
        throw error
      }
    }

    // Step 4: Create indexes if they don't exist
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rate_card_active ON rate_cards(is_active);
      `)
      console.log('✓ Created index on is_active (or already exists)')
    } catch (error: any) {
      console.log('Index creation note:', error.message)
    }

    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rate_card_effective ON rate_cards(effective_from, effective_to);
      `)
      console.log('✓ Created index on effective dates (or already exists)')
    } catch (error: any) {
      console.log('Index creation note:', error.message)
    }

    console.log('✅ Migration completed: Created rate_cards table with ENUM types')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

