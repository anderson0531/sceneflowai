import { NextRequest, NextResponse } from 'next/server';
import { dolVideoService } from '@/services/DOL/VideoGenerationService';
import { DOLVideoRequest } from '@/services/DOL/VideoGenerationService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreditService } from '@/services/CreditService';
import { SubscriptionService } from '@/services/SubscriptionService';
import { normalizeTierName } from '@/lib/billing/tierCatalog';
import { canUseVeoMax, TOP_UP_PACKS, type VideoQuality, type PlanTier } from '@/lib/credits/creditCosts';
import { resolveGenerationQuote } from '@/lib/credits/resolveGenerationQuote';
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway';
import { resolveVertexCredentialForUser } from '@/lib/byok/resolveProviderCredential';

// Helper to determine user's plan tier from subscription tier (with single-counted credit fallback)
async function getUserPlanTier(userId: string): Promise<PlanTier> {
  try {
    const subscription = await SubscriptionService.getUserSubscription(userId);
    const tierName = subscription.tier?.name ? normalizeTierName(subscription.tier.name) : null;
    if (tierName === 'enterprise') return 'enterprise';
    if (tierName === 'studio') return 'studio';
    if (tierName === 'pro') return 'pro';
    if (tierName === 'starter' || tierName === 'hobbyist') return 'starter';
    if (tierName === 'explorer') return 'trial';

    const breakdown = await CreditService.getCreditBreakdown(userId);
    // total_credits already includes subscription_credits + addon_credits (do NOT double-count)
    const total = breakdown.total_credits;
    if (total >= 45000) return 'studio';
    if (total >= 10000) return 'pro';
    if (total >= 3000) return 'starter';
    return 'trial';
  } catch {
    return 'trial';
  }
}

export async function POST(request: NextRequest) {
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

    // Never trust client-supplied body.userKeyUsed; DOL service executes with platform credentials
    await resolveVertexCredentialForUser(userId).catch(() => ({ source: 'platform' as const }));
    const userKeyUsed = false;

    // 2. Determine video quality and credit cost
    const quality: VideoQuality = body.quality === 'max' ? 'max' : 'fast';
    const durationSeconds = Number(body.duration) || 6;
    const quoteInput = {
      kind: 'clip' as const,
      provider: 'google_vertex' as const,
      model: quality === 'max' ? 'veo-3.1-generate-001' : 'veo-3.1-fast-generate-001',
      resolution: quality === 'max' ? '4k' : '1080p',
      durationSeconds,
      audio: true,
      userKeyUsed,
    };
    const preview = await resolveGenerationQuote(quoteInput);
    const creditCost = preview.credits;

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

    // 4 & 5. Atomically reserve credits before generation, capture on success (fail-closed), release on error
    let metered;
    try {
      metered = await executeMeteredProviderCall({
        userId,
        projectId: body.projectId ?? null,
        route: '/api/dol/video/generate',
        provider: 'vertex',
        model: quoteInput.model,
        operation: quality === 'max' ? 'veo_max' : 'veo_fast',
        quoteInput,
        meta: { label: quality === 'max' ? 'veo_max' : 'veo_fast', duration: durationSeconds },
        execute: () => dolVideoService.generateVideo(dolRequest),
      });
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_CREDITS') {
        const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => ({ total_credits: 0 }));
        return NextResponse.json({
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: creditCost,
          balance: breakdown.total_credits,
          quality,
          suggestedTopUp: creditCost <= TOP_UP_PACKS.quick_fix.credits
            ? { pack: 'quick_fix', name: TOP_UP_PACKS.quick_fix.name, price: TOP_UP_PACKS.quick_fix.price, credits: TOP_UP_PACKS.quick_fix.credits }
            : { pack: 'scene_pack', name: TOP_UP_PACKS.scene_pack.name, price: TOP_UP_PACKS.scene_pack.price, credits: TOP_UP_PACKS.scene_pack.credits }
        }, { status: 402 });
      }
      throw err;
    }

    // Get updated balance
    let newBalance: number | undefined;
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId);
      newBalance = breakdown.total_credits;
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      result: metered.result,
      message: 'Video generation started successfully',
      creditsCharged: metered.creditsCharged,
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
