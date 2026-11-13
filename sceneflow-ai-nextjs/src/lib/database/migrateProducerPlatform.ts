import { sequelize } from '@/config/database'
import { hasTables } from '@/lib/database/schemaProbe'

export const COMMERCIAL_ADDENDUM_VERSION = '2026-11-v1'
export const CUSTOMER_CONSENT_VERSION = '2026-11-v1'

const PRODUCER_TABLES = [
  'producer_profiles',
  'customer_consents',
  'client_asset_submissions',
  'workspace_members',
  'project_assignments',
] as const

let schemaInProgress = false
let schemaCompleted = false

/**
 * Idempotently ensures B2B2C Service Provider & Universal Team tables exist.
 * Short-circuits with a single `information_schema` probe once created so hot
 * request paths pay minimal overhead on serverless cold starts.
 */
export async function ensureProducerPlatformSchema(): Promise<void> {
  if (schemaCompleted) return

  if (schemaInProgress) {
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 100))
      if (schemaCompleted) return
    }
    throw new Error('[migrateProducerPlatform] Schema migration timeout')
  }

  schemaInProgress = true
  try {
    if (await hasTables([...PRODUCER_TABLES])) {
      schemaCompleted = true
      return
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS producer_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        brand_name VARCHAR(160) NOT NULL DEFAULT '',
        brand_logo_url VARCHAR(1000),
        primary_color VARCHAR(24) NOT NULL DEFAULT '#7c3aed',
        support_email VARCHAR(255),
        custom_terms_url VARCHAR(1000),
        hide_sceneflow_branding BOOLEAN NOT NULL DEFAULT true,
        default_max_rounds INTEGER NOT NULL DEFAULT 2,
        daily_public_intake_credit_cap INTEGER NOT NULL DEFAULT 200,
        commercial_addendum_accepted_at TIMESTAMPTZ,
        commercial_addendum_version VARCHAR(32),
        accepted_ip VARCHAR(96),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customer_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collab_session_id UUID NOT NULL,
        project_id UUID,
        owner_user_id UUID NOT NULL,
        customer_name VARCHAR(160) NOT NULL,
        customer_email VARCHAR(255),
        consent_version VARCHAR(32) NOT NULL DEFAULT '2026-11-v1',
        ip_address VARCHAR(96),
        user_agent VARCHAR(512),
        attested_media_rights BOOLEAN NOT NULL DEFAULT true,
        acknowledged_zero_privity BOOLEAN NOT NULL DEFAULT true,
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS client_asset_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collab_session_id UUID NOT NULL,
        project_id UUID NOT NULL,
        owner_user_id UUID NOT NULL,
        slot_id VARCHAR(160) NOT NULL,
        slot_type VARCHAR(32) NOT NULL,
        slot_name VARCHAR(200) NOT NULL,
        customer_name VARCHAR(160) NOT NULL,
        customer_email VARCHAR(255),
        blob_url VARCHAR(1200) NOT NULL,
        mime_type VARCHAR(64) NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        caption TEXT,
        quarantine_status VARCHAR(24) NOT NULL DEFAULT 'clean',
        quarantine_reason TEXT,
        approval_status VARCHAR(24) NOT NULL DEFAULT 'pending',
        promoted_reference_asset_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_user_id UUID NOT NULL,
        member_user_id UUID,
        member_email VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'project_manager',
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        access_all_projects BOOLEAN NOT NULL DEFAULT false,
        monthly_credit_limit INTEGER,
        credits_used_month INTEGER NOT NULL DEFAULT 0,
        credits_period_key VARCHAR(16),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (owner_user_id, member_email)
      );

      CREATE TABLE IF NOT EXISTS project_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        owner_user_id UUID NOT NULL,
        member_user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (project_id, member_user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_customer_consents_session ON customer_consents(collab_session_id);
      CREATE INDEX IF NOT EXISTS idx_client_assets_session ON client_asset_submissions(collab_session_id, project_id);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_member ON workspace_members(member_user_id, status);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_owner ON workspace_members(owner_user_id, status);
      CREATE INDEX IF NOT EXISTS idx_project_assignments_lookup ON project_assignments(project_id, member_user_id);
    `)

    schemaCompleted = true
  } finally {
    schemaInProgress = false
  }
}

export function resetProducerPlatformSchemaCacheForTests(): void {
  schemaCompleted = false
  schemaInProgress = false
}
