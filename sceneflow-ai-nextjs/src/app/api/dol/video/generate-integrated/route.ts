import { NextRequest, NextResponse } from 'next/server';
import { videoGenerationIntegrationService, VideoGenerationRequest } from '@/services/DOL/VideoGenerationIntegrationService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreditService } from '@/services/CreditService';
import { SubscriptionService } from '@/services/SubscriptionService';
import { normalizeTierName } from '@/lib/billing/tierCatalog';
import { canUseVeoMax, type PlanTier } from '@/lib/credits/creditCosts';
import { resolveGenerationQuote } from '@/lib/credits/resolveGenerationQuote';
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway';
import { resolveVertexCredentialForUser } from '@/lib/byok/resolveProviderCredential';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body: VideoGenerationRequest = await request.json();

    // Validate required fields before reserving credits
    if (!body.sceneDirections || body.sceneDirections.length === 0) {
      return NextResponse.json(
        { error: 'No scene directions provided' },
        { status: 400 }
      );
    }

    if (!body.projectId) {
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 }
      );
    }

    // Never trust client-supplied body.userKeyUsed or body.userId
    await resolveVertexCredentialForUser(userId).catch(() => ({ source: 'platform' as const }));
    const userKeyUsed = false;

    // Determine credit cost based on quality
    const quality = body.generationSettings?.quality || '1080p';
    const isVeoMax = quality === '4K' || quality === '8K';
    const clipCount = body.sceneDirections.length;
    const durationSeconds = Math.max(
      1,
      Math.round(
        body.sceneDirections.reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0) /
          clipCount
      ) || 8
    );
    const modelId = isVeoMax ? 'veo-3.1-generate-001' : 'veo-3.1-fast-generate-001';
    const perClip = await resolveGenerationQuote({
      kind: 'clip',
      provider: 'google_vertex',
      model: modelId,
      resolution: isVeoMax ? '4k' : '1080p',
      durationSeconds,
      audio: true,
      userKeyUsed,
    });
    const CREDIT_COST = perClip.credits;
    const totalCreditCost = CREDIT_COST * clipCount;
    const totalCogsUsd = perClip.cogsUsd * clipCount;

    // Veo Max tier restriction: check actual SubscriptionTier via SubscriptionService
    if (isVeoMax) {
      const subscription = await SubscriptionService.getUserSubscription(userId);
      const normalized = subscription.tier?.name ? normalizeTierName(subscription.tier.name) : null;
      const planTier: PlanTier =
        normalized === 'enterprise'
          ? 'enterprise'
          : normalized === 'studio'
            ? 'studio'
            : normalized === 'pro'
              ? 'pro'
              : normalized === 'starter' || normalized === 'hobbyist'
                ? 'starter'
                : 'trial';

      if (!canUseVeoMax(planTier)) {
        return NextResponse.json(
          {
            error: 'TIER_RESTRICTION',
            message: 'Veo Max quality is available on Pro and Studio plans. Please upgrade to access this feature.',
            requiredPlan: 'pro',
            currentPlan: normalized || 'free',
            upgradeUrl: '/dashboard/settings/billing'
          },
          { status: 403 }
        );
      }
    }

    console.log('🎬 DOL Video Generation API: Processing request...');

    // Atomically reserve credits before generation, capture on success (fail-closed), release on failure
    let metered;
    try {
      metered = await executeMeteredProviderCall({
        userId,
        projectId: body.projectId,
        route: '/api/dol/video/generate-integrated',
        provider: 'vertex',
        model: modelId,
        operation: isVeoMax ? 'veo_max_integrated' : 'veo_fast_integrated',
        flatCredits: totalCreditCost,
        estimatedCogsUsd: totalCogsUsd,
        meta: {
          label: isVeoMax ? 'veo_max_integrated' : 'veo_fast_integrated',
          clipCount,
          quality,
        },
        execute: async () => {
          const result = await videoGenerationIntegrationService.generateVideo({
            ...body,
            userId,
          });
          if (!result.success) {
            throw new Error(result.error || 'Video generation failed');
          }
          return result;
        },
        resolveSettlement: (res) => ({
          finalCredits: totalCreditCost,
          estimatedCogsUsd: totalCogsUsd,
          providerRequestId: res.generationId,
          meta: { generationId: res.generationId },
        }),
      });
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_CREDITS') {
        const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => ({ total_credits: 0 }));
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
      throw err;
    }

    let newBalance: number | undefined;
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId);
      newBalance = breakdown.total_credits;
    } catch {
      // Ignore balance lookup error
    }

    return NextResponse.json({
      ...metered.result,
      creditsCharged: metered.creditsCharged,
      creditsBalance: newBalance
    });

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
