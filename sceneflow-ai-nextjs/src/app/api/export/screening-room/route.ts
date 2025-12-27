import { NextRequest, NextResponse } from 'next/server';
import { RenderStorage } from '@/lib/gcs/renderStorage';
import { CloudRunJobsService } from '@/lib/video/CloudRunJobsService';
import { RenderJobSpec, RenderSegment, AudioTrack } from '@/lib/video/renderTypes';
import RenderJob from '@/models/RenderJob';
import { v4 as uuidv4 } from 'uuid';

export interface ScreeningRoomScene {
  id: string;
  title: string;
  duration: number; // in seconds
  imageUrl?: string;
  thumbnailUrl?: string;
  audioTrack?: string;
  audioTrackEs?: string;
  audioTrackFr?: string;
  audioTrackDe?: string;
  audioTrackIt?: string;
  audioTrackPt?: string;
  audioTrackPtBr?: string;
  audioTrackJa?: string;
  audioTrackKo?: string;
  audioTrackZh?: string;
  audioTrackHi?: string;
  audioTrackAr?: string;
  audioTrackRu?: string;
}

export interface ExportRequest {
  projectId: string;
  scenes: ScreeningRoomScene[];
  language: string;
  resolution: 'sd' | 'hd' | 'fhd';
  title?: string;
}

// Map resolution string to dimensions
function getResolutionDimensions(resolution: string): { width: number; height: number } {
  switch (resolution) {
    case 'sd':
      return { width: 854, height: 480 };
    case 'hd':
      return { width: 1280, height: 720 };
    case 'fhd':
    default:
      return { width: 1920, height: 1080 };
  }
}

// Get the audio URL for the specified language
function getAudioUrlForLanguage(scene: ScreeningRoomScene, language: string): string | undefined {
  const languageToField: Record<string, keyof ScreeningRoomScene> = {
    en: 'audioTrack',
    es: 'audioTrackEs',
    fr: 'audioTrackFr',
    de: 'audioTrackDe',
    it: 'audioTrackIt',
    pt: 'audioTrackPt',
    'pt-br': 'audioTrackPtBr',
    ja: 'audioTrackJa',
    ko: 'audioTrackKo',
    zh: 'audioTrackZh',
    hi: 'audioTrackHi',
    ar: 'audioTrackAr',
    ru: 'audioTrackRu',
  };

  const field = languageToField[language.toLowerCase()] || 'audioTrack';
  return scene[field] as string | undefined;
}

// Check if Cloud Run rendering is configured
function isCloudRunConfigured(): boolean {
  return !!(
    process.env.GCS_RENDER_BUCKET &&
    process.env.CLOUD_RUN_JOB_NAME &&
    process.env.CLOUD_RUN_REGION
  );
}

// Build job spec for Cloud Run FFmpeg rendering
function buildRenderJobSpec(
  jobId: string,
  projectId: string,
  scenes: ScreeningRoomScene[],
  language: string,
  resolution: 'sd' | 'hd' | 'fhd',
  title?: string
): RenderJobSpec {
  const { width, height } = getResolutionDimensions(resolution);
  
  let currentTime = 0;
  const segments: RenderSegment[] = [];
  const audioTracks: AudioTrack[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const imageUrl = scene.imageUrl || scene.thumbnailUrl;
    
    if (!imageUrl) {
      console.warn(`Scene ${i} has no image URL, skipping`);
      continue;
    }

    // Add segment for this scene
    segments.push({
      imageUrl,
      duration: scene.duration,
      startTime: currentTime,
      kenBurnsEffect: {
        startZoom: 1.0,
        endZoom: 1.15,
        startX: 0.5,
        startY: 0.5,
        endX: 0.5,
        endY: 0.5,
      },
    });

    // Add audio track for this scene if available
    const audioUrl = getAudioUrlForLanguage(scene, language);
    if (audioUrl) {
      audioTracks.push({
        audioUrl,
        startTime: currentTime,
        duration: scene.duration,
        volume: 1.0,
      });
    }

    currentTime += scene.duration;
  }

  if (segments.length === 0) {
    throw new Error('No valid segments found. Each scene must have an imageUrl or thumbnailUrl.');
  }

  return {
    jobId,
    projectId,
    segments,
    audioTracks,
    output: {
      format: 'mp4',
      resolution,
      fps: 24,
      width,
      height,
    },
    metadata: {
      title: title || `Export-${projectId}`,
      language,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExportRequest;
    const { projectId, scenes, language, resolution, title } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: scenes (must be a non-empty array)' },
        { status: 400 }
      );
    }

    const validLanguage = language || 'en';
    const validResolution = resolution || 'hd';

    console.log(`[Export] Starting export for project ${projectId} with ${scenes.length} scenes`);
    console.log(`[Export] Language: ${validLanguage}, Resolution: ${validResolution}`);

    // Validate Cloud Run is configured
    if (!isCloudRunConfigured()) {
      console.error('[Export] Cloud Run FFmpeg rendering is not configured');
      return NextResponse.json(
        { 
          error: 'Video export is not configured',
          details: 'Cloud Run FFmpeg rendering requires the following environment variables: GCS_RENDER_BUCKET, CLOUD_RUN_JOB_NAME, CLOUD_RUN_REGION, GCP_PROJECT_ID. Please contact support or check the deployment documentation.',
          missingConfig: {
            GCS_RENDER_BUCKET: !process.env.GCS_RENDER_BUCKET,
            CLOUD_RUN_JOB_NAME: !process.env.CLOUD_RUN_JOB_NAME,
            CLOUD_RUN_REGION: !process.env.CLOUD_RUN_REGION,
            GCP_PROJECT_ID: !process.env.GCP_PROJECT_ID,
          }
        },
        { status: 503 }
      );
    }

    console.log('[Export] Using Cloud Run FFmpeg rendering');
    
    // Generate unique job ID
    const jobId = uuidv4();
    
    // Build the render job spec
    const jobSpec = buildRenderJobSpec(
      jobId,
      projectId,
      scenes,
      validLanguage,
      validResolution as 'sd' | 'hd' | 'fhd',
      title
    );

    // Upload job spec to GCS
    const renderStorage = new RenderStorage();
    await renderStorage.uploadJobSpec(jobId, jobSpec);
    console.log(`[Export] Job spec uploaded to GCS for job ${jobId}`);

    // Map resolution format for database
    const dbResolution = validResolution === 'sd' ? '720p' : validResolution === 'hd' ? '1080p' : '4K';

    // Create database record for tracking
    // Note: Using jobId as the primary key (id field)
    await RenderJob.create({
      id: jobId,
      project_id: projectId,
      user_id: projectId, // Use projectId as user_id for now (can be updated with actual user ID)
      status: 'QUEUED',
      progress: 0,
      language: validLanguage,
      resolution: dbResolution as '720p' | '1080p' | '4K',
      include_subtitles: false,
      estimated_duration: scenes.reduce((sum, s) => sum + s.duration, 0),
    });
    console.log(`[Export] Database record created for job ${jobId}`);

    // Trigger Cloud Run Job
    const cloudRunService = new CloudRunJobsService();
    await cloudRunService.triggerRenderJob(jobId);
    console.log(`[Export] Cloud Run Job triggered for job ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Render job submitted successfully',
      provider: 'cloud-run',
    });
  } catch (error) {
    console.error('[Export] Error processing export request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to start video export',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
