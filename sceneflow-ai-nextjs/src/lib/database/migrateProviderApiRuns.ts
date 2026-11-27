import { sequelize } from '@/models'
import { hasColumns } from '@/lib/database/schemaProbe'

let providerApiRunsReady = false

export async function ensureProviderApiRunsTable(): Promise<void> {
  if (providerApiRunsReady) return

  if (
    await hasColumns('provider_api_runs', [
      'id',
      'route',
      'provider',
      'credential_source',
      'status',
      'estimated_cogs_usd',
      'ledger_id',
    ])
  ) {
    providerApiRunsReady = true
    return
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS provider_api_runs (
      id UUID PRIMARY KEY,
      user_id UUID,
      project_id UUID,
      route VARCHAR(255) NOT NULL,
      provider VARCHAR(32) NOT NULL,
      model VARCHAR(128) NOT NULL,
      operation VARCHAR(128) NOT NULL,
      credential_source VARCHAR(16) NOT NULL DEFAULT 'platform',
      provider_request_id VARCHAR(255),
      units_billed DOUBLE PRECISION NOT NULL DEFAULT 0,
      unit_type VARCHAR(32),
      estimated_cogs_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
      hold_id UUID,
      ledger_id UUID,
      charged_credits BIGINT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'dispatching',
      http_status INTEGER,
      error_code VARCHAR(128),
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_provider_api_runs_created_status
    ON provider_api_runs (created_at, status);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_provider_api_runs_audit_parity
    ON provider_api_runs (credential_source, status, ledger_id);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_provider_api_runs_user_created
    ON provider_api_runs (user_id, created_at);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_provider_api_runs_hold_id
    ON provider_api_runs (hold_id);
  `)

  providerApiRunsReady = true
}

export function resetProviderApiRunsReadyCache(): void {
  providerApiRunsReady = false
}
