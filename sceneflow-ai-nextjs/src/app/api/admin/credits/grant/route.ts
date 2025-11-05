import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isDemoMode } from '@/lib/env'

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
    // Authenticate user (admin check - allow in dev/demo mode)
    const session = await getServerSession(authOptions as any)
    
    // In demo mode or if no session, allow access (for testing)
    // In production, you should add proper admin check here
    if (!session && !isDemoMode()) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Admin access required'
      }, { status: 401 })
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

