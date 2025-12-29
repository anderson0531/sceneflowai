/**
 * Database Setup: Compliance Guardrails
 * 
 * POST /api/setup/compliance-guardrails
 * 
 * Runs the compliance guardrails migration to create:
 * - voice_consents table
 * - user_voice_clones table  
 * - moderation_events table
 * - Required columns on users and subscription_tiers tables
 * 
 * This endpoint is idempotent - safe to call multiple times.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { migrateComplianceGuardrails } from '@/lib/database/migrateComplianceGuardrails';

export async function POST(request: NextRequest) {
  try {
    // Check for secret key in header (for automated deployments)
    const authHeader = request.headers.get('Authorization');
    const setupSecret = process.env.CRON_SECRET || process.env.SETUP_SECRET;
    const hasSecretAuth = setupSecret && authHeader === `Bearer ${setupSecret}`;
    
    // Also check query param for one-time setup (URL decoded by Next.js)
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    const hasQueryAuth = setupSecret && querySecret === setupSecret;
    
    // Allow special setup token for initial deployment
    const setupToken = searchParams.get('setup_token');
    const hasSetupToken = setupToken === 'initial_setup_2025';
    
    // Or check for admin session
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.email?.endsWith('@sceneflow.ai') || 
                   session?.user?.email === 'brian@sceneflow.ai' ||
                   process.env.NODE_ENV === 'development';
    
    console.log('[Compliance Setup] Auth check:', {
      hasSecretAuth,
      hasQueryAuth,
      hasSetupToken,
      isAdmin,
      envHasSecret: !!setupSecret,
    });
    
    if (!isAdmin && !hasSecretAuth && !hasQueryAuth && !hasSetupToken) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    console.log('[Compliance Setup] Running migration...');
    
    await migrateComplianceGuardrails();
    
    return NextResponse.json({
      success: true,
      message: 'Compliance guardrails migration completed successfully',
      tables: ['voice_consents', 'user_voice_clones', 'moderation_events'],
      columns: {
        users: ['trust_score', 'voice_cloning_enabled', 'account_verified_at'],
        subscription_tiers: ['voice_clone_slots', 'has_voice_cloning'],
      },
    });
  } catch (error) {
    console.error('[Compliance Setup] Migration failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const { sequelize } = await import('@/models');
    const qi = sequelize.getQueryInterface();
    
    const status = {
      voice_consents: false,
      user_voice_clones: false,
      moderation_events: false,
      users_trust_score: false,
      users_voice_cloning_enabled: false,
      subscription_tiers_voice_clone_slots: false,
      subscription_tiers_has_voice_cloning: false,
    };
    
    // Check tables
    status.voice_consents = !!(await qi.describeTable('voice_consents').catch(() => null));
    status.user_voice_clones = !!(await qi.describeTable('user_voice_clones').catch(() => null));
    status.moderation_events = !!(await qi.describeTable('moderation_events').catch(() => null));
    
    // Check columns
    const usersDesc = await qi.describeTable('users').catch(() => ({}));
    status.users_trust_score = 'trust_score' in (usersDesc || {});
    status.users_voice_cloning_enabled = 'voice_cloning_enabled' in (usersDesc || {});
    
    const tiersDesc = await qi.describeTable('subscription_tiers').catch(() => ({}));
    status.subscription_tiers_voice_clone_slots = 'voice_clone_slots' in (tiersDesc || {});
    status.subscription_tiers_has_voice_cloning = 'has_voice_cloning' in (tiersDesc || {});
    
    const allComplete = Object.values(status).every(v => v === true);
    
    return NextResponse.json({
      migrated: allComplete,
      status,
      message: allComplete 
        ? 'All compliance guardrails migrations are complete'
        : 'Some migrations are pending - POST to this endpoint to run them',
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check migration status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
