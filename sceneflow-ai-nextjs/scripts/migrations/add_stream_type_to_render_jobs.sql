-- Migration: Add stream_type and scene_id columns to render_jobs table
-- Run this in Supabase SQL Editor to update the render_jobs table
-- Date: 2026-01-28

-- ============================================================================
-- 1. Add new columns
-- ============================================================================

-- Add scene_id column for scene-level renders
ALTER TABLE render_jobs 
ADD COLUMN IF NOT EXISTS scene_id VARCHAR(255) NULL;

COMMENT ON COLUMN render_jobs.scene_id IS 'Scene ID for scene-level renders (null for project-level)';

-- Add stream_type column (animatic vs video)
ALTER TABLE render_jobs 
ADD COLUMN IF NOT EXISTS stream_type VARCHAR(20) NOT NULL DEFAULT 'video';

COMMENT ON COLUMN render_jobs.stream_type IS 'Stream type: animatic (Ken Burns) or video (AI-generated)';

-- Add file_size column for storage tracking
ALTER TABLE render_jobs 
ADD COLUMN IF NOT EXISTS file_size BIGINT NULL;

COMMENT ON COLUMN render_jobs.file_size IS 'Output file size in bytes';

-- ============================================================================
-- 2. Update render_type to use VARCHAR instead of ENUM for flexibility
-- ============================================================================

-- First, remove the old ENUM constraint if it exists
-- Note: This approach preserves existing data
ALTER TABLE render_jobs 
ALTER COLUMN render_type TYPE VARCHAR(50);

-- Update the comment
COMMENT ON COLUMN render_jobs.render_type IS 'Type of render: scene_animatic, scene_video, project_animatic, project_video, project_final';

-- ============================================================================
-- 3. Add new indexes for efficient queries
-- ============================================================================

-- Index for scene_id lookups
CREATE INDEX IF NOT EXISTS render_jobs_scene_id_idx 
ON render_jobs(scene_id) 
WHERE scene_id IS NOT NULL;

-- Index for stream_type filtering
CREATE INDEX IF NOT EXISTS render_jobs_stream_type_idx 
ON render_jobs(stream_type);

-- Composite index for scene-level stream queries
-- Used when looking up specific scene renders by type and language
CREATE INDEX IF NOT EXISTS render_jobs_project_scene_stream_idx 
ON render_jobs(project_id, scene_id, stream_type, language);

-- ============================================================================
-- 4. Backfill existing data
-- ============================================================================

-- Set stream_type based on existing render_type
UPDATE render_jobs 
SET stream_type = CASE 
  WHEN render_type = 'animatic' THEN 'animatic'
  ELSE 'video'
END
WHERE stream_type = 'video'; -- Only update if not already set

-- Migrate old 'animatic' render_type to new 'project_animatic' 
UPDATE render_jobs 
SET render_type = 'project_animatic'
WHERE render_type = 'animatic';

-- ============================================================================
-- 5. Create scene_feedback table for shared review feedback
-- ============================================================================

CREATE TABLE IF NOT EXISTS scene_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token VARCHAR(64) NOT NULL,
  scene_id VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Reviewer identification
  reviewer_name VARCHAR(255),
  reviewer_email VARCHAR(255),
  session_id VARCHAR(64), -- For anonymous tracking
  
  -- Scores (1-10 scale)
  overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
  pacing_score INTEGER CHECK (pacing_score BETWEEN 1 AND 10),
  visual_score INTEGER CHECK (visual_score BETWEEN 1 AND 10),
  audio_score INTEGER CHECK (audio_score BETWEEN 1 AND 10),
  story_score INTEGER CHECK (story_score BETWEEN 1 AND 10),
  
  -- Written feedback
  feedback_text TEXT,
  timestamp_notes JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_hash VARCHAR(64) -- Hashed for privacy
);

-- Indexes for feedback queries
CREATE INDEX IF NOT EXISTS scene_feedback_share_token_idx 
ON scene_feedback(share_token);

CREATE INDEX IF NOT EXISTS scene_feedback_scene_id_idx 
ON scene_feedback(scene_id);

CREATE INDEX IF NOT EXISTS scene_feedback_project_id_idx 
ON scene_feedback(project_id);

CREATE INDEX IF NOT EXISTS scene_feedback_submitted_at_idx 
ON scene_feedback(submitted_at);

COMMENT ON TABLE scene_feedback IS 'Scene-by-scene feedback from shared review links';

-- ============================================================================
-- 6. Create feedback_summaries table for AI-generated summaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Summary data
  total_responses INTEGER DEFAULT 0,
  average_scores JSONB DEFAULT '{}'::jsonb,
  scene_scores JSONB DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  revision_recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For cache invalidation
  
  -- Source tracking
  feedback_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Feedback IDs included in summary
  
  UNIQUE(project_id) -- One summary per project
);

CREATE INDEX IF NOT EXISTS feedback_summaries_project_id_idx 
ON feedback_summaries(project_id);

COMMENT ON TABLE feedback_summaries IS 'AI-generated summaries of scene feedback';

-- ============================================================================
-- 7. Update shared_reviews in project metadata (no table changes needed)
-- Shared review links are stored in project.metadata.screeningRoomShareLink
-- ============================================================================

-- Done! Verify the changes:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'render_jobs';
