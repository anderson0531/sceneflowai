import { sequelize } from '@/models'
import { hasColumns } from '@/lib/database/schemaProbe'

let creditHoldsReady = false

export async function ensureCreditHoldsTable(): Promise<void> {
  if (creditHoldsReady) return

  if (
    await hasColumns('credit_holds', [
      'id',
      'user_id',
      'idempotency_key',
      'amount',
      'status',
      'expires_at',
    ])
  ) {
    creditHoldsReady = true
    return
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS credit_holds (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      idempotency_key VARCHAR(255) NOT NULL UNIQUE,
      amount BIGINT NOT NULL,
      captured_amount BIGINT DEFAULT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      reason VARCHAR(64) NOT NULL DEFAULT 'ai_usage',
      provider VARCHAR(64),
      operation VARCHAR(128),
      project_id UUID,
      ref VARCHAR(255),
      ledger_id UUID,
      expires_at TIMESTAMPTZ NOT NULL,
      settled_at TIMESTAMPTZ,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_credit_holds_user_status
    ON credit_holds (user_id, status);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_credit_holds_status_expires
    ON credit_holds (status, expires_at);
  `)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_holds_idempotency_key
    ON credit_holds (idempotency_key);
  `)

  creditHoldsReady = true
}

export function resetCreditHoldsReadyCache(): void {
  creditHoldsReady = false
}
