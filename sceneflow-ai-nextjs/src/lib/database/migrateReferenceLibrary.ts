/**
 * Global Reference Library database migration.
 * Creates reference_assets and reference_asset_links tables.
 * Safe to run multiple times.
 */

import { sequelize } from '@/config/database'
import { QueryTypes } from 'sequelize'

export async function migrateReferenceLibrary(): Promise<{
  success: boolean
  actions: string[]
  errors: string[]
}> {
  const actions: string[] = []
  const errors: string[] = []

  try {
    // pg_trgm for fuzzy name search
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
      actions.push('Ensured pg_trgm extension')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      actions.push(`pg_trgm note: ${msg}`)
    }

    const [assetsExists] = (await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reference_assets'
      ) AS exists`,
      { type: QueryTypes.SELECT }
    )) as Array<{ exists: boolean }>

    if (!assetsExists?.exists) {
      await sequelize.query(`
        CREATE TABLE reference_assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          kind VARCHAR(20) NOT NULL CHECK (kind IN ('character', 'wardrobe', 'location', 'prop')),
          parent_asset_id UUID REFERENCES reference_assets(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          canonical_name VARCHAR(255) NOT NULL,
          description TEXT,
          reference_image_url TEXT,
          attributes JSONB NOT NULL DEFAULT '{}',
          tags TEXT[] NOT NULL DEFAULT '{}',
          origin_project_id UUID,
          origin_series_id UUID,
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          archived_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `)
      actions.push('Created reference_assets table')

      await sequelize.query(
        `CREATE INDEX idx_reference_assets_user_kind ON reference_assets(user_id, kind)`
      )
      await sequelize.query(
        `CREATE INDEX idx_reference_assets_user_canonical ON reference_assets(user_id, canonical_name)`
      )
      await sequelize.query(
        `CREATE INDEX idx_reference_assets_parent ON reference_assets(parent_asset_id) WHERE parent_asset_id IS NOT NULL`
      )
      await sequelize.query(
        `CREATE INDEX idx_reference_assets_tags ON reference_assets USING GIN(tags)`
      )
      try {
        await sequelize.query(
          `CREATE INDEX idx_reference_assets_name_trgm ON reference_assets USING GIN(name gin_trgm_ops)`
        )
        actions.push('Created pg_trgm index on reference_assets.name')
      } catch {
        actions.push('Skipped pg_trgm index (extension unavailable)')
      }
    } else {
      actions.push('reference_assets table already exists')
    }

    const [linksExists] = (await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reference_asset_links'
      ) AS exists`,
      { type: QueryTypes.SELECT }
    )) as Array<{ exists: boolean }>

    if (!linksExists?.exists) {
      await sequelize.query(`
        CREATE TABLE reference_asset_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID NOT NULL REFERENCES reference_assets(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          series_id UUID REFERENCES series(id) ON DELETE CASCADE,
          added_by VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (added_by IN ('auto', 'user', 'series')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT reference_asset_links_target_check CHECK (
            project_id IS NOT NULL OR series_id IS NOT NULL
          )
        )
      `)
      actions.push('Created reference_asset_links table')

      await sequelize.query(
        `CREATE UNIQUE INDEX idx_reference_asset_links_asset_project
         ON reference_asset_links(asset_id, project_id) WHERE project_id IS NOT NULL`
      )
      await sequelize.query(
        `CREATE UNIQUE INDEX idx_reference_asset_links_asset_series
         ON reference_asset_links(asset_id, series_id) WHERE series_id IS NOT NULL`
      )
      await sequelize.query(
        `CREATE INDEX idx_reference_asset_links_project ON reference_asset_links(project_id) WHERE project_id IS NOT NULL`
      )
      await sequelize.query(
        `CREATE INDEX idx_reference_asset_links_series ON reference_asset_links(series_id) WHERE series_id IS NOT NULL`
      )
    } else {
      actions.push('reference_asset_links table already exists')
    }

    return { success: true, actions, errors }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(msg)
    console.error('[migrateReferenceLibrary]', error)
    return { success: false, actions, errors }
  }
}

/** Postgres `undefined_table`. */
const UNDEFINED_TABLE = '42P01'

/** True when a query failed only because the reference library is not created. */
export function isMissingReferenceLibraryTable(error: unknown): boolean {
  const candidates = [
    error,
    (error as { parent?: unknown })?.parent,
    (error as { original?: unknown })?.original,
  ]
  return candidates.some(
    (candidate) => (candidate as { code?: string } | undefined)?.code === UNDEFINED_TABLE
  )
}

let tablesReady = false
let tablesInFlight: Promise<void> | null = null

/**
 * Memoized, fail-soft table check for the reference library.
 *
 * The tables ship in this migration rather than in a deploy step, so a
 * deployment that never ran bootstrap answers every library query with
 * `relation "reference_asset_links" does not exist`. Callers run this first and
 * the DDL is idempotent, so the cost is one existence check per process.
 */
export async function ensureReferenceLibraryTablesOnce(): Promise<void> {
  if (tablesReady) return
  if (tablesInFlight) return tablesInFlight

  tablesInFlight = migrateReferenceLibrary()
    .then((result) => {
      if (!result.success) {
        console.warn('[migrateReferenceLibrary] ensure failed:', result.errors.join('; '))
      }
      tablesReady = true
    })
    .catch((error: unknown) => {
      // Never block a user action on a DDL permission problem; the query that
      // follows reports a clearer error if the tables really are missing.
      const msg = error instanceof Error ? error.message : String(error)
      console.warn('[migrateReferenceLibrary] ensure threw:', msg)
      tablesReady = true
    })
    .finally(() => {
      tablesInFlight = null
    })

  return tablesInFlight
}
