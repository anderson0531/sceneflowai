/**
 * Migration: asset_provenance_logs table for video forensic chain-of-custody.
 */

import { sequelize } from '@/models'

export async function migrateAssetProvenance(): Promise<void> {
  await sequelize.authenticate()
  console.log('[Migration] Creating asset_provenance_logs table...')

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS asset_provenance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      scene_id VARCHAR(128),
      segment_id VARCHAR(128),
      content_hash VARCHAR(64) NOT NULL,
      signature VARCHAR(128) NOT NULL,
      generative_model VARCHAR(32) NOT NULL,
      generation_provider VARCHAR(16) NOT NULL,
      was_policy_fallback BOOLEAN NOT NULL DEFAULT false,
      vertex_policy_attempts INTEGER,
      asset_url TEXT,
      c2pa_status VARCHAR(16) NOT NULL DEFAULT 'pending',
      c2pa_manifest_url TEXT,
      sidecar_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_provenance_content_hash
    ON asset_provenance_logs (content_hash);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_provenance_user_created
    ON asset_provenance_logs (user_id, created_at DESC);
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_asset_provenance_project
    ON asset_provenance_logs (project_id);
  `)

  console.log('[Migration] asset_provenance_logs ready')
}

if (require.main === module) {
  migrateAssetProvenance()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
