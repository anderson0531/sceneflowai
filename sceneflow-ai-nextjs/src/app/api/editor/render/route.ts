import { NextRequest, NextResponse } from 'next/server';
import Project from '@/models/Project';
import { shotstackService } from '@/services/ShotstackService';
import { VideoStitchRequest } from '@/app/api/video/stitch/route';

export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    
    console.log('[Render] Render request received for project:', projectId);
    
    const project = await Project.findByPk(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const scenes = project.metadata?.visionPhase?.scenes || [];
    const clips = scenes
      .filter((scene: any) => scene.videoUrl)
      .map((scene: any) => ({
        scene_number: scene.sceneNumber,
        clip_id: `scene-${scene.sceneNumber}`,
        video_url: scene.videoUrl,
        duration: 5 // Default duration if not specified
      }));

    if (clips.length === 0) {
      return NextResponse.json({ error: 'No video clips found in project' }, { status: 400 });
    }

    const stitchRequest: VideoStitchRequest = {
      generationId: projectId,
      userId: project.user_id,
      clips,
      outputSettings: {
        format: 'mp4',
        quality: 'high',
        frameRate: '30',
        resolution: '1080p'
      }
    };

    const result = await shotstackService.assembleVideo(stitchRequest);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to start render',
        message: result.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      renderId: result.renderId,
      message: 'Rendering started',
      statusUrl: `/api/video/stitch?stitchId=${result.renderId}&userId=${project.user_id}`
    });

  } catch (error) {
    console.error('[Render] Error:', error);
    return NextResponse.json({ 
      error: 'Render failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

