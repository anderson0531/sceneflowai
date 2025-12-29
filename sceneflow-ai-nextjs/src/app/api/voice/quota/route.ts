/**
 * Voice Quota API Route
 * 
 * GET /api/voice/quota
 * 
 * Returns the user's voice clone quota information including:
 * - Current usage
 * - Maximum allowed slots
 * - Available slots
 * - Trust gate status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { AuthService } from '../../../../services/AuthService';
import { ComplianceService } from '../../../../services/ComplianceService';
import { SubscriptionService } from '../../../../services/SubscriptionService';
import { migrateComplianceGuardrails } from '../../../../lib/database/migrateComplianceGuardrails';

// Run migration on first request
let migrationChecked = false;
async function ensureMigration() {
  if (!migrationChecked) {
    try {
      await migrateComplianceGuardrails();
      migrationChecked = true;
    } catch (e) {
      console.error('[Voice Quota] Migration check failed:', e);
    }
  }
}

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

export async function GET(request: NextRequest) {
  try {
    // Ensure database tables exist
    await ensureMigration();
    
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get quota from ComplianceService
    const quota = await ComplianceService.getVoiceQuota(userId);
    
    // Get trust gate status
    const trustGate = await ComplianceService.canAccessVoiceCloning(userId);
    
    // Get subscription-level access check
    const subscriptionAccess = await SubscriptionService.canAccessVoiceCloning(userId);

    // Get list of user's voice clones
    const { UserVoiceClone } = await import('../../../../models/UserVoiceClone');
    const voiceClones = await UserVoiceClone.findAll({
      where: {
        user_id: userId,
        archived_at: null,
      },
      order: [['created_at', 'DESC']],
    });

    return NextResponse.json({
      success: true,
      quota: {
        used: quota.used,
        max: quota.max,
        available: quota.available,
        canCreate: quota.canCreate,
        lockedSlots: quota.lockedSlots,
      },
      access: {
        allowed: trustGate.allowed,
        subscriptionAllowed: subscriptionAccess.allowed,
        tierRequired: subscriptionAccess.tierRequired,
        blockers: trustGate.blockers,
        suggestions: trustGate.suggestions,
      },
      voiceClones: voiceClones.map(clone => ({
        id: clone.id,
        name: clone.voice_name,
        isActive: clone.is_active,
        useCount: clone.use_count,
        createdAt: clone.created_at,
        elevenLabsId: clone.elevenlabs_voice_id,
      })),
    });
  } catch (error) {
    console.error('[Voice Quota] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get voice quota',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/quota
 * 
 * Delete a voice clone (frees up a slot)
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cloneId = searchParams.get('cloneId');

    if (!cloneId) {
      return NextResponse.json(
        { error: 'cloneId query parameter is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cloneId)) {
      return NextResponse.json(
        { error: 'Invalid clone ID format', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const success = await ComplianceService.deleteVoiceClone(userId, cloneId);

    if (!success) {
      return NextResponse.json(
        { error: 'Voice clone not found or already deleted', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get updated quota
    const quota = await ComplianceService.getVoiceQuota(userId);

    console.log(`[Voice Quota] Deleted clone ${cloneId} for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Voice clone deleted successfully',
      quota: {
        used: quota.used,
        max: quota.max,
        available: quota.available,
        canCreate: quota.canCreate,
      },
    });
  } catch (error) {
    console.error('[Voice Quota Delete] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete voice clone',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
