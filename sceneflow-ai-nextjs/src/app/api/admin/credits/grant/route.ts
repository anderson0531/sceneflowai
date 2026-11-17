import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isDemoMode } from '@/lib/env'
import { isAdminEmail } from '@/lib/adminUtils'

// Use relative import to avoid path alias issues in production builds
import { CreditService } from '../../../../../services/CreditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/credits/grant
 * Grant credits to a user (admin function)
 * 
 * Body: {
 *   userIdOrEmail: string - User ID (UUID) or email address
 *   credits: number - Amount of credits to grant
 *   reason?: string - Optional reason for the grant (default: 'admin_grant')
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user — require whitelisted admin email unless running in explicit demo mode
    const session = (await getServerSession(authOptions as any)) as {
      user?: { email?: string | null }
    } | null

    if (!isDemoMode()) {
      if (!session?.user?.email) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Admin sign-in required',
          },
          { status: 401 }
        )
      }
      if (!isAdminEmail(session.user.email)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Admin access required',
          },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await req.json()
    const { userIdOrEmail, credits, reason, ref } = body

    // Validate input
    if (!userIdOrEmail) {
      return NextResponse.json({
        error: 'Missing userIdOrEmail',
        message: 'userIdOrEmail is required'
      }, { status: 400 })
    }

    if (typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json({
        error: 'Invalid credits amount',
        message: 'credits must be a positive number'
      }, { status: 400 })
    }

    // Grant credits
    const result = await CreditService.grantCredits(
      userIdOrEmail,
      credits,
      reason || 'admin_grant',
      ref || null,
      {
        grantedBy: session?.user?.email || 'system',
        timestamp: new Date().toISOString()
      }
    )

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${credits} credits`,
      data: {
        userId: userIdOrEmail,
        creditsGranted: credits,
        previousBalance: result.prev,
        newBalance: result.next,
        addonCredits: result.addonCredits
      }
    })

  } catch (error: any) {
    console.error('[Admin Grant Credits] Error:', error)
    return NextResponse.json({
      error: 'Failed to grant credits',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}

