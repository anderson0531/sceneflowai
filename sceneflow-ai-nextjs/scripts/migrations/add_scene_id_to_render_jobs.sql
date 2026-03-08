-- Migration: Add scene_id and related columns to render_jobs table
-- Run this in your Neon PostgreSQL database console
-- 
-- This migration adds:
-- 1. scene_id column for scene-level render tracking
-- 2. stream_type column for animatic/video differentiation  
-- 3. file_size column for output file tracking
-- 4. New indexes for efficient querying
--
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add scene_id column
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS scene_id VARCHAR(255) NULL;

-- Add stream_type column (if not already present from previous migration)
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS stream_type VARCHAR(20) NOT NULL DEFAULT 'video';

-- Add file_size column
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS file_size BIGINT NULL;

-- Create indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS render_jobs_scene_id_idx ON render_jobs(scene_id);
CREATE INDEX IF NOT EXISTS render_jobs_stream_type_idx ON render_jobs(stream_type);
CREATE INDEX IF NOT EXISTS render_jobs_project_scene_stream_idx ON render_jobs(project_id, scene_id, stream_type, language);

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'render_jobs' 
  AND column_name IN ('scene_id', 'stream_type', 'file_size')
ORDER BY column_name;
