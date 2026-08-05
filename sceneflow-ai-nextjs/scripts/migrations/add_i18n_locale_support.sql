-- Multilanguage architecture: interface/story locale preferences and the
-- shared machine-translation cache for creative content.
--
-- Idempotent; safe to re-run. Mirrored by src/lib/database/migrateI18n.ts so
-- the columns also appear via the app's bootstrap path.

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS story_locale VARCHAR(12);

COMMENT ON COLUMN users.preferred_locale IS
  'Interface language for app chrome; mirrored to the sf-locale cookie.';
COMMENT ON COLUMN users.story_locale IS
  'Default language new AI-authored creative content is written in.';

-- Hash-keyed so an identical source string is translated once platform-wide,
-- edits produce a new key rather than a stale hit, and orphans are LRU-evictable.
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

CREATE INDEX IF NOT EXISTS idx_content_translations_lru
  ON content_translations (last_used_at);
