-- Migration: Add resonance_analysis column to series table
-- Description: Stores cached resonance analysis results (scores, insights, episode engagement)
-- Created: 2026-02-13
-- 
-- This column stores the full analysis result from the Audience Resonance Analysis feature,
-- allowing users to view cached results without re-running expensive LLM analysis.

-- Add resonance_analysis column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'series' AND column_name = 'resonance_analysis'
    ) THEN
        ALTER TABLE series 
        ADD COLUMN resonance_analysis JSONB DEFAULT NULL;
        
        COMMENT ON COLUMN series.resonance_analysis IS 'Cached resonance analysis with scores, insights, and episode engagement data';
    END IF;
END
$$;

-- Create index for querying series with analysis
CREATE INDEX IF NOT EXISTS idx_series_has_resonance_analysis 
ON series ((resonance_analysis IS NOT NULL));

-- Sample query to find series with greenlight score above threshold:
-- SELECT id, title, resonance_analysis->'greenlightScore'->>'score' as score 
-- FROM series 
-- WHERE resonance_analysis IS NOT NULL 
-- AND (resonance_analysis->'greenlightScore'->>'score')::numeric >= 80;
