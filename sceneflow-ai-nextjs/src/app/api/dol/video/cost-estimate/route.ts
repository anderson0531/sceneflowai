import { NextRequest, NextResponse } from 'next/server';
import { dolVideoService } from '@/services/DOL/VideoGenerationService';

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

    // Create request for cost estimation
    const costRequest = {
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
      byokPlatformId: body.byokPlatformId
    };

    console.log('💰 DOL Cost Estimation: Processing request...');

    // Get cost estimate using DOL
    const estimate = await dolVideoService.getCostEstimate(costRequest);

    return NextResponse.json({
      success: true,
      estimate,
      message: 'Cost estimate generated successfully'
    });

  } catch (error) {
    console.error('DOL Cost Estimation API error:', error);
    return NextResponse.json(
      { 
        error: 'Cost estimation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'DOL Video Cost Estimation API',
    description: 'Get cost estimates for video generation with DOL optimization'
  });
}
