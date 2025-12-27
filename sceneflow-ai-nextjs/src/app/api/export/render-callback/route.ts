/**
 * Render Job Callback API Route
 * 
 * POST /api/export/render-callback
 * 
 * Called by the Cloud Run FFmpeg renderer to update job status.
 * This endpoint is called when rendering starts, progresses, completes, or fails.
 */

import { NextRequest, NextResponse } from 'next/server';
import RenderJob, { RenderJobStatus } from '@/models/RenderJob';

interface CallbackPayload {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  outputPath?: string;
  downloadUrl?: string;
  error?: string;
}

// Simple API key validation for callback security
function validateCallbackAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  const expectedKey = process.env.RENDER_CALLBACK_API_KEY;
  
  if (!expectedKey) {
    console.warn('[Render Callback] RENDER_CALLBACK_API_KEY not set, accepting all callbacks');
    return true;
  }
  
  if (!authHeader) {
    return false;
  }
  
  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' && token === expectedKey;
}

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    if (!validateCallbackAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as CallbackPayload;
    const { jobId, status, progress, outputPath, downloadUrl, error } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required field: jobId' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      );
    }

    console.log(`[Render Callback] Updating job ${jobId}:`, {
      status,
      progress,
      hasDownloadUrl: !!downloadUrl,
      hasError: !!error,
    });

    // Find the job by its primary key (id)
    const job = await RenderJob.findByPk(jobId);

    if (!job) {
      console.error(`[Render Callback] Job not found: ${jobId}`);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Build update data matching RenderJobAttributes
    const updateData: Partial<{
      status: RenderJobStatus;
      progress: number;
      output_path: string;
      download_url: string;
      error: string;
      completed_at: Date;
    }> = {
      status: status as RenderJobStatus,
    };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (outputPath) {
      updateData.output_path = outputPath;
    }

    if (downloadUrl) {
      updateData.download_url = downloadUrl;
    }

    if (error) {
      updateData.error = error;
    }

    // Set completion timestamp
    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completed_at = new Date();
    }

    await job.update(updateData);

    console.log(`[Render Callback] Job ${jobId} updated successfully to ${status}`);

    return NextResponse.json({
      success: true,
      jobId,
      status,
    });
  } catch (error) {
    console.error('[Render Callback] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process callback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
