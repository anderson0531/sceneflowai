/**
 * Voice Consent Initiation API Route
 * 
 * POST /api/voice/consent/initiate
 * 
 * Initiates the voice consent verification process.
 * Returns a consent phrase that the voice actor must record.
 * 
 * Required for cloning third-party voices (not the user's own voice).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { AuthService } from '../../../../../services/AuthService';
import { ComplianceService } from '../../../../../services/ComplianceService';

interface InitiateConsentRequest {
  actorName: string;      // Name of the voice being cloned
  isSelfClone?: boolean;  // true if cloning own voice (simplified flow)
}

/**
 * Get authenticated user ID from session or token
 */
async function getAuthenticatedUserId(req: NextRequest): Promise<{ userId: string | null; userName: string | null }> {
  let userId: string | null = null;
  let userName: string | null = null;

  try {
    const session: any = await getServerSession(authOptions as any);
    if (session?.user) {
      userId = session.user.id || null;
      userName = session.user.name || session.user.first_name || session.user.email || null;
    }
  } catch {}

  if (!userId) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token) {
      const vr = await AuthService.verifyToken(token);
      if (vr.success && vr.user) {
        userId = vr.user.id;
        userName = vr.user.name || vr.user.email || null;
      }
    }
  }

  return { userId, userName };
}

export async function POST(request: NextRequest) {
  try {
    const { userId, userName } = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: InitiateConsentRequest = await request.json();
    const { actorName, isSelfClone = false } = body;

    if (!actorName || typeof actorName !== 'string') {
      return NextResponse.json(
        { error: 'actorName is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    if (actorName.length < 2 || actorName.length > 100) {
      return NextResponse.json(
        { error: 'actorName must be between 2 and 100 characters', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Initiate consent through ComplianceService
    const result = await ComplianceService.initiateVoiceConsent(
      userId,
      actorName.trim(),
      userName || 'User',
      isSelfClone
    );

    if (!result.success) {
      // Determine appropriate status code based on error
      let statusCode = 400;
      let errorCode = 'CONSENT_INITIATION_FAILED';

      if (result.error?.includes('subscription')) {
        statusCode = 403;
        errorCode = 'SUBSCRIPTION_REQUIRED';
      } else if (result.error?.includes('account')) {
        statusCode = 403;
        errorCode = 'ACCOUNT_REQUIREMENTS_NOT_MET';
      } else if (result.error?.includes('quota') || result.error?.includes('limit')) {
        statusCode = 403;
        errorCode = 'QUOTA_EXCEEDED';
      } else if (result.error?.includes('disabled')) {
        statusCode = 403;
        errorCode = 'VOICE_CLONING_DISABLED';
      }

      return NextResponse.json(
        { 
          error: result.error,
          code: errorCode,
        },
        { status: statusCode }
      );
    }

    console.log(`[Voice Consent] Initiated for user ${userId}, consent ID: ${result.consentId}`);

    return NextResponse.json({
      success: true,
      consent: {
        id: result.consentId,
        phrase: result.phrase,
        verificationCode: result.verificationCode,
        expiresAt: result.expiresAt?.toISOString(),
        isSelfClone,
      },
      instructions: isSelfClone
        ? 'Please confirm that you are cloning your own voice by checking the self-attestation box.'
        : 'Please have the voice actor record themselves saying the consent phrase clearly. The recording should be at least 10 seconds long.',
    });
  } catch (error) {
    console.error('[Voice Consent Initiate] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate voice consent',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/consent/initiate
 * 
 * Check if user can initiate voice consent (trust gate check)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check trust gate
    const trustResult = await ComplianceService.canAccessVoiceCloning(userId);
    const quota = await ComplianceService.getVoiceQuota(userId);

    return NextResponse.json({
      success: true,
      canInitiate: trustResult.allowed,
      trustGate: {
        allowed: trustResult.allowed,
        reason: trustResult.reason,
        blockers: trustResult.blockers,
        suggestions: trustResult.suggestions,
      },
      quota: {
        used: quota.used,
        max: quota.max,
        available: quota.available,
        canCreate: quota.canCreate,
      },
    });
  } catch (error) {
    console.error('[Voice Consent Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check consent eligibility',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
