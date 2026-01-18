import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadJobSpec, getOutputPath, getRenderBucket } from '@/lib/gcs/renderStorage';
import { triggerCloudRunJob, isCloudRunJobsEnabled } from '@/lib/video/CloudRunJobsService';
import { RenderJobSpec, RenderSegment, RenderAudioClip } from '@/lib/video/renderTypes';
import RenderJob from '@/models/RenderJob';
import { v4 as uuidv4 } from 'uuid';

export interface PlayerSettings {
  volume: number;
  musicVolume: number;
  playbackSpeed: number;
  kenBurnsIntensity: 'subtle' | 'medium' | 'dramatic';
  narrationEnabled: boolean;
}

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
  playerSettings?: PlayerSettings;
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

// Ken Burns intensity settings
function getKenBurnsZoom(intensity: 'subtle' | 'medium' | 'dramatic' | undefined): { zoomStart: number; zoomEnd: number } {
  switch (intensity) {
    case 'subtle':
      return { zoomStart: 1.0, zoomEnd: 1.05 };
    case 'dramatic':
      return { zoomStart: 1.0, zoomEnd: 1.25 };
    case 'medium':
    default:
      return { zoomStart: 1.0, zoomEnd: 1.15 };
  }
}

// Map sd/hd/fhd to standard resolution format
function mapResolution(resolution: 'sd' | 'hd' | 'fhd'): '720p' | '1080p' | '4K' {
  switch (resolution) {
    case 'sd': return '720p';
    case 'hd': return '1080p';
    case 'fhd': return '4K';
    default: return '1080p';
  }
}

// Build job spec for Cloud Run FFmpeg rendering
function buildRenderJobSpec(
  jobId: string,
  projectId: string,
  scenes: ScreeningRoomScene[],
  language: string,
  resolution: 'sd' | 'hd' | 'fhd',
  title?: string,
  playerSettings?: PlayerSettings
): RenderJobSpec {
  const { zoomStart, zoomEnd } = getKenBurnsZoom(playerSettings?.kenBurnsIntensity);
  
  // Apply player volume settings (default to 1.0)
  const audioVolume = playerSettings?.volume ?? 1.0;
  
  let currentTime = 0;
  const segments: RenderSegment[] = [];
  const audioClips: RenderAudioClip[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const imageUrl = scene.imageUrl || scene.thumbnailUrl;
    
    if (!imageUrl) {
      console.warn(`Scene ${i} has no image URL, skipping`);
      continue;
    }

    // Add segment for this scene with player's Ken Burns intensity
    segments.push({
      segmentId: scene.id || `segment-${i}`,
      imageUrl,
      duration: scene.duration,
      startTime: currentTime,
      kenBurns: {
        zoomStart,
        zoomEnd,
        panX: 0,
        panY: 0,
      },
    });

    // Add audio clip for this scene if available (respecting narrationEnabled and volume)
    // Note: In screening room, all audio is narration audio
    if (playerSettings?.narrationEnabled !== false) {
      const audioUrl = getAudioUrlForLanguage(scene, language);
      if (audioUrl) {
        audioClips.push({
          url: audioUrl,
          startTime: currentTime,
          duration: scene.duration,
          volume: audioVolume,
          type: 'narration',
        });
      }
    }

    currentTime += scene.duration;
  }

  if (segments.length === 0) {
    throw new Error('No valid segments found. Each scene must have an imageUrl or thumbnailUrl.');
  }

  return {
    jobId,
    projectId,
    projectTitle: title || `Animatic-${projectId}`,
    resolution: mapResolution(resolution),
    fps: 24,
    segments,
    audioClips,
    outputPath: getOutputPath(jobId),
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'}/api/export/render-callback`,
    createdAt: new Date().toISOString(),
    language,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || session?.user?.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json() as ExportRequest;
    const { projectId, scenes, language, resolution, title, playerSettings } = body;

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
    if (playerSettings) {
      console.log(`[Export] Player settings: volume=${playerSettings.volume}, musicVolume=${playerSettings.musicVolume}, kenBurns=${playerSettings.kenBurnsIntensity}, narration=${playerSettings.narrationEnabled}`);
    }

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
      title,
      playerSettings
    );

    // Upload job spec to GCS
    const jobSpecPath = await uploadJobSpec(jobSpec);
    console.log(`[Export] Job spec uploaded to GCS for job ${jobId}: ${jobSpecPath}`);

    // Map resolution format for database
    const dbResolution = validResolution === 'sd' ? '720p' : validResolution === 'hd' ? '1080p' : '4K';

    // Create database record for tracking (non-blocking - render proceeds even if tracking fails)
    try {
      await RenderJob.create({
        id: jobId,
        project_id: projectId,
        user_id: userId,
        status: 'QUEUED',
        progress: 0,
        language: validLanguage,
        resolution: dbResolution as '720p' | '1080p' | '4K',
        include_subtitles: false,
        estimated_duration: scenes.reduce((sum, s) => sum + s.duration, 0),
        render_type: 'animatic', // Mark as animatic render for Final Cut phase
      });
      console.log(`[Export] Database record created for job ${jobId}`);
    } catch (dbError) {
      // Log but don't fail - render can proceed without tracking
      console.warn(`[Export] Failed to create database record for job ${jobId}:`, dbError);
      console.warn(`[Export] Proceeding with render anyway - tracking disabled for this job`);
    }

    // Trigger Cloud Run Job
    await triggerCloudRunJob(jobId, jobSpecPath);
    console.log(`[Export] Cloud Run Job triggered for job ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Animatic render job submitted successfully',
      provider: 'cloud-run',
    });
  } catch (error) {
    console.error('[Export] Error processing export request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to start animatic render',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
