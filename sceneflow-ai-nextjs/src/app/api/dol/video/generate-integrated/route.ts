import { NextRequest, NextResponse } from 'next/server';
import { videoGenerationIntegrationService, VideoGenerationRequest } from '@/services/DOL/VideoGenerationIntegrationService';

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerationRequest = await request.json();
    
    // Validate required fields
    if (!body.sceneDirections || body.sceneDirections.length === 0) {
      return NextResponse.json(
        { error: 'No scene directions provided' },
        { status: 400 }
      );
    }

    if (!body.userId || !body.projectId) {
      return NextResponse.json(
        { error: 'Missing user ID or project ID' },
        { status: 400 }
      );
    }

    console.log('🎬 DOL Video Generation API: Processing request...');

    // Generate video using DOL integration service
    const result = await videoGenerationIntegrationService.generateVideo(body);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error || 'Video generation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('DOL Video Generation API error:', error);
    return NextResponse.json(
      { 
        error: 'Video generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'DOL-Integrated Video Generation API',
    description: 'This endpoint uses DOL optimization for all video generation requests',
    endpoints: {
      POST: '/api/dol/video/generate-integrated - Generate video with DOL optimization',
      GET: '/api/dol/video/generate-integrated - Get API information'
    }
  });
}
