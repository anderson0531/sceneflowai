-- Migration: Global Reference Library (reference_assets, reference_asset_links)
-- Run this in your Neon PostgreSQL database console
--
-- These tables normally arrive through src/lib/database/migrateReferenceLibrary.ts,
-- which the app now runs lazily on the first reference-library query. This file
-- exists for operators who would rather apply the DDL directly, and mirrors that
-- migration exactly.
--
-- Safe to run multiple times (uses IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS reference_assets (
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
);

CREATE INDEX IF NOT EXISTS idx_reference_assets_user_kind
  ON reference_assets(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_reference_assets_user_canonical
  ON reference_assets(user_id, canonical_name);
CREATE INDEX IF NOT EXISTS idx_reference_assets_parent
  ON reference_assets(parent_asset_id) WHERE parent_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reference_assets_tags
  ON reference_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_reference_assets_name_trgm
  ON reference_assets USING GIN(name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS reference_asset_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES reference_assets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  added_by VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (added_by IN ('auto', 'user', 'series')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT reference_asset_links_target_check CHECK (
    project_id IS NOT NULL OR series_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reference_asset_links_asset_project
  ON reference_asset_links(asset_id, project_id) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reference_asset_links_asset_series
  ON reference_asset_links(asset_id, series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reference_asset_links_project
  ON reference_asset_links(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reference_asset_links_series
  ON reference_asset_links(series_id) WHERE series_id IS NOT NULL;

-- Verify both tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('reference_assets', 'reference_asset_links')
ORDER BY table_name;
