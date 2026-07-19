-- Migration: Widen target_audience columns from VARCHAR(255) to TEXT
-- Description: The unified audience feature captures a free-text audience
-- description (speech or typing) that can exceed 255 characters. Widen the
-- target_audience columns on both series and projects so descriptions are not
-- truncated. The structured audience definition (with cultural signals) is
-- stored in each row's metadata JSONB.
-- Created: 2026-07-19

DO $$
BEGIN
    -- series.target_audience -> TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series'
          AND column_name = 'target_audience'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE series ALTER COLUMN target_audience TYPE TEXT;
    END IF;

    -- projects.target_audience -> TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects'
          AND column_name = 'target_audience'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE projects ALTER COLUMN target_audience TYPE TEXT;
    END IF;
END
$$;
