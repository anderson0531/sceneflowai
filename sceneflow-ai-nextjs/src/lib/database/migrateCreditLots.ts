import { sequelize } from '@/models'
import { hasColumns } from '@/lib/database/schemaProbe'

let creditLotsReady = false

export async function ensureCreditLotsTable(): Promise<void> {
  if (creditLotsReady) return

  if (await hasColumns('credit_lots', ['id', 'user_id', 'remaining', 'expires_at', 'source'])) {
    creditLotsReady = true
    return
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS credit_lots (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      source VARCHAR(32) NOT NULL,
      remaining BIGINT NOT NULL,
      granted BIGINT NOT NULL,
      purchased_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      ref VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_credit_lots_user ON credit_lots (user_id);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_credit_lots_expires ON credit_lots (expires_at);
  `)
  creditLotsReady = true
}
