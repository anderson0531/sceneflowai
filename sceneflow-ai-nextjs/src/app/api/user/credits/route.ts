import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService, ensureWhopMigrationRan } from '@/services/CreditService'
import { isDatabaseUnavailableError } from '@/lib/database/connectionDiagnostics'
import { SANDBOX_CREDITS } from '@/lib/demo/uiSandboxProject'

export const dynamic = 'force-dynamic'

function isMissingColumnError(error: unknown): boolean {
  const err = error as { parent?: { code?: string }; original?: { code?: string }; message?: string }
  const code = err?.parent?.code ?? err?.original?.code
  const message = String(err?.message ?? '')
  return code === '42703' || message.includes('does not exist')
}

/**
 * GET /api/user/credits
 * Returns the current user's credit balance breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    let breakdown
    try {
      breakdown = await CreditService.getCreditBreakdown(userId)
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error
      }

      console.warn('[Credits API] Missing schema columns detected, running Whop migration...')
      await ensureWhopMigrationRan()
      breakdown = await CreditService.getCreditBreakdown(userId)
    }

    return NextResponse.json(breakdown)
  } catch (error: any) {
    console.error('[Credits API] Error fetching credits:', error)

    if (isMissingColumnError(error)) {
      return NextResponse.json(
        {
          error: 'Database schema migration required',
          code: 'SCHEMA_MIGRATION_REQUIRED',
          details: error.message,
        },
        { status: 503 }
      )
    }

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        subscription_credits: SANDBOX_CREDITS,
        subscription_expires_at: null,
        addon_credits: 0,
        total_credits: SANDBOX_CREDITS,
        subscription_credits_monthly: SANDBOX_CREDITS,
        subscription_plan: 'UI Sandbox (1M Credits)',
        subscription_expires: null,
        databaseUnavailable: true,
      })
    }

    return NextResponse.json({
      subscription_credits: SANDBOX_CREDITS,
      subscription_expires_at: null,
      addon_credits: 0,
      total_credits: SANDBOX_CREDITS,
      subscription_credits_monthly: SANDBOX_CREDITS,
      subscription_plan: 'UI Sandbox (1M Credits)',
      subscription_expires: null,
      databaseUnavailable: true,
    })
  }
}
