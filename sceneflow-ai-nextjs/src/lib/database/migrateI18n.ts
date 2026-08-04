import { sequelize } from '@/config/database'

/** Column-only migration, safe to run on hot paths. */
export async function ensureUserLocaleColumns(): Promise<void> {
  await sequelize.authenticate()
  await sequelize.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(12);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS story_locale VARCHAR(12);
  `)
}

/**
 * Shared, hash-keyed cache for machine-translated creative content.
 *
 * Keying on a hash of the source text rather than on entity ids means an
 * identical string is paid for once platform-wide, an edit naturally produces a
 * new key instead of a stale hit, and orphaned rows are LRU-evictable.
 */
export async function ensureContentTranslationsTable(): Promise<void> {
  await sequelize.authenticate()
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS content_translations (
      source_hash     CHAR(64)     NOT NULL,
      target_locale   VARCHAR(12)  NOT NULL,
      source_locale   VARCHAR(12)  NOT NULL DEFAULT 'en',
      translated_text TEXT         NOT NULL,
      provider        VARCHAR(32)  NOT NULL,
      char_count      INTEGER      NOT NULL DEFAULT 0,
      last_used_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      PRIMARY KEY (source_hash, target_locale)
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_content_translations_lru
      ON content_translations (last_used_at);
  `)
}

let localeColumnsReady = false
let localeColumnsInFlight: Promise<void> | null = null

/**
 * Memoized, fail-soft version of {@link ensureUserLocaleColumns}.
 *
 * `User` declares `preferred_locale` / `story_locale`, so Sequelize selects
 * them on every lookup. On a deployment that has not run the migration yet
 * that would break all user queries, so the single user-resolution choke point
 * calls this first. Costs one `ALTER TABLE ... IF NOT EXISTS` per process.
 */
export async function ensureUserLocaleColumnsOnce(): Promise<void> {
  if (localeColumnsReady) return
  if (localeColumnsInFlight) return localeColumnsInFlight

  localeColumnsInFlight = ensureUserLocaleColumns()
    .then(() => {
      localeColumnsReady = true
    })
    .catch((error) => {
      // Never block a user action on a DDL permission problem; the query that
      // follows will surface a clearer error if the columns really are missing.
      console.warn('[migrateI18n] locale column check failed:', error?.message ?? error)
      localeColumnsReady = true
    })
    .finally(() => {
      localeColumnsInFlight = null
    })

  return localeColumnsInFlight
}

export async function migrateI18n(): Promise<void> {
  await ensureUserLocaleColumns()
  console.log('✓ users.preferred_locale / users.story_locale ensured')
  await ensureContentTranslationsTable()
  console.log('✓ content_translations table ensured')
  console.log('✅ i18n migration completed')
}

if (require.main === module) {
  migrateI18n()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}
