import { NextRequest, NextResponse } from 'next/server';
import { dolVideoService } from '@/services/DOL/VideoGenerationService';
import { DOLVideoRequest } from '@/services/DOL/VideoGenerationService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreditService } from '@/services/CreditService';
import { VIDEO_CREDITS, canUseVeoMax, type VideoQuality, type PlanTier } from '@/lib/credits/creditCosts';

// Helper to determine user's plan tier from credits
async function getUserPlanTier(userId: string): Promise<PlanTier> {
  try {
    const breakdown = await CreditService.getCreditBreakdown(userId);
    const total = breakdown.total_credits + breakdown.subscription_credits;
    if (total >= 50000) return 'studio';
    if (total >= 10000) return 'pro';
    if (total >= 3000) return 'starter';
    return 'coffee_break';
  } catch {
    return 'coffee_break';
  }
}

export async function POST(request: NextRequest) {
  let creditsCharged = 0;
  
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || session?.user?.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // 2. Determine video quality and credit cost
    const quality: VideoQuality = body.quality === 'max' ? 'max' : 'fast';
    const creditCost = quality === 'max' ? VIDEO_CREDITS.VEO_MAX : VIDEO_CREDITS.VEO_FAST;

    // 3. Check plan restrictions for Veo Max
    if (quality === 'max') {
      const planTier = await getUserPlanTier(userId);
      if (!canUseVeoMax(planTier)) {
        return NextResponse.json({
          error: 'Veo 3.1 Max quality requires Pro or Studio plan',
          code: 'PLAN_RESTRICTED',
          currentPlan: planTier,
          upgradeRequired: true,
          suggestion: 'Select "Fast" quality or upgrade to Pro plan for production-quality video.'
        }, { status: 403 });
      }
    }

    // 4. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, creditCost);
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId);
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: creditCost,
        balance: breakdown.total_credits,
        quality,
        suggestedTopUp: creditCost <= 2000 
          ? { pack: 'quick_fix', name: 'Quick Fix', price: 25, credits: 2000 }
          : { pack: 'scene_pack', name: 'Scene Pack', price: 60, credits: 6000 }
      }, { status: 402 });
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
      userId: userId,
      qualityRequirement: body.qualityRequirement,
      budget: body.budget,
      byokPlatformId: body.byokPlatformId,
      userPreferences: body.userPreferences
    };

    console.log('🎬 DOL Video API: Processing request...');

    // Generate video using DOL
    const result = await dolVideoService.generateVideo(dolRequest);

    // 5. Charge credits after successful generation start
    try {
      await CreditService.charge(
        userId,
        creditCost,
        'ai_usage',
        null,
        { operation: quality === 'max' ? 'veo_max' : 'veo_fast', duration: body.duration || 6 }
      );
      creditsCharged = creditCost;
      console.log(`[DOL Video] Charged ${creditCost} credits (${quality}) to user ${userId}`);
    } catch (chargeError: any) {
      console.error('[DOL Video] Failed to charge credits:', chargeError);
    }

    // Get updated balance
    let newBalance: number | undefined;
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId);
      newBalance = breakdown.total_credits;
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      result,
      message: 'Video generation started successfully',
      creditsCharged: creditCost,
      creditsBalance: newBalance
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
