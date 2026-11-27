import { sequelize } from '@/models'
import { hasTables } from '@/lib/database/schemaProbe'

let propertyToursSchemaReady = false

export async function ensurePropertyToursSchema(): Promise<void> {
  if (propertyToursSchemaReady) return

  if (
    await hasTables([
      'property_tours',
      'property_tour_leads',
      'property_tour_hosting_events',
    ])
  ) {
    propertyToursSchemaReady = true
    return
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS property_tours (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      producer_profile_id UUID,
      slug VARCHAR(120) NOT NULL UNIQUE,
      title VARCHAR(200) NOT NULL,
      property_address VARCHAR(300),
      property_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      hosting_tier VARCHAR(24) NOT NULL DEFAULT 'standard',
      monthly_hosting_credits INTEGER NOT NULL DEFAULT 150,
      published_at TIMESTAMPTZ,
      hosting_renewed_at TIMESTAMPTZ,
      branding JSONB NOT NULL DEFAULT '{}'::jsonb,
      default_room_id VARCHAR(100),
      available_styles JSONB NOT NULL DEFAULT '["as_is","modern_coastal","warm_transitional","chefs_remodel"]'::jsonb,
      available_lighting JSONB NOT NULL DEFAULT '["daylight","golden_hour","twilight"]'::jsonb,
      available_lifestyles JSONB NOT NULL DEFAULT '["architectural","quiet_morning","entertaining"]'::jsonb,
      blueprint_rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
      view_count BIGINT NOT NULL DEFAULT 0,
      lead_count INTEGER NOT NULL DEFAULT 0,
      total_generation_credits INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_property_tours_user_status
    ON property_tours (user_id, status);
  `)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_property_tours_slug
    ON property_tours (slug);
  `)

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS property_tour_leads (
      id UUID PRIMARY KEY,
      tour_id UUID NOT NULL,
      owner_user_id UUID NOT NULL,
      buyer_name VARCHAR(160) NOT NULL,
      buyer_email VARCHAR(255) NOT NULL,
      buyer_phone VARCHAR(64),
      inquiry_type VARCHAR(32) NOT NULL DEFAULT 'schedule_showing',
      selected_room_name VARCHAR(120),
      selected_style VARCHAR(64),
      message TEXT,
      referrer_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_property_tour_leads_tour
    ON property_tour_leads (tour_id, created_at);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_property_tour_leads_owner
    ON property_tour_leads (owner_user_id, created_at);
  `)

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS property_tour_hosting_events (
      id UUID PRIMARY KEY,
      tour_id UUID NOT NULL,
      user_id UUID NOT NULL,
      billing_month VARCHAR(7) NOT NULL,
      event_type VARCHAR(32) NOT NULL,
      credits_charged INTEGER NOT NULL DEFAULT 0,
      ledger_id UUID,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_property_tour_hosting_month
    ON property_tour_hosting_events (tour_id, billing_month);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_property_tour_hosting_user_month
    ON property_tour_hosting_events (user_id, billing_month);
  `)

  propertyToursSchemaReady = true
}

export function resetPropertyToursSchemaCache(): void {
  propertyToursSchemaReady = false
}
