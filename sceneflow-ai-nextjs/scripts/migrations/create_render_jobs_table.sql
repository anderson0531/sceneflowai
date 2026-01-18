-- Migration: Create render_jobs table
-- Run this in Supabase SQL Editor to create the render_jobs table
-- 
-- This table tracks video rendering jobs submitted to GCP Cloud Run
-- Used for status polling and job management

-- Create ENUM types first
DO $$ BEGIN
    CREATE TYPE render_job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE render_type AS ENUM ('animatic', 'scene_video', 'project_video');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE render_resolution AS ENUM ('720p', '1080p', '4K');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the render_jobs table
CREATE TABLE IF NOT EXISTS render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status and progress
    status render_job_status NOT NULL DEFAULT 'QUEUED',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Render settings
    resolution render_resolution NOT NULL DEFAULT '1080p',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    include_subtitles BOOLEAN NOT NULL DEFAULT false,
    render_type render_type NOT NULL DEFAULT 'scene_video',
    
    -- Duration estimate
    estimated_duration FLOAT,
    
    -- Cloud Run execution tracking
    cloud_run_execution_id VARCHAR(255),
    
    -- Output paths
    output_path TEXT,
    download_url TEXT,
    download_url_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS render_jobs_project_id_idx ON render_jobs(project_id);
CREATE INDEX IF NOT EXISTS render_jobs_user_id_idx ON render_jobs(user_id);
CREATE INDEX IF NOT EXISTS render_jobs_status_idx ON render_jobs(status);
CREATE INDEX IF NOT EXISTS render_jobs_created_at_idx ON render_jobs(created_at);
CREATE INDEX IF NOT EXISTS render_jobs_render_type_idx ON render_jobs(render_type);
CREATE INDEX IF NOT EXISTS render_jobs_project_render_type_idx ON render_jobs(project_id, render_type);

-- Add trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_render_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_render_jobs_updated_at ON render_jobs;
CREATE TRIGGER trigger_update_render_jobs_updated_at
    BEFORE UPDATE ON render_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_render_jobs_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own render jobs
CREATE POLICY "Users can view own render jobs" ON render_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own render jobs
CREATE POLICY "Users can insert own render jobs" ON render_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own render jobs
CREATE POLICY "Users can update own render jobs" ON render_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for API routes)
CREATE POLICY "Service role full access" ON render_jobs
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON render_jobs TO authenticated;
GRANT ALL ON render_jobs TO service_role;

-- Add comment to table
COMMENT ON TABLE render_jobs IS 'Tracks video rendering jobs submitted to GCP Cloud Run for status polling and job management';
COMMENT ON COLUMN render_jobs.render_type IS 'Type of render: animatic (from Screening Room), scene_video, or project_video';
COMMENT ON COLUMN render_jobs.cloud_run_execution_id IS 'Cloud Run Job execution ID for monitoring';
COMMENT ON COLUMN render_jobs.output_path IS 'GCS path to rendered video (gs://bucket/path)';
COMMENT ON COLUMN render_jobs.download_url IS 'Signed download URL for the rendered video';
COMMENT ON COLUMN render_jobs.download_url_expires_at IS 'Expiration time for the download URL';
COMMENT ON COLUMN render_jobs.estimated_duration IS 'Estimated video duration in seconds';
