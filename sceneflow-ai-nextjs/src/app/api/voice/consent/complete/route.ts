/**
 * Voice Consent Completion API Route
 * 
 * POST /api/voice/consent/complete
 * 
 * Completes the voice consent verification process.
 * - For self-attestation: Accepts checkbox confirmation
 * - For voice verification: Accepts audio files for Azure Speaker Recognition
 * 
 * Returns a voice clone ID upon successful verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { AuthService } from '../../../../../services/AuthService';
import { ComplianceService } from '../../../../../services/ComplianceService';

/**
 * Get authenticated user ID from session or token
 */
async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  let userId: string | null = null;

  try {
    const session: any = await getServerSession(authOptions as any);
    if (session?.user) {
      userId = session.user.id || null;
    }
  } catch {}

  if (!userId) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token) {
      const vr = await AuthService.verifyToken(token);
      if (vr.success && vr.user) {
        userId = vr.user.id;
      }
    }
  }

  return userId;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || '';
    
    let consentId: string;
    let selfAttestationConfirmed: boolean | undefined;
    let audioBuffers: Buffer[] | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with audio files)
      const formData = await request.formData();
      consentId = formData.get('consentId') as string;
      selfAttestationConfirmed = formData.get('selfAttestationConfirmed') === 'true';
      
      // Extract audio files
      const files = formData.getAll('files') as File[];
      if (files && files.length > 0) {
        audioBuffers = await Promise.all(
          files.map(async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            return Buffer.from(arrayBuffer);
          })
        );
      }
    } else {
      // Handle JSON body (for self-attestation without audio)
      const body = await request.json();
      consentId = body.consentId;
      selfAttestationConfirmed = body.selfAttestationConfirmed;
    }

    // Validate required fields
    if (!consentId || typeof consentId !== 'string') {
      return NextResponse.json(
        { error: 'consentId is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(consentId)) {
      return NextResponse.json(
        { error: 'Invalid consent ID format', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Complete consent through ComplianceService
    const result = await ComplianceService.completeVoiceConsent(
      consentId,
      audioBuffers,
      selfAttestationConfirmed
    );

    if (!result.success) {
      let statusCode = 400;
      let errorCode = 'CONSENT_COMPLETION_FAILED';

      if (result.error?.includes('not found')) {
        statusCode = 404;
        errorCode = 'CONSENT_NOT_FOUND';
      } else if (result.error?.includes('expired')) {
        statusCode = 410;
        errorCode = 'CONSENT_EXPIRED';
      } else if (result.error?.includes('already')) {
        statusCode = 409;
        errorCode = 'CONSENT_ALREADY_PROCESSED';
      } else if (result.error?.includes('verification failed')) {
        statusCode = 422;
        errorCode = 'VERIFICATION_FAILED';
      } else if (result.error?.includes('More audio')) {
        statusCode = 422;
        errorCode = 'INSUFFICIENT_AUDIO';
      }

      return NextResponse.json(
        { 
          error: result.error,
          code: errorCode,
        },
        { status: statusCode }
      );
    }

    console.log(`[Voice Consent] Completed for user ${userId}, consent ID: ${consentId}, clone ID: ${result.cloneId}`);

    return NextResponse.json({
      success: true,
      consent: {
        id: result.consentId,
        status: 'verified',
      },
      voiceClone: {
        id: result.cloneId,
      },
      message: 'Voice consent verified successfully. You can now proceed with voice cloning.',
    });
  } catch (error) {
    console.error('[Voice Consent Complete] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete voice consent',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/consent/complete
 * 
 * Get the status of a consent record
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get('consentId');

    if (!consentId) {
      return NextResponse.json(
        { error: 'consentId query parameter is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Import VoiceConsent model
    const { VoiceConsent } = await import('../../../../../models/VoiceConsent');
    
    const consent = await VoiceConsent.findByPk(consentId);

    if (!consent) {
      return NextResponse.json(
        { error: 'Consent record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (consent.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      consent: {
        id: consent.id,
        status: consent.consent_status,
        type: consent.consent_type,
        actorName: consent.actor_name,
        verificationCode: consent.verification_code,
        createdAt: consent.created_at,
        expiresAt: consent.expires_at,
        verifiedAt: consent.verified_at,
        voiceCloneId: consent.voice_clone_id,
      },
    });
  } catch (error) {
    console.error('[Voice Consent Status] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get consent status',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
