import { NextRequest, NextResponse } from 'next/server';
import { dolVideoService } from '@/services/DOL/VideoGenerationService';
import { DOLVideoRequest } from '@/services/DOL/VideoGenerationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.prompt || !body.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, userId' },
        { status: 400 }
      );
    }

    // Create DOL video request
    const dolRequest: DOLVideoRequest = {
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      aspect_ratio: body.aspect_ratio || '16:9',
      motion_intensity: body.motion_intensity || 5,
      duration: body.duration || 6,
      resolution: body.resolution || '1920x1080',
      style: body.style || 'cinematic',
      quality: body.quality || 'standard',
      fps: body.fps || 24,
      custom_settings: body.custom_settings || {},
      userId: body.userId,
      qualityRequirement: body.qualityRequirement,
      budget: body.budget,
      byokPlatformId: body.byokPlatformId,
      userPreferences: body.userPreferences
    };

    console.log('🎬 DOL Video API: Processing request...');

    // Generate video using DOL
    const result = await dolVideoService.generateVideo(dolRequest);

    return NextResponse.json({
      success: true,
      result,
      message: 'Video generation started successfully'
    });

  } catch (error) {
    console.error('DOL Video API error:', error);
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
    message: 'DOL Video Generation API',
    endpoints: {
      POST: '/api/dol/video/generate - Generate video with DOL optimization',
      MODELS: '/api/dol/video/models - Get available video models',
      COST_ESTIMATE: '/api/dol/video/cost-estimate - Get cost estimate'
    }
  });
}
