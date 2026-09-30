import { NextRequest, NextResponse } from 'next/server';
import { videoGenerationIntegrationService, VideoGenerationRequest } from '@/services/DOL/VideoGenerationIntegrationService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreditService } from '@/services/CreditService';
import { chargeQuotedGeneration } from '@/lib/credits/chargeQuotedGeneration';
import { resolveGenerationQuote } from '@/lib/credits/resolveGenerationQuote';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body: VideoGenerationRequest = await request.json();
    
    // Determine credit cost based on quality
    const quality = body.generationSettings?.quality || '1080p';
    const isVeoMax = quality === '4K' || quality === '8K';
    const sceneCount = body.sceneDirections?.length || 1;
    const durationSeconds = Math.max(
      1,
      Math.round(
        (body.sceneDirections || []).reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0) /
          sceneCount
      ) || 8
    );
    const perClip = await resolveGenerationQuote({
      kind: 'clip',
      provider: 'google_vertex',
      resolution: isVeoMax ? '4k' : '1080p',
      durationSeconds,
      audio: true,
      userKeyUsed: (body as { userKeyUsed?: boolean }).userKeyUsed === true,
    });
    const CREDIT_COST = perClip.credits;

    // Veo Max tier restriction: block for trial and starter plans
    if (isVeoMax) {
      const user = await User.findByPk(userId);
      const userPlan = user?.subscription_plan || 'free';
      const blockedPlans = ['free', 'trial', 'starter'];
      
      if (blockedPlans.includes(userPlan)) {
        return NextResponse.json(
          {
            error: 'TIER_RESTRICTION',
            message: 'Veo Max quality is available on Pro and Studio plans. Please upgrade to access this feature.',
            requiredPlan: 'pro',
            currentPlan: userPlan,
            upgradeUrl: '/dashboard/settings/billing'
          },
          { status: 403 }
        );
      }
    }

    // Credit pre-check (multiply by number of clips)
    const clipCount = body.sceneDirections?.length || 1;
    const totalCreditCost = CREDIT_COST * clipCount;
    const hasCredits = await CreditService.ensureCredits(userId, totalCreditCost);
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId);
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `This operation requires ${totalCreditCost} credits (${CREDIT_COST} × ${clipCount} clips). You have ${breakdown.total_credits}.`,
          required: totalCreditCost,
          available: breakdown.total_credits
        },
        { status: 402 }
      );
    }
    
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
      // Charge credits after successful generation
      let newBalance: number | undefined;
      try {
        const charged = await chargeQuotedGeneration({
          userId,
          projectId: body.projectId,
          quote: {
            ...perClip,
            credits: perClip.credits * clipCount,
            standardCredits: perClip.standardCredits * clipCount,
            providerUsd: perClip.providerUsd * clipCount,
            cogsUsd: perClip.cogsUsd * clipCount,
          },
          meta: {
            label: isVeoMax ? 'veo_max_integrated' : 'veo_fast_integrated',
            clipCount,
            quality,
            generationId: result.generationId,
          },
        });
        console.log(`[DOL Video] Charged ${charged.credits} credits (${CREDIT_COST} × ${clipCount}) to user ${userId}`);
        const breakdown = await CreditService.getCreditBreakdown(userId);
        newBalance = breakdown.total_credits;
      } catch (chargeError: any) {
        console.error('[DOL Video] Failed to charge credits:', chargeError);
      }

      return NextResponse.json({
        ...result,
        creditsCharged: totalCreditCost,
        creditsBalance: newBalance
      });
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
